const {
	// External Functions
	expectEvent,
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

	it("Adding another owner should emit OwnerAdded.", async () => {
		let txReceipt = await originsAdmin.addOwner(ownerTwo, { from: ownerOne });
		expectEvent(txReceipt, "OwnerAdded", {
			_initiator: ownerOne,
			_newOwner: ownerTwo,
		});
	});

	it("Remove an owner should emit OwnerRemoved.", async () => {
		let txReceipt = await originsAdmin.removeOwner(ownerTwo, { from: ownerOne });
		expectEvent(txReceipt, "OwnerRemoved", {
			_initiator: ownerOne,
			_removedOwner: ownerTwo,
		});
	});

	it("Adding a verifier should emit VerifierAdded.", async () => {
		let txReceipt = await originsAdmin.addVerifier(verifierOne, { from: ownerOne });
		expectEvent(txReceipt, "VerifierAdded", {
			_initiator: ownerOne,
			_newVerifier: verifierOne,
		});
	});

	it("Removing a verifier should emit VerifierRemoved.", async () => {
		let txReceipt = await originsAdmin.removeVerifier(verifierOne, { from: ownerOne });
		expectEvent(txReceipt, "VerifierRemoved", {
			_initiator: ownerOne,
			_removedVerifier: verifierOne,
		});
	});
});
