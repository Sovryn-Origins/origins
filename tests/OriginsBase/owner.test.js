const {
	// External Functions
	BN,
	constants,
	expectRevert,
	expectEvent,
	time,
	balance,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeAndVest,
	checkStatus,
	getTokenBalances,
	userMintAndApprove,
	checkTier,
	// Contract Artifacts
	Token,
	LockedFund,
	StakingLogic,
	StakingProxy,
	FeeSharingProxy,
	VestingLogic,
	VestingFactory,
	VestingRegistry,
	OriginsAdmin,
	OriginsBase,
} = require("../utils");

const {
	zero,
	zeroAddress,
	fourWeeks,
	zeroBasisPoint,
	twentyBasisPoint,
	fiftyBasisPoint,
	hundredBasisPoint,
	invalidBasisPoint,
	depositTypeRBTC,
	depositTypeToken,
	unlockTypeNone,
	unlockTypeImmediate,
	unlockTypeWaited,
	saleEndDurationOrTSNone,
	saleEndDurationOrTSUntilSupply,
	saleEndDurationOrTSDuration,
	saleEndDurationOrTSTimestamp,
	verificationTypeNone,
	verificationTypeEveryone,
	verificationTypeByAddress,
	transferTypeNone,
	transferTypeUnlocked,
	transferTypeWaitedUnlock,
	transferTypeVested,
	transferTypeLocked,
} = require("../constants");

let {
	cliff,
	duration,
	waitedTS,
	firstMinAmount,
	firstMaxAmount,
	firstRemainingTokens,
	firstSaleStartTS,
	firstSaleEnd,
	firstUnlockedBP,
	firstVestOrLockCliff,
	firstVestOfLockDuration,
	firstDepositRate,
	firstDepositToken,
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
	secondVerificationType,
	secondSaleEndDurationOrTS,
	secondTransferType,
} = require("../variable");

