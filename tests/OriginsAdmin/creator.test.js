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
		await expectRevert(originsAdmin.removeVerifier(verifierOne, { from: creator }), "OriginsAdmin: Only owner can call this function.");
	});

});
