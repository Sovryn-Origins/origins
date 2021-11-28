from brownie import *
import json

def main():
    loadConfig()

    # Function Call
    deployOriginsDepositAddressMultisig()

# =========================================================================================================================================
def loadConfig():
    global values, acct, thisNetwork
    thisNetwork = network.show_active()

    if thisNetwork == "development":
        acct = accounts[0]
        configFile = open('./scripts/origins/values/development.json')
    elif thisNetwork == "testnet" or thisNetwork == "testnet-ws":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/origins/values/testnet.json')
    elif thisNetwork == "rsk-testnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/origins/values/testnet.json')
    elif thisNetwork == "rsk-mainnet" or thisNetwork == "mainnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/origins/values/mainnet.json')
    else:
        raise Exception("Network not supported")

    # Load values & deployed contracts addresses.
    values = json.load(configFile)

# == Multisig Deployment ==================================================================================================================
def deployOriginsDepositAddressMultisig():
    balanceBefore = acct.balance()
    owners = values["multisigDepositAddressOwners"]
    requiredConf = 1
    if network.show_active() == "rsk-mainnet" or network.show_active() == "mainnet":
        requiredConf = int(len(owners)/2 + 1)
    print("=============================================================")
    print("Deployment Parameters")
    print("=============================================================")
    print("Multisig Deposit Owners:         ", owners)
    print("Required Confirmations:  ", requiredConf)
    print("=============================================================")

    print("Deploying the Deposit Owner multisig...\n")
    multisig = acct.deploy(MultiSigWallet, owners, requiredConf)
    print("=============================================================")
    print("Deployed Details")
    print("=============================================================")
    print("Deposit Owner Multisig Address:        ", multisig)
    print("=============================================================")

    # Updating the JSON Values.    
    values["depositAddress"] = multisig.address
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
        fileHandle = open('./scripts/origins/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        fileHandle = open('./scripts/origins/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet" or thisNetwork == "mainnet":
        fileHandle = open('./scripts/origins/values/mainnet.json', "w")
    json.dump(values, fileHandle, indent=4)
