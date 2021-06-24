const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
const OriginsBase = artifacts.require("OriginsBase");
const StakingLogic = artifacts.require("Staking");
const StakingProxy = artifacts.require("StakingProxy");
const FeeSharingProxy = artifacts.require("FeeSharingProxyMockup");
const VestingLogic = artifacts.require("VestingLogic");
const VestingFactory = artifacts.require("VestingFactory");
const VestingRegistry = artifacts.require("VestingRegistry3");

const {
	BN, // Big Number support.
	balance,
	constants,
	expectRevert, // Assertions for transactions that should fail.
} = require("@openzeppelin/test-helpers");
const { current } = require("@openzeppelin/test-helpers/src/balance");

const { assert } = require("chai");

// Some constants we would be using in the contract.
let zero = new BN(0);
let zeroAddress = constants.ZERO_ADDRESS;
let cliff = 1; // This is in 4 weeks. i.e. 1 * 4 weeks.
let duration = 11; // This is in 4 weeks. i.e. 11 * 4 weeks.
let zeroBasisPoint = 0;
let twentyBasisPoint = 2000;
let fiftyBasisPoint = 5000;
let hundredBasisPoint = 10000;
let invalidBasisPoint = 10001;
let waitedTS = currentTimestamp();
let depositTypeRBTC = 0;
let depositTypeToken = 1;
let saleEndDurationOrTSNone = 0;
let saleEndDurationOrTSUntilSupply = 1;
let saleEndDurationOrTSDuration = 2;
let saleEndDurationOrTSTimestamp = 3;
let verificationTypeNone = 0;
let verificationTypeEveryone = 1;
let verificationTypeByAddress = 2;
let transferTypeNone = 0;
let transferTypeUnlocked = 1;
let transferTypeWaitedUnlock = 2;
let transferTypeVested = 3;
let transferTypeLocked = 4;
let firstVerificationType = verificationTypeByAddress;
let [firstDepositRate, firstDepositToken, firstDepositType] = [100, zeroAddress, depositTypeRBTC];
let firstMinAmount = 1;
let firstMaxAmount = new BN(50000);
let firstRemainingTokens = new BN(6000000);
let [firstUnlockedBP, firstVestOrLockCliff, firstVestOfLockDuration, firstTransferType] = [0, 1, 11, transferTypeVested];
let [firstSaleStartTS, firstSaleEnd, firstSaleEndDurationOrTS] = [currentTimestamp(), 86400, saleEndDurationOrTSDuration];
let [
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
] = [
	1,
	new BN(75000),
	new BN(10000000),
	currentTimestamp(),
	86400,
	5000,
	1,
	11,
	50,
	zeroAddress,
	depositTypeRBTC,
	verificationTypeEveryone,
	saleEndDurationOrTSDuration,
	transferTypeVested,
];

/**
 * Function to create a random value.
 * It expects no parameter.
 *
 * @return {number} Random Value.
 */
function randomValue() {
	return Math.floor(Math.random() * 10000) + 10000;
}

/**
 * Function to get back the current timestamp in seconds.
 * It expects no parameter.
 *
 * @return {number} Current Unix Timestamp.
 */
function currentTimestamp() {
	return Math.floor(Date.now() / 1000);
}

/**
 * Mints random token for user account and then approve a contract.
 *
 * @param tokenContract The Token Contract.
 * @param userAddr User Address.
 * @param toApprove User Address who is approved.
 *
 * @returns value The token amount which was minted by user.
 */
async function userMintAndApprove(tokenContract, userAddr, toApprove) {
	let value = randomValue();
	await tokenContract.mint(userAddr, value);
	await tokenContract.approve(toApprove, value, { from: userAddr });
	return value;
}

/**
 * Checks Tier Details.
 */
