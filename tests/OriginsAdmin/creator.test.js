const {
	// External Functions
	expectRevert,
	assert,
	// Contract Artifacts
	OriginsAdmin,
} = require("../utils");

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

	it("Creator should not be able to create an instance with same owner address twice.", async () => {
		await expectRevert(OriginsAdmin.new([ownerOne, ownerOne], { from: creator }), "OriginsAdmin: Each owner can be added only once.");
	});

	it("Creator should not be able to add another owner.", async () => {
		await expectRevert(originsAdmin.addOwner(ownerTwo, { from: creator }), "OriginsAdmin: Only owner can call this function.");
	});

	it("Creator should not be able to remove an owner.", async () => {
		await expectRevert(originsAdmin.removeOwner(ownerTwo, { from: creator }), "OriginsAdmin: Only owner can call this function.");
	});

	it("Creator should not be able to add a verifier.", async () => {
		await expectRevert(originsAdmin.addVerifier(verifierOne, { from: creator }), "OriginsAdmin: Only owner can call this function.");
	});

	it("Creator should not be able to remove a verifier.", async () => {
		await expectRevert(
			originsAdmin.removeVerifier(verifierOne, { from: creator }),
			"OriginsAdmin: Only owner or verifier himself can call this function."
		);
	});
});
