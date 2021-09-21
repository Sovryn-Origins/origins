# Origins

The Origins Platform Smart Contracts Users Manual

## Intro

Sovryn Origins platform is designed to create new Origins token sales or add a new sale to the earlier created Origins.  
To do that one needs to

1. Create a separate git branch for a new token Origins sale or open an existing branch to add tier (new token sale).
2. Input settings files with relevant data - token or multisig wallet addresses if exist (if no then new ones will be created), exchange rate for the sale, whilelisting addresses etc.
3. Run a series of scripts which will perform necessary deployments and setups (token, multisig wallets, addresses whitelisting etc, set ownerships etc.).
4. One also will need to transfer ownership of key contracts (Token, Origins etc) to multisig (most probably) wallets of actual owners and sign off himself from ownership and admin roles from relevant contracts before sale starts.

Details of the above steps are below.

## Workflow

1. Deploy & setup token related contracts - `scripts/token` folder
   - Input relevant values in `scripts/token/values` into the corresponding .json file (testnet, mainnet or development for local test deployment)
     - `TODO`: detailed description of the field, link to a sample doc with description
   - Run python scripts to deploy token related contracts - token, vesting and staking contracts, multisig as the token owner
     - `TODO`: description of the script key options, order of execution, dependencies.
2. Deploy & setup Origins/sales related contracts - `scripts/origins` folder
   - Input relevant values in `scripts/origins/values` into the corresponding .json file (testnet, mainnet or development for local test deployment)
     - `TODO`: detailed description of the field, link to a sample doc with description
   - Run python scripts to deploy origins related contracts - Origins, LockedFund and multisig as owner of these
     - `TODO`: description of the scripts key options, order of execution, dependencies.

## Settings files

[testnet: /scripts/origins/values/testnet.json](/scripts/origins/values/testnet.json)

- Admin has a lot of power, and is assumed to be the right, fair and just person/party. It is highly advised to have a multisig as admin, rather than just a EOA.

## Limitations

- If the deposit asset price is lower than the token which is sold, currently that is not possible with this system. A simple solution is to have a divisor constant or a numerator & denominator system instead of the rate system.
- LockedFund can only have a single cliff and duration per person. Tier based system would be much better when the vesting registry is updated (waiting for a PR to be merged in Sovryn).
- Address can only be validated, and cannot be invalidated. Adding a simple function should suffice. To be done in the next update.

## TODOs

- NFT Based Sale.
- Decoupling Tier for lesser gas usage and minimize the stack too deep error.
- Fee for use of Origins platform (Contracts, UI and Setup).
- Maybe a single contract can act as the platform if instead of different tiers based on ID, the tiers are based on token address (which is to be sold), thus having multiple tiers based on that. So, a single contract can handle multiple sales at once with multiple tiers. This can only be done after struct decoupling and gas profiling of each function and possible gas saving methods added.
- Total unique wallets participated in all tiers. Currently only unique wallets participated in a each tier is counted, which is not the same as unique wallets participated in all tiers combined. New storage structure will be required.
- Tests related to other type of sales to be added.
- Reduce the reason string text size, or use a numbering system with errors in mainly LockedFund and OriginsBase.
- `saleEndDurationOrTS` in OriginsBase has little upside for storing and might be removable in the future.
