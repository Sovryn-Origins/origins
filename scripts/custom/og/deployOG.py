from brownie import *

import time
import json
import csv
import math

def main():
    thisNetwork = network.show_active()

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
        delay = 3*24*60*60
    else:
        raise Exception("network not supported")

    # Load deployed contracts addresses
    contracts = json.load(configFile)

    oneAddress = "0x0000000000000000000000000000000000000001"

    # TODO: Change this in the future. It should be proper RSK Multisig of Exchequer/Core.
    multisig = acct
    
    # TODO: Change this in the future. It should be the same address as above or another exchequer multisig.
    teamVestingOwner = multisig

    # TODO: Change this in the future. It should be Sovryn Governance Timelock Address.
    guardian = acct

    # == Governance Params =================================================================================================================
    quorumVotes = contracts["quorumVotes"]
    majorityPercentageVotes = contracts["majorityPercentageVotes"]
    delay = contracts["delay"]

    balanceBefore = acct.balance() / 10**18

    # == OG ===============================================================================================================================
    # Deploy/Fetch OG
    print("Deploying/Fetching OG Token")
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
    tokenBalanceBefore =  OGToken.balanceOf(acct) / 10**18

    MULTIPLIER = 10**16

    # == Staking ===========================================================================================================================
    # Deploy the staking contracts
    print("Deploying/Fetching Staking")
    if(contracts["Staking"] == '' or contracts["Reset"]):
        print("Deploying Staking Logic.")
        stakingLogic = acct.deploy(Staking)
        contracts["StakingLogic"] = stakingLogic.address
        print("Staking Logic Deployed at:", stakingLogic.address)

        print("Deploying Staking Proxy")
        staking = acct.deploy(StakingProxy, OGToken.address)
        print("Staking Proxy Deployed at:", staking.address)

        print("Setting Staking Implementation")
        staking.setImplementation(stakingLogic.address)
        print("Staking Implementation set to Staking Proxy")

        staking = Contract.from_abi("Staking", address=staking.address, abi=Staking.abi, owner=acct)
        contracts["Staking"] = staking.address
        writeToJSON(contracts)
    else:
        staking = Contract.from_abi("Staking", address=contracts["Staking"], abi=Staking.abi, owner=acct)
        print("Staking already deployed at:",staking.address)

    # == Governor ====================================================================================================================
    # [timelockOwner]
    # params: owner, delay
    print("Deploying/Fetching Timelock")
    if(contracts["Timelock"] == '' or contracts["Reset"]):
        print("Deploying Timelock")
        timelock = acct.deploy(Timelock, acct, delay)
        contracts["Timelock"] = timelock.address
        print("Timelock Deployed at:",timelock.address)
        writeToJSON(contracts)
    else:
        timelock = Contract.from_abi("Timelock", address=contracts["Timelock"], abi=Timelock.abi, owner=acct)
        print("Timelock already deployed at:",timelock.address)

    # params: timelockOwner. staking, guardian
    print("Deploying/Fetching Governance")
    if(contracts["Governor"] == '' or contracts["Reset"]):
        print("Deploying Governance")
        governor = acct.deploy(GovernorAlpha, timelock.address, staking.address, guardian, quorumVotes, majorityPercentageVotes)
        print("Governance Deployed at:",governor.address)

        print("Setting pending admin at Timelock")
        dataString = timelock.setPendingAdmin.encode_input(governor.address)
        # 2 days and 5 minutes from now
        eta = round(time.time()) + delay + 300
        print("IMPORTANT: Schedule ownership(admin) transfer for:", eta)
        print(dataString[10:])
        timelock.queueTransaction(timelock.address, 0, "setPendingAdmin(address)", dataString[10:], eta)
        print("Transaction queued in Timelock.")

        contracts["Governor"] = governor.address
        writeToJSON(contracts)
    else:
        governor = Contract.from_abi("GovernorAlpha", address=contracts["Governor"], abi=GovernorAlpha.abi, owner=acct)
        print("Governor already deployed at:",governor.address)

    # GovernorVault Owner
    print("Deploying/Fetching Governance Vault")
    if(contracts["GovernorVault"] == '' or contracts["Reset"]):
        governorVault = acct.deploy(GovernorVault)
        governorVault.transferOwnership(timelock.address)
        contracts["GovernorVault"] = governorVault.address
        writeToJSON(contracts)
    else:
        governorVault = Contract.from_abi("GovernorVault", address=contracts["GovernorVault"], abi=GovernorVault.abi, owner=acct)
        print("GovernorVault already deployed at:",governorVault.address)
    
    if(staking.feeSharing != governorVault.address):
        print("Setting Governor Vault as the fee sharing address of Staking.")
        staking.setFeeSharing(governorVault.address)

    # Deplot VestingRegistry
    print("Deploying/Fetching Vesting Registry")
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

        # Initialization is done after lockedFund is created.

        vestingRegistryProxy.addAdmin(multisig)
        contracts["VestingRegistry"] = vestingRegistry.address
        writeToJSON(contracts)
    else:
        vestingRegistry = Contract.from_abi("VestingRegistry", address=contracts["VestingRegistry"], abi=VestingRegistryLogic.abi, owner=acct)
        print("VestingRegistry already deployed at:",vestingRegistry.address)

    # Deploy LockedFund
    print("Deploying/Fetching LockedFund")    
    if(contracts["LockedFund"] == '' or contracts["Reset"]):
        waitedTS = contracts['waitedTimestamp']
        if thisNetwork == "development":
            waitedTS = int(time.time()) + (2*60*60) # 2 Hours
        elif (thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws") and waitedTS == "":
            waitedTS = int(time.time()) + (3*24*60*60) # 3 Days
        lockedFund = acct.deploy(LockedFund, waitedTS, OGToken.address, vestingRegistry.address, [multisig])
        contracts["LockedFund"] = lockedFund.address
        writeToJSON(contracts)
    else:
        lockedFund = Contract.from_abi("LockedFund", address=contracts["LockedFund"], abi=LockedFund.abi, owner=acct)
        print("LockedFund already deployed at:",lockedFund.address)
    
    # Initializing vesting registry
    print("Initializing vesting registry.")
    if(vestingRegistry.token() != OGToken.address):
        vestingRegistry.initialize(vestingFactory.address, OGToken.address, staking.address, governorVault.address, teamVestingOwner, lockedFund.address)
    else:
        print("VestingRegistry already Initialized")

    # Deploy VestingCreator
    print("\nDeploying/Fetching Vesting Creator")
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

    #  == Transfer ownership to owner governor =============================================================================================
    # TODO: transfer ownership of all these contracts to timelockOwner

    # OGToken.transferOwnership(timelockOwner.address)
    # staking.transferOwnership(timelockOwner.address)
    # stakingProxy = Contract.from_abi("UpgradableProxy", address=staking.address, abi=UpgradableProxy.abi, owner=acct)
    # stakingProxy.setProxyOwner(timelockOwner.address)

    tokenBalanceAfter = OGToken.balanceOf(acct) / 10**18

    balanceAfter = acct.balance() / 10**18

    print("== RSK Gas Usage ============================================")
    print("Balance Before:  ", balanceBefore)
    print("Balance After:   ", balanceAfter)
    print("Gas Used:        ", balanceBefore - balanceAfter)
    print("\n== Token Usage ==============================================")
    print("Token Balance Before:    ", tokenBalanceBefore)
    print("Token Balance After:     ", tokenBalanceAfter)
    print("Token Used:              ", tokenBalanceBefore - tokenBalanceAfter)
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
