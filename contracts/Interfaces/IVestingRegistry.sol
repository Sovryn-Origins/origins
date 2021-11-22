pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../Sovryn/Governance/Vesting/VestingRegistryStorage.sol";

/**
 * @title Vesting Registry Interface
 */
contract IVestingRegistry is VestingRegistryStorage {
	/**
	 * @notice creates Vesting contract
	 * @param _tokenOwner the owner of the tokens
	 * @param _amount the amount to be staked
	 * @param _cliff the cliff in seconds
	 * @param _duration the total duration in seconds
	 * @param _vestingCreationType the type of vesting created(e.g. Origin, Bug Bounty etc.)
	 */
	function createVestingAddr(
		address _tokenOwner,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public;

	/**
	 * @notice stakes tokens according to the vesting schedule
	 * @param _vesting the address of Vesting contract
	 * @param _amount the amount of tokens to stake
	 */
	function stakeTokens(address _vesting, uint256 _amount) public;

	/**
	 * @notice public function that returns vesting contract address for the given token owner, cliff, duration
	 */
	function getVestingAddr(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public view returns (address);

	/**
	 * @notice returns all vesting details for the given token owner
	 * @param _tokenOwner the owner of the tokens
	 */
	function getVestingsOf(address _tokenOwner) public view returns (VestingDetail[] memory);

}
