const {
	// External Functions
	expectRevert,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeVestAndLockedFund,
	// Contract Artifacts
	Token,
	LockedFund,
	OriginsBase,
} = require("../utils");

const {
	zero,
	saleEndDurationOrTSNone,
	saleEndDurationOrTSUntilSupply,
	saleEndDurationOrTSDuration,
	verificationTypeNone,
	verificationTypeEveryone,
	transferTypeNone,
	transferTypeUnlocked,
	transferTypeWaitedUnlock,
	transferTypeLocked,
	saleTypeFCFS,
	zeroAddress,
} = require("../constants");

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
} = require("../variable");

contract("OriginsBase (User Functions)", (accounts) => {
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

	it("User should be allowed to buy with Immediate Unlock.", async () => {
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			transferTypeUnlocked,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
	});

	it("User should be allowed to buy with Waited Unlock.", async () => {
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			transferTypeWaitedUnlock,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
	});

	it("User should be allowed to buy with Locked Transfer.", async () => {
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			transferTypeLocked,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
	});

	it("User should not be allowed to buy without setting Transfer Type.", async () => {
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			transferTypeNone,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await expectRevert(
			originsBase.buy(tierCount, zero, { from: userOne, value: amount }),
			"OriginsBase: Transfer Type not set by owner."
		);
	});

	it("User should not be allowed to buy if sale end duration or TS not set.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			(await currentTimestamp()) + 1000,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstVerificationType,
			saleEndDurationOrTSNone,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if sale start time is not set.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			zero,
			(await currentTimestamp()) + 1000,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstVerificationType,
			saleEndDurationOrTSDuration,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		let amount = 10000;
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if the token sale has ended.", async () => {
		let amount = 100;
		await token.mint(owner, amount);
		await token.approve(originsBase.address, amount, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			amount,
			amount,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, 1, zeroAddress, firstDepositType, { from: owner });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userTwo, value: amount }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if sale end is not set.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			zero,
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
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if total tokens are sold with Sale End as Duration.", async () => {
		let amount = 100;
		await token.mint(owner, amount);
		await token.approve(originsBase.address, amount, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			amount / 2,
			amount,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, 1, zeroAddress, firstDepositType, { from: owner });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount / 2 });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount / 2 });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userThree, value: amount / 2 }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if total tokens are sold with Sale End as Until Supply.", async () => {
		let amount = 100;
		await token.mint(owner, amount);
		await token.approve(originsBase.address, amount, { from: owner });
		await originsBase.createTier(
			firstMinAmount,
			amount,
			amount,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			verificationTypeEveryone,
			saleEndDurationOrTSUntilSupply,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, 1, zeroAddress, firstDepositType, { from: owner });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount / 2 });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount / 2 });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userThree, value: amount / 2 }), "OriginsBase: Sale not allowed.");
	});

	it("User should not be allowed to buy if Verification is not set.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeNone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: User not verified.");
	});

	it("If verification is done by address, user should only be allowed if it is done by verified address.", async () => {
		let amount = randomValue();
		await token.mint(owner, firstRemainingTokens);
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
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: amount }), "OriginsBase: User not verified.");
	});

	it("User should not be allowed to buy once the max reaches even if there is remaining tokens.", async () => {
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
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
			firstMinAmount,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		await expectRevert(originsBase.buy(tierCount, zero, { from: userOne, value: zero }), "OriginsBase: Amount cannot be zero.");
	});

	it("User should not be allowed to buy with assets deposited less than minimum allowed.", async () => {
		let amount = 1000;
		await token.mint(owner, firstRemainingTokens);
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
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			firstSaleType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, firstDepositRate, zeroAddress, firstDepositType, { from: owner });
		await originsBase.setTierTokenLimit(tierCount, 10000, firstMaxAmount, { from: owner });
		await expectRevert(
			originsBase.buy(tierCount, zero, { from: userOne, value: amount }),
			"OriginsBase: Deposit is less than minimum allowed."
		);
	});

	it("User should be able to get token address.", async () => {
		let tokenAddress = await originsBase.getToken({ from: userOne });
	});

	it("User should be able to get Tokens Bought By Address.", async () => {
		let tokensBought = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
	});

	it("User should be able to get Tokens Bought By Address On Tier.", async () => {
		let tokensBought = await originsBase.getTokensBoughtByAddressOnTier(userOne, 1, { from: userOne });
	});

	it("User should be able to get Participating Wallet Count.", async () => {
		let participatingWallet = await originsBase.getParticipatingWalletCount({ from: userOne });
	});

	it("User should be able to get Participating Wallet Count Per Tier.", async () => {
		let participatingWallet = await originsBase.getParticipatingWalletCountPerTier(1, { from: userOne });
	});

	it("User should be able to get Total Token Allocation Per Tier.", async () => {
		let totalTokenAllocation = await originsBase.getTotalTokenAllocationPerTier(1, { from: userOne });
	});

	it("User should be able to get Tokens Sold Per Tier.", async () => {
		let tokensSoldPerTier = await originsBase.getTokensSoldPerTier(1, { from: userOne });
	});

	it("User should be able to check Sale Ended.", async () => {
		let saleEnded = await originsBase.checkSaleEnded(1, { from: userOne });
	});

	it("User should be able to check if a user is verified for a particular tier", async () => {
		let verified = await originsBase.checkVerification(1, userTwo, { from: userOne });
	});

	it("User should be able to check if he/she is verified for a particular tier", async () => {
		let verified = await originsBase.checkVerification(1, zeroAddress, { from: userOne });
	});

	it("User should be able to check if a user has staked for a particular tier", async () => {
		let staked = await originsBase.checkStakesByTier(1, userTwo, { from: userOne });
	});

	it("User should be able to check if he/she has staked for a particular tier", async () => {
		let staked = await originsBase.checkStakesByTier(1, zeroAddress, { from: userOne });
	});

	it("User should not be able to close sale of tier whose saleEnd is greater than block.timestamp", async () => {
		// TODO
	});
	
	it("User should not be able to close sale of tier whose saleEndDurationOrTS is SaleEndDurationOrTS.UntilSupply", async () => {
		// TODO
	});

	it("User should not be able to claim tier during the sale", async () => {
		// TODO
	});

	it("User should not be able to claim unless the sale ended", async () => {
		// TODO
	});

	it("User should not be able to claim unless the sale type is Pooled", async () => {
		// TODO
	});

	it("Claim should be rejected if no tokens were bought for the tier for the specified user", async () => {
		// TODO
	});

	it("User can not double claim", async () => {
		// TODO
	});

	it("Claimed amount should be reflected on the balance", async () => {
		// TODO
	});
});
