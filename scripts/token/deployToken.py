from brownie import *
import json
import time

def main():
    loadConfig()
    makeChoice()

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
        print("Options:")
        print("1 for Deploying Token.")
        print("2 for Transfering Token Ownership to multisig.")
        print("3 to exit.")
        selection = int(input("Enter the choice: "))
        if(selection == 1):
            deployToken()
        elif(selection == 2):
            transferTokenOwnership()
        elif(selection == 3):
            repeat = False
        else:
            print("Smarter people have written this, enter valid selection ;)\n")

# =========================================================================================================================================
def deployToken():
    tokenName = values["tokenName"]
    tokenSymbol = values["tokenSymbol"]
    tokenDecimal = int(values["tokenDecimal"])
    tokenAmount = int(values["tokenAmount"]) * (10 ** tokenDecimal)
    print("=============================================================")
    print("Deployment Parameters")
    print("=============================================================")
    print("Token Name:                      ", tokenName)
    print("Token Symbol:                    ", tokenSymbol)
    print("Token Decimal:                   ", tokenDecimal)
    print("Token Balance with Decimal:      ", tokenAmount/(10 ** tokenDecimal))
    print("Token Balance without Decimal:   ", tokenAmount)
    print("=============================================================")

    print("Deploying the Token with the above parameters...")
    TokenObj = acct.deploy(Token, tokenAmount, tokenName, tokenSymbol, tokenDecimal)
    waitTime()
    tokenAmount = TokenObj.balanceOf(acct)
    print("=============================================================")
    print("Deployed Details")
    print("=============================================================")
    print("Token Address:                   ", TokenObj)
    print("Token Balance with Decimal:      ", tokenAmount/(10 ** tokenDecimal))
    print("Token Balance without Decimal:   ", tokenAmount)
    print("=============================================================")
    values["token"] = str(TokenObj)
    origins["token"] = str(TokenObj)
    origins["decimal"] = values["tokenDecimal"]
    writeToJSON()


# =========================================================================================================================================
def transferTokenOwnership():
    tokenAddress = values["token"]
    multisig = values["multisig"]
    TokenObj = Contract.from_abi("Staking", address=tokenAddress, abi=Token.abi, owner=acct)
    print("Current Token Owner of:", tokenAddress, "is", TokenObj.owner())
    TokenObj.transferOwnership(multisig)
    #TODO: Add transferring balance too.
    waitTime()
    print("New Token Owner of:", tokenAddress, "is", TokenObj.owner())

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

# =========================================================================================================================================
def waitTime():
    if(thisNetwork != "development"):
        print("\nWaiting for 30 seconds for the node to propogate correctly...\n")
        time.sleep(15)
        print("Just 15 more seconds...\n")
        time.sleep(10)
        print("5 more seconds I promise...\n")
        time.sleep(5)
