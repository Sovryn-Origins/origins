const Token = artifacts.require("Token");
const LockedFund = artifacts.require("LockedFund");
const StakingLogic = artifacts.require("Staking");
const StakingProxy = artifacts.require("StakingProxy");
const FeeSharingProxy = artifacts.require("FeeSharingProxyMockup");
const VestingLogic = artifacts.require("VestingLogic");
const VestingFactory = artifacts.require("VestingFactory");
const VestingRegistry = artifacts.require("VestingRegistry3");

const {
	BN, // Big Number support.
	constants, // Assertions for transactions that should fail.
} = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

// Some constants we would be using in the contract.
let zero = new BN(0);
let zeroAddress = constants.ZERO_ADDRESS;
let cliff = 1; // This is in 4 weeks. i.e. 1 * 4 weeks.
let duration = 11; // This is in 4 weeks. i.e. 11 * 4 weeks.
let fourWeeks = 4 * 7 * 24 * 60 * 60;
let zeroBasisPoint = 0;
let twentyBasisPoint = 2000;
let fiftyBasisPoint = 5000;
let hundredBasisPoint = 10000;
let invalidBasisPoint = 10001;
let waitedTS = currentTimestamp();

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
		let cValue = await contractInstance.waitedTS();
		assert.strictEqual(waitedTS, cValue.toNumber(), "The waited timestamp does not match.");
	}
	if (checkArray[1] == 1) {
		let cValue = await contractInstance.token();
		assert.strictEqual(token, cValue, "The token does not match.");
	}
	if (checkArray[2] == 1) {
		let cValue = await contractInstance.cliff(userAddr);
		// console.log("cliff: "+cliff);
		// console.log(cliff);
		// console.log("cliff.toNumber(): "+cliff.toNumber());
		// console.log(cliff.toNumber());
		// console.log("cValue: "+cValue);
		// console.log(cValue);
		// console.log("cValue.toNumber(): "+cValue.toNumber());
		// console.log(cValue.toNumber());
		assert.strictEqual(cliff, cValue.toNumber() / fourWeeks, "The cliff does not match.");
	}
	if (checkArray[3] == 1) {
		let cValue = await contractInstance.duration(userAddr);
		assert.strictEqual(duration, cValue.toNumber() / fourWeeks, "The duration does not match.");
	}
	if (checkArray[4] == 1) {
		let cValue = await contractInstance.vestingRegistry();
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

contract("LockedFund (State Change)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

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
	});

	beforeEach("Creating New Locked Fund Contract Instance.", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [admin]);

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address);
	});

	it("Admin should be able to add another admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			true
		);
	});

	it("Admin should be able to remove an admin.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			true
		);
		await lockedFund.removeAdmin(newAdmin, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			newAdmin,
			waitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to change the vestingRegistry.", async () => {
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			zero,
			zero,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to change the waited timestamp.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		await lockedFund.changeWaitedTS(newWaitedTS, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
			userOne,
			newWaitedTS,
			token.address,
			zero,
			zero,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("Admin should be able to deposit using depositVested().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
	});

	it("User should be able to withdraw waited unlocked balance using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userOne, token, lockedFund);
		await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to withdraw waited unlocked balance to any wallet using withdrawWaitedUnlockedBalance().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userTwo, token, lockedFund);
		await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to create vesting and stake vested balance using createVestingAndStake().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.createVestingAndStake({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to create vesting using createVesting().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.createVesting({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to stake vested balance using stakeTokens().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			value,
			zero,
			zero,
			zero,
			false
		);
		await lockedFund.stakeTokens({ from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
	});

	it("User should be able to withdraw waited unlocked balance, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(newVestingRegistry.address);
		await newVestingRegistry.addAdmin(lockedFund.address);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userOne, token, lockedFund);
		await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("User should be able to withdraw waited unlocked balance to any wallet, create vesting and stake vested balance using withdrawAndStakeTokens().", async () => {
		vestingFactory = await VestingFactory.new(vestingLogic.address);
		let newVestingRegistry = await VestingRegistry.new(
			vestingFactory.address,
			token.address,
			staking.address,
			feeSharingProxy.address,
			creator // This should be Governance Timelock Contract.
		);
		vestingFactory.transferOwnership(newVestingRegistry.address);
		await newVestingRegistry.addAdmin(lockedFund.address);
		await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userTwo, token, lockedFund);
		await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			newVestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userTwo, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});

	it("Any user should be able to trigger withdraw waited unlocked balance of another user, create vesting and stake vested balance for them using withdrawAndStakeTokensFrom().", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, { from: admin });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			Math.ceil(value / 2),
			zero,
			Math.floor(value / 2),
			zero,
			false
		);
		let oldBalances = await getTokenBalances(userOne, token, lockedFund);
		await lockedFund.withdrawAndStakeTokensFrom(userOne, { from: userTwo });
		await checkStatus(
			lockedFund,
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			userOne,
			waitedTS,
			token.address,
			cliff,
			duration,
			vestingRegistry.address,
			zero,
			zero,
			zero,
			zero,
			false
		);
		let newBalances = await getTokenBalances(userOne, token, lockedFund);
		assert.strictEqual(newBalances[0].toNumber(), oldBalances[0].toNumber() + Math.floor(value / 2), "Token Balance not matching.");
	});
});
