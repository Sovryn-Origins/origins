# Script: Token

## Token Sale

Origins Platform requires a token for the sale. If the project for which the origins are used does not want to create their own token, this script can be used to create the token as well as it's corresponding governance, staking and vesting.

### Pre-requisite

Please fill the below details in mainnet.json (or the corresponding network JSON files):

- Token Parameters like Name, Symbol, Decimal and Amount in `tokenName, tokenSymbol, tokenDecimal and tokenAmount`.

IMPORTANT: Token Amount is multiplied by 10 raise to the number of decimals. So, if a token with 100 Million supply has to be created, the amount should be 100 Million and the decimals should be mentioned as required, the rest script will take care.

- Add multisig owners in `multisigOwners`.

- All the other values, including some of the values (token address) in origins folder of script gets populated automatically.

### Deployment

1. Run deploy_Token.py (Don't forget to transfer ownership of token after everything is done.)

```
brownie run scripts/token/deployToken.py --network [ENTER DESIRED NETWORK]
```

It will ask for a choice between deployment and transfer of ownership. Initially we select deployment. After running step 2, we can go forward to transferring ownership anytime we want.

The deployment will take:

- the token name from `tokenName`
- the token symbol from `tokenSymbol`
- the token amount from `tokenAmount`
- the decimals from `tokenDecimal`
  from the JSON files. `Amount * (10 ** Decimals)` will be done by the script.

It will also update the testnet/mainnet JSON file with the new contract addresses as well.

2. Run deploy_multisig.py

```
brownie run scripts/token/deployMultisig.py --network [ENTER DESIRED NETWORK]
```

NOTE: Before deploying, please make sure you add the correct key holders into `multisigOwners` in the JSON file based on the network.

The multisig will be the owner of Token when running the Transfer Ownership in `deployToken.py` also will be the owner of the Governance, Staking, etc.

3. Run deploy_stake_and_vest.py

```
brownie run scripts/token/deployStakeAndVest.py --network [ENTER DESIRED NETWORK]
```

This will create the staking and vesting.

Important: It does not deploy feeSharing, as for FISH sale the governance was not deployed, thus for feeSharing, the address is taken from JSON and a dummy address is passed.
