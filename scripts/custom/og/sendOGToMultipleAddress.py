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

    MULTIPLIER = 10**18
    OGToken = Contract.from_abi("Token", address=contracts["OGToken"], abi=Token.abi, owner=acct)
    tokenSender = Contract.from_abi("TokenSender", address=contracts["TokenSender"], abi=TokenSender.abi, owner=acct)

    # == OG Token Transfer ===============================================================================================================================
    print("OG Token Balance: ", OGToken.balanceOf(acct))

    receivers = [
        "0x2b6a4e5b0f648fbca778c2e3f6d59d2f2ce6cbda",
        "0x44a7da048d4216a8edc944985b839b25aa9e6293",
        "0x0f39e7af6810a2b73a973c3167755930b1266811",
        "0x566f961081921045b32e2ebe0420eb77d74d2022",
        "0x9cf4cc7185e957c63f0ba6a4d793f594c702ad66",
        "0x61e1eac4064564889a093ebc9939b118d5b8d415"
    ]
    amounts = [
        500*MULTIPLIER,
        500*MULTIPLIER,
        500*MULTIPLIER,
        500*MULTIPLIER,
        500*MULTIPLIER,
        500*MULTIPLIER
    ]

    print("Total Amount Being Sent: ", sum(amounts))

    print("Sending Token to addresses...")
    OGToken.transfer(tokenSender.address, sum(amounts))
    tokenSender.transferSOVusingList(receivers, amounts)

    print("OG Token Balance: ", OGToken.balanceOf(acct))

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
