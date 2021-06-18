from brownie import *
import json

def main():
    loadConfig()

    balanceBefore = acct.balance()
    # Function Call
    deployMultisig()
    balanceAfter = acct.balance()

    print("=============================================================")
    print("ETH Before Balance:  ", balanceBefore)
    print("ETH After Balance:   ", balanceAfter)
    print("Gas Used:            ", balanceBefore - balanceAfter)
    print("=============================================================")

# =========================================================================================================================================
def loadConfig():
    global values, acct, thisNetwork
    thisNetwork = network.show_active()

    if thisNetwork == "development":
        acct = accounts[0]
        configFile = open('./scripts/values/testnet.json')
    elif thisNetwork == "testnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/values/testnet.json')
    elif thisNetwork == "rsk-testnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/values/testnet.json')
    elif thisNetwork == "rsk-mainnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/values/mainnet.json')
    else:
        raise Exception("Network not supported")

    # Load values & deployed contracts addresses.
    values = json.load(configFile)

# == Multisig Deployment ==================================================================================================================
def deployMultisig():
    owners = values["multisigOwners"]
    requiredConf = 1
    if network.show_active() == "mainnet":
        requiredConf = int(len(owners)/2 + 1)
    print("=============================================================")
    print("Deployment Parameters")
    print("=============================================================")
    print("Multisig Owners:         ", owners)
    print("Required Confirmations:  ", requiredConf)
    print("=============================================================")

    print("Deploying the multisig...\n")
    multisig = acct.deploy(MultiSigWallet, owners, requiredConf)
    print("=============================================================")
    print("Deployed Details")
    print("=============================================================")
    print("Multisig Address:        ", multisig)
    print("=============================================================")

    # Updating the JSON Values.    
    values["multisig"] = str(multisig)
    writeToJSON()

# =========================================================================================================================================
def writeToJSON():
    if thisNetwork == "testnet" or thisNetwork == "rsk-testnet":
        fileHandle = open('./scripts/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet":
        fileHandle = open('./scripts/values/mainnet.json', "w")
    json.dump(values, fileHandle, indent=4)
