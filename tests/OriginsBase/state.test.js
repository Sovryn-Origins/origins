const {
	// External Functions
	BN,
	balance,
	assert,
	// Custom Functions
	currentTimestamp,
	createStakeAndVest,
	checkTier,
	// Contract Artifacts
	Token,
	LockedFund,
	OriginsBase,
} = require("../utils");

const { zero, verificationTypeEveryone } = require("../constants");

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

contract("OriginsBase (State Functions)", (accounts) => {
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

		// Creating the Staking and Vesting
		[staking, vestingLogic, vestingRegistry] = await createStakeAndVest(creator, token);

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

		// Minting new tokens, Approving Origins and creating a new tier.
		await token.mint(owner, firstRemainingTokens, { from: creator });

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

		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
	});

	beforeEach("Updating the timestamp.", async () => {
		let timestamp = await currentTimestamp();
		firstSaleStartTS = timestamp;
		secondSaleStartTS = timestamp;
	});

	it("Setting a deposit address should update the state.", async () => {
		await originsBase.setDepositAddress(newDepositAddr, { from: owner });
		let cDepositAddr = await originsBase.getDepositAddress();
		assert.strictEqual(cDepositAddr, newDepositAddr, "Deposit Address is not correctly set.");

		// Resetting it for other tests.
		await originsBase.setDepositAddress(depositAddr, { from: owner });
	});

	it("Setting Locked Fund Contract should update the state.", async () => {
		let newLockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
		await originsBase.setLockedFund(newLockedFund.address, { from: owner });
		let cLockedFund = await originsBase.getLockDetails();
		assert.strictEqual(cLockedFund, newLockedFund.address, "Locked Fund Contract is not correctly set.");

		// Resetting it for other tests.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });
	});

	it("Adding a new tier should update the state correctly.", async () => {
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
		await checkTier(
			originsBase,
			tierCount,
			zero,
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
			firstTransferType
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
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierVerification(tierCount, secondVerificationType, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
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
			secondVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
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
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, secondDepositRate, secondDepositToken, secondDepositType, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			secondDepositRate,
			secondDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
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
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierTokenLimit(tierCount, secondMinAmount, secondMaxAmount, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			secondMinAmount,
			secondMaxAmount,
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
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Token Amount Parameters.", async () => {
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
		await token.mint(owner, secondRemainingTokens);
		await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
		await originsBase.setTierTokenAmount(tierCount, secondRemainingTokens, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			secondRemainingTokens,
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
			firstTransferType
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
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierVestOrLock(
			tierCount,
			secondVestOrLockCliff,
			secondVestOfLockDuration,
			secondUnlockedBP,
			secondTransferType,
			{ from: owner }
		);
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			secondUnlockedBP,
			secondVestOrLockCliff,
			secondVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			secondTransferType
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
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierTime(tierCount, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			secondSaleStartTS,
			secondSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			secondSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Verifier should be able to verify a single address to a single tier.", async () => {
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a single address to a multiple tier.", async () => {
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
		await originsBase.singleAddressMultipleTierVerification(userOne, [tierCount, tierCount - 1, tierCount - 2], { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userOne, tierCount - 1);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userOne, tierCount - 2);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a multiple address to a single tier.", async () => {
		await originsBase.multipleAddressSingleTierVerification([userOne, userTwo, userThree], tierCount, { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userTwo, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userThree, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a multiple address to a multiple tier.", async () => {
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
		await originsBase.multipleAddressAndTierVerification([userOne, userTwo, userThree], [tierCount, tierCount - 1, tierCount - 2], {
			from: verifier,
		});
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userTwo, tierCount - 1);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userThree, tierCount - 2);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("User should be able to buy tokens.", async () => {
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
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		let participatingWalletCountPerTier = await originsBase.getParticipatingWalletCountPerTier(tierCount, { from: userOne });
		let participatingWalletCount = await originsBase.getParticipatingWalletCount({ from: userOne });
		let tokensBoughtByAddressOnTier = await originsBase.getTokensBoughtByAddressOnTier(userOne, tierCount, { from: userOne });
		let tokensBoughtByAddress = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
		assert(participatingWalletCountPerTier.eq(new BN(1)), "Participating Wallet Count Per Tier is wrong.");
		assert(participatingWalletCount.eq(new BN(1)), "Participating Wallet Count is wrong.");
		assert(tokensBoughtByAddressOnTier.eq(new BN(amount).mul(new BN(firstDepositRate))), "Tokens Bought by Address Per Tier is wrong.");
		assert(tokensBoughtByAddress.eq(new BN(amount).mul(new BN(firstDepositRate))), "Tokens Bought by Address is wrong.");
		assert(userVestedBalance.eq(new BN(amount).mul(new BN(firstDepositRate))), "User Vesting Balance is wrong.");
	});

	it("User should be able to buy tokens multiple times until max asset amount reaches.", async () => {
		let amount = 10000;
		let oldTokensBoughtByAddressOnTier = await originsBase.getTokensBoughtByAddressOnTier(userOne, tierCount, { from: userOne });
		let oldTokensBoughtByAddress = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		let participatingWalletCountPerTier = await originsBase.getParticipatingWalletCountPerTier(tierCount, { from: userOne });
		let participatingWalletCount = await originsBase.getParticipatingWalletCount({ from: userOne });
		let newTokensBoughtByAddressOnTier = await originsBase.getTokensBoughtByAddressOnTier(userOne, tierCount, { from: userOne });
		let newTokensBoughtByAddress = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
		assert(participatingWalletCountPerTier.eq(new BN(1)), "Participating Wallet Count Per Tier is wrong.");
		assert(participatingWalletCount.eq(new BN(1)), "Participating Wallet Count is wrong.");
		assert(
			newTokensBoughtByAddressOnTier.eq(
				oldTokensBoughtByAddressOnTier.add(new BN(3).mul(new BN(amount).mul(new BN(firstDepositRate))))
			),
			"Tokens Bought by Address Per Tier is wrong."
		);
		assert(
			newTokensBoughtByAddress.eq(oldTokensBoughtByAddress.add(new BN(3).mul(new BN(amount).mul(new BN(firstDepositRate))))),
			"Tokens Bought by Address is wrong."
		);
		assert(userVestedBalance.eq(new BN(amount).mul(new BN(4)).mul(new BN(firstDepositRate))), "User Vesting Balance is wrong.");
	});

	it("User should be refunded the extra after the max reaches.", async () => {
		let amount = 20000;
		let oldBalance = await balance.current(userOne);
		let tx = await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let gasUsed = tx.receipt.gasUsed;
		let gasPrice = (await web3.eth.getTransaction(tx.tx)).gasPrice;
		let newBalance = await balance.current(userOne);
		newBalance = newBalance.add(new BN(gasUsed).mul(new BN(gasPrice)));
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		assert(oldBalance.sub(newBalance).eq(new BN(10000)), "User not returned enough.");
		assert(userVestedBalance.eq(firstMaxAmount.mul(new BN(firstDepositRate))), "User Vested Balance is wrong.");
	});

	it("Users buying on different tiers should be counted as one unique wallet.", async () => {
		let amount = 10000;
		let oldTokensBoughtByAddress = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
		let oldParticipatingWalletCountPerTier = await originsBase.getParticipatingWalletCountPerTier(tierCount - 1, { from: userOne });
		let oldParticipatingWalletCount = await originsBase.getParticipatingWalletCount({ from: userOne });
		await originsBase.buy(tierCount - 1, zero, { from: userOne, value: amount });
		let newTokensBoughtByAddress = await originsBase.getTokensBoughtByAddress(userOne, { from: userOne });
		let newParticipatingWalletCountPerTier = await originsBase.getParticipatingWalletCountPerTier(tierCount - 1, { from: userOne });
		let newParticipatingWalletCount = await originsBase.getParticipatingWalletCount({ from: userOne });
		assert(oldParticipatingWalletCountPerTier.eq(new BN(0)), "Participating Wallet Count Per Tier is wrong.");
		assert(newParticipatingWalletCountPerTier.eq(new BN(1)), "Participating Wallet Count Per Tier is wrong.");
		assert(oldParticipatingWalletCount.eq(newParticipatingWalletCount), "Participating Wallet Count is wrong.");
		assert(
			newTokensBoughtByAddress.eq(oldTokensBoughtByAddress.add(new BN(amount).mul(new BN(firstDepositRate)))),
			"Tokens Bought by Address is wrong."
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
		let oldBalance = await balance.current(depositAddr);
		await originsBase.withdrawSaleDeposit({ from: owner });
		let newBalance = await balance.current(depositAddr);
		assert(newBalance.sub(oldBalance).eq(new BN(60000)), "Admin did not received the total sale proceedings.");
	});
});
