from brownie import *

import time
import json
import csv
import math

def main():
    thisNetwork = network.show_active()

    # == Governance Params =================================================================================================================
    # TODO set correct variables
    quorumVotes = 10
    majorityPercentageVotes = 50

    # == Load config =======================================================================================================================
    if thisNetwork == "development":
        acct = accounts[0]
        configFile =  open('./scripts/custom/og/values/development.json')
        delay = 3*60*60
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        acct = accounts.load("rskdeployer")
        configFile =  open('./scripts/custom/og/values/testnet.json')
        delay = 2*24*60*60
    elif thisNetwork == "rsk-mainnet":
        acct = accounts.load("rskdeployer")
        configFile =  open('./scripts/custom/og/values/mainnet.json')
        delay = 2*24*60*60
    else:
        raise Exception("network not supported")

    # Load deployed contracts addresses
    contracts = json.load(configFile)

    oneAddress = "0x0000000000000000000000000000000000000001"
    # Change this in the future.
    protocolAddress = oneAddress

    # Change this in the future.
    multisig = acct
    teamVestingOwner = multisig

    # Change this in the future.
    guardian = acct

    balanceBefore = acct.balance()

    # == OG ===============================================================================================================================
    # Change this in the future
    # Deploy/Fetch OG
    if(contracts["OGToken"] == '' or contracts["Reset"]):
        tokenName = contracts["tokenName"]
        tokenSymbol = contracts["tokenSymbol"]
        tokenDecimal = int(contracts["tokenDecimal"])
        tokenAmount = int(contracts["tokenAmount"]) * (10 ** tokenDecimal)

        print("=============================================================")
        print("Deployment Parameters")
        print("=============================================================")
        print("Token Name:                      ", tokenName)
        print("Token Symbol:                    ", tokenSymbol)
        print("Token Decimal:                   ", tokenDecimal)
        print("Token Balance with Decimal:      ", tokenAmount/(10 ** tokenDecimal))
        print("Token Balance without Decimal:   ", tokenAmount)
        print("=============================================================")

        OGToken = acct.deploy(Token, tokenAmount, tokenName, tokenSymbol, tokenDecimal)

        tokenAmount = OGToken.balanceOf(acct)
        print("=============================================================")
        print("Deployed Details")
        print("=============================================================")
        print("Token Address:                   ", OGToken)
        print("Token Balance with Decimal:      ", tokenAmount/(10 ** tokenDecimal))
        print("Token Balance without Decimal:   ", tokenAmount)
        print("=============================================================")

        contracts["OGToken"] = OGToken.address
        writeToJSON(contracts)
    else:
        OGToken = Contract.from_abi("Token", address=contracts["OGToken"], abi=Token.abi, owner=acct)
        print("OGToken already deployed at:",OGToken.address)

    print("Balance: ")
    print(OGToken.balanceOf(acct))

    MULTIPLIER = 10**16

    # == Staking ===========================================================================================================================
    # Deploy the staking contracts
    if(contracts["Staking"] == '' or contracts["Reset"]):
        stakingLogic = acct.deploy(Staking)
        contracts["StakingLogic"] = stakingLogic.address
        staking = acct.deploy(StakingProxy, OGToken.address)
        staking.setImplementation(stakingLogic.address)
        staking = Contract.from_abi("Staking", address=staking.address, abi=Staking.abi, owner=acct)
        contracts["Staking"] = staking.address
        writeToJSON(contracts)
    else:
        staking = Contract.from_abi("Staking", address=contracts["Staking"], abi=Staking.abi, owner=acct)
        print("Staking already deployed at:",staking.address)

    # == Governor ====================================================================================================================
    # [timelockOwner]
    # params: owner, delay
    if(contracts["Timelock"] == '' or contracts["Reset"]):
        timelock = acct.deploy(Timelock, acct, delay)
        contracts["Timelock"] = timelock.address
        writeToJSON(contracts)
    else:
        timelock = Contract.from_abi("Timelock", address=contracts["Timelock"], abi=Timelock.abi, owner=acct)
        print("Timelock already deployed at:",timelock.address)

    # params: timelockOwner. staking, guardian
    if(contracts["Governor"] == '' or contracts["Reset"]):
        governor = acct.deploy(GovernorAlpha, timelock.address, staking.address, guardian, quorumVotes, majorityPercentageVotes)

        dataString = timelock.setPendingAdmin.encode_input(governor.address)
        # 2 days and 5 minutes from now
        eta = round(time.time()) + delay + 300
        print("schedule ownership(admin) transfer for ", eta)
        print(dataString[10:])
        timelock.queueTransaction(timelock.address, 0, "setPendingAdmin(address)", dataString[10:], eta)

        contracts["Governor"] = governor.address
        writeToJSON(contracts)
    else:
        governor = Contract.from_abi("GovernorAlpha", address=contracts["Governor"], abi=GovernorAlpha.abi, owner=acct)
        print("Governor already deployed at:",governor.address)

    # GovernorVault Owner
    if(contracts["GovernorVault"] == '' or contracts["Reset"]):
        governorVault = acct.deploy(GovernorVault)
        governorVault.transferOwnership(timelock.address)
        contracts["GovernorVault"] = governorVault.address
        writeToJSON(contracts)
    else:
        governorVault = Contract.from_abi("GovernorVault", address=contracts["GovernorVault"], abi=GovernorVault.abi, owner=acct)
        print("GovernorVault already deployed at:",governorVault.address)

    # Deploy LockedFund
    cliff = 1
    duration = 11
    if(contracts["LockedFund"] == '' or contracts["Reset"]):
        waitedTS = contracts['waitedTimestamp']
        if thisNetwork == "development" or thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
            waitedTS = int(time.time()) + (3*24*60*60)
        lockedFund = acct.deploy(LockedFund, waitedTS, OGToken.address, oneAddress, [multisig])
        contracts["LockedFund"] = lockedFund.address
        writeToJSON(contracts)
    else:
        lockedFund = Contract.from_abi("LockedFund", address=contracts["LockedFund"], abi=LockedFund.abi, owner=acct)
        print("LockedFund already deployed at:",lockedFund.address)

    # Deplot VestingRegistry
    if(contracts["VestingRegistry"] == '' or contracts["Reset"]):
        # Deploy VestingFactory for VestingCreator
        vestingLogic = acct.deploy(VestingLogic)
        contracts["VestingLogic"] = vestingLogic.address
        vestingFactory = acct.deploy(VestingFactory, vestingLogic.address)
        contracts["VestingFactory"] = vestingFactory.address

        # Deploy VestingRegistryLogic
        vestingRegistryLogic = acct.deploy(VestingRegistryLogic)
        vestingRegistryProxy = acct.deploy(VestingRegistryProxy)
        vestingRegistryProxy.setImplementation(vestingRegistryLogic.address)
        vestingRegistry = Contract.from_abi(
            "VestingRegistryLogic",
            address=vestingRegistryProxy.address,
            abi=VestingRegistryLogic.abi,
            owner=acct)

        vestingRegistry.initialize(vestingFactory.address, OGToken.address, staking.address, governorVault.address, teamVestingOwner, lockedFund.address)

        vestingRegistryProxy.addAdmin(multisig)
        contracts["VestingRegistry"] = vestingRegistry.address
        writeToJSON(contracts)
    else:
        vestingRegistry = Contract.from_abi("VestingRegistry", address=contracts["VestingRegistry"], abi=VestingRegistryLogic.abi, owner=acct)
        print("VestingRegistry already deployed at:",vestingRegistry.address)

    # Updating Vesting Registry in LockedFund
    if(lockedFund.getVestingRegistry() != vestingRegistry.address):
        lockedFund.changeVestingRegistry(vestingRegistry.address)

    # Deploy VestingCreator
    if(contracts["VestingCreator"] == '' or contracts["Reset"]):
        vestingCreator = acct.deploy(VestingCreator, OGToken.address, vestingRegistry)

        vestingCreator.transferOwnership(multisig)
        vestingRegistryProxy.addAdmin(vestingCreator)
        vestingRegistryProxy.addAdmin(lockedFund.address)

        vestingFactory.transferOwnership(vestingRegistryProxy.address)
        vestingRegistry.transferOwnership(multisig)
        vestingRegistryProxy.setProxyOwner(multisig)
        contracts["VestingCreator"] = vestingCreator.address
        writeToJSON(contracts)
    else:
        vestingCreator = Contract.from_abi("VestingCreator", address=contracts["VestingCreator"], abi=VestingCreator.abi, owner=acct)
        print("VestingCreator already deployed at:",vestingCreator.address)

    # == Vesting contracts ===============================================================================================================
    # TODO check vestings.csv

    month = 24*60*60 * 28

    print("Adding Vesting")

    # vestingCreator.addVestings(
    #     ["0x2b6a4e5b0f648Fbca778c2e3f6D59D2F2ce6cbDA", "0x44a7Da048D4216A8edc944985B839b25aa9e6293", "0x0f39e7af6810a2B73a973C3167755930b1266811", "0x566f961081921045b32e2eBe0420eb77d74d2022", "0x9Cf4CC7185E957C63f0BA6a4D793F594c702AD66", "0x61E1eaC4064564889a093EbC9939B118d5b8D415"],
    #     [100e18,100e18,100e18,100e18,100e18,100e18],
    #     [1 * month,2 * month,3 * month,4 * month,5 * month,6 * month],
    #     [12 * month,15 * month,18 * month,21 * month,24 * month,27 * month],
    #     [True, True, True, True, True, True],
    #     [0, 0, 0, 0, 0, 0]
    # )

    # vestingCreator.addVestings(
    #     ["0x2b6a4e5b0f648Fbca778c2e3f6D59D2F2ce6cbDA", "0x44a7Da048D4216A8edc944985B839b25aa9e6293", "0x0f39e7af6810a2B73a973C3167755930b1266811", "0x566f961081921045b32e2eBe0420eb77d74d2022", "0x9Cf4CC7185E957C63f0BA6a4D793F594c702AD66", "0x61E1eaC4064564889a093EbC9939B118d5b8D415"],
    #     [100e18,100e18,100e18,100e18,100e18,100e18],
    #     [1 * month,2 * month,3 * month,4 * month,5 * month,6 * month],
    #     [12 * month,15 * month,18 * month,21 * month,24 * month,27 * month],
    #     [False, False, False, False, False, False],
    #     [0, 0, 0, 0, 0, 0]
    # )

    print("Transferring OG for Vesting")

    OGForVesting = vestingCreator.getMissingBalance()
    if(OGForVesting > 0):
        # print(OGForVesting)
        # print(vestingCreator.address)
        # print(vestingCreator.isEnoughBalance())
        # print(vestingCreator.SOV())
        # print(OGToken.balanceOf(vestingCreator.address))
        OGToken.transfer(vestingCreator.address, OGForVesting)

    print("Processing Vesting")

    # print("Unprocessed Count:", vestingCreator.getUnprocessedCount())
    # vestingCreator.processNextVesting()

    #  == Transfer ownership to owner governor =============================================================================================
    # TODO transfer ownership of all these contracts to timelockOwner

    # OGToken.transferOwnership(timelockOwner.address)
    # staking.transferOwnership(timelockOwner.address)
    # stakingProxy = Contract.from_abi("UpgradableProxy", address=staking.address, abi=UpgradableProxy.abi, owner=acct)
    # stakingProxy.setProxyOwner(timelockOwner.address)

    print("Balance:")
    print(OGToken.balanceOf(acct) / 10**18)

    balanceAfter = acct.balance()

    print("=============================================================")
    print("Balance Before:  ", balanceBefore)
    print("Balance After:   ", balanceAfter)
    print("Gas Used:        ", balanceBefore - balanceAfter)
    print("=============================================================")

# =========================================================================================================================================
def writeToJSON(contracts):
    thisNetwork = network.show_active()
    if thisNetwork == "development":
        originsHandle = open('./scripts/custom/og/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        originsHandle = open('./scripts/custom/og/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet":
        originsHandle = open('./scripts/custom/og/values/mainnet.json', "w")
    json.dump(contracts, originsHandle, indent=4)
