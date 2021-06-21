from brownie import *

import time
import json
import csv
import math

def main():
    loadConfig()

    balanceBefore = acct.balance()
    choice()
    balanceAfter = acct.balance()

    print("=============================================================")
    print("RSK Before Balance:  ", balanceBefore)
    print("RSK After Balance:   ", balanceAfter)
    print("Gas Used:            ", balanceBefore - balanceAfter)
    print("=============================================================")

# =========================================================================================================================================
def loadConfig():
    global values, acct, thisNetwork
    thisNetwork = network.show_active()

    if thisNetwork == "development":
        acct = accounts[0]
        configFile = open('./scripts/values/development.json')
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
        raise Exception("Network not supported.")

    # Load deployment parameters and contracts addresses
    values = json.load(configFile)

# =========================================================================================================================================
def choice():
    repeat = True
    while(repeat):
        print("\nOptions:")
        print("1 for Deploying Locked Fund.")
        print("2 for Adding Origins as an Admin.")
        print("3 for Removing yourself as an Admin.")
        print("4 for Updating Vesting Registry.")
        print("5 for Updating waited timestamp.")
        print("6 to exit.")
        selection = int(input("Enter the choice: "))
        if(selection == 1):
            deployLockedFund()
        elif(selection == 2):
            addOriginsAsAdmin()
        elif(selection == 3):
            removeMyselfAsAdmin()
        elif(selection == 4):
            updateVestingRegistry()
        elif(selection == 5):
            updateWaitedTS()
        elif(selection == 6):
            repeat = False
        else:
            print("\nSmarter people have written this, enter valid selection ;)\n")

# == Locked Fund Deployment ===============================================================================================================
def deployLockedFund():
    waitedTS = values['waitedTimestamp']
    if thisNetwork == "testnet" or thisNetwork == "rsk-testnet":
        waitedTS = int(time.time()) + (4*24*60*60)
    token = values['token']
    vestingRegistry = values['vestingRegistry']
    adminList = [values['multisig'], values['initialAdmin']]

    print("\n=============================================================")
    print("Deployment Parameters for LockedFund")
    print("=============================================================")
    print("Waited Timestamp:    ", waitedTS)
    print("Token Address:       ", token)
    print("Vesting Registry:    ", vestingRegistry)
    print("Admin List:          ", adminList)
    print("=============================================================")

    lockedFund = acct.deploy(LockedFund, waitedTS, token, vestingRegistry, adminList)

    values['lockedFund'] = str(lockedFund)
    writeToJSON()

# =========================================================================================================================================
def addOriginsAsAdmin():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nAdding Origins as an admin to LockedFund...\n")
    lockedFund.addAdmin(values['origins'])
    print("Added Origins as", values['origins'], " as an admin of Locked Fund.")

# =========================================================================================================================================
def removeMyselfAsAdmin():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nRemoving myself as an admin to LockedFund...\n")
    lockedFund.removeAdmin(acct)
    print("Removed myself as", acct, " as an admin of Locked Fund.")

# =========================================================================================================================================
def updateVestingRegistry():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nUpdating Vesting Registry of LockedFund...\n")
    lockedFund.changeVestingRegistry(values['vestingRegistry'])
    print("Updated Vesting Registry as", values['vestingRegistry'], " of LockedFund...\n")

# =========================================================================================================================================
def updateWaitedTS():
    lockedFund = Contract.from_abi("LockedFund", address=values['lockedFund'], abi=LockedFund.abi, owner=acct)
    print("\nUpdating Waited Timestamp of LockedFund...\n")
    lockedFund.changeWaitedTS(values['waitedTimestamp'])
    print("Updated Waited Timestamp as", values['waitedTimestamp'], " of LockedFund...\n")

# =========================================================================================================================================
def writeToJSON():
    if thisNetwork == "development":
        fileHandle = open('./scripts/values/development.json', "w")
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet":
        fileHandle = open('./scripts/values/testnet.json', "w")
    elif thisNetwork == "rsk-mainnet":
        fileHandle = open('./scripts/values/mainnet.json', "w")
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
