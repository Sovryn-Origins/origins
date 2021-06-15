pragma solidity ^0.5.17;

import "./Interfaces/IERC20.sol";
import "./Interfaces/ILockedFund.sol";
import "./Openzeppelin/SafeMath.sol";
import "./Interfaces/IVestingLogic.sol";
import "./Interfaces/IVestingRegistry.sol";

/**
 * @title A holding contract for Locked Fund.
 * @author Franklin Richards - powerhousefrank@protonmail.com
 * @notice You can use this contract for timed token release from Locked Fund.
 * @dev This is not the final form of this contract.
 */
contract LockedFund is ILockedFund {
	using SafeMath for uint256;

	/* Storage */

	/// @notice The time after which waited unlock balance can be withdrawn.
	uint256 public waitedTS;

	/// @notice The maximum basis point which is allowed.
	uint256 internal constant MAX_BASIS_POINT = 10000;
	/// @notice The maximum duration allowed for staking.
	uint256 internal constant MAX_DURATION = 37;
	/// @notice The interval duration.
	uint256 public constant INTERVAL = 4 weeks;

	/// @notice The token contract.
	IERC20 public token;
	/// @notice The Vesting registry contract.
	IVestingRegistry public vestingRegistry;

	/// @notice The vested balances.
	mapping(address => uint256) public vestedBalances;
	/// @notice The locked user balances. Not used right now.
	mapping(address => uint256) public lockedBalances;
	/// @notice The waited unlocked user balances.
	mapping(address => uint256) public waitedUnlockedBalances;
	/// @notice The unlocked user balances. Not used right now.
	mapping(address => uint256) public unlockedBalances;
	/// @notice The contracts/wallets with admin power.
	mapping(address => bool) public isAdmin;

	/// @notice The Cliff specified for an address.
	mapping(address => uint256) public cliff;
	/// @notice The Duration specified for an address.
	mapping(address => uint256) public duration;

	/* Events */

	/**
	 * @notice Emitted when a new Admin is added to the admin list.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _newAdmin The address of the new admin.
	 */
	event AdminAdded(address indexed _initiator, address indexed _newAdmin);

	/**
	 * @notice Emitted when an admin is removed from the admin list.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _removedAdmin The address of the removed admin.
	 */
	event AdminRemoved(address indexed _initiator, address indexed _removedAdmin);

	/**
	 * @notice Emitted when Vesting Registry is updated.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _vestingRegistry The Vesting Registry Contract.
	 */
	event VestingRegistryUpdated(address indexed _initiator, address indexed _vestingRegistry);

	/**
	 * @notice Emitted when Waited Timestamp is updated.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _waitedTS The waited timestamp.
	 */
	event WaitedTSUpdated(address indexed _initiator, uint256 _waitedTS);

	/**
	 * @notice Emitted when a new deposit is made.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user to whose un/locked balance a new deposit was made.
	 * @param _amount The amount of Token to be added to the un/locked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be unlocked immediately.
	 */
	event VestedDeposited(
		address indexed _initiator,
		address indexed _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint
	);

	/**
	 * @notice Emitted when a user withdraws the fund.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user whose unlocked balance has to be withdrawn.
	 * @param _amount The amount of Token withdrawn from the unlocked balance.
	 */
	event Withdrawn(address indexed _initiator, address indexed _userAddress, uint256 _amount);

	/**
	 * @notice Emitted when a user creates a vesting for himself.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user whose unlocked balance has to be withdrawn.
	 * @param _vesting The Vesting Contract.
	 */
	event VestingCreated(address indexed _initiator, address indexed _userAddress, address indexed _vesting);

	/**
	 * @notice Emitted when a user stakes tokens.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _vesting The Vesting Contract.
	 * @param _amount The amount of locked tokens staked by the user.
	 */
	event TokenStaked(address indexed _initiator, address indexed _vesting, uint256 _amount);

	/* Modifiers */

	/**
	 * @notice Modifier to check only admin is allowed for certain functions.
	 */
	modifier onlyAdmin {
		require(isAdmin[msg.sender], "Only admin can call this.");
		_;
	}

	/* Functions */

	/**
	 * @notice Setup the required parameters.
	 * @param _waitedTS The time after which unlocked token balance withdrawal is allowed.
	 * @param _token The Token Address.
	 * @param _vestingRegistry The Vesting Registry Address.
	 * @param _admins The list of Admins to be added.
	 */
	constructor(
		uint256 _waitedTS,
		address _token,
		address _vestingRegistry,
		address[] memory _admins
	) public {
		require(_waitedTS != 0, "LockedFund: Waited TS cannot be zero.");
		require(_token != address(0), "LockedFund: Invalid Token Address.");
		require(_vestingRegistry != address(0), "LockedFund: Vesting registry address is invalid.");

		waitedTS = _waitedTS;
		token = IERC20(_token);
		vestingRegistry = IVestingRegistry(_vestingRegistry);

		for (uint256 index = 0; index < _admins.length; index++) {
			require(_admins[index] != address(0), "LockedFund: Invalid Address.");
			isAdmin[_admins[index]] = true;
			emit AdminAdded(msg.sender, _admins[index]);
		}
	}

	/* Public or External Functions */

	/**
	 * @notice The function to add a new admin.
	 * @param _newAdmin The address of the new admin.
	 * @dev Only callable by an Admin.
	 */
	function addAdmin(address _newAdmin) external onlyAdmin {
		_addAdmin(_newAdmin);
	}

	/**
	 * @notice The function to remove an admin.
	 * @param _adminToRemove The address of the admin which should be removed.
	 * @dev Only callable by an Admin.
	 */
	function removeAdmin(address _adminToRemove) external onlyAdmin {
		_removeAdmin(_adminToRemove);
	}

	/**
	 * @notice The function to update the Vesting Registry, Duration and Cliff.
	 * @param _vestingRegistry The Vesting Registry Address.
	 */
	function changeVestingRegistry(address _vestingRegistry) public onlyAdmin {
		_changeVestingRegistry(_vestingRegistry);
	}

	/**
	 * @notice The function used to update the waitedTS.
	 * @param _waitedTS The timestamp after which withdrawal is allowed.
	 */
	function changeWaitedTS(uint256 _waitedTS) public onlyAdmin {
		_changeWaitedTS(_waitedTS);
	}

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
	) public onlyAdmin {
		_depositVested(_userAddress, _amount, _cliff, _duration, _basisPoint);
	}

	/**
	 * @notice A function to withdraw the waited unlocked balance.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function withdrawWaitedUnlockedBalance(address _receiverAddress) external {
		_withdrawWaitedUnlockedBalance(msg.sender, _receiverAddress);
	}

	/**
	 * @notice Creates vesting if not already created and Stakes tokens for a user.
	 * @dev Only use this function if the `duration` is small.
	 */
	function createVestingAndStake() external {
		_createVestingAndStake(msg.sender);
	}

	/**
	 * @notice Creates vesting contract (if it hasn't been created yet) for the calling user.
	 * @return _vestingAddress The New Vesting Contract Created.
	 */
	function createVesting() external returns (address _vestingAddress) {
		_vestingAddress = _createVesting(msg.sender);
	}

	/**
	 * @notice Stakes tokens for a user who already have a vesting created.
	 * @dev The user should already have a vesting created, else this function will throw error.
	 */
	function stakeTokens() external {
		IVestingLogic vesting = IVestingLogic(_getVesting(msg.sender));

		require(cliff[msg.sender] == vesting.cliff() && duration[msg.sender] == vesting.duration(), "LockedFund: Wrong Vesting Schedule.");

		_stakeTokens(msg.sender, address(vesting));
	}

	/**
	 * @notice Withdraws unlocked tokens and Stakes Locked tokens for a user who already have a vesting created.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function withdrawAndStakeTokens(address _receiverAddress) external {
		_withdrawWaitedUnlockedBalance(msg.sender, _receiverAddress);
		_createVestingAndStake(msg.sender);
	}

	/**
	 * @notice Withdraws unlocked tokens and Stakes Locked tokens for a user who already have a vesting created.
	 * @param _userAddress The address of user tokens will be withdrawn.
	 */
	function withdrawAndStakeTokensFrom(address _userAddress) external {
		_withdrawWaitedUnlockedBalance(_userAddress, _userAddress);
		_createVestingAndStake(_userAddress);
	}

	/* Internal Functions */

	/**
	 * @notice Internal function to add a new admin.
	 * @param _newAdmin The address of the new admin.
	 */
	function _addAdmin(address _newAdmin) internal {
		require(_newAdmin != address(0), "LockedFund: Invalid Address.");
		require(!isAdmin[_newAdmin], "LockedFund: Address is already admin.");
		isAdmin[_newAdmin] = true;

		emit AdminAdded(msg.sender, _newAdmin);
	}

	/**
	 * @notice Internal function to remove an admin.
	 * @param _adminToRemove The address of the admin which should be removed.
	 * @dev Only callable by an Admin.
	 */
	function _removeAdmin(address _adminToRemove) public onlyAdmin {
		require(isAdmin[_adminToRemove], "LockedFund: Address is not an admin.");
		isAdmin[_adminToRemove] = false;

		emit AdminRemoved(msg.sender, _adminToRemove);
	}

	/**
	 * @notice Internal function to update the Vesting Registry, Duration and Cliff.
	 * @param _vestingRegistry The Vesting Registry Address.
	 */
	function _changeVestingRegistry(address _vestingRegistry) internal {
		require(_vestingRegistry != address(0), "LockedFund: Vesting registry address is invalid.");

		vestingRegistry = IVestingRegistry(_vestingRegistry);

		emit VestingRegistryUpdated(msg.sender, _vestingRegistry);
	}

	/**
	 * @notice Internal function used to update the waitedTS.
	 * @param _waitedTS The timestamp after which withdrawal is allowed.
	 */
	function _changeWaitedTS(uint256 _waitedTS) internal {
		require(_waitedTS != 0, "LockedFund: Waited TS cannot be zero.");

		waitedTS = _waitedTS;

		emit WaitedTSUpdated(msg.sender, _waitedTS);
	}

	/**
	 * @notice Internal function to add Token to the user balance (Vested and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point)which determines how much will be unlocked immediately.
	 */
	function _depositVested(
		address _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint
	) internal {
		/// If duration is also zero, then it is similar to Unlocked Token.
		require(_duration != 0, "LockedFund: Duration cannot be zero.");
		require(_duration < MAX_DURATION, "LockedFund: Duration is too long.");

		// MAX_BASIS_POINT is not included because if 100% is unlocked, then this function is not required to be used.
		require(_basisPoint < MAX_BASIS_POINT, "LockedFund: Basis Point has to be less than 10000.");
		bool txStatus = token.transferFrom(msg.sender, address(this), _amount);
		require(txStatus, "LockedFund: Token transfer was not successful. Check receiver address.");

		uint256 waitedUnlockedBal = _amount.mul(_basisPoint).div(MAX_BASIS_POINT);

		waitedUnlockedBalances[_userAddress] = waitedUnlockedBalances[_userAddress].add(waitedUnlockedBal);
		vestedBalances[_userAddress] = vestedBalances[_userAddress].add(_amount).sub(waitedUnlockedBal);

		cliff[_userAddress] = _cliff * INTERVAL;
		duration[_userAddress] = _duration * INTERVAL;

		emit VestedDeposited(msg.sender, _userAddress, _amount, _cliff, _duration, _basisPoint);
	}

	/**
	 * @notice A function to withdraw the waited unlocked balance.
	 * @param _sender The one who initiates the call, from this user the balance will be taken.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function _withdrawWaitedUnlockedBalance(address _sender, address _receiverAddress) internal {
		require(waitedTS != 0, "LockedFund: Waited TS not set yet.");
		require(waitedTS < block.timestamp, "LockedFund: Wait Timestamp not yet passed.");

		address userAddr = _receiverAddress;
		if (_receiverAddress == address(0)) {
			userAddr = _sender;
		}

		uint256 amount = waitedUnlockedBalances[_sender];
		waitedUnlockedBalances[_sender] = 0;

		bool txStatus = token.transfer(userAddr, amount);
		require(txStatus, "LockedFund: Token transfer was not successful. Check receiver address.");

		emit Withdrawn(_sender, userAddr, amount);
	}

	/**
	 * @notice Creates a Vesting Contract for a user.
	 * @param _tokenOwner The owner of the vesting contract.
	 * @return _vestingAddress The Vesting Contract Address.
	 * @dev Does not do anything if Vesting Contract was already created.
	 */
	function _createVesting(address _tokenOwner) internal returns (address _vestingAddress) {
		require(cliff[msg.sender] != 0 && duration[msg.sender] != 0, "LockedFund: Cliff and/or Duration not set.");
		/// Here zero is given in place of amount, as amount is not really used in `vestingRegistry.createVesting()`.
		vestingRegistry.createVesting(_tokenOwner, 0, cliff[_tokenOwner], duration[_tokenOwner]);
		_vestingAddress = _getVesting(_tokenOwner);
		emit VestingCreated(msg.sender, _tokenOwner, _vestingAddress);
	}

	/**
	 * @notice Internal function to create vesting if not already created and Stakes tokens for a user.
	 */
	function _createVestingAndStake(address _sender) internal {
		address vestingAddr = _getVesting(_sender);

		if (vestingAddr == address(0)) {
			vestingAddr = _createVesting(_sender);
		}

		_stakeTokens(_sender, vestingAddr);
	}

	/**
	 * @notice Returns the Vesting Contract Address.
	 * @param _tokenOwner The owner of the vesting contract.
	 * @return _vestingAddress The Vesting Contract Address.
	 */
	function _getVesting(address _tokenOwner) internal view returns (address _vestingAddress) {
		return vestingRegistry.getVesting(_tokenOwner);
	}

	/**
	 * @notice Stakes the tokens in a particular vesting contract.
	 * @param _vesting The Vesting Contract Address.
	 */
	function _stakeTokens(address _sender, address _vesting) internal {
		uint256 amount = lockedBalances[_sender];
		lockedBalances[_sender] = 0;

		require(token.approve(_vesting, amount), "LockedFund: Approve failed.");
		IVestingLogic(_vesting).stakeTokens(amount);

		emit TokenStaked(_sender, _vesting, amount);
	}

	/* Getter or Read Functions */

	/**
	 * @notice Function to read the waited timestamp.
	 * @return The waited timestamp.
	 */
	function getWaitedTS() external view returns (uint256) {
		return waitedTS;
	}

	/**
	 * @notice Function to read the token on sale.
	 * @return The Token contract address which is being sold in the contract.
	 */
	function getToken() public view returns (address) {
		return address(token);
	}

	/**
	 * @notice Function to read the vesting registry.
	 * @return Address of Vesting Registry.
	 */
	function getVestingDetails() public view returns (address) {
		return address(vestingRegistry);
	}

	/**
	 * @notice The function to get the vested balance of a user.
	 * @param _addr The address of the user to check the vested balance.
	 * @return _balance The vested balance of the address `_addr`.
	 */
	function vestedBalance(address _addr) external view returns (uint256 _balance) {
		return vestedBalances[_addr];
	}

	/**
	 * @notice The function to get the locked balance of a user.
	 * @param _addr The address of the user to check the locked balance.
	 * @return _balance The locked balance of the address `_addr`.
	 */
	function getLockedBalance(address _addr) external view returns (uint256 _balance) {
		return lockedBalances[_addr];
	}

	/**
	 * @notice The function to get the waited unlocked balance of a user.
	 * @param _addr The address of the user to check the waited unlocked balance.
	 * @return _balance The waited unlocked balance of the address `_addr`.
	 */
	function getWaitedUnlockedBalance(address _addr) external view returns (uint256 _balance) {
		return waitedUnlockedBalances[_addr];
	}

	/**
	 * @notice The function to get the unlocked balance of a user.
	 * @param _addr The address of the user to check the unlocked balance.
	 * @return _balance The unlocked balance of the address `_addr`.
	 */
	function getUnlockedBalance(address _addr) external view returns (uint256 _balance) {
		return unlockedBalances[_addr];
	}

	/**
	 * @notice The function to check is an address is admin or not.
	 * @param _addr The address of the user to check the admin status.
	 * @return _status True if admin, False otherwise.
	 */
	function adminStatus(address _addr) external view returns (bool _status) {
		return isAdmin[_addr];
	}

	/**
	 * @notice Function to read the cliff and duration of a user.
	 * @param _addr The address whose cliff and duration has to be found.
	 * @return The cliff of the user vesting/lock.
	 * @return The duration of the user vesting/lock.
	 */
	function getCliffAndDuration(address _addr) external view returns (uint256, uint256) {
		return (cliff[_addr], duration[_addr]);
	}
}
