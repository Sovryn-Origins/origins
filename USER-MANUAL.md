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

[Development: /scripts/origins/values/development.json](/scripts/origins/values/development.json)

[Testnet: /scripts/origins/values/testnet.json](/scripts/origins/values/testnet.json)

[Mainnet: /scripts/origins/values/mainnet.json](/scripts/origins/values/mainnet.json)