contract("OriginsBase (Owner Functions)", (accounts) => {
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

		// Creating the Staking and Vesting
		[staking, vestingLogic, vestingRegistry] = await createStakeAndVest(creator, token);

		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner], { from: creator });
	});

	beforeEach("Creating New OriginsBase Contract Instance.", async () => {
		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr, { from: creator });

		// Setting lockedFund in Origins.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });

		// Added Origins as an admin of LockedFund.
		await lockedFund.addAdmin(originsBase.address, { from: owner });

		let timestamp = await currentTimestamp();
		waitedTS = timestamp;
		firstSaleStartTS = timestamp;
		secondSaleStartTS = timestamp;
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
	});

	it("Owner should be able to set Tier Verification Parameters.", async () => {
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
		await originsBase.setTierVerification(1, secondVerificationType, { from: owner });
	});

	it("Owner should be able to set Tier Deposit Parameters.", async () => {
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
		await originsBase.setTierDeposit(1, secondDepositRate, secondDepositToken, secondDepositType, { from: owner });
	});

	it("Owner should not be able to set Tier Deposit Parameters with deposit rate as zero.", async () => {
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
		await expectRevert(
			originsBase.setTierDeposit(1, zero, secondDepositToken, secondDepositType, { from: owner }),
			"OriginsBase: Deposit Rate cannot be zero."
		);
	});

	it("Owner should not be able to set Tier Deposit Parameters with deposit token as zero address if deposit type is Token.", async () => {
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
		await expectRevert(
			originsBase.setTierDeposit(1, secondDepositRate, zeroAddress, depositTypeToken, { from: owner }),
			"OriginsBase: Deposit Token Address cannot be zero."
		);
	});

	it("Owner should be able to set Tier Deposit Parameters with correct deposit token address if deposit type is Token.", async () => {
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
		let newToken = await Token.new(zero, "Test Token", "TST", 18);
		await originsBase.setTierDeposit(1, secondDepositRate, newToken.address, depositTypeToken, { from: owner });
	});

	it("Owner should be able to set Tier Deposit Parameters with deposit token as zero address if deposit type is RBTC.", async () => {
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
		await originsBase.setTierDeposit(1, secondDepositRate, zeroAddress, depositTypeRBTC, { from: owner });
	});

	it("Owner should be able to set Tier Token Limit Parameters.", async () => {
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
		await originsBase.setTierTokenLimit(1, secondMinAmount, secondMaxAmount, { from: owner });
	});

	it("Owner should not be able to set Tier Token Limit Parameters with minimum is greater than maximum amount.", async () => {
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
		await expectRevert(
			originsBase.setTierTokenLimit(1, secondMaxAmount, secondMinAmount, { from: owner }),
			"OriginsBase: Min Amount cannot be higher than Max Amount."
		);
	});

	it("Owner should be able to set Tier Token Amount Parameters where extra is provided.", async () => {
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
		await token.mint(owner, secondRemainingTokens);
		await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
		await originsBase.setTierTokenAmount(1, secondRemainingTokens, { from: owner });
	});

	it("Owner should be able to set Tier Token Amount Parameters where extra is returned.", async () => {
		await token.mint(owner, secondRemainingTokens);
		await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			secondRemainingTokens,
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
		await originsBase.setTierTokenAmount(1, firstRemainingTokens, { from: owner });
	});

	it("Owner should not be able to set Tier Token Amount Parameters with remaining token as zero.", async () => {
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
		await expectRevert(
			originsBase.setTierTokenAmount(1, zero, { from: owner }),
			"OriginsBase: Total token to sell should be higher than zero."
		);
	});

	it("Owner should not be able to set Tier Token Amount Parameters with max allowed is higher than remaining token.", async () => {
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
		await expectRevert(
			originsBase.setTierTokenAmount(1, 1, { from: owner }),
			"OriginsBase: Max Amount to buy should not be higher than token availability."
		);
	});

	it("Owner should be able to set Tier Vest or Lock Parameters.", async () => {
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
		await originsBase.setTierVestOrLock(1, secondVestOrLockCliff, secondVestOfLockDuration, secondUnlockedBP, secondTransferType, {
			from: owner,
		});
	});

	it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
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
		await expectRevert(
			originsBase.setTierVestOrLock(1, secondVestOfLockDuration, secondVestOrLockCliff, secondUnlockedBP, secondTransferType, {
				from: owner,
			}),
			"OriginsBase: Cliff has to be <= duration."
		);
	});

	it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
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
		await expectRevert(
			originsBase.setTierVestOrLock(1, secondVestOrLockCliff, secondVestOfLockDuration, invalidBasisPoint, secondTransferType, {
				from: owner,
			}),
			"OriginsBase: The basis point cannot be higher than 10K."
		);
	});

	it("Owner should be able to set Tier Time Parameters.", async () => {
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
		await originsBase.setTierTime(1, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: owner });
	});

	it("Owner should not be able to set Tier Time Parameters with sale start timestamp is higher than sale end timestamp.", async () => {
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
		await expectRevert(
			originsBase.setTierTime(1, secondSaleStartTS, secondSaleStartTS, saleEndDurationOrTSTimestamp, { from: owner }),
			"OriginsBase: The sale start TS cannot be after sale end TS."
		);
	});

	it("Owner should not be able to set Tier Time Parameters with sale start timestamp is higher than sale end timestamp.", async () => {
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
		await expectRevert(
			originsBase.setTierTime(1, (await currentTimestamp()) - 1000, (await currentTimestamp()) - 100, saleEndDurationOrTSTimestamp, {
				from: owner,
			}),
			"OriginsBase: The sale end duration cannot be past already."
		);
	});

	it("Owner should be able to withdraw the sale deposit to deposit address.", async () => {
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

	it("Owner should be able to withdraw the sale deposit and remaining tokens to deposit address.", async () => {
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
		let amount = 20000;
		await token.mint(userOne, amount);
		await token.approve(originsBase.address, amount, { from: userOne });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await token.mint(userTwo, amount);
		await token.approve(originsBase.address, amount, { from: userTwo });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount });
		await time.increase(firstSaleEnd + 100);
		await originsBase.withdrawSaleDeposit({ from: owner });
	});
});
