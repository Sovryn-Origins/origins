from brownie import *

import time
import json
import csv
import math

def main():
    loadConfig()
    makeChoice()

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
    elif thisNetwork == "rsk-mainnet":
        acct = accounts.load("rskdeployer")
        configFile = open('./scripts/origins/values/mainnet.json')
    else:
        raise Exception("Network not supported.")

    # Load deployment parameters and contracts addresses
    values = json.load(configFile)

# =========================================================================================================================================
def makeChoice():
    balanceBefore = acct.balance()
    choice()
    balanceAfter = acct.balance()

    print("=============================================================")
    print("Balance Before:  ", balanceBefore)
    print("Balance After:   ", balanceAfter)
    print("Gas Used:        ", balanceBefore - balanceAfter)
    print("=============================================================")

# =========================================================================================================================================
def choice():
    repeat = True
    while(repeat):
        print("\nOptions:")
        print("1 for Deploying Locked Fund.")
        print("2 for Adding LockedFund as an Admin of Vesting Registry.")
        print("3 for Adding Origins as an Admin.")
        print("4 for Removing yourself as an Admin.")
        print("5 for Updating Vesting Registry.")
        print("6 for Updating waited timestamp.")
        print("7 to exit.")
        selection = int(input("Enter the choice: "))
        if(selection == 1):
            deployLockedFund()
        elif(selection == 2):
            addLockedFundAsVestingRegistryAdmin()
        elif(selection == 3):
            addOriginsAsAdmin()
        elif(selection == 4):
            removeMyselfAsAdmin()
        elif(selection == 5):
            updateVestingRegistry()
        elif(selection == 6):
            updateWaitedTS()
        elif(selection == 7):
            repeat = False
        else:
            print("\nSmarter people have written this, enter valid selection ;)\n")

# == Locked Fund Deployment ===============================================================================================================
def deployLockedFund():
    waitedTS = values['waitedTimestamp']
    if thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        waitedTS = int(time.time()) + (3*24*60*60)
    token = values['token']
    vestingRegistry = values['vestingRegistry']
    adminList = [values['multisig'], acct]

    print("\n=============================================================")
    print("Deployment Parameters for LockedFund")
    print("=============================================================")
    print("Waited Timestamp:    ", waitedTS)
    print("Token Address:       ", token)
    print("Vesting Registry:    ", vestingRegistry)
    print("Admin List:          ", adminList)
    print("=============================================================")

    lockedFund = acct.deploy(LockedFund, waitedTS, token, vestingRegistry, adminList)
    values['lockedFund'] = str(lockedFund.address)
    print("\nLocked Fund Deployed.")

    addLockedFundAsVestingRegistryAdmin()
    updateWaitedTS()

    writeToJSON()

# =========================================================================================================================================
def addLockedFundAsVestingRegistryAdmin():
    vestingRegistry = Contract.from_abi("VestingRegistryLogic", address=values['vestingRegistry'], abi=VestingRegistryLogic.abi, owner=acct)
    print("\nAdding LockedFund as an admin of Vesting Registry.\n")
    vestingRegistry.addAdmin(values['lockedFund'])
    print("\nAdded Locked Fund:",values['lockedFund'],"as the admin of Vesting Registry:", values['vestingRegistry'])

# =========================================================================================================================================
def addOriginsAsAdmin():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nAdding Origins as an admin to LockedFund...\n")
    lockedFund.addAdmin(values['origins'])
    print("Added Origins as", values['origins'], "as an admin of Locked Fund.")

# =========================================================================================================================================
def removeMyselfAsAdmin():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nRemoving myself as an admin to LockedFund...\n")
    lockedFund.removeAdmin(acct)
    print("Removed myself as", acct, "as an admin of Locked Fund.")

# =========================================================================================================================================
def updateVestingRegistry():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nUpdating Vesting Registry of LockedFund...\n")
    lockedFund.changeVestingRegistry(values['vestingRegistry'])
    print("Updated Vesting Registry as", values['vestingRegistry'], "of LockedFund...\n")

# =========================================================================================================================================
def updateWaitedTS():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nUpdating Waited Timestamp of LockedFund...\n")
    lockedFund.changeWaitedTS(values['waitedTimestamp'])
    print("Updated Waited Timestamp as", values['waitedTimestamp'], "of LockedFund...\n")

# =========================================================================================================================================
def updateWaitedTSMultisig():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nUpdating Waited Timestamp of LockedFund...\n")

    data = lockedFund.changeWaitedTS.encode_input(values['waitedTimestamp'])
    print(data)

    multisig = Contract.from_abi("MultiSig", address=contracts['multisig'], abi=MultiSigWallet.abi, owner=acct)
    tx = multisig.submitTransaction(lockedFund.address,0,data)
    txId = tx.events["Submission"]["transactionId"]
    print(txId)

    print("Updated Waited Timestamp as", values['waitedTimestamp'], "of LockedFund...\n")

# =========================================================================================================================================
def writeToJSON():
    if thisNetwork == "development":
        fileHandle = open('./scripts/origins/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        fileHandle = open('./scripts/origins/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet":
        fileHandle = open('./scripts/origins/values/mainnet.json', "w")
    json.dump(values, fileHandle, indent=4)

# =========================================================================================================================================
def waitTime():
    if(thisNetwork != "development"):
        print("\nWaiting for 30 seconds for the node to propogate correctly...\n")
        time.sleep(15)
        print("Just 15 more seconds...\n")
        time.sleep(10)
        print("5 more seconds I promise...\n")
        time.sleep(5)
