const OriginsAdmin = artifacts.require("OriginsAdmin");

const {
	BN, // Big Number support.
	constants,
	expectRevert, // Assertions for transactions that should fail.
} = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

// Some constants we would be using in the contract.
let zero = new BN(0);
let zeroAddress = constants.ZERO_ADDRESS;

contract("OriginsAdmin (Owner Functions)", (accounts) => {
	let originsAdmin;
	let creator, ownerOne, ownerTwo, ownerThree;
    let verifierOne, verifierTwo, verifierThree, userOne;

	before("Initiating Accounts & Creating Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, ownerOne, ownerTwo, ownerThree, verifierOne, verifierTwo, verifierThree, userOne] = accounts;

        // Creating the instance of OriginsAdmin Contract.
		originsAdmin = await OriginsAdmin.new([ownerOne]);
	});

	it("Owner should be able to add another owner.", async () => {
		await originsAdmin.addOwner(ownerTwo, { from: ownerOne });
        let isAdmin = await originsAdmin.checkOwner(ownerTwo);
        assert.strictEqual(isAdmin, true, "Owner status not udpated correctly.")
	});

	it("Owner should be able to remove an owner.", async () => {
		await originsAdmin.removeOwner(ownerTwo, { from: ownerOne });
        let isAdmin = await originsAdmin.checkOwner(ownerTwo);
        assert.strictEqual(isAdmin, false, "Owner status not udpated correctly.")
	});

	it("Owner should be able to add a verifier.", async () => {
		await originsAdmin.addVerifier(verifierOne, { from: ownerOne });
        let isVerifier = await originsAdmin.checkVerifier(verifierOne);
        assert.strictEqual(isVerifier, true, "Verifier status not udpated correctly.")
	});

	it("Owner should be able to remove a verifier.", async () => {
		await originsAdmin.removeVerifier(verifierOne, { from: ownerOne });
        let isVerifier = await originsAdmin.checkVerifier(verifierOne);
        assert.strictEqual(isVerifier, false, "Verifier status not udpated correctly.")
	});

});
