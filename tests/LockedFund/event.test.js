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
	expectEvent,
	constants, // Assertions for transactions that should fail.
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

contract("LockedFund (Events)", (accounts) => {
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

	it("Adding another admin should emit AdminAdded.", async () => {
		let txReceipt = await lockedFund.addAdmin(newAdmin, { from: admin });
		expectEvent(txReceipt, "AdminAdded", {
			_initiator: admin,
			_newAdmin: newAdmin,
		});
	});

	it("Removing another admin should emit AdminRemoved.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		let txReceipt = await lockedFund.removeAdmin(newAdmin, { from: admin });
		expectEvent(txReceipt, "AdminRemoved", {
			_initiator: admin,
			_removedAdmin: newAdmin,
		});
	});

	it("Changing the vestingRegistry should emit VestingRegistryUpdated.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		let txReceipt = await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		expectEvent(txReceipt, "VestingRegistryUpdated", {
			_initiator: admin,
			_vestingRegistry: newVestingRegistry.address,
		});
	});

	it("Changing the waited timestamp should emit WaitedTSUpdated.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		let txReceipt = await lockedFund.changeWaitedTS(newWaitedTS, { from: admin });
		expectEvent(txReceipt, "WaitedTSUpdated", {
			_initiator: admin,
			_waitedTS: new BN(newWaitedTS),
		});
	});

	it("Depositing using depositVested() should emit VestedDeposited.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		let txReceipt = await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		expectEvent(txReceipt, "VestedDeposited", {
			_initiator: admin,
			_userAddress: userOne,
			_amount: new BN(value),
			_cliff: new BN(cliff),
			_duration: new BN(duration),
			_basisPoint: new BN(zeroBasisPoint),
		});
	});

	it("Withdrawing waited unlocked balance using withdrawWaitedUnlockedBalance() should emit Withdrawn.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		let txReceipt = await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
		expectEvent(txReceipt, "Withdrawn", {
			_initiator: userOne,
			_userAddress: userOne,
			_amount: new BN(Math.floor(value / 2)),
		});
	});

	it("Withdrawing waited unlocked balance to another wallet using withdrawWaitedUnlockedBalance() should emit Withdrawn.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, { from: admin });
		let txReceipt = await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
		expectEvent(txReceipt, "Withdrawn", {
			_initiator: userOne,
			_userAddress: userTwo,
			_amount: new BN(Math.floor(value / 2)),
		});
	});

	it("Creating vesting and staking vested balance using createVestingAndStake() should emit VestingCreated and TokenStaked.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		let txReceipt = await lockedFund.createVestingAndStake({ from: userOne });
		let vestingAddress = await vestingRegistry.getVesting(userOne);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(value),
		});
	});

	it("Creating vesting using createVesting() should emit VestingCreated.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		let txReceipt = await lockedFund.createVesting({ from: userOne });
		let vestingAddress = await vestingRegistry.getVesting(userOne);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
	});

	it("Staking vested balance using stakeTokens() should emit TokenStaked.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
		let vestingAddress = await vestingRegistry.getVesting(userOne);
		let txReceipt = await lockedFund.stakeTokens({ from: userOne });
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(value),
		});
	});

	it("Wthdrawing waited unlocked balance, creating vesting and staking vested balance using withdrawAndStakeTokens() should emit Withdrawn, VestingCreated and TokenStaked.", async () => {
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
		let txReceipt = await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
		expectEvent(txReceipt, "Withdrawn", {
			_initiator: userOne,
			_userAddress: userOne,
			_amount: new BN(Math.floor(value / 2)),
		});
		let vestingAddress = await newVestingRegistry.getVesting(userOne);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(Math.ceil(value / 2)),
		});
	});

	it("Withdrawing waited unlocked balance to any wallet, creating vesting and staking vested balance using withdrawAndStakeTokens() should emit Withdrawn, VestingCreated and TokenStaked.", async () => {
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
		let txReceipt = await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
		expectEvent(txReceipt, "Withdrawn", {
			_initiator: userOne,
			_userAddress: userTwo,
			_amount: new BN(Math.floor(value / 2)),
		});
		let vestingAddress = await newVestingRegistry.getVesting(userOne);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(Math.ceil(value / 2)),
		});
	});

});
