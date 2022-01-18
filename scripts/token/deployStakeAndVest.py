from brownie import *
import json

def main():
    loadConfig()
    deployStakingAndVesting()

# =========================================================================================================================================
def loadConfig():
    global values, origins, acct, thisNetwork
    thisNetwork = network.show_active()

    if thisNetwork == "development":
        acct = accounts[0]
        configFile = open('./scripts/token/values/development.json')
        originsFile = open('./scripts/origins/values/development.json')
    elif thisNetwork == "testnet" or thisNetwork == "testnet-ws":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/testnet.json')
        originsFile = open('./scripts/origins/values/testnet.json')
    elif thisNetwork == "rsk-testnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/testnet.json')
        originsFile = open('./scripts/origins/values/testnet.json')
    elif thisNetwork == "rsk-mainnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/mainnet.json')
        originsFile = open('./scripts/origins/values/mainnet.json')
    else:
        raise Exception("Network not supported")

    # Load values & deployed contracts addresses.
    values = json.load(configFile)
    origins = json.load(originsFile)

# =========================================================================================================================================
def deployStakingAndVesting():
    multisig = values["multisig"]
    token = values["token"]
    feeSharing = values["multisig"]
    stakingLogic = values["stakingLogic"]
    staking = values["staking"]
    vestingFactory = values["vestingFactory"]
    vestingRegistry = values["vestingRegistry"]
    balanceBefore = acct.balance()
    oneAddress = "0x0000000000000000000000000000000000000001"

    if stakingLogic == "" or values["Reset"]:
        print("\nDeploying the staking logic...\n")
        stakingLogic = acct.deploy(Staking)
        values["stakingLogic"] = stakingLogic.address
    
    if staking == "" or values["Reset"]:
        print("Deploying the staking proxy...\n")
        staking = acct.deploy(StakingProxy, token)
        values["staking"] = str(staking)
    else:
        staking = Contract.from_abi("StakingProxy", address=values['staking'], abi=StakingProxy.abi, owner=acct)

    if staking.getImplementation() != stakingLogic.address:
        print("Setting the staking logic to proxy...\n")
        staking.setImplementation(stakingLogic.address)
        staking = Contract.from_abi("Staking", address=values["staking"], abi=Staking.abi, owner=acct)

    # TODO: This needs to be changed to Governor Vault or similar to receive the early stake withdrawal slashing amount.
    if staking.feeSharing() != values["multisig"]:
        print("Setting the Fee Sharing into multisig (TEMPORARY)...\n")
        staking.setFeeSharing(values["multisig"])

    if values["vestingLogic"] == "" or values["Reset"]:
        print("Deploying the vesting logic...\n")
        vestingLogic = acct.deploy(VestingLogic)
        values["vestingLogic"] = vestingLogic.address
    else:
        vestingLogic = Contract.from_abi("VestingLogic", address=values['vestingLogic'], abi=VestingLogic.abi, owner=acct)

    if values["vestingFactory"] == "" or values["Reset"]:
        print("Deploying the vesting factory...\n")
        vestingFactory = acct.deploy(VestingFactory, vestingLogic.address)
        values["vestingFactory"] = vestingFactory.address

    if values["vestingRegistry"] == "" or values["Reset"]:
        print("Deploying the vesting registry...\n")
        vestingRegistryLogic = acct.deploy(VestingRegistryLogic)
        values["vestingRegistryLogic"] = vestingRegistryLogic.address
        vestingRegistryProxy = acct.deploy(VestingRegistryProxy)
        vestingRegistryProxy.setImplementation(vestingRegistryLogic.address)
        vestingRegistry = Contract.from_abi(
            "VestingRegistryLogic",
            address=vestingRegistryProxy.address,
            abi=VestingRegistryLogic.abi,
            owner=acct)
        
        # Here the feeSharing should be set to Governor Vault
        # There is a teamVesting, whose owner should be multisig itself
        # `oneAddress` should be replaced with lockedFund during this step itself.
        vestingRegistry.initialize(vestingFactory.address, token, staking.address, multisig, multisig, oneAddress)

        vestingRegistryProxy.addAdmin(multisig)
        values["VestingRegistry"] = vestingRegistry.address

        print("Transfering ownership of vestingFactory to vestingRegistry...\n")
        vestingFactory.transferOwnership(vestingRegistry.address)
        
        values["vestingRegistry"] = vestingRegistry.address
        origins["vestingRegistry"] = vestingRegistry.address

    print("Almost finished, writing the values to json.")
    writeToJSON()
    balanceAfter = acct.balance()

    print("=============================================================")
    print("Balance Before:  ", balanceBefore)
    print("Balance After:   ", balanceAfter)
    print("Gas Used:        ", balanceBefore - balanceAfter)
    print("=============================================================")

# =========================================================================================================================================
def writeToJSON():
    if thisNetwork == "development":
        tokenHandle = open('./scripts/token/values/development.json', "w")
        originsHandle = open('./scripts/origins/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        tokenHandle = open('./scripts/token/values/testnet.json', "w")
        originsHandle = open('./scripts/origins/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet":
        tokenHandle = open('./scripts/token/values/mainnet.json', "w")
        originsHandle = open('./scripts/origins/values/mainnet.json', "w")
    json.dump(values, tokenHandle, indent=4)
    json.dump(origins, originsHandle, indent=4)
