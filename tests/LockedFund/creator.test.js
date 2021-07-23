const {
	// External Functions
	expectRevert,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeAndVest,
	// Contract Artifacts
	Token,
	LockedFund,
	VestingRegistry,
} = require("../utils");

const { zero, zeroAddress, zeroBasisPoint, unlockTypeWaited } = require("../constants");

let { cliff, duration, waitedTS } = require("../variable");

contract("LockedFund (Creator Functions)", (accounts) => {
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
