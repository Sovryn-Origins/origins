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
		await expectRevert(originsAdmin.removeVerifier(verifierOne, { from: creator }), "OriginsAdmin: Only owner can call this function.");
	});
});
