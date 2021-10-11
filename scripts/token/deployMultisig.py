from brownie import *
import json

def main():
    loadConfig()

    # balanceBefore = acct.balance()
    deployMultisig()
    # balanceAfter = acct.balance()

    # print("=============================================================")
    # print("Balance Before:  ", balanceBefore)
    # print("Balance After:   ", balanceAfter)
    # print("Gas Used:        ", balanceBefore - balanceAfter)
    # print("=============================================================")

# =========================================================================================================================================
def loadConfig():
    global values, acct, thisNetwork
    thisNetwork = network.show_active()

    if thisNetwork == "development":
        acct = accounts[0]
        configFile = open('./scripts/token/values/development.json')
    elif thisNetwork == "testnet" or thisNetwork == "testnet-ws":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/testnet.json')
    elif thisNetwork == "rsk-testnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/testnet.json')
    elif thisNetwork == "rsk-mainnet" or thisNetwork == "mainnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/token/values/mainnet.json')
    else:
        raise Exception("Network not supported")

    # Load values & deployed contracts addresses.
    values = json.load(configFile)

# =========================================================================================================================================
def deployMultisig():
    owners = values["multisigOwners"]
    if network.show_active() == "development":
        owners[0] = acct.address
    requiredConf = 1
    if network.show_active() == "rsk-mainnet" or network.show_active() == "mainnet":
        requiredConf = int(len(owners)/2 + 1)
    print("=============================================================")
    print("Deployment Parameters")
    print("=============================================================")
    print("Multisig Owners:         ", owners)
    print("Required Confirmations:  ", requiredConf)
    print("=============================================================")

    multisig = acct.deploy(MultiSigWallet, owners, requiredConf)
    print("=============================================================")
    print("Deployed Details")
    print("=============================================================")
    print("Multisig Address:        ", multisig)
    print("=============================================================")
    values["multisig"] = str(multisig)
    writeToJSON()

# =========================================================================================================================================
def writeToJSON():
    if thisNetwork == "development":
        fileHandle = open('./scripts/token/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        fileHandle = open('./scripts/token/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet" or thisNetwork == "mainnet":
        fileHandle = open('./scripts/token/values/mainnet.json', "w")
    json.dump(values, fileHandle, indent=4)
