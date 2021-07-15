## Prerequisite

Please fill the below details in mainnet.json (or the corresponding network JSON files):
- Token Contract in `token` (If not already added by the `deploy_Token.py` script)
- Token Decimals in `decimal` (If not already added by the `deploy_Token.py` script)
- Multisig Owners in `multisigOwners`
- Initial Admin in `initialAdmin`, this should be the EOA which runs this script. Don't forget to remove yourself as an admin. It is recommended to use a multisig as the sole admin after initial setup.
- Verifier in `originsVerifiers`, this address will be adding the address list which has to be verified to a particular tier.
- Deposit Address in `depositAddress`, this address will receive the sale proceedings from the sale. Recommended to use a multisig provided by the Token Owners.
- Token Release Time in `waitedTimestamp`, after this time, users who bought tokens in any tier with Transfer Type of Sale anything apart from `Unlocked` will be able to claim/vest their token in Locked Fund Contract.
- Populate the tiers as per the tier details.

## Steps:

1. Create a multisig, if not already created. If already created, please add that to `multisig` in the JSON file to the corresponding network.

To create:

```
brownie run scripts/origins/deployMultisig.py --network [ENTER DESIRED NETWORK]
```

2. Create the Locked Fund Contract.

To create:

```
brownie run scripts/origins/deployLockedFund.py --network [ENTER DESIRED NETWORK]
```

Then select the correct option to deploy Locked Fund Contract.

3. Create the Origins Platform.

To create:

```
brownie run scripts/origins/deployOrigins.py --network [ENTER DESIRED NETWORK]
```

Then select the correct option to deploy Origins.

4. Once the Origins is created, tiers has to be created. And required things to be set. There is an option when running `deployOrigins` to create tier. Select that, and add the tier ID based on JSON to add the tier in smart contract.

5. Set the `waitedTS` of Locked Fund. Running the `deployLockedFund` will show an option for the same.

6. Set the origins as an admin of Locked Fund. Similar to above, running the `deployLockedFund` will show an option for the same.

7. Other things to do after things are deployed:
    - If the verification type is `ByAddress` (Optional):
        - Add yourself as a Verifier to verify address.
        - Verify Addresses, if the verification type is `ByAddress`. (Currently it takes all the addresses at once and tries to verify, need to sequentialize that to take X number of wallets at once. A CSV parsed sequential list taker has to be built.)
        - Remove yourself as a whitelister.
    - Remove yourself as an Owner of Origins Platform.
    - Remove yourself as an Owner of Locked Fund.