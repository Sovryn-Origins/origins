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
    elif thisNetwork == "testnet" or thisNetwork == "rsk-testnet" or thisNetwork == "testnet-ws":
        acct = accounts.load("rskdeployer")
        configFile =  open('./scripts/custom/og/values/testnet.json')
    elif thisNetwork == "rsk-mainnet":
        acct = accounts.load("rskdeployer")
        configFile =  open('./scripts/custom/og/values/mainnet.json')
    else:
        raise Exception("network not supported")

    # Load deployed contracts addresses
    contracts = json.load(configFile)

    balanceBefore = acct.balance()
    OGToken = Contract.from_abi("Token", address=contracts["OGToken"], abi=Token.abi, owner=acct)

    # == Deploy Token Sender ===============================================================================================================================
    if(contracts["TokenSender"] == '' or contracts["Reset"]):
        tokenSender = acct.deploy(TokenSender, OGToken.address)
        contracts["TokenSender"] = tokenSender.address
        writeToJSON(contracts)
    else:
        tokenSender = Contract.from_abi("TokenSender", address=contracts["TokenSender"], abi=TokenSender.abi, owner=acct)
        print("TokenSender already deployed at:",tokenSender.address)

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
