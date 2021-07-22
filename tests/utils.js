// Independent Variables
let { saleEndDurationOrTSDuration, saleEndDurationOrTSTimestamp } = require("./variable.js");

// Independent Constants

const { zeroAddress, fourWeeks } = require("./constants.js");

// External Functions

const {
	BN, // Big Number support.
	constants,
	expectRevert, // Assertions for transactions that should fail.
	expectEvent,
	time,
	balance,
} = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

// Custom Functions

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
async function currentTimestamp() {
	let timestamp = await time.latest();
	return timestamp;
}
/**
 * Function to create staking and vesting details.
 */
async function createStakeAndVest(creator, token) {
	// Creating the Staking Instance.
	stakingLogic = await StakingLogic.new(token.address, { from: creator });
	staking = await StakingProxy.new(token.address, { from: creator });
	await staking.setImplementation(stakingLogic.address, { from: creator });
	staking = await StakingLogic.at(staking.address);

	// Creating the FeeSharing Instance.
	feeSharingProxy = await FeeSharingProxy.new(zeroAddress, staking.address, { from: creator });

	// Creating the Vesting Instance.
	vestingLogic = await VestingLogic.new({ from: creator });
	vestingFactory = await VestingFactory.new(vestingLogic.address, { from: creator });
	vestingRegistry = await VestingRegistry.new(
		vestingFactory.address,
		token.address,
		staking.address,
		feeSharingProxy.address,
		creator, // This should be Governance Timelock Contract.
		{ from: creator }
	);
	vestingFactory.transferOwnership(vestingRegistry.address, { from: creator });

	return [staking, vestingLogic, vestingRegistry];
}

/**
 * Function to check the contract state.
 *
 * @param contractInstance The contract instance.
 * @param checkArray The items to be checked.
 * @param userAddr The user address for any particular check.
 * @param waitedTS Whether the waited unlock started or not.
 * @param token The token address which is being locked, unlocked, vested, etc.
 * @param cliff Wait period after which locked token starts unlocking, represented in 4 weeks duration. 2 means 8 weeks.
 * @param duration Duration of the entire staking, represented similar to cliff.
 * @param vestingRegistry The vesting registry address.
 * @param vestedBalance The vested balance of the `userAddr`.
 * @param lockedBalance The locked balance of the `userAddr`.
 * @param waitedUnlockedBalance The waited unlocked balance of the `userAddr`.
 * @param unlockedBalance The unlocked balance of the `userAddr`.
 * @param isAdmin True if `userAddr` is an admin, false otherwise.
 */
async function checkStatus(
	contractInstance,
	checkArray,
	userAddr,
	waitedTS,
	token,
	cliff,
	duration,
	vestingRegistry,
	vestedBalance,
	lockedBalance,
	waitedUnlockedBalance,
	unlockedBalance,
	isAdmin
) {
	if (checkArray[0] == 1) {
		let cValue = await contractInstance.getWaitedTS();
		assert.equal(waitedTS, cValue.toNumber(), "The waited timestamp does not match.");
	}
	if (checkArray[1] == 1) {
		let cValue = await contractInstance.getToken();
		assert.strictEqual(token, cValue, "The token does not match.");
	}
	if (checkArray[2] == 1) {
		let cValue = await contractInstance.cliff(userAddr);
		assert.equal(cliff, cValue.toNumber() / fourWeeks, "The cliff does not match.");
	}
	if (checkArray[3] == 1) {
		let cValue = await contractInstance.duration(userAddr);
		assert.equal(duration, cValue.toNumber() / fourWeeks, "The duration does not match.");
	}
	if (checkArray[4] == 1) {
		let cValue = await contractInstance.getVestingDetails();
		assert.strictEqual(vestingRegistry, cValue, "The vesting registry does not match.");
	}
	if (checkArray[5] == 1) {
		let cValue = await contractInstance.getVestedBalance(userAddr);
		assert.equal(vestedBalance, cValue.toNumber(), "The vested balance does not match.");
	}
	if (checkArray[6] == 1) {
		let cValue = await contractInstance.getLockedBalance(userAddr);
		assert.equal(lockedBalance, cValue.toNumber(), "The locked balance does not match.");
	}
	if (checkArray[7] == 1) {
		let cValue = await contractInstance.getWaitedUnlockedBalance(userAddr);
		assert.equal(waitedUnlockedBalance, cValue.toNumber(), "The waited unlocked balance does not match.");
	}
	if (checkArray[8] == 1) {
		let cValue = await contractInstance.getUnlockedBalance(userAddr);
		assert.equal(unlockedBalance, cValue.toNumber(), "The unlocked balance does not match.");
	}
	if (checkArray[9] == 1) {
		let cValue = await contractInstance.adminStatus(userAddr);
		assert.equal(isAdmin, cValue, "The admin status does not match.");
	}
}

/**
 * Function to get the current token balance in contract & wallet.
 * It expects user address along with contract & token instances as parameters.
 *
 * @param addr The user/contract address.
 * @param tokenContract The Token Contract.
 * @param lockedFundContract The Locked Fund Contract.
 *
 * @return [Token Balance, Vested Balance, Locked Balance, Waited Unlocked Balance, Unlocked Balance].
 */
async function getTokenBalances(addr, tokenContract, lockedFundContract) {
	let tokenBal = await tokenContract.balanceOf(addr);
	let vestedBal = await lockedFundContract.getVestedBalance(addr);
	let lockedBal = await lockedFundContract.getLockedBalance(addr);
	let waitedUnlockedBal = await lockedFundContract.getWaitedUnlockedBalance(addr);
	let unlockedBal = await lockedFundContract.getUnlockedBalance(addr);
	return [tokenBal, vestedBal, lockedBal, waitedUnlockedBal, unlockedBal];
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
		assert(tierPartA._saleEnd.eq(new BN(Number(_saleStartTS) + Number(_saleEnd))), "Sale End TS is not correctly set.");
	} else if (tierPartB._saleEndDurationOrTS == saleEndDurationOrTSTimestamp) {
		assert(tierPartA._saleEnd.eq(new BN(_saleEnd)), "Sale End TS is not correctly set.");
	}
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

// Contract Artifacts
const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
const StakingLogic = artifacts.require("Staking");
const StakingProxy = artifacts.require("StakingProxy");
const FeeSharingProxy = artifacts.require("FeeSharingProxyMockup");
const VestingLogic = artifacts.require("VestingLogic");
const VestingFactory = artifacts.require("VestingFactory");
const VestingRegistry = artifacts.require("VestingRegistry3");
const OriginsAdmin = artifacts.require("OriginsAdmin");
const OriginsBase = artifacts.require("OriginsBase");

module.exports = {
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
};
