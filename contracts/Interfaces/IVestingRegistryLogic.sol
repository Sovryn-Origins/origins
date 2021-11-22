pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../Sovryn/Governance/Vesting/VestingRegistryStorage.sol";

contract IVestingRegistryLogic is VestingRegistryStorage {
	/**
	 * @notice sets vesting factory address
	 * @param _vestingFactory the address of vesting factory contract
	 */
	function setVestingFactory(address _vestingFactory) external;

	/**
	 * @notice transfers tokens to given address
	 * @param _receiver the address of the token receiver
	 * @param _amount the amount to be transferred
	 */
	function transferToken(address _receiver, uint256 _amount) external;

	/**
	 * @notice creates Vesting contract
	 * @param _tokenOwner the owner of the tokens
	 * @param _amount the amount to be staked
	 * @param _cliff the cliff in seconds
	 * @param _duration the total duration in seconds
	 * @dev Calls a public createVestingAddr function with vestingCreationType. This is to accomodate the existing logic for LockedFund
	 * @dev vestingCreationType 0 = LockedFund
	 */
	function createVesting(
		address _tokenOwner,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration
	) external;

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
	 * @notice creates Team Vesting contract
	 * @param _tokenOwner the owner of the tokens
	 * @param _amount the amount to be staked
	 * @param _cliff the cliff in seconds
	 * @param _duration the total duration in seconds
	 * @param _vestingCreationType the type of vesting created(e.g. Origin, Bug Bounty etc.)
	 */
	function createTeamVesting(
		address _tokenOwner,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) external;

	/**
	 * @notice stakes tokens according to the vesting schedule
	 * @param _vesting the address of Vesting contract
	 * @param _amount the amount of tokens to stake
	 */
	function stakeTokens(address _vesting, uint256 _amount) external;

	/**
	 * @notice returns vesting contract address for the given token owner
	 * @param _tokenOwner the owner of the tokens
	 * @dev Calls a public getVestingAddr function with cliff and duration. This is to accomodate the existing logic for LockedFund
	 * @dev We need to use LockedFund.changeRegistryCliffAndDuration function very judiciously
	 * @dev vestingCreationType 0 - LockedFund
	 */
	function getVesting(address _tokenOwner) public view returns (address);

	/**
	 * @notice public function that returns vesting contract address for the given token owner, cliff, duration
	 * @dev Important: Please use this instead of getVesting function
	 */
	function getVestingAddr(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public view returns (address);

	/**
	 * @notice returns team vesting contract address for the given token owner, cliff, duration
	 */
	function getTeamVesting(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public view returns (address);

	/**
	 * @notice returns all vesting details for the given token owner
	 */
	function getVestingsOf(address _tokenOwner) external view returns (VestingDetail[] memory);

	/**
	 * @notice returns cliff and duration for Vesting & TeamVesting contracts
	 */
	function getVestingDetails(address _vestingAddress) external view returns (uint256 cliff, uint256 duration);

	/**
	 * @notice returns if the address is a vesting address
	 */
	function isVestingAdress(address _vestingAddress) external view returns (bool isVestingAddr);
}
