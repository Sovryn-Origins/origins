const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
const OriginsBase = artifacts.require("OriginsBase");
const StakingLogic = artifacts.require("Staking");
const StakingProxy = artifacts.require("StakingProxy");
const FeeSharingProxy = artifacts.require("FeeSharingProxyMockup");
const VestingLogic = artifacts.require("VestingLogic");
const VestingFactory = artifacts.require("VestingFactory");
const VestingRegistry = artifacts.require("VestingRegistry3");

const {
	BN, // Big Number support.
	constants,
	expectRevert, // Assertions for transactions that should fail.
} = require("@openzeppelin/test-helpers");
const { current } = require("@openzeppelin/test-helpers/src/balance");

const { assert } = require("chai");

// Some constants we would be using in the contract.
let zero = new BN(0);
let zeroAddress = constants.ZERO_ADDRESS;
let cliff = 1; // This is in 4 weeks. i.e. 1 * 4 weeks.
let duration = 11; // This is in 4 weeks. i.e. 11 * 4 weeks.
let zeroBasisPoint = 0;
let twentyBasisPoint = 2000;
let fiftyBasisPoint = 5000;
let hundredBasisPoint = 10000;
let invalidBasisPoint = 10001;
let waitedTS = currentTimestamp();
let depositTypeRBTC = 0;
let depositTypeToken = 1;
let saleEndDurationOrTSNone = 0;
let saleEndDurationOrTSUntilSupply = 1;
let saleEndDurationOrTSDuration = 2;
let saleEndDurationOrTSTimestamp = 3;
let verificationTypeNone = 0;
let verificationTypeEveryone = 1;
let verificationTypeByAddress = 2;
let transferTypeNone = 0;
let transferTypeUnlocked = 1;
let transferTypeWaitedUnlock = 2;
let transferTypeVested = 3;
let transferTypeLocked = 4;
let firstVerificationType = verificationTypeByAddress;
let [firstDepositRate, firstDepositToken, firstDepositType] = [100, zeroAddress, depositTypeRBTC];
let firstMinAmount = 1;
let firstMaxAmount = new BN(50000);
let firstRemainingTokens = new BN(6000000);
let [firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstTransferType] = [0, 1, 11, transferTypeVested];
let [firstSaleStartTS, firstSaleEnd, firstSaleEndDurationOrTS] = [currentTimestamp(), 86400, saleEndDurationOrTSDuration];
let [secondMinAmount, secondMaxAmount, secondRemainingTokens, secondSaleStartTS, secondSaleEnd, secondUnlockedBP, secondVestOrLockCliff, secondVestOfLockDuration, secondDepositRate, secondDepositToken, secondDepositType, secondVerificationType, secondSaleEndDurationOrTS, secondTransferType] = [1, new BN(75000), new BN(10000000), currentTimestamp(), 86400, 5000, 1, 11, 50, zeroAddress, depositTypeRBTC, verificationTypeEveryone, saleEndDurationOrTSDuration, transferTypeVested];

/**
 * Function to create a random value.
 * It expects no parameter.
 *
 * @return {number} Random Value.
 */
function randomValue() {
	return Math.floor(Math.random() * 10000) + 10000;
}

/**
 * Function to get back the current timestamp in seconds.
 * It expects no parameter.
 *
 * @return {number} Current Unix Timestamp.
 */
function currentTimestamp() {
	return Math.floor(Date.now() / 1000);
}

/**
 * Mints random token for user account and then approve a contract.
 *
 * @param tokenContract The Token Contract.
 * @param userAddr User Address.
 * @param toApprove User Address who is approved.
 *
 * @returns value The token amount which was minted by user.
 */
 async function userMintAndApprove(tokenContract, userAddr, toApprove) {
	let value = randomValue();
	await tokenContract.mint(userAddr, value);
	await tokenContract.approve(toApprove, value, { from: userAddr });
	return value;
}

