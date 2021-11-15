const {
	// External Functions
	expectRevert,
	time,
	assert,
	// Custom Functions
	currentTimestamp,
	createStakeAndVest,
	// Contract Artifacts
	Token,
	LockedFund,
	OriginsBase,
} = require("../utils");

const {
	zero,
	zeroAddress,
	invalidBasisPoint,
	depositTypeRBTC,
	depositTypeToken,
	saleEndDurationOrTSTimestamp,
	verificationTypeEveryone,
} = require("../constants");

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
	secondVerificationType,
	secondSaleEndDurationOrTS,
	secondTransferType,
	thirdMinAmount,
	thirdMaxAmount,
	thirdRemainingTokens,
	thirdSaleStartTS,
	thirdSaleEnd,
	thirdUnlockedBP,
	thirdVestOrLockCliff,
	thirdVestOfLockDuration,
	thirdDepositRate,
	thirdDepositToken,
	thirdDepositType,
	thirdVerificationType,
	thirdSaleEndDurationOrTS,
	thirdTransferType,
	thirdBlockNumber,
	thirdDate,
	thirdMinStake,
	thirdMaxStake,
} = require("../variable");
const { current } = require("@openzeppelin/test-helpers/src/balance");

contract("OriginsBase (Owner Functions)", (accounts) => {
	let token, lockedFund, staking, vestingRegistry, vestingLogic, originsBase;
	let depositToken, depositStaking, depositVestingRegistry, depositVestingLogic;
	let creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr;
	let tierCount, timestamp;

	before("Initiating Accounts & Creating Test Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 9, "Alteast 9 accounts are required to test the contracts.");
		[creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr] = accounts;

		timestamp = await currentTimestamp();
		waitedTS = timestamp;

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking and Vesting
		[staking, vestingLogic, vestingRegistry] = await createStakeAndVest(creator, token);

		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner], { from: creator });

		// Creating the instance of Token for Staking.
		depositToken = await Token.new(zero, "Deposit Token", "DPST", 18, { from: creator });
		thirdDepositToken = depositToken.address;

		// Creating the Staking and Vesting for stakeToken
		[depositStaking, depositVestingLogic, depositVestingRegistry] = await createStakeAndVest(creator, depositToken);

		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr, { from: creator });

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
		/// Reverting back to original locked fund contract for the rest of the tests.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });
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
		tierCount = await originsBase.getTierCount();
	});

	it("Owner should be able to set Tier Verification Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierVerification(tierCount, secondVerificationType, { from: owner });
	});

	it("Owner should be able to set Tier Deposit Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierDeposit(tierCount, secondDepositRate, secondDepositToken, secondDepositType, { from: owner });
	});

	it("Owner should not be able to set Tier Deposit Parameters with deposit rate as zero.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierDeposit(tierCount, zero, secondDepositToken, secondDepositType, { from: owner }),
			"OriginsBase: Deposit Rate cannot be zero."
		);
	});

	it("Owner should not be able to set Tier Deposit Parameters with deposit token as zero address if deposit type is Token.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierDeposit(tierCount, secondDepositRate, zeroAddress, depositTypeToken, { from: owner }),
			"OriginsBase: Deposit Token Address cannot be zero."
		);
	});

	it("Owner should be able to set Tier Deposit Parameters with correct deposit token address if deposit type is Token.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		let newToken = await Token.new(zero, "Test Token", "TST", 18);
		await originsBase.setTierDeposit(tierCount, secondDepositRate, newToken.address, depositTypeToken, { from: owner });
	});

	it("Owner should be able to set Tier Deposit Parameters with deposit token as zero address if deposit type is RBTC.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierDeposit(tierCount, secondDepositRate, zeroAddress, depositTypeRBTC, { from: owner });
	});

	it("Owner should be able to set Tier Token Limit Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierTokenLimit(tierCount, secondMinAmount, secondMaxAmount, { from: owner });
	});

	it("Owner should not be able to set Tier Token Limit Parameters with minimum is greater than maximum amount.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierTokenLimit(tierCount, secondMaxAmount, secondMinAmount, { from: owner }),
			"OriginsBase: Min Amount cannot be higher than Max Amount."
		);
	});

	it("Owner should be able to set Tier Token Amount Parameters where extra is provided.", async () => {
		await token.mint(owner, secondRemainingTokens);
		await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
		await originsBase.setTierTokenAmount(tierCount, secondRemainingTokens, { from: owner });
	});

	it("Owner should be able to set Tier Token Amount Parameters where extra is returned.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierTokenAmount(tierCount, firstRemainingTokens, { from: owner });
	});

	it("Owner should not be able to set Tier Token Amount Parameters with remaining token as zero.", async () => {
		await expectRevert(
			originsBase.setTierTokenAmount(tierCount, zero, { from: owner }),
			"OriginsBase: Total token to sell should be higher than zero."
		);
	});

	it("Owner should not be able to set Tier Token Amount Parameters with max allowed is higher than remaining token.", async () => {
		let lessThanMaxAmount = secondMaxAmount*secondDepositRate - 1;
		await token.mint(owner, lessThanMaxAmount);
		await token.approve(originsBase.address, lessThanMaxAmount, { from: owner });
		await expectRevert(
			originsBase.setTierTokenAmount(tierCount, lessThanMaxAmount, { from: owner }),
			"OriginsBase: Max Amount to buy should not be higher than token availability."
		);
	});

	it("Owner should be able to set Tier Vest or Lock Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierVestOrLock(tierCount, secondVestOrLockCliff, secondVestOfLockDuration, secondUnlockedBP, secondTransferType, {
			from: owner,
		});
	});

	it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierVestOrLock(tierCount, secondVestOfLockDuration, secondVestOrLockCliff, secondUnlockedBP, secondTransferType, {
				from: owner,
			}),
			"OriginsBase: Cliff has to be <= duration."
		);
	});

	it("Owner should not be able to set Tier Vest or Lock Parameters with cliff higher than duration.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierVestOrLock(tierCount, secondVestOrLockCliff, secondVestOfLockDuration, invalidBasisPoint, secondTransferType, {
				from: owner,
			}),
			"OriginsBase: The basis point cannot be higher than 10K."
		);
	});

	it("Owner should be able to set Tier Time Parameters.", async () => {
		secondSaleStartTS = await currentTimestamp();
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.setTierTime(tierCount, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: owner });
	});

	it("Owner should be able to set Stake Conditions.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });

		let currentBlockNumber = await time.latestBlock() - 1;
		thirdBlockNumber = [currentBlockNumber];

		thirdDate = [timestamp - 1];

		await originsBase.setTierDeposit(tierCount, thirdDepositRate, thirdDepositToken, thirdDepositType, { from: owner });
		await originsBase.setTierStakeCondition(tierCount, thirdMinStake, thirdMaxStake, thirdBlockNumber, thirdDate, depositStaking.address, { from: owner });
	});

	it("Owner should not be able to set Tier Time Parameters with sale end timestamp in the past.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierTime(tierCount, (await currentTimestamp()) - 1000, (await currentTimestamp()) - 100, saleEndDurationOrTSTimestamp, {
				from: owner,
			}),
			"OriginsBase: The sale end duration cannot be past already."
		);
	});

	it("Owner should not be able to set Tier Time Parameters with sale start timestamp equal to sale end timestamp.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierTime(tierCount, (await currentTimestamp()) - 100, (await currentTimestamp()) - 100, saleEndDurationOrTSTimestamp, {
				from: owner,
			}),
			"OriginsBase: The sale start TS cannot be after sale end TS."
		);
	});

	it("Owner should not be able to set Tier Time Parameters with sale start timestamp after sale end timestamp.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await expectRevert(
			originsBase.setTierTime(tierCount, (await currentTimestamp()) - 100, (await currentTimestamp()) - 1000, saleEndDurationOrTSTimestamp, {
				from: owner,
			}),
			"OriginsBase: The sale start TS cannot be after sale end TS."
		);
	});

	it("Owner should be able to withdraw the sale deposit to deposit address.", async () => {
		firstSaleStartTS = await currentTimestamp();
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

		await token.mint(userThree, amount);
		await token.approve(originsBase.address, amount, { from: userThree });
		await originsBase.buy(tierCount, zero, { from: userThree, value: amount });

		await time.increase(firstSaleEnd + 100);
		await originsBase.withdrawSaleDeposit({ from: owner });
	});

	it("Owner should be able to withdraw the sale deposit to own address if deposit address is not set.", async () => {
		firstSaleStartTS = await currentTimestamp();
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

		await token.mint(userTwo, amount);
		await token.approve(originsBase.address, amount, { from: userTwo });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount });

		await token.mint(userThree, amount);
		await token.approve(originsBase.address, amount, { from: userThree });
		await originsBase.buy(tierCount, zero, { from: userThree, value: amount });
		await originsBase.withdrawSaleDeposit({ from: owner });
	});

	it("Owner should be able to withdraw the sale deposit and remaining tokens to deposit address.", async () => {
		firstSaleStartTS = await currentTimestamp();
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
