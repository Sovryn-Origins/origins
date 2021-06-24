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
	time,
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
let [
	secondMinAmount,
	secondMaxAmount,
	secondRemainingTokens,
	secondSaleStartTS,
	secondSaleEnd,
	secondUnlockedBP,
	secondVestOrLockCliff,
	secondVestOfLockDuration,
	secondDepositRate,
	secondDepositToken,
	secondDepositType,
	secondVerificationType,
	secondSaleEndDurationOrTS,
	secondTransferType,
] = [
	1,
	new BN(75000),
	new BN(10000000),
	currentTimestamp(),
	86400,
	5000,
	1,
	11,
	50,
	zeroAddress,
	depositTypeRBTC,
	verificationTypeEveryone,
	saleEndDurationOrTSDuration,
	transferTypeVested,
];

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

		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr);

		// Setting lockedFund in Origins.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });

		// Added Origins as an admin of LockedFund.
		await lockedFund.addAdmin(originsBase.address, { from: owner });

		// Setting Verifier in Origins.
		await originsBase.addVerifier(verifier, { from: owner });

		// Creating a new tier.
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
	});

	beforeEach("Creating New OriginsBase Contract Instance.", async () => {});

	it("User should be able to buy tokens.", async () => {
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
	});

	it("User should be able to buy tokens multiple times until max asset amount reaches.", async () => {
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
	});

	it("User should be allowed to buy until the max reaches.", async () => {
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await expectRevert(
			originsBase.buy(tierCount, zero, { from: userOne, value: amount }),
			"OriginsBase: User already bought maximum allowed."
		);
	});

	it("User should not be allowed to buy if sale start time is not set.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			zero,
			currentTimestamp() + 1000,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			saleEndDurationOrTSDuration,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		let amount = 10000;
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: Sale has not started yet.");
	});

	it("User should not be allowed to buy if the token sale has ended.", async () => {
		let amount = 100;
		await token.mint(owner, amount);
		await token.approve(originsBase.address, amount, { from: owner });
		await originsBase.createTier(
			amount,
			amount,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			1,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userTwo, value: amount }), "OriginsBase: Sale ended.");
	});

	it("User should not be allowed to buy if sale end is not set.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if total tokens are sold.", async () => {
		let amount = 100;
		await token.mint(owner, amount);
		await token.approve(originsBase.address, amount, { from: owner });
		await originsBase.createTier(
			amount / 2,
			amount,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			1,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount / 2 });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount / 2 });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userThree, value: amount / 2 }), "OriginsBase: Sale ended.");
	});

	it("User should not be allowed to buy if Verification is not set.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			verificationTypeNone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: No one is allowed for sale.");
	});

	it("If verification is done by address, user should only be allowed if it is done by verified address.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: User not approved for sale.");
	});

	it("User should not be allowed to buy once the max reaches even if there is remaining tokens.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		let amount = 25000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		amount = 5000;
		await expectRevert(
			originsBase.buy(tierCount, zero, { from: userOne, value: amount }),
			"OriginsBase: User already bought maximum allowed."
		);
		// Though any other user can still buy.
		amount = 5000;
		await token.approve(originsBase.address, amount, { from: userTwo });
	});

	it("User should not be allowed to buy tokens with zero deposit in RBTC", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: zero }), "OriginsBase: Amount cannot be zero.");
	});

	it("User should not be allowed to buy with assets deposited less than minimum allowed.", async () => {
		let amount = 1000;
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierTokenLimit(tierCount, 10000, firstMaxAmount, { from: owner });
		await expectRevert(
			originsBase.buy(tierCount, zero, { from: userOne, value: amount }),
			"OriginsBase: Deposit is less than minimum allowed."
		);
	});
});
