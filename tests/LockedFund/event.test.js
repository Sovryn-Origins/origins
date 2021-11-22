const {
	// External Functions
	BN,
	expectEvent,
	assert,
	// Custom Functions
	randomValue,
	currentTimestamp,
	createStakeVestAndLockedFund,
	// Contract Artifacts
	Token,
	LockedFund,
	VestingFactory,
	VestingRegistryLogic,
	VestingRegistryProxy,
} = require("../utils");

const { zero, zeroAddress, fourWeeks, zeroBasisPoint, fiftyBasisPoint, unlockTypeWaited, receiveTokens, dontReceiveTokens } = require("../constants");

let { cliff, duration, waitedTS } = require("../variable");

contract("LockedFund (Events)", (accounts) => {
	let token, lockedFund, vestingRegistry, vestingLogic, stakingLogic;
	let creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive;

	before("Initiating Accounts & Creating Test Token Instance.", async () => {
		// Checking if we have enough accounts to test.
		assert.isAtLeast(accounts.length, 8, "Alteast 8 accounts are required to test the contracts.");
		[creator, admin, newAdmin, userOne, userTwo, userThree, userFour, userFive] = accounts;

		waitedTS = await currentTimestamp();

		// Creating the instance of Test Token.
		token = await Token.new(zero, "Test Token", "TST", 18, { from: creator });

		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, vestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [admin]);
	});

	beforeEach("Creating New Locked Fund Contract Instance.", async () => {
		// Creating the instance of LockedFund Contract.
		lockedFund = await LockedFund.new(waitedTS, token.address, vestingRegistry.address, [admin], { from: creator });

		// Adding lockedFund as an admin in the Vesting Registry.
		await vestingRegistry.addAdmin(lockedFund.address, { from: creator });
	});

	it("Adding another admin should emit AdminAdded.", async () => {
		let txReceipt = await lockedFund.addAdmin(newAdmin, { from: admin });
		expectEvent(txReceipt, "AdminAdded", {
			_initiator: admin,
			_newAdmin: newAdmin,
		});
	});

	it("Removing another admin should emit AdminRemoved.", async () => {
		await lockedFund.addAdmin(newAdmin, { from: admin });
		let txReceipt = await lockedFund.removeAdmin(newAdmin, { from: admin });
		expectEvent(txReceipt, "AdminRemoved", {
			_initiator: admin,
			_removedAdmin: newAdmin,
		});
	});

	it("Changing the vestingRegistry should emit VestingRegistryUpdated.", async () => {
		let vestingRegistryLogic = await VestingRegistryLogic.new();
		let newVestingRegistry = await VestingRegistryProxy.new();
		await newVestingRegistry.setImplementation(vestingRegistryLogic.address);
		newVestingRegistry = await VestingRegistryLogic.at(newVestingRegistry.address);

		let txReceipt = await lockedFund.changeVestingRegistry(newVestingRegistry.address, { from: admin });
		expectEvent(txReceipt, "VestingRegistryUpdated", {
			_initiator: admin,
			_vestingRegistry: newVestingRegistry.address,
		});
	});

	it("Changing the waited timestamp should emit WaitedTSUpdated.", async () => {
		let value = randomValue();
		let newWaitedTS = waitedTS + value;
		let txReceipt = await lockedFund.changeWaitedTS(newWaitedTS, { from: admin });
		expectEvent(txReceipt, "WaitedTSUpdated", {
			_initiator: admin,
			_waitedTS: new BN(newWaitedTS),
		});
	});

	it("Depositing using depositVested() should emit VestedDeposited.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		let txReceipt = await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		expectEvent(txReceipt, "VestedDeposited", {
			_initiator: admin,
			_userAddress: userOne,
			_amount: new BN(value),
			_cliff: new BN(cliff),
			_duration: new BN(duration),
			_basisPoint: new BN(zeroBasisPoint),
		});
	});

	it("Withdrawing waited unlocked balance using withdrawWaitedUnlockedBalance() should emit WithdrawnWaitedUnlockedBalance.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let txReceipt = await lockedFund.withdrawWaitedUnlockedBalance(zeroAddress, { from: userOne });
		expectEvent(txReceipt, "WithdrawnWaitedUnlockedBalance", {
			_initiator: userOne,
			_userAddress: userOne,
			_amount: new BN(Math.floor(value / 2)),
		});
	});

	it("Withdrawing waited unlocked balance to another wallet using withdrawWaitedUnlockedBalance() should emit WithdrawnWaitedUnlockedBalance.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let txReceipt = await lockedFund.withdrawWaitedUnlockedBalance(userTwo, { from: userOne });
		expectEvent(txReceipt, "WithdrawnWaitedUnlockedBalance", {
			_initiator: userOne,
			_userAddress: userTwo,
			_amount: new BN(Math.floor(value / 2)),
		});
	});

	it("Creating vesting and staking vested balance using createVestingAndStake() should emit VestingCreated and TokenStaked.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let txReceipt = await lockedFund.createVestingAndStake({ from: userOne });
		let vestingCreationType = await lockedFund.vestingCreationType({ from: userOne });
		vestingCreationType = vestingCreationType.sub(new BN(1));
		let vestingAddress = await lockedFund.getVesting(userOne, cliff * fourWeeks, duration * fourWeeks, vestingCreationType);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(value),
		});
	});

	it("Creating vesting using createVesting() should emit VestingCreated.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let _vestingData = await lockedFund.getVestingData(cliff, duration, { from: userOne });
		let txReceipt = await lockedFund.createVesting(_vestingData, { from: userOne });
		let vestingCreationType = await lockedFund.vestingCreationType({ from: userOne });
		vestingCreationType = vestingCreationType.sub(new BN(1));
		let vestingAddress = await lockedFund.getVesting(userOne, cliff * fourWeeks, duration * fourWeeks, vestingCreationType);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
	});

	it("Staking vested balance using stakeTokens() should emit TokenStaked.", async () => {
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, zeroBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let vestingCreationType = await lockedFund.vestingCreationType({ from: userOne });
		vestingCreationType = vestingCreationType.sub(new BN(1));
		let vestingAddress = await lockedFund.getVesting(userOne, cliff * fourWeeks, duration * fourWeeks, vestingCreationType);
		let _vestingData = await lockedFund.getVestingData(cliff, duration, { from: userOne });
		let txReceipt = await lockedFund.stakeTokens(_vestingData, { from: userOne });
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(value),
		});
	});

	it("Wthdrawing waited unlocked balance, creating vesting and staking vested balance using withdrawAndStakeTokens() should emit WithdrawnWaitedUnlockedBalance, VestingCreated and TokenStaked.", async () => {
		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, newVestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [admin]);
		// Adding lockedFund as an admin in the Vesting Registry.
		await newVestingRegistry.addAdmin(lockedFund.address, { from: creator });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let txReceipt = await lockedFund.withdrawAndStakeTokens(zeroAddress, { from: userOne });
		expectEvent(txReceipt, "WithdrawnWaitedUnlockedBalance", {
			_initiator: userOne,
			_userAddress: userOne,
			_amount: new BN(Math.floor(value / 2)),
		});
		let vestingCreationType = await lockedFund.vestingCreationType({ from: userOne });
		vestingCreationType = vestingCreationType.sub(new BN(1));
		let vestingAddress = await lockedFund.getVesting(userOne, cliff * fourWeeks, duration * fourWeeks, vestingCreationType);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(Math.ceil(value / 2)),
		});
	});

	it("Withdrawing waited unlocked balance to any wallet, creating vesting and staking vested balance using withdrawAndStakeTokens() should emit WithdrawnWaitedUnlockedBalance, VestingCreated and TokenStaked.", async () => {
		// Creating the Staking, Vesting and Locked Fund
		[staking, vestingLogic, newVestingRegistry, lockedFund] = await createStakeVestAndLockedFund(creator, token, waitedTS, [admin]);
		// Adding lockedFund as an admin in the Vesting Registry.
		await newVestingRegistry.addAdmin(lockedFund.address, { from: creator });
		let value = randomValue();
		token.mint(admin, value, { from: creator });
		token.approve(lockedFund.address, value, { from: admin });
		await lockedFund.depositVested(userOne, value, cliff, duration, fiftyBasisPoint, unlockTypeWaited, receiveTokens, { from: admin });
		let txReceipt = await lockedFund.withdrawAndStakeTokens(userTwo, { from: userOne });
		expectEvent(txReceipt, "WithdrawnWaitedUnlockedBalance", {
			_initiator: userOne,
			_userAddress: userTwo,
			_amount: new BN(Math.floor(value / 2)),
		});
		let vestingCreationType = await lockedFund.vestingCreationType({ from: userOne });
		vestingCreationType = vestingCreationType.sub(new BN(1));
		let vestingAddress = await lockedFund.getVesting(userOne, cliff * fourWeeks, duration * fourWeeks, vestingCreationType);
		expectEvent(txReceipt, "VestingCreated", {
			_initiator: userOne,
			_userAddress: userOne,
			_vesting: vestingAddress,
		});
		expectEvent(txReceipt, "TokenStaked", {
			_initiator: userOne,
			_vesting: vestingAddress,
			_amount: new BN(Math.ceil(value / 2)),
		});
	});
});
