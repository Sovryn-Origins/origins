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
let waitedTS = 0;
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
let [firstSaleStartTS, firstSaleEnd, firstSaleEndDurationOrTS] = [0, 86400, saleEndDurationOrTSDuration];
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
	0,
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
async function currentTimestamp() {
	let timestamp = await time.latest();
	return timestamp;
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

contract("OriginsBase (Verifier Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic, originsBase;
	let creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr;
	let tierCount;

	before("Initiating Accounts & Creating Test Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 9, "Alteast 9 accounts are required to test the contracts.");
		[creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr] = accounts;

		let timestamp = await currentTimestamp();
		waitedTS = timestamp;
		firstSaleStartTS = timestamp;
		secondSaleStartTS = timestamp;

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking Instance.
		stakingLogic = await StakingLogic.new(token.address, { from: creator });
		staking = await StakingProxy.new(token.address, { from: creator });
		await staking.setImplementation(stakingLogic.address, { from: creator });
		staking = await StakingLogic.at(staking.address, { from: creator });

		// Creating the FeeSharing Instance.
		feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address, { from: creator });

		// Creating the Vesting Instance.
		vestingLogic = await VestingLogic.new({ from: creator });
		vestingFactory = await VestingFactory.new(vestingLogic.address, { from: creator });
		vestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator, // This should be Governance Timelock Contract.
			{ from: creator }
		);
		vestingFactory.transferOwnership(vestingRegistry.address, { from: creator });

		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner], { from: creator });

		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr, { from: creator });

		// Setting lockedFund in Origins.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });

		// Added Origins as an admin of LockedFund.
		await lockedFund.addAdmin(originsBase.address, { from: owner });

		// Setting Verifier in Origins.
		await originsBase.addVerifier(verifier, { from: owner });
	});

	beforeEach("Updating the timestamp and creating new Tier.", async () => {
		let timestamp = await currentTimestamp();
		firstSaleStartTS = timestamp;
		secondSaleStartTS = timestamp;

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

	it("Verifier should not be able to set deposit address.", async () => {
		await expectRevert(
			originsBase.setDepositAddress(newDepositAddr, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Locked Fund Contract.", async () => {
		let newLockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
		await expectRevert(
			originsBase.setLockedFund(newLockedFund.address, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to add a new tier.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.createTier(
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
				{ from: verifier }
			),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Tier Deposit Parameters.", async () => {
		await expectRevert(
			originsBase.setTierDeposit(tierCount, secondDepositRate, secondDepositToken, secondDepositType, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Tier Token Limit Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTokenLimit(tierCount, secondMinAmount, secondMaxAmount, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Tier Token Amount Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTokenAmount(tierCount, secondRemainingTokens, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Tier Vest or Lock Parameters.", async () => {
		await expectRevert(
			originsBase.setTierVestOrLock(
				tierCount,
				secondVestOrLockCliff,
				secondVestOfLockDuration,
				secondUnlockedBP,
				secondTransferType,
				{ from: verifier }
			),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should not be able to set Tier Time Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTime(tierCount, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: verifier }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Verifier should be able to verify a single address to a single tier.", async () => {
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
	});

	it("Verifier should not be able to verify a zero address to a single tier.", async () => {
		await expectRevert(
			originsBase.addressVerification(zeroAddress, tierCount, { from: verifier }),
			"OriginsBase: Address to be verified cannot be zero."
		);
	});

	it("Verifier should be able to verify a single address to a multiple tier.", async () => {
		await originsBase.singleAddressMultipleTierVerification(userOne, [tierCount, tierCount - 1, tierCount - 2], { from: verifier });
	});

	it("Verifier should be able to verify a multiple address to a single tier.", async () => {
		await originsBase.multipleAddressSingleTierVerification([userOne, userTwo, userThree], tierCount, { from: verifier });
	});

	it("Verifier should be able to verify a multiple address to a multiple tier.", async () => {
		await originsBase.multipleAddressAndTierVerification([userOne, userTwo, userThree], [tierCount, tierCount - 1, tierCount - 2], {
			from: verifier,
		});
	});

	it("Verifier should not be able to verify a multiple address of length x to a multiple tier of length y, where x != y.", async () => {
		await expectRevert(
			originsBase.multipleAddressAndTierVerification([userOne, userTwo, userThree], [tierCount, tierCount - 1], { from: verifier }),
			"OriginsBase: Address and Tier Array length mismatch."
		);
	});
});