async function checkTier(
	_originsBase,
	_tierCount,
	_minAmount,
	_maxAmount,
	_remainingTokens,
	_saleStartTS,
	_saleEnd,
	_unlockedTokenWithdrawTS,
	_unlockedBP,
	_vestOrLockCliff,
	_vestOrLockDuration,
	_depositRate,
	_depositToken,
	_depositType,
	_verificationType,
	_saleEndDurationOrTS,
	_transferType
) {
	let tierPartA = await _originsBase.readTierPartA(_tierCount);
	let tierPartB = await _originsBase.readTierPartB(_tierCount);
	assert(tierPartA._minAmount.eq(new BN(_minAmount)), "Minimum Amount is not correctly set.");
	assert(tierPartA._maxAmount.eq(new BN(_maxAmount)), "Maximum Amount is not correctly set.");
	assert(tierPartA._remainingTokens.eq(new BN(_remainingTokens)), "Remaining Token is not correctly set.");
	assert(tierPartA._saleStartTS.eq(new BN(_saleStartTS)), "Sale Start TS is not correctly set.");
	if (tierPartB._saleEndDurationOrTS == saleEndDurationOrTSDuration) {
		assert(tierPartA._saleEnd.eq(new BN(_saleStartTS + _saleEnd)), "Sale End TS is not correctly set.");
	} else if (tierPartB._saleEndDurationOrTS == saleEndDurationOrTSTimestamp) {
		assert(tierPartA._saleEnd.eq(new BN(_saleEnd)), "Sale End TS is not correctly set.");
	}
	assert(tierPartA._unlockedTokenWithdrawTS.eq(new BN(_unlockedTokenWithdrawTS)), "Unlocked Token Withdraw TS is not correctly set.");
	assert(tierPartA._unlockedBP.eq(new BN(_unlockedBP)), "Unlocked Basis Point is not correctly set.");
	assert(tierPartA._vestOrLockCliff.eq(new BN(_vestOrLockCliff)), "Vest or Lock Cliff is not correctly set.");
	assert(tierPartA._vestOrLockDuration.eq(new BN(_vestOrLockDuration)), "Vest or Lock Duration is not correctly set.");
	assert(tierPartA._depositRate.eq(new BN(_depositRate)), "Deposit Rate is not correctly set.");
	assert.strictEqual(tierPartB._depositToken, _depositToken, "Deposit Token is not correctly set.");
	assert(tierPartB._depositType.eq(new BN(_depositType)), "Deposit Type is not correctly set.");
	assert(tierPartB._verificationType.eq(new BN(_verificationType)), "Verification Type is not correctly set.");
	assert(tierPartB._saleEndDurationOrTS.eq(new BN(_saleEndDurationOrTS)), "Sale End Duration or TS is not correctly set.");
	assert(tierPartB._transferType.eq(new BN(_transferType)), "Transfer Type is not correctly set.");
}

