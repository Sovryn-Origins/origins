const { expect } = require("chai");
const { expectRevert, expectEvent, constants, BN, balance, time } = require("@openzeppelin/test-helpers");

const { ZERO_ADDRESS } = constants;

const { encodeParameters, etherMantissa, mineBlock, increaseTime } = require("../Ethereum");

const GovernorAlpha = artifacts.require("GovernorAlphaMockup");
const Timelock = artifacts.require("TimelockHarness");
const StakingLogic = artifacts.require("StakingMockup");
const StakingProxy = artifacts.require("StakingProxy");
const TestToken = artifacts.require("TestToken");

const PROPOSAL_THRESHOLD = etherMantissa(1000000);
const QUORUM_VOTES = etherMantissa(4000000);
const TOTAL_SUPPLY = etherMantissa(1000000000);

const DAY = 86400;
const TWO_DAYS = 86400 * 2;
const TWO_WEEKS = 86400 * 14;
const MAX_DURATION = new BN(24 * 60 * 60).mul(new BN(1092));

contract("GovernanceIntegration", (accounts) => {
	const name = "Test token";
	const symbol = "TST";

	let root, account1, account2, account3, account4;
	let token, staking, gov, timelock;

	before(async () => {
		[root, account1, account2, account3, account4, ...accounts] = accounts;
	});

	beforeEach(async () => {
		//Token
		token = await TestToken.new(name, symbol, 18, TOTAL_SUPPLY);

		//Staking
		let stakingLogic = await StakingLogic.new(token.address);
		staking = await StakingProxy.new(token.address);
		await staking.setImplementation(stakingLogic.address);
		staking = await StakingLogic.at(staking.address);

		//Governor
		timelock = await Timelock.new(root, TWO_DAYS);
		gov = await GovernorAlpha.new(timelock.address, staking.address, root, 4, 0);
		await timelock.harnessSetAdmin(gov.address);
	});

	describe("change settings", () => {
		it("Should be able to execute one action", async () => {
			// TODO
		});
		it("Should be able to execute one action with signature in the call data", async () => {
			// TODO
		});
		it("Should be able to execute three actions", async () => {
			// TODO
		});

		it("Shouldn't be able to execute proposal using Timelock directly", async () => {
			await expectRevert(
				timelock.executeTransaction(ZERO_ADDRESS, "0", "", "0x", "0"),
				"Timelock::executeTransaction: Call must come from admin."
			);
		});
	});

	async function executeProposal(proposalData) {
		await token.approve(staking.address, QUORUM_VOTES);
		let kickoffTS = await staking.kickoffTS.call();
		await staking.stake(QUORUM_VOTES, kickoffTS.add(MAX_DURATION), root, root);

		await gov.propose(
			proposalData.targets,
			proposalData.values,
			proposalData.signatures,
			proposalData.callDatas,
			proposalData.description
		);
		let proposalId = await gov.latestProposalIds.call(root);

		await mineBlock();
		await gov.castVote(proposalId, true);

		await advanceBlocks(10);
		await gov.queue(proposalId);

		await increaseTime(TWO_DAYS);
		let tx = await gov.execute(proposalId);

		expectEvent(tx, "ProposalExecuted", {
			id: proposalId,
		});
	}
});

async function advanceBlocks(number) {
	for (let i = 0; i < number; i++) {
		await mineBlock();
	}
}
