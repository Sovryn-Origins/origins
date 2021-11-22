const {
	// External Functions
	expectRevert,
	assert,
	// Custom Functions
	currentTimestamp,
	createStakeVestAndLockedFund,
	// Contract Artifacts
	Token,
	LockedFund,
	OriginsBase,
} = require("../utils");

const { zero, zeroAddress } = require("../constants");

let {
	waitedTS,
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
	secondSaleEndDurationOrTS,
	secondTransferType,
} = require("../variable");

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

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, vestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [owner]);

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
