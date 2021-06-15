pragma solidity ^0.5.17;

/**
 * @title Vesting Storage Contract (Incomplete).
 * @notice This contract is just the required storage fromm vesting for LockedFund.
 */
contract VestingStorage {
	/// @notice The cliff. After this time period the tokens begin to unlock.
	uint256 public cliff;

	/// @notice The duration. After this period all tokens will have been unlocked.
	uint256 public duration;
}

/**
 * TODO
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
