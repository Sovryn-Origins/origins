const {
	// External Functions
	expectRevert,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeVestAndLockedFund,
	createLockedFund,
	// Contract Artifacts
	Token,
	LockedFund,
	VestingRegistry,
} = require("../utils");

const {
	zero,
	zeroAddress,
	dummyAddress,
	zeroBasisPoint,
	fiftyBasisPoint,
	unlockTypeWaited,
	receiveTokens,
	dontReceiveTokens,
} = require("../constants");

let { cliff, duration, waitedTS } = require("../variable");

contract("LockedFund (User Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		waitedTS = await currentTimestamp();

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, vestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [admin]);

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address, { from: creator });
	});

	it("User should not be able to add another admin.", async () => {
		await expectRevert(lockedFund.addAdmin(newAdmin, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to remove an admin.", async () => {
		await expectRevert(lockedFund.removeAdmin(newAdmin, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to change the vestingRegistry.", async () => {
		await expectRevert(lockedFund.changeVestingRegistry(dummyAddress, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		await expectRevert(lockedFund.changeWaitedTS(newWaitedTS, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to deposit using depositVested().", async () => {
		let value = randomValue();
		token.mint(userOne, value, { from: creator });
		token.approve(lockedFund.address, value, { from: userOne });
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: userOne }),
			"LockedFund: Only admin can call this."
		);
	});

	it("User should be able to withdraw waited unlocked balance using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
	});

	it("User should be able to withdraw waited unlocked balance to any wallet using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
	});

	it("User should not be able to withdraw waited unlocked balance before waitedTimestamp using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let timestamp = await currentTimestamp();
		await lockedFund.changeWaitedTS(timestamp + 10000, { from: admin });
		await expectRevert(
			lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne }),
			"LockedFund: Wait Timestamp not yet passed."
		);
	});

	it("User should be able to create vesting and stake vested balance using createVestingAndStake().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		await lockedFund.createVestingAndStake({ from: userOne });
	});

	it("User should be able to create vesting using createVesting().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let _vestingData = await lockedFund.getVestingData(cliff, duration);
		await lockedFund.createVesting(_vestingData, { from: userOne });
	});

	it("User should be able to stake vested balance using stakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let _vestingData = await lockedFund.getVestingData(cliff, duration);
		await lockedFund.stakeTokens(_vestingData, { from: userOne });
	});

	it("User should not be able to stake vested balance using stakeTokens() if vesting is not created previously.", async () => {
		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, newVestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [admin]);
		// Adding lockedFund as an admin in the Vesting Registry.
		await newVestingRegistry.addAdmin(lockedFund.address, { from: creator });
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let _vestingData = await lockedFund.getVestingData(cliff, duration);
		await expectRevert(lockedFund.stakeTokens(_vestingData, { from: userOne }), "LockedFund: Vesting address invalid.");
	});

	it("User should be able to withdraw waited unlocked balance, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await createLockedFund(waitedTS, token, vestingRegistry, [admin], creator);
		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address, { from: creator });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
	});

	it("User should be able to withdraw waited unlocked balance to any wallet, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
	});

	it("User should not be able to create vesting and stake vested balance using createVestingAndStake() if cliff and duration is not set.", async () => {
		await expectRevert(lockedFund.createVestingAndStake({ from: userTwo }), "LockedFund: No Vesting for user available.");
	});
});
