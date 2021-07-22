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

contract("LockedFund (State Change)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		waitedTS = await currentTimestamp();

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking and Vesting
		[staking, vestingLogic, vestingRegistry] = await createStakeAndVest(creator, token);
	});

	beforeEach("Creating New Locked Fund Contract Instance.", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [admin], { from: creator });

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address, { from: creator });
	});

	it("Admin should be able to add another admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			true
		);
	});

	it("Admin should be able to remove an admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			true
		);
		await lockedFund.removeAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to change the vestingRegistry.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			zero,
			zero,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		await lockedFund.changeWaitedTS(newWaitedTS, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			userOne,
			newWaitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to deposit using depositVested() and unlock as waited.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
	});

	it("Admin should be able to deposit using depositVested() and unlock as immediate.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeImmediate, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			zero,
			Math.floor(value / 2),
			false
		);
	});

	it("Admin should be able to deposit using depositVested() and unlock as none.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeNone, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to deposit using depositLocked().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositLocked(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		// TODO: Check status
	});

	it("Admin should be able to deposit using depositWaitedUnlocked() with non zero basis point.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositWaitedUnlocked(userOne, value, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			Math.ceil(value / 2),
			Math.floor(value / 2),
			false
		);
	});

	it("Admin should be able to deposit using depositWaitedUnlocked() with zero basis point.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositWaitedUnlocked(userOne, value, zeroBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			value,
			zero,
			false
		);
	});

	it("User should be able to withdraw waited unlocked balance using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userOne, token, lockedFund);
		await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to withdraw waited unlocked balance to any wallet using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userTwo, token, lockedFund);
		await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to create vesting and stake vested balance using createVestingAndStake().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.createVestingAndStake({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to create vesting using createVesting().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.createVesting({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to stake vested balance using stakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.stakeTokens({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to withdraw waited unlocked balance, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(newVestingRegistry.address);
		await newVestingRegistry.addAdmin(lockedFund.address);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userOne, token, lockedFund);
		await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to withdraw waited unlocked balance to any wallet, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(newVestingRegistry.address);
		await newVestingRegistry.addAdmin(lockedFund.address);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userTwo, token, lockedFund);
		await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("Admin should be able to get the cliff and duration of a user.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		let detail = await lockedFund.getCliffAndDuration(userOne, { from: admin });
		assert.equal(detail[0].toNumber() / fourWeeks, cliff, "Cliff does not match.");
		assert.equal(detail[1].toNumber() / fourWeeks, duration, "Duration does not match.");
	});
});
