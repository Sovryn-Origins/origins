pragma solidity ^0.5.17;

/**
 *  @title An interface of Locked Fund Contract.
 *  @author Franklin Richards - powerhousefrank@protonmail.com
 */
contract ILockedFund {
	/* Functions */

	/**
	 * @notice The function to add a new admin.
	 * @param _newAdmin The address of the new admin.
	 * @dev Only callable by an Admin.
	 */
	function addAdmin(address _newAdmin) external;

	/**
	 * @notice The function to remove an admin.
	 * @param _adminToRemove The address of the admin which should be removed.
	 * @dev Only callable by an Admin.
	 */
	function removeAdmin(address _adminToRemove) external;

	/**
	 * @notice The function to update the Vesting Registry, Duration and Cliff.
	 * @param _vestingRegistry The Vesting Registry Address.
	 */
	function changeVestingRegistry(address _vestingRegistry) public;

	/**
	 * @notice The function used to update the waitedTS.
	 * @param _waitedTS The timestamp after which withdrawal is allowed.
	 */
	function changeWaitedTS(uint256 _waitedTS) public;

	/**
	 * @notice Adds Token to the user balance (Vested and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point)which determines how much will be unlocked immediately.
	 * @dev Future iteration will have choice between waited unlock and immediate unlock.
	 */
	function depositVested(
		address _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint
	) public;

	/**
	 * @notice A function to withdraw the waited unlocked balance.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function withdrawWaitedUnlockedBalance(address _receiverAddress) external;

	/**
	 * @notice Creates vesting if not already created and Stakes tokens for a user.
	 * @dev Only use this function if the `duration` is small.
	 */
	function createVestingAndStake() external;

	/**
	 * @notice Creates vesting contract (if it hasn't been created yet) for the calling user.
	 * @return _vestingAddress The New Vesting Contract Created.
	 */
	function createVesting() external returns (address _vestingAddress);

	/**
	 * @notice Stakes tokens for a user who already have a vesting created.
	 * @dev The user should already have a vesting created, else this function will throw error.
	 */
	function stakeTokens() external;

	/**
	 * @notice Withdraws unlocked tokens and Stakes Locked tokens for a user who already have a vesting created.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function withdrawAndStakeTokens(address _receiverAddress) external;

	/**
	 * @notice Withdraws unlocked tokens and Stakes Locked tokens for a user who already have a vesting created.
	 * @param _userAddress The address of user tokens will be withdrawn.
	 */
	function withdrawAndStakeTokensFrom(address _userAddress) external;
}
