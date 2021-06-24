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

contract("LockedFund (Admin Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		// Creating the instance of Test Token.
		token = await Token.new(zero);

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

	it("Admin should be able to add another admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
	});

	it("Admin should not be able to add zero address as another admin.", async () => {
		await expectRevert(lockedFund.addAdmin(zeroAddress, { from: admin }), "LockedFund: Invalid Address.");
	});

	it("Admin should not be able to add another admin more than once.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await expectRevert(lockedFund.addAdmin(newAdmin, { from: admin }), "LockedFund: Address is already admin.");
	});

	it("Admin should be able to remove an admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await lockedFund.removeAdmin(newAdmin, { from: admin });
	});

	it("Admin should not be able to call removeAdmin() with a normal user address.", async () => {
		await expectRevert(lockedFund.removeAdmin(userOne, { from: admin }), "LockedFund: Address is not an admin.");
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
	});

	it("Admin should not be able to change the vestingRegistry as a zero address.", async () => {
		await expectRevert(
			lockedFund.changeVestingRegistry(zeroAddress, { from: admin }),
			"LockedFund: Vesting registry address is invalid."
		);
	});

	it("Admin should be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		await lockedFund.changeWaitedTS(newWaitedTS, { from: admin });
	});

	it("Admin should not be able to change the waited TS as zero.", async () => {
		await expectRevert(lockedFund.changeWaitedTS(zero, { from: admin }), "LockedFund: Waited TS cannot be zero.");
	});

	it("Admin should be able to deposit using depositVested().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, { from: admin });
	});

	it("Admin should not be able to deposit with the duration as zero.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, zero, zeroBasisPoint, { from: admin }),
			"LockedFund: Duration cannot be zero."
		);
	});

	it("Admin should not be able to deposit with the duration higher than max allowed.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, 100, zeroBasisPoint, { from: admin }),
			"LockedFund: Duration is too long."
		);
	});

	it("Admin should not be able to deposit with basis point higher than max allowed.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, duration, invalidBasisPoint, { from: admin }),
			"LockedFund: Basis Point has to be less than 10000."
		);
	});
});
