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
	firstMinAmount,
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
	firstSaleType,
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
	secondSaleType,
	saleEndDurationOrTSUntilSupply,
} = require("../variable");

contract("OriginsBase (Creator Functions)", (accounts) => {
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

		// Minting new tokens, Approving Origins and creating a new tier.
		await token.mint(owner, firstRemainingTokens, { from: creator });
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
	});

	beforeEach("Updating the timestamp.", async () => {
		let timestamp = await currentTimestamp();
		firstSaleStartTS = timestamp;
		secondSaleStartTS = timestamp;
	});

	it("Creator should not be able to create a originsBase with invalid token address.", async () => {
		await expectRevert(
			OriginsBase.new([owner], zeroAddress, depositAddr, { from: creator }),
			"OriginsBase: Token Address cannot be zero."
		);
	});

	it("Creator should not be able to set deposit address.", async () => {
		await expectRevert(
			originsBase.setDepositAddress(newDepositAddr, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Locked Fund Contract.", async () => {
		let newLockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
		await expectRevert(
			originsBase.setLockedFund(newLockedFund.address, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to add a new tier.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: creator });
		await expectRevert(
			originsBase.createTier(
				firstMinAmount,
				firstMaxAmount,
				firstRemainingTokens,
				firstSaleStartTS,
				firstSaleEnd,
				firstUnlockedBP,
				firstVestOrLockCliff,
				firstVestOfLockDuration,
				firstVerificationType,
				firstSaleEndDurationOrTS,
				firstTransferType,
				firstSaleType,
				{ from: creator }
			),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Tier Deposit Parameters.", async () => {
		await expectRevert(
			originsBase.setTierDeposit(tierCount, secondDepositRate, secondDepositToken, secondDepositType, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Tier Token Limit Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTokenLimit(tierCount, secondMinAmount, secondMaxAmount, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Tier Token Amount Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTokenAmount(tierCount, secondRemainingTokens, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Tier Vest or Lock Parameters.", async () => {
		await expectRevert(
			originsBase.setTierVestOrLock(
				tierCount,
				secondVestOrLockCliff,
				secondVestOfLockDuration,
				secondUnlockedBP,
				secondTransferType,
				{ from: creator }
			),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to set Tier Time Parameters.", async () => {
		await expectRevert(
			originsBase.setTierTime(tierCount, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: creator }),
			"OriginsAdmin: Only owner can call this function."
		);
	});

	it("Creator should not be able to verify a single address to a single tier.", async () => {
		await expectRevert(
			originsBase.addressVerification(userOne, tierCount, { from: creator }),
			"OriginsAdmin: Only verifier can call this function."
		);
	});

	it("Creator should not be able to verify a single address to a multiple tier.", async () => {
		tierCount = 3;
		await expectRevert(
			originsBase.singleAddressMultipleTierVerification(userOne, [tierCount, tierCount - 1, tierCount - 2], { from: creator }),
			"OriginsAdmin: Only verifier can call this function."
		);
	});

	it("Creator should not be able to verify a multiple address to a single tier.", async () => {
		await expectRevert(
			originsBase.multipleAddressSingleTierVerification([userOne, userTwo, userThree], tierCount, { from: creator }),
			"OriginsAdmin: Only verifier can call this function."
		);
	});

	it("Creator should not be able to verify a multiple address to a multiple tier.", async () => {
		tierCount = 3;
		await expectRevert(
			originsBase.multipleAddressAndTierVerification([userOne, userTwo, userThree], [tierCount, tierCount - 1, tierCount - 2], {
				from: creator,
			}),
			"OriginsAdmin: Only verifier can call this function."
		);
	});

	it("Creator should not be able to close sale of tier whose saleEnd is greater than block.timestamp", async () => {
		await token.mint(owner, firstRemainingTokens, { from: creator });
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });

		await expectRevert(
			originsBase.closeSaleOf(tierCount, {
				from: creator,
			}),
			"OriginsBase: Cannot close this tier right now."
		);
	});

	it("Creator should not be able to close sale of tier whose saleEndDurationOrTS is SaleEndDurationOrTS.UntilSupply", async () => {
		await token.mint(owner, firstRemainingTokens, { from: creator });
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleStartTS,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstVerificationType,
			saleEndDurationOrTSUntilSupply,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		await originsBase.addressVerification(creator, tierCount, { from: verifier });
		await originsBase.buy(tierCount, zero, { from: creator, value: firstRemainingTokens / 2 });

		await expectRevert(
			originsBase.closeSaleOf(tierCount, {
				from: creator,
			}),
			"OriginsBase: Cannot close this tier right now."
		);
	});

	it("Creator should not be able to claim tier during the sale", async () => {
		// TODO
	});

	it("Creator should not be able to claim unless the sale ended", async () => {
		// TODO
	});

	it("Creator should not be able to claim unless the sale type is Pooled", async () => {
		// TODO
	});

	it("Claim should be rejected if no tokens were bought for the tier for the specified user", async () => {
		// TODO
	});

	it("Creator can not double claim", async () => {
		// TODO
	});
});
