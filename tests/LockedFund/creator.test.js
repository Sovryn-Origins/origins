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

contract("LockedFund (Creator Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking Instance.
		stakingLogic = await StakingLogic.new(token.address, { from: creator });
		staking = await StakingProxy.new(token.address, { from: creator });
		await staking.setImplementation(stakingLogic.address, { from: creator });
		staking = await StakingLogic.at(staking.address);

		// Creating the FeeSharing Instance.
		feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address, { from: creator });

		// Creating the Vesting Instance.
		vestingLogic = await VestingLogic.new({ from: creator });
		vestingFactory = await VestingFactory.new(vestingLogic.address, { from: creator });
		vestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator, // This should be Governance Timelock Contract.
			{ from: creator }
		);
		vestingFactory.transferOwnership(vestingRegistry.address, { from: creator });
	});

	beforeEach("Creating New Locked Fund Contract Instance.", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [admin], { from: creator });

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address, { from: creator });
	});

	it("Creator should not be able to create a lockedFund contract with zero as waited timestamp.", async () => {
		await expectRevert(
			LockedFund.new(0, token.address, vestingRegistry.address, [admin], { from: creator }),
			"LockedFund: Waited TS cannot be zero."
		);
	});

	it("Creator should not be able to create a lockedFund contract with zero address for token.", async () => {
		await expectRevert(
			LockedFund.new(waitedTS, zeroAddress, vestingRegistry.address, [admin], { from: creator }),
			"LockedFund: Invalid Token Address."
		);
	});

	it("Creator should not be able to create a lockedFund contract with zero address as vesting registry.", async () => {
		await expectRevert(
			LockedFund.new(waitedTS, token.address, zeroAddress, [admin], { from: creator }),
			"LockedFund: Vesting registry address is invalid."
		);
	});

	it("Creator should not be able to create a lockedFund contract with invalid admin address.", async () => {
		await expectRevert(
			LockedFund.new(waitedTS, token.address, vestingRegistry.address, [zeroAddress], { from: creator }),
			"LockedFund: Invalid Address."
		);
	});

	it("Creator should not be able to add another admin.", async () => {
		await expectRevert(lockedFund.addAdmin(newAdmin, { from: creator }), "LockedFund: Only admin can call this.");
	});

	it("Creator should not be able to remove an admin.", async () => {
		await expectRevert(lockedFund.removeAdmin(newAdmin, { from: creator }), "LockedFund: Only admin can call this.");
	});

	it("Creator should not be able to change the vestingRegistry.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		await expectRevert(
			lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: creator }),
			"LockedFund: Only admin can call this."
		);
	});

	it("Creator should not be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		await expectRevert(lockedFund.changeWaitedTS(newWaitedTS, { from: creator }), "LockedFund: Only admin can call this.");
	});

	it("Creator should not be able to deposit using depositVested().", async () => {
		let value = randomValue();
		token.mint(creator, value, { from: creator });
		token.approve(lockedFund.address, value, { from: creator });
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: creator }),
			"LockedFund: Only admin can call this."
		);
	});
});