contract("OriginsBase (Admin Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic, originsBase;
	let creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr;
    let tierCount;

	before("Initiating Accounts & Creating Test Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 9, "Alteast 9 accounts are required to test the contracts.");
		[creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr] = accounts;

		// Creating the instance of Test Token.
		token = await Token.new(zero);

		// Creating the Staking Instance.
		stakingLogic = await StakingLogic.new(token.address);
		staking = await StakingProxy.new(token.address);
		await staking.setImplementation(stakingLogic.address);
		staking = await StakingLogic.at(staking.address);

		// Creating the FeeSharing Instance.
		feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address);

		// Creating the Vesting Instance.
		vestingLogic = await VestingLogic.new();
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		vestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(vestingRegistry.address);

        // Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
	});

	beforeEach("Creating New OriginsBase Contract Instance.", async () => {
		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr);

		// Setting lockedFund in Origins.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });

        // Added Origins as an admin of LockedFund.
        await lockedFund.addAdmin(originsBase.address, { from: owner });
	});

	it("Owner should be able to set deposit address.", async () => {
		await originsBase.setDepositAddress(newDepositAddr, { from: owner });
	});

	it("Owner should not be able to add zero address as deposit address.", async () => {
		await expectRevert(originsBase.setDepositAddress(zeroAddress, { from: owner }), "OriginsBase: Deposit Address cannot be zero.");
	});

	it("Owner should be able to set Locked Fund Contract.", async () => {
		let newLockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
		await originsBase.setLockedFund(newLockedFund.address, { from: owner });
	});

	it("Owner should not be able to add zero address as Locked Fund Contract.", async () => {
		await expectRevert(originsBase.setLockedFund(zeroAddress, { from: owner }), "OriginsBase: Locked Fund Address cannot be zero.");
	});

    it("Owner should be able to add a new tier.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
    });

    it("Owner should be able to set Tier Verification Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await originsBase.setTierVerification(1, secondVerificationType, { from: owner });
    });

    it("Owner should be able to set Tier Deposit Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await originsBase.setTierDeposit(1, secondDepositRate, secondDepositToken, secondDepositType, { from: owner });
    });

    it("Owner should not be able to set Tier Deposit Parameters with deposit rate as zero.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierDeposit(1, zero, secondDepositToken, secondDepositType, { from: owner }), "OriginsBase: Deposit Rate cannot be zero.");
    });

    it("Owner should not be able to set Tier Deposit Parameters with deposit token as zero address if deposit type is Token.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierDeposit(1, secondDepositRate, zeroAddress, depositTypeToken, { from: owner }), "OriginsBase: Deposit Token Address cannot be zero.");
    });

    it("Owner should be able to set Tier Token Limit Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await originsBase.setTierTokenLimit(1, secondMinAmount, secondMaxAmount, { from: owner });
    });

    it("Owner should not be able to set Tier Token Limit Parameters with minimum is greater than maximum amount.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierTokenLimit(1, secondMaxAmount, secondMinAmount, { from: owner }), "OriginsBase: Min Amount cannot be higher than Max Amount.");
    });

    it("Owner should be able to set Tier Token Amount Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await token.mint(owner, secondRemainingTokens);
        await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
        await originsBase.setTierTokenAmount(1, secondRemainingTokens, { from: owner });
    });

    it("Owner should not be able to set Tier Token Amount Parameters with remaining token as zero.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierTokenAmount(1, zero, { from: owner }), "OriginsBase: Total token to sell should be higher than zero.");
    });

    it("Owner should not be able to set Tier Token Amount Parameters with max allowed is higher than remaining token.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierTokenAmount(1, 1, { from: owner }), "OriginsBase: Max Amount to buy should not be higher than token availability.");
    });

    it("Owner should be able to set Tier Vest or Lock Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await originsBase.setTierVestOrLock(1, secondVestOrLockCliff, secondVestOfLockDuration, waitedTS, secondUnlockedBP, secondTransferType, { from: owner });
    });

    it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierVestOrLock(1, secondVestOfLockDuration, secondVestOrLockCliff, waitedTS, secondUnlockedBP, secondTransferType, { from: owner }), "OriginsBase: Cliff has to be <= duration.");
    });

    it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierVestOrLock(1, secondVestOrLockCliff, secondVestOfLockDuration, waitedTS, invalidBasisPoint, secondTransferType, { from: owner }), "OriginsBase: The basis point cannot be higher than 10K.");
    });

    it("Owner should be able to set Tier Time Parameters.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await originsBase.setTierTime(1, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: owner });
    });

    it("Owner should not be able to set Tier Time Parameters with sale start timestamp is higher than sale end timestamp.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierTime(1, secondSaleStartTS, secondSaleStartTS, saleEndDurationOrTSTimestamp, { from: owner }), "OriginsBase: The sale start TS cannot be after sale end TS.");
    });

    it("Owner should not be able to set Tier Time Parameters with sale start timestamp is higher than sale end timestamp.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, firstVerificationType, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        await expectRevert(originsBase.setTierTime(1, currentTimestamp() - 1000, currentTimestamp() - 100, saleEndDurationOrTSTimestamp, { from: owner }), "OriginsBase: The sale end duration cannot be past already.");
    });

    it("Owner should be able to withdraw the sale deposit to deposit address.", async () => {
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, verificationTypeEveryone, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        tierCount = await originsBase.getTierCount();
        let amount = 20000;
        await token.mint(userOne, amount);
        await token.approve(originsBase.address, amount, { from: userOne });
        await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
        amount = 20000;
        await token.mint(userTwo, amount);
        await token.approve(originsBase.address, amount, { from: userTwo });
        await originsBase.buy(tierCount, zero, { from: userTwo, value: amount });
        amount = 20000;
        await token.mint(userThree, amount);
        await token.approve(originsBase.address, amount, { from: userThree });
        await originsBase.buy(tierCount, zero, { from: userThree, value: amount });
        await originsBase.withdrawSaleDeposit({ from: owner });
    });

    it("Owner should be able to withdraw the sale deposit to own address if deposit address is not set.", async () => {
		originsBase = await OriginsBase.new([owner], token.address, zeroAddress);
		await originsBase.setLockedFund(lockedFund.address, { from: owner });
        await lockedFund.addAdmin(originsBase.address, { from: owner });
        await token.mint(owner, firstRemainingTokens);
        await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
        await originsBase.createTier(firstMaxAmount, firstRemainingTokens, firstSaleStartTS, firstSaleEnd, firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstDepositRate, firstDepositType, verificationTypeEveryone, firstSaleEndDurationOrTS, firstTransferType, { from: owner });
        tierCount = await originsBase.getTierCount();
        let amount = 20000;
        await token.mint(userOne, amount);
        await token.approve(originsBase.address, amount, { from: userOne });
        await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
        amount = 20000;
        await token.mint(userTwo, amount);
        await token.approve(originsBase.address, amount, { from: userTwo });
        await originsBase.buy(tierCount, zero, { from: userTwo, value: amount });
        amount = 20000;
        await token.mint(userThree, amount);
        await token.approve(originsBase.address, amount, { from: userThree });
        await originsBase.buy(tierCount, zero, { from: userThree, value: amount });
        await originsBase.withdrawSaleDeposit({ from: owner });
    });

});
