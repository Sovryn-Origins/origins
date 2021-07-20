pragma solidity ^0.5.17;

import "../Sovryn/Governance/Vesting/VestingStorage.sol";

/**
 * @title Vesting Logic Interface
 */
contract IVestingLogic is VestingStorage {
	/* Functions */

	/**
	 * @notice Stakes tokens according to the vesting schedule.
	 * @param _amount The amount of tokens to stake.
	 * */
	function stakeTokens(uint256 _amount) public;

	/**
	 * @notice Withdraws unlocked tokens from the staking contract and
	 * forwards them to an address specified by the token owner.
	 * @param receiver The receiving address.
	 * */
	function withdrawTokens(address receiver) public;
}
