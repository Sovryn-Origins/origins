const {
	// External Functions
	expectRevert,
	assert,
	// Contract Artifacts
	OriginsAdmin,
} = require("../utils");

const {
	zeroAddress,
} = require("../constants");

contract("OriginsAdmin (Owner Functions)", (accounts) => {
	let originsAdmin;
	let creator, ownerOne, ownerTwo, ownerThree;
	let verifierOne, verifierTwo, verifierThree, userOne;

	before("Initiating Accounts & Creating Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, ownerOne, ownerTwo, ownerThree, verifierOne, verifierTwo, verifierThree, userOne] = accounts;

		// Creating the instance of OriginsAdmin Contract.
		originsAdmin = await OriginsAdmin.new([ownerOne], { from: creator });
	});

	it("Owner should be able to add another owner.", async () => {
		await originsAdmin.addOwner(ownerTwo, { from: ownerOne });
	});

	it("Owner should not be able to add zero address as another owner.", async () => {
		await expectRevert(originsAdmin.addOwner(zeroAddress, { from: ownerOne }), "OriginsAdmin: Invalid Address.");
	});

	it("Owner should not be able to add another owner more than once.", async () => {
		await expectRevert(originsAdmin.addOwner(ownerTwo, { from: ownerOne }), "OriginsAdmin: Address is already an owner.");
	});

	it("Owner should be able to remove an owner.", async () => {
		await originsAdmin.removeOwner(ownerTwo, { from: ownerOne });
	});

	it("Owner should not be able to call removeOwner() with a normal user address.", async () => {
		await expectRevert(originsAdmin.removeOwner(userOne, { from: ownerOne }), "OriginsAdmin: Address is not an owner.");
	});

	it("Owner should be able to add a verifier.", async () => {
		await originsAdmin.addVerifier(verifierOne, { from: ownerOne });
	});

	it("Owner should not be able to add zero address as a verifier.", async () => {
		await expectRevert(originsAdmin.addVerifier(zeroAddress, { from: ownerOne }), "OriginsAdmin: Invalid Address.");
	});

	it("Owner should not be able to add another verifier more than once.", async () => {
		await expectRevert(originsAdmin.addVerifier(verifierOne, { from: ownerOne }), "OriginsAdmin: Address is already a verifier.");
	});

	it("Owner should be able to remove a verifier.", async () => {
		await originsAdmin.removeVerifier(verifierOne, { from: ownerOne });
	});

	it("Owner should not be able to call removeVerifier() with a normal user address.", async () => {
		await expectRevert(originsAdmin.removeVerifier(userOne, { from: ownerOne }), "OriginsAdmin: Address is not a verifier.");
	});
});
