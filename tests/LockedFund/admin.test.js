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

const { zero, zeroAddress, zeroBasisPoint, invalidBasisPoint, unlockTypeWaited } = require("../constants");

let { cliff, duration, waitedTS } = require("../variable");

contract("LockedFund (Admin Functions)", (accounts) => {
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
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, { from: admin });
	});

	it("Admin should not be able to deposit using depositWaitedUnlocked() with invalid basis point.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await expectRevert(
			lockedFund.depositWaitedUnlocked(userOne, value, invalidBasisPoint, { from: admin }),
			"LockedFund: Basis Point has to be less than 10000."
		);
	});

	it("Admin should not be able to deposit with the duration as zero.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, zero, zeroBasisPoint, unlockTypeWaited, { from: admin }),
			"LockedFund: Duration cannot be zero."
		);
	});

	it("Admin should not be able to deposit with the duration higher than max allowed.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, 100, zeroBasisPoint, unlockTypeWaited, { from: admin }),
			"LockedFund: Duration is too long."
		);
	});

	it("Admin should not be able to deposit with basis point higher than max allowed.", async () => {
		let value = randomValue();
		await expectRevert(
			lockedFund.depositVested(userOne, value, cliff, duration, invalidBasisPoint, unlockTypeWaited, { from: admin }),
			"LockedFund: Basis Point has to be less than 10000."
		);
	});
});