contract("OriginsBase (State Functions)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic, originsBase;
	let creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr;
	let tierCount;

	before("Initiating Accounts & Creating Test Contract Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 9, "Alteast 9 accounts are required to test the contracts.");
		[creator, owner, newOwner, userOne, userTwo, userThree, verifier, depositAddr, newDepositAddr] = accounts;

		// Creating the instance of Test Token.
		token = await Token.new(zero);

		// Creating the Staking Instance.
		stakingLogic = await StakingLogic.new(token.address);
		staking = await StakingProxy.new(token.address);
		await staking.setImplementation(stakingLogic.address);
		staking = await StakingLogic.at(staking.address);

		// Creating the FeeSharing Instance.
		feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address);

		// Creating the Vesting Instance.
		vestingLogic = await VestingLogic.new();
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		vestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(vestingRegistry.address);

		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);

		// Creating the instance of OriginsBase Contract.
		originsBase = await OriginsBase.new([owner], token.address, depositAddr);

		// Setting lockedFund in Origins.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });

		// Added Origins as an admin of LockedFund.
		await lockedFund.addAdmin(originsBase.address, { from: owner });

		// Setting Verifier in Origins.
		await originsBase.addVerifier(verifier, { from: owner });

		// Creating a new tier.
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();

		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
	});

	beforeEach("Creating New OriginsBase Contract Instance.", async () => {});

	it("Setting a deposit address should update the state.", async () => {
		await originsBase.setDepositAddress(newDepositAddr, { from: owner });
		let cDepositAddr = await originsBase.getDepositAddress();
		assert.strictEqual(cDepositAddr, newDepositAddr, "Deposit Address is not correctly set.");

		// Resetting it for other tests.
		await originsBase.setDepositAddress(depositAddr, { from: owner });
	});

	it("Setting Locked Fund Contract should update the state.", async () => {
		let newLockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [owner]);
		await originsBase.setLockedFund(newLockedFund.address, { from: owner });
		let cLockedFund = await originsBase.getLockDetails();
		assert.strictEqual(cLockedFund, newLockedFund.address, "Locked Fund Contract is not correctly set.");

		// Resetting it for other tests.
		await originsBase.setLockedFund(lockedFund.address, { from: owner });
	});

	it("Adding a new tier should update the state correctly.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Verification Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierVerification(tierCount, secondVerificationType, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			secondVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Deposit Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierDeposit(tierCount, secondDepositRate, secondDepositToken, secondDepositType, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			secondDepositRate,
			secondDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Token Limit Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierTokenLimit(tierCount, secondMinAmount, secondMaxAmount, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			secondMinAmount,
			secondMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Token Amount Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await token.mint(owner, secondRemainingTokens);
		await token.approve(originsBase.address, secondRemainingTokens, { from: owner });
		await originsBase.setTierTokenAmount(tierCount, secondRemainingTokens, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			secondRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Owner should be able to set Tier Vest or Lock Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierVestOrLock(
			tierCount,
			secondVestOrLockCliff,
			secondVestOfLockDuration,
			waitedTS,
			secondUnlockedBP,
			secondTransferType,
			{ from: owner }
		);
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			waitedTS,
			secondUnlockedBP,
			secondVestOrLockCliff,
			secondVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			secondTransferType
		);
	});

	it("Owner should be able to set Tier Time Parameters.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.setTierTime(tierCount, secondSaleStartTS, secondSaleEnd, secondSaleEndDurationOrTS, { from: owner });
		await checkTier(
			originsBase,
			tierCount,
			zero,
			firstMaxAmount,
			firstRemainingTokens,
			secondSaleStartTS,
			secondSaleEnd,
			zero,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositToken,
			firstDepositType,
			firstVerificationType,
			secondSaleEndDurationOrTS,
			firstTransferType
		);
	});

	it("Verifier should be able to verify a single address to a single tier.", async () => {
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a single address to a multiple tier.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.singleAddressMultipleTierVerification(userOne, [tierCount, tierCount - 1, tierCount - 2], { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userOne, tierCount - 1);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userOne, tierCount - 2);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a multiple address to a single tier.", async () => {
		await originsBase.multipleAddressSingleTierVerification([userOne, userTwo, userThree], tierCount, { from: verifier });
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userTwo, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userThree, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("Verifier should be able to verify a multiple address to a multiple tier.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.multipleAddressAndTierVerification([userOne, userTwo, userThree], [tierCount, tierCount - 1, tierCount - 2], {
			from: verifier,
		});
		let currentStatus = await originsBase.isAddressApproved(userOne, tierCount);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userTwo, tierCount - 1);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
		currentStatus = await originsBase.isAddressApproved(userThree, tierCount - 2);
		assert.strictEqual(currentStatus, true, "Address Verification invalid");
	});

	it("User should be able to buy tokens.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			firstVerificationType,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		await originsBase.addressVerification(userOne, tierCount, { from: verifier });
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		assert(userVestedBalance.eq(new BN(amount).mul(new BN(firstDepositRate))), "User Vesting Balance is wrong.");
	});

	it("User should be able to buy tokens multiple times until max asset amount reaches.", async () => {
		let amount = 10000;
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		assert(userVestedBalance.eq(new BN(amount).mul(new BN(4)).mul(new BN(firstDepositRate))), "User Vesting Balance is wrong.");
	});

	it("User should be refunded the extra after the max reaches.", async () => {
		let amount = 20000;
		let oldBalance = await balance.current(userOne);
		let tx = await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		let gasUsed = tx.receipt.gasUsed;
		let gasPrice = (await web3.eth.getTransaction(tx.tx)).gasPrice;
		let newBalance = await balance.current(userOne);
		newBalance = newBalance.add(new BN(gasUsed).mul(new BN(gasPrice)));
		let userVestedBalance = await lockedFund.getVestedBalance(userOne);
		assert(oldBalance.sub(newBalance).eq(new BN(10000)), "User not returned enough.");
		assert(userVestedBalance.eq(firstMaxAmount.mul(new BN(firstDepositRate))), "User Vested Balance is wrong.");
	});

	it("Owner should be able to withdraw the sale deposit to deposit address.", async () => {
		await token.mint(owner, firstRemainingTokens);
		await token.approve(originsBase.address, firstRemainingTokens, { from: owner });
		await originsBase.createTier(
			firstMaxAmount,
			firstRemainingTokens,
			firstSaleStartTS,
			firstSaleEnd,
			firstUnlockedBP,
			firstVestOrLockCliff,
			firstVestOfLockDuration,
			firstDepositRate,
			firstDepositType,
			verificationTypeEveryone,
			firstSaleEndDurationOrTS,
			firstTransferType,
			{ from: owner }
		);
		tierCount = await originsBase.getTierCount();
		let amount = 20000;
		await token.mint(userOne, amount);
		await token.approve(originsBase.address, amount, { from: userOne });
		await originsBase.buy(tierCount, zero, { from: userOne, value: amount });
		amount = 20000;
		await token.mint(userTwo, amount);
		await token.approve(originsBase.address, amount, { from: userTwo });
		await originsBase.buy(tierCount, zero, { from: userTwo, value: amount });
		amount = 20000;
		await token.mint(userThree, amount);
		await token.approve(originsBase.address, amount, { from: userThree });
		await originsBase.buy(tierCount, zero, { from: userThree, value: amount });
		let oldBalance = await balance.current(depositAddr);
		await originsBase.withdrawSaleDeposit({ from: owner });
		let newBalance = await balance.current(depositAddr);
		assert(newBalance.sub(oldBalance).eq(new BN(60000)), "Admin did not received the total sale proceedings.");
	});
});
