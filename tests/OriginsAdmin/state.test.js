const {
	// External Functions
	BN,
	constants,
	expectRevert,
	expectEvent,
	time,
	balance,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeAndVest,
	checkStatus,
	getTokenBalances,
	userMintAndApprove,
	checkTier,
	// Contract Artifacts
	Token,
	LockedFund,
	StakingLogic,
	StakingProxy,
	FeeSharingProxy,
	VestingLogic,
	VestingFactory,
	VestingRegistry,
	OriginsAdmin,
	OriginsBase,
} = require("../utils");

const {
    zero,
    zeroAddress,
    fourWeeks,
    zeroBasisPoint,
    twentyBasisPoint,
    fiftyBasisPoint,
    hundredBasisPoint,
    invalidBasisPoint,
    depositTypeRBTC,
    depositTypeToken,
    unlockTypeNone,
    unlockTypeImmediate,
    unlockTypeWaited,
    saleEndDurationOrTSNone,
    saleEndDurationOrTSUntilSupply,
    saleEndDurationOrTSDuration,
    saleEndDurationOrTSTimestamp,
    verificationTypeNone,
    verificationTypeEveryone,
    verificationTypeByAddress,
    transferTypeNone,
    transferTypeUnlocked,
    transferTypeWaitedUnlock,
    transferTypeVested,
    transferTypeLocked,
} = require("../constants");

let {
    cliff,
    duration,
    waitedTS,
	firstMinAmount,
	firstMaxAmount,
	firstRemainingTokens,
	firstSaleStartTS,
	firstSaleEnd,
	firstUnlockedBP,
	firstVestOrLockCliff,
	firstVestOfLockDuration,
	firstDepositRate,
	firstDepositToken,
	firstDepositType,
	firstVerificationType,
	firstSaleEndDurationOrTS,
	firstTransferType,
	secondMinAmount,
	secondMaxAmount,
	secondRemainingTokens,
	secondSaleStartTS,
	secondSaleEnd,
	secondUnlockedBP,
	secondVestOrLockCliff,
	secondVestOfLockDuration,
	secondDepositRate,
	secondDepositToken,
	secondDepositType,
	secondVerificationType,
	secondSaleEndDurationOrTS,
	secondTransferType,
} = require("../variable");

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
		let isAdmin = await originsAdmin.checkOwner(ownerTwo);
		assert.strictEqual(isAdmin, true, "Owner status not udpated correctly.");
	});

	it("Owner should be able to remove an owner.", async () => {
		await originsAdmin.removeOwner(ownerTwo, { from: ownerOne });
		let isAdmin = await originsAdmin.checkOwner(ownerTwo);
		assert.strictEqual(isAdmin, false, "Owner status not udpated correctly.");
	});

	it("Owner should be able to add a verifier.", async () => {
		await originsAdmin.addVerifier(verifierOne, { from: ownerOne });
		let isVerifier = await originsAdmin.checkVerifier(verifierOne);
		assert.strictEqual(isVerifier, true, "Verifier status not udpated correctly.");
	});

	it("Owner should be able to remove a verifier.", async () => {
		await originsAdmin.removeVerifier(verifierOne, { from: ownerOne });
		let isVerifier = await originsAdmin.checkVerifier(verifierOne);
		assert.strictEqual(isVerifier, false, "Verifier status not udpated correctly.");
	});

	it("Owner should be able to get owner list.", async () => {
		let owners = await originsAdmin.getOwners({ from: ownerOne });
		assert.strictEqual(owners[0], ownerOne, "Owner address incorrect.");
	});

	it("Owner should be able to get verifier list.", async () => {
		await originsAdmin.addVerifier(verifierOne, { from: ownerOne });
		let verifiers = await originsAdmin.getVerifiers({ from: ownerOne });
		assert.strictEqual(verifiers[0], verifierOne, "Verifier address incorrect.");
	});
});
