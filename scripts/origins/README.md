# Script: Origins

## Origins Platform

These are the scripts which will be used to deploy the Origins Platform.

## Prerequisite

Please fill the below details in mainnet.json (or the corresponding network JSON files):

- Multisig Owners in `multisigOwners`
- Verifier in `originsVerifiers`, this address will be adding the address list which has to be verified to a particular tier.
- Deposit Address in `multisigDepositAddress`, this address will receive the sale proceedings from the sale. Recommended to use a multisig provided by the Token Owners.
- Token Release Time in `waitedTimestamp`, after this time, users who bought tokens in any tier with Transfer Type of Sale anything apart from `Unlocked` will be able to claim/vest their token in Locked Fund Contract.
- `vestOrLockCliff` and `vestOrLockDuration` is mentioned in 4 weeks time period. So, if it is mention as `1`, then that means `1 * 4 weeks` is stored in the smart contract.
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

6. (Optional, this is already done in Step 3) Set the origins as an admin of Locked Fund. Similar to above, running the `deployLockedFund` will show an option for the same.

7. Now to create tier, you can select the option of Create Tier in the origins script. It will ask for the index, provide that based on the values file tier detail entry.

8. Other things to do after things are deployed:
   - If the verification type is `ByAddress` (Optional):
     - Add yourself as a Verifier to verify address.
     - Verify Addresses, if the verification type is `ByAddress`. (TODO: Currently it takes all the addresses at once and tries to verify, need to sequentialize that to take X number of wallets at once. A CSV parsed sequential list taker has to be built.)
     - Remove yourself as a Verifier.
   - Remove yourself as an Owner of Origins Platform.
   - Remove yourself as an Owner of Locked Fund.

Note: There are many other options for the Origins Script, and best to look to it for more in depth detail about each step.
