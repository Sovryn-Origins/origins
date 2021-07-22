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
