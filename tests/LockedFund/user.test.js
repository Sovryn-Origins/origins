const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
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
} = require("@openzeppelin/test-helpers");

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
let waitedTS = currentTimestamp();
let unlockTypeImmediate = 1;
let unlockTypeWaited = 2;

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
function currentTimestamp() {
	return Math.floor(Date.now() / 1000);
}

contract("LockedFund (User Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18);

		// Creating the Staking Instance.
		stakingLogic = await StakingLogic.new(token.address);
		staking = await StakingProxy.new(token.address);
		await staking.setImplementation(stakingLogic.address);
		staking = await StakingLogic.at(staking.address);

		// Creating the FeeSharing Instance.
		feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address);

		// Creating the Vesting Instance.
		vestingLogic = await VestingLogic.new();
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		vestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(vestingRegistry.address);
	});

	beforeEach("Creating New Locked Fund Contract Instance.", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [admin]);

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address);
	});

	it("User should not be able to add another admin.", async () => {
		await expectRevert(lockedFund.addAdmin(newAdmin, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to remove an admin.", async () => {
		await expectRevert(lockedFund.removeAdmin(newAdmin, { from: userOne }), "LockedFund: Only admin can call this.");
	});

	it("User should not be able to change the vestingRegistry.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		await expectRevert(
			lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: userOne }),
			"LockedFund: Only admin can call this."
		);
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
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
	});

	it("User should be able to withdraw waited unlocked balance to any wallet using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
	});

	it("User should not be able to withdraw waited unlocked balance before waitedTimestamp using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.changeWaitedTS(currentTimestamp() + 10000, { from: admin });
		await expectRevert(
			lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne }),
			"LockedFund: Wait Timestamp not yet passed."
		);
	});

	it("User should be able to create vesting and stake vested balance using createVestingAndStake().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.createVestingAndStake({ from: userOne });
	});

	it("User should be able to create vesting using createVesting().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.createVesting({ from: userOne });
	});

	it("User should be able to stake vested balance using stakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.stakeTokens({ from: userOne });
	});

	it("User should not be able to stake vested balance using stakeTokens() if vesting is not created previously.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		await expectRevert(lockedFund.stakeTokens({ from: userOne }), "function call to a non-contract account");
	});

	it("User should be able to withdraw waited unlocked balance, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
	});

	it("User should be able to withdraw waited unlocked balance to any wallet, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
	});

	it("User should not be able to create vesting and stake vested balance using createVestingAndStake() if cliff and duration is not set.", async () => {
		await expectRevert(lockedFund.createVestingAndStake({ from: userTwo }), "LockedFund: Cliff and/or Duration not set.");
	});
});
