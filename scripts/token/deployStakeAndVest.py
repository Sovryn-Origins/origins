from brownie import *
import json

def main():
    loadConfig()

    balanceBefore = acct.balance()
    deployStakingAndVesting()
    balanceAfter = acct.balance()

    print("=============================================================")
    print("Balance Before:  ", balanceBefore)
    print("Balance After:   ", balanceAfter)
    print("Gas Used:        ", balanceBefore - balanceAfter)
    print("=============================================================")

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
    feeSharing = values["feeSharing"]

    print("\nDeploying the staking logic...\n")
    stakingLogic = acct.deploy(Staking)
    values["stakingLogic"] = str(stakingLogic)
    
    print("Deploying the staking proxy...\n")
    staking = acct.deploy(StakingProxy, token)
    values["staking"] = str(staking)

    print("Setting the staking logic to proxy...\n")
    staking.setImplementation(stakingLogic.address)
    staking = Contract.from_abi("Staking", address=staking.address, abi=Staking.abi, owner=acct)

    print("Setting the Fee Sharing into Staking...\n")
    staking.setFeeSharing(feeSharing)

    print("Deploying the vesting logic...\n")
    vestingLogic = acct.deploy(VestingLogic)
    values["vestingLogic"] = str(vestingLogic)

    print("Deploying the vesting factory...\n")
    vestingFactory = acct.deploy(VestingFactory, vestingLogic.address)
    values["vestingFactory"] = str(vestingFactory)

    print("Deploying the vesting registry...\n")
    vestingRegistry = acct.deploy(VestingRegistry3, vestingFactory.address, token, staking.address, feeSharing, multisig)
    values["vestingRegistry"] = str(vestingRegistry)
    origins["vestingRegistry"] = str(vestingRegistry)

    print("Almost finished, writing the values to json.")
    writeToJSON()

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
