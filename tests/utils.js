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
 * Function to create staking, vesting and Locked Fund contracts.
 *
 * @param creator The address which creates all those staking and vesting addresses.
 * @param token The token address.
 * @param waitedTS The time after which waited unlock will be unlocked.
 * @param adminList The admin list for locked fund.
 *
 * @return [staking, vestingLogic, vestingRegistry, lockedFund] The objects of staking, vesting logics, vesting registry and LockedFund.
 */
async function createStakeVestAndLockedFund(creator, token, waitedTS, adminList) {
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

	vestingRegistryLogic = await VestingRegistryLogic.new();
	vestingRegistry = await VestingRegistryProxy.new();
	await vestingRegistry.setImplementation(vestingRegistryLogic.address);
	vestingRegistry = await VestingRegistryLogic.at(vestingRegistry.address);
	vestingFactory.transferOwnership(vestingRegistry.address, { from: creator });

	lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, adminList, { from: creator });

	await vestingRegistry.initialize(
		vestingFactory.address,
		token.address,
		staking.address,
		feeSharingProxy.address,
		creator, // This should be Governance Timelock Contract.
		lockedFund.address,
		{ from: creator }
	);

	return [staking, vestingLogic, vestingRegistry, lockedFund];
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
	let _vestingData = await contractInstance.getVestingData(cliff, duration);
	if (checkArray[0] == 1) {
		let cValue = await contractInstance.getWaitedTS();
		assert.equal(waitedTS, cValue.toNumber(), "The waited timestamp does not match.");
	}
	if (checkArray[1] == 1) {
		let cValue = await contractInstance.getToken();
		assert.strictEqual(token, cValue, "The token does not match.");
	}
	if (checkArray[2] == 1 || checkArray[3] == 1) {
		let cValue = await contractInstance.checkUserVestingsOf(userAddr, _vestingData);
		assert.equal(true, cValue, "The cliff or duration does not match.");
	}
	if (checkArray[4] == 1) {
		let cValue = await contractInstance.getVestingRegistry();
		assert.strictEqual(vestingRegistry, cValue, "The vesting registry does not match.");
	}
	if (checkArray[5] == 1) {
		let cValue = await contractInstance.getVestedBalance(userAddr, _vestingData);
		assert.equal(vestedBalance, cValue.toNumber(), "The vested balance does not match.");
	}
	if (checkArray[6] == 1) {
		let _lockingData = "0x0"; // TODO: To be changed with the getLockedData content.
		let cValue = await contractInstance.getLockedBalance(userAddr, _lockingData);
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
 * @param cliff TODO
 * @param duration TODO
 *
 * @return [Token Balance, Vested Balance, Locked Balance, Waited Unlocked Balance, Unlocked Balance].
 */
async function getTokenBalances(addr, tokenContract, lockedFundContract, cliff, duration) {
	let _vestingData = await lockedFundContract.getVestingData(cliff, duration);
	let tokenBal = (await tokenContract.balanceOf(addr)).toNumber();
	let vestedBal = (await lockedFundContract.getVestedBalance(addr, _vestingData)).toNumber();
	// TODO Update the locked data with actual data.
	let lockedBal = (await lockedFundContract.getLockedBalance(addr, "0x0")).toNumber();
	let waitedUnlockedBal = (await lockedFundContract.getWaitedUnlockedBalance(addr)).toNumber();
	let unlockedBal = (await lockedFundContract.getUnlockedBalance(addr)).toNumber();
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
 *
 * @param _originsBase The origins contract object.
 * @param _tierCount The tier count.
 * @param _minAmount The minimum tier deposit amount.
 * @param _maxAmount The maximum tier deposit amount.
 * @param _remainingTokens The remamining tokens in the tier for sale.
 * @param _saleStartTS The sale start timestamp for the tier.
 * @param _saleEnd The sale end timestamp for the tier.
 * @param _unlockedBP The unlocked amount specified in basis point.
 * @param _vestOrLockCliff The cliff for vesting or locking tokens.
 * @param _vestOrLockDuration The duration for vesting or locking tokens.
 * @param _depositRate The deposit rate for the particular tier.
 * @param _depositToken The deposit token for the particular tier (if deposit type as token).
 * @param _depositType The deposit type (RBTC or Token).
 * @param _verificationType The verification type for the tier.
 * @param _saleEndDurationOrTS The sale end duration specified as duration or timestamp.
 * @param _transferType The transfer type for the tier.
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

/**
 * Function to create a locked fund contract.
 *
 * @param waitedTS The time after which waited unlock will be unlocked.
 * @param token The token address.
 * @param vestingRegistry The vesting registry address.
 * @param adminList The admin list for locked fund.
 * @param creator The address used to create the locked fund.
 *
 * @return lockedFund contract object.
 */
 async function createLockedFund(waitedTS, token, vestingRegistry, adminList, creator) {
	lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, adminList, { from: creator });

	return lockedFund;
}

// Contract Artifacts
const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
const StakingLogic = artifacts.require("Staking");
const StakingProxy = artifacts.require("StakingProxy");
const FeeSharingProxy = artifacts.require("FeeSharingProxyMockup");
const VestingLogic = artifacts.require("VestingLogic");
const VestingFactory = artifacts.require("VestingFactory");
const VestingRegistryLogic = artifacts.require("VestingRegistryLogic");
const VestingRegistryProxy = artifacts.require("VestingRegistryProxy");
const UpgradableProxy = artifacts.require("UpgradableProxy");
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
	createStakeVestAndLockedFund,
	checkStatus,
	getTokenBalances,
	userMintAndApprove,
	checkTier,
	createLockedFund,
	// Contract Artifacts
	Token,
	LockedFund,
	StakingLogic,
	StakingProxy,
	FeeSharingProxy,
	VestingLogic,
	VestingFactory,
	VestingRegistryLogic,
	VestingRegistryProxy,
	UpgradableProxy,
	OriginsAdmin,
	OriginsBase,
};
