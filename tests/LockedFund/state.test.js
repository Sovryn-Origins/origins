const {
	// External Functions
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeAndVest,
	checkStatus,
	getTokenBalances,
	createLockedFund,
	// Contract Artifacts
	Token,
	VestingFactory,
	VestingRegistry,
} = require("../utils");

const {
	zero,
	zeroAddress,
	fourWeeks,
	zeroBasisPoint,
	fiftyBasisPoint,
	unlockTypeNone,
	unlockTypeImmediate,
	unlockTypeWaited,
} = require("../constants");

let { cliff, duration, waitedTS } = require("../variable");

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

		// Creating the instance of LockedFund Contract.
		lockedFund = await createLockedFund(waitedTS, token, vestingRegistry, [admin], creator);

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
		await lockedFund.changeVestingRegistry(vestingRegistry.address, { from: admin });
	});

	it("Admin should be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		// Creating the instance of LockedFund Contract.
		newLockedFund = await createLockedFund(waitedTS, token, vestingRegistry, [admin], creator);
		await newLockedFund.changeWaitedTS(newWaitedTS, { from: admin });
		await checkStatus(
			newLockedFund,
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
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			Math.floor(value / 2) + unlockedBal,
			false
		);
	});

	it("Admin should be able to deposit using depositVested() and unlock as none.", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			value + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
	});

	it("Admin should be able to deposit using depositLocked().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositLocked(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		// TODO: Check status
	});

	it("Admin should be able to deposit using depositWaitedUnlocked() with non zero basis point.", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			cliff,
			duration,
			vestingRegistry.address,
			zero + vestedBal,
			zero + lockedBal,
			Math.ceil(value / 2) + waitedUnlockedBal,
			Math.floor(value / 2) + unlockedBal,
			false
		);
	});

	it("Admin should be able to deposit using depositWaitedUnlocked() with zero basis point.", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			cliff,
			duration,
			vestingRegistry.address,
			zero + vestedBal,
			zero + lockedBal,
			value + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
	});

	it("User should be able to withdraw waited unlocked balance using withdrawWaitedUnlockedBalance().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			Math.floor(value / 2) + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			zero + vestedBal,
			zero + lockedBal,
			zero,
			zero + unlockedBal,
			false
		);
		[newTokenBal, , , ,] = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newTokenBal, oldTokenBal + waitedUnlockedBal, "Token Balance not matching.");
	});

	it("User should be able to withdraw waited unlocked balance to any wallet using withdrawWaitedUnlockedBalance().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			Math.floor(value / 2) + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, , , ,] = await getTokenBalances(userTwo, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			zero,
			zero + unlockedBal,
			false
		);
		[newTokenBal, , , ,] = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newTokenBal, oldTokenBal + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to create vesting and stake vested balance using createVestingAndStake().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			value + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
	});

	it("User should be able to create vesting using createVesting().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			value + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			zero + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
	});

	it("User should be able to stake vested balance using stakeTokens().", async () => {
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			value + vestedBal,
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			zero + lockedBal,
			zero + waitedUnlockedBal,
			zero + unlockedBal,
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
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			Math.floor(value / 2) + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			zero + lockedBal,
			zero,
			zero + unlockedBal,
			false
		);
		[newTokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newTokenBal, oldTokenBal + Math.floor(value / 2), "Token Balance not matching.");
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
		let [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal] = await getTokenBalances(userOne, token, lockedFund);
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
			Math.ceil(value / 2) + vestedBal,
			zero + lockedBal,
			Math.floor(value / 2) + waitedUnlockedBal,
			zero + unlockedBal,
			false
		);
		[oldTokenBal, , , ,] = await getTokenBalances(userTwo, token, lockedFund);
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
			zero + lockedBal,
			zero,
			zero + unlockedBal,
			false
		);
		[newTokenBal, , , ,] = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newTokenBal, oldTokenBal + Math.floor(value / 2), "Token Balance not matching.");
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
