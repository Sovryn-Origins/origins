pragma solidity ^0.5.17;

import "../Interfaces/IERC20.sol";
import "../Interfaces/ILockedFund.sol";
import "../Openzeppelin/SafeMath.sol";
import "../Openzeppelin/SafeERC20.sol";
import "../Interfaces/IVestingLogic.sol";
import "../Interfaces/IVestingRegistryLogic.sol";

/**
 * @title A holding contract for Locked Fund.
 * @author Shebin John - admin@remedcu.com
 * @notice You can use this contract for timed token release from Locked Fund.
 * @dev This is not the final form of this contract.
 */
contract LockedFund is ILockedFund {
	using SafeMath for uint256;
	using Address for address;
	using SafeERC20 for IERC20;

	/* Storage */

	/// @notice The time after which waited unlock balance can be withdrawn.
	uint256 public waitedTS;

	/// @notice The maximum basis point which is allowed.
	uint256 internal constant MAX_BASIS_POINT = 10000;
	/// @notice The maximum duration allowed for staking.
	uint256 internal constant MAX_DURATION = 36;
	/// @notice The interval duration.
	uint256 public constant INTERVAL = 4 weeks;
	/// @notice The Missing Tokens for transfers/vesting/locking.
	uint256 internal missingBalance;
	/// @notice Used for vestingCreationType parameter in vesting creation.
	uint256 public vestingCreationType;

	/// @notice The token contract.
	IERC20 public token;
	/// @notice The Vesting registry contract.
	IVestingRegistryLogic public vestingRegistry;

	/**
	 * @notice The type of Unlock.
	 * None - The unlock is not set yet.
	 * Immediate - The tokens will be unlocked immediately.
	 * Waited - The tokens will be unlocked only after a particular time period.
	 */
	enum UnlockType {
		None,
		Immediate,
		Waited
	}

	/// @notice The vested balances.
	mapping(address => mapping(bytes32 => uint256)) public vestedBalances;
	/// @notice The locked user balances. Not used right now.
	mapping(address => mapping(bytes32 => uint256)) public lockedBalances;
	/// @notice The waited unlocked user balances.
	mapping(address => uint256) public waitedUnlockedBalances;
	/// @notice The unlocked user balances. Not used right now.
	mapping(address => uint256) public unlockedBalances;
	/// @notice The contracts/wallets with admin power.
	mapping(address => bool) public isAdmin;

	/// @notice The vestings of a particular user.
	mapping(address => bytes32[]) public userVestings;
	/// @notice The vesting details of a particular vesting schedule.
	mapping(bytes32 => VestingData) public vestingDatas;

	struct VestingData {
		uint256 vestingType;
		uint256 cliff;
		uint256 duration;
	}

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
	 * @notice Emitted when Token is updated.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _oldToken The old token address.
	 * @param _newToken The new token address.
	 */
	event TokenUpdated(address indexed _initiator, address indexed _oldToken, address indexed _newToken);

	/**
	 * @notice Emitted when a new unlocked deposit is made.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user to whose unlocked balance a new deposit was made.
	 * @param _amount The amount of Token to be added to the unlocked balance.
	 */
	event UnlockedDeposited(address indexed _initiator, address indexed _userAddress, uint256 _amount);

	/**
	 * @notice Emitted when a new waited unlocked deposit is made.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user to whose waited unlocked balance a new deposit was made.
	 * @param _amount The amount of Token to be added to the waited unlocked balance.
	 */
	event WaitedUnlockedDeposited(address indexed _initiator, address indexed _userAddress, uint256 _amount);

	/**
	 * @notice Emitted when a new vested deposit is made.
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
	 * @notice Emitted when a new unlocked deposit is made.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _amount The amount of Token to be added to the un/locked balance.
	 */
	event MissingBalanceDeposited(address indexed _initiator, uint256 _amount);

	/**
	 * @notice Emitted when a new deposit is made.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user to whose un/locked balance a new deposit was made.
	 * @param _amount The amount of Token to be added to the un/locked balance.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be unlocked immediately.
	 */
	event WaitedUnlockedDeposited(address indexed _initiator, address indexed _userAddress, uint256 _amount, uint256 _basisPoint);

	/**
	 * @notice Emitted when a user withdraws the Waited Unlocked fund.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user whose waited unlocked balance has to be withdrawn.
	 * @param _amount The amount of Token withdrawn from the waited unlocked balance.
	 */
	event WithdrawnWaitedUnlockedBalance(address indexed _initiator, address indexed _userAddress, uint256 _amount);

	/**
	 * @notice Emitted when a user withdraws the Unlocked fund.
	 * @param _initiator The address which initiated this event to be emitted.
	 * @param _userAddress The user whose unlocked balance has to be withdrawn.
	 * @param _amount The amount of Token withdrawn from the unlocked balance.
	 */
	event WithdrawnUnlockedBalance(address indexed _initiator, address indexed _userAddress, uint256 _amount);

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
	modifier onlyAdmin() {
		require(isAdmin[msg.sender], "LockedFund: Only admin can call this.");
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
		require(_token != address(0) && _token.isContract(), "LockedFund: Invalid Token Address.");
		require(_vestingRegistry != address(0) && _vestingRegistry.isContract(), "LockedFund: Vesting registry address is invalid.");

		waitedTS = _waitedTS;
		token = IERC20(_token);
		vestingRegistry = IVestingRegistryLogic(_vestingRegistry);
		vestingCreationType = 1;

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
	 * @notice The function used to update the Token.
	 * @param _token The address of the ERC20 Token.
	 * @dev This is in some cases when the token is not created before/during Origins Sale.
	 */
	function changeToken(address _token) public onlyAdmin {
		_changeToken(_token);
	}

	/**
	 * @notice Adds Token to the user balance (Vested and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be (waited) unlocked immediately.
	 * @param _unlockedOrWaited Determines if the Basis Point determines the Unlocked or Waited Unlock Balance.
	 * @param _receiveTokens - True if tokens should be taken from caller, False otherwise.
	 * @dev Future iteration will have choice between waited unlock and immediate unlock.
	 */
	function depositVested(
		address _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint,
		uint256 _unlockedOrWaited,
		bool _receiveTokens
	) public onlyAdmin {
		_depositVested(_userAddress, _amount, _cliff, _duration, _basisPoint, UnlockType(_unlockedOrWaited), _receiveTokens);
	}

	/**
	 * @notice Adds Token to the user balance (Locked and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be (waited) unlocked immediately.
	 * @param _unlockedOrWaited Determines if the Basis Point determines the Unlocked or Waited Unlock Balance.
	 * @param _receiveTokens - True if tokens should be taken from caller, False otherwise.
	 * @dev Future iteration will have choice between waited unlock and immediate unlock.
	 */
	function depositLocked(
		address _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint,
		uint256 _unlockedOrWaited,
		bool _receiveTokens
	) public onlyAdmin {
		// TODO Implement the functionality.
		// _depositLocked(_userAddress, _amount, _cliff, _duration, _basisPoint, UnlockType(_unlockedOrWaited), _receiveTokens);
		// An array with timestamp and a mapping from timestamp to the amount.
		// Array will be unsorted, so there should be two ways to withdraw this to avoid out of gas problem.
		// One should be normal one which will loop through all the timestamp in array.
		// The other should be which allows certain index to be passed to get the array elements.
		// There should also be a check to see if the timestamp is already in array. It can be done through checking the mapping.
		// If the mapping already has some amount, then that timestamp will be in array.
		// The the mapping has no amount, then the timestamp has to be added to the array.
	}

	/**
	 * @notice Adds Token to the user balance (Vested and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be unlocked immediately.
	 * @param _receiveTokens - True if tokens should be taken from caller, False otherwise.
	 * @dev Future iteration will have choice between waited unlock and immediate unlock.
	 */
	function depositWaitedUnlocked(
		address _userAddress,
		uint256 _amount,
		uint256 _basisPoint,
		bool _receiveTokens
	) public onlyAdmin {
		_depositWaitedUnlocked(_userAddress, _amount, _basisPoint, _receiveTokens);
	}

	/**
	 * @notice Function to call to deposit missing balance to create vesting/staking.
	 * @param _amount The amount being sent.
	 */
	function depositMissingBalance(uint256 _amount) external {
		_depositMissingBalance(_amount);
	}

	/**
	 * @notice A function to withdraw the unlocked balance.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function withdrawUnlockedBalance(address _receiverAddress) external {
		_withdrawUnlockedBalance(msg.sender, _receiverAddress);
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
	 * @return _vestingAddresses The New Vesting Contracts Created.
	 * @dev Zero (0) is passed to denote all vesting for that user will be created.
	 */
	function createAllVesting() external returns (address[] memory _vestingAddresses) {
		_vestingAddresses = _createVesting(msg.sender, bytes32(0));
	}

	/**
	 * @notice Creates vesting contract (if it hasn't been created yet) for the calling user.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @return _vestingAddress The New Vesting Contract Created.
	 */
	function createVesting(bytes32 _vestingData) external returns (address[] memory _vestingAddresses) {
		_vestingAddresses = _createVesting(msg.sender, _vestingData);
	}

	/**
	 * @notice Stakes tokens for a user who already have a vesting created.
	 * @dev The user should already have a vesting created, else this function will throw error.
	 * @dev Zero (0) is passed to denote all vesting for that user will be created.
	 * @dev This is not recommended function if there are many stakes to be created due to gas limit.
	 */
	function stakeAllTokens() external {
		_stakeTokens(msg.sender, bytes32(0));
	}

	/**
	 * @notice Stakes tokens for a user who already have a vesting created.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @dev The user should already have a vesting created, else this function will throw error.
	 */
	function stakeTokens(bytes32 _vestingData) external {
		_stakeTokens(msg.sender, _vestingData);
	}

	/**
	 * @notice Withdraws unlocked tokens and Stakes Vested token balance for a user who already have a vesting created.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 * @dev This will only create the last vesting schedule of a user.
	 */
	function withdrawAndStakeTokens(address _receiverAddress) external {
		_withdrawWaitedUnlockedBalance(msg.sender, _receiverAddress);
		// TODO: Tests & Audit _withdrawUnlockedBalance(msg.sender, _receiverAddress);
		_createVestingAndStake(msg.sender);
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
	function _removeAdmin(address _adminToRemove) internal {
		require(isAdmin[_adminToRemove], "LockedFund: Address is not an admin.");
		isAdmin[_adminToRemove] = false;

		emit AdminRemoved(msg.sender, _adminToRemove);
	}

	/**
	 * @notice Internal function to update the Vesting Registry, Duration and Cliff.
	 * @param _vestingRegistry The Vesting Registry Address.
	 */
	function _changeVestingRegistry(address _vestingRegistry) internal {
		require(_vestingRegistry != address(0) && _vestingRegistry.isContract(), "LockedFund: Vesting registry address is invalid.");

		vestingRegistry = IVestingRegistryLogic(_vestingRegistry);

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
	 * @notice The internal function used to update the Token.
	 * @param _token The address of the ERC20 Token.
	 */
	function _changeToken(address _token) internal {
		require(_token != address(0) && _token.isContract(), "LockedFund: Invalid Token Address.");
		emit TokenUpdated(msg.sender, address(token), _token);
		token = IERC20(_token);
	}

	/**
	 * @notice Internal function to get vesting data using cliff and duration.
	 * @return _vestingData The vesting data of a certain vesting schedule.
	 */
	function _getVestingData(uint256 _cliff, uint256 _duration) internal pure returns (bytes32 _vestingData) {
		return keccak256(abi.encodePacked(_cliff, _duration));
	}

	/**
	 * @notice Internal function to check if a user has a particular vesting schedule.
	 * @param _addr The address of the user to check the vesting of.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @return _status True if user has that vesting, False otherwise.
	 */
	function _checkUserVestingsOf(address _addr, bytes32 _vestingData) internal view returns (bool _status) {
		for (uint256 i = 0; i < userVestings[_addr].length; i++) {
			if (userVestings[_addr][i] == _vestingData) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @notice Internal function to add Token to the user balance (Vested and Waited Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose locked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _cliff The cliff for vesting.
	 * @param _duration The duration for vesting.
	 * @param _basisPoint The % (in Basis Point) which determines how much will be (waited) unlocked immediately.
	 * @param _unlockedOrWaited Determines if the Basis Point determines the Unlocked or Waited Unlock Balance.
	 * @param _receiveTokens - True if tokens should be taken from caller, False otherwise.
	 */
	function _depositVested(
		address _userAddress,
		uint256 _amount,
		uint256 _cliff,
		uint256 _duration,
		uint256 _basisPoint,
		UnlockType _unlockedOrWaited,
		bool _receiveTokens
	) internal {
		/// If duration is also zero, then it is similar to Unlocked Token.
		require(_duration != 0, "LockedFund: Duration cannot be zero.");
		require(_duration <= MAX_DURATION, "LockedFund: Duration is too long.");

		// MAX_BASIS_POINT is not included because if 100% is unlocked, then this function is not required to be used.
		require(_basisPoint < MAX_BASIS_POINT, "LockedFund: Basis Point has to be less than 10000.");
		if (_receiveTokens) {
			token.safeTransferFrom(msg.sender, address(this), _amount);
		} else {
			missingBalance = missingBalance.add(_amount);
		}
		uint256 unlockedBal = _amount.mul(_basisPoint).div(MAX_BASIS_POINT);

		if (_unlockedOrWaited == UnlockType.Immediate) {
			unlockedBalances[_userAddress] = unlockedBalances[_userAddress].add(unlockedBal);
			emit UnlockedDeposited(msg.sender, _userAddress, unlockedBal);
		} else if (_unlockedOrWaited == UnlockType.Waited) {
			waitedUnlockedBalances[_userAddress] = waitedUnlockedBalances[_userAddress].add(unlockedBal);
			emit WaitedUnlockedDeposited(msg.sender, _userAddress, unlockedBal);
		} else {
			unlockedBal = 0;
		}

		/// @notice Creating unique vesting data identifier.
		bytes32 _vestingData = _getVestingData(_cliff, _duration);

		/// @notice Checking if it already is in the list.
		bool _vestingExist = _checkUserVestingsOf(_userAddress, _vestingData);

		/// @notice If vesting does not exist in the user list, we add it.
		if (!_vestingExist) {
			userVestings[_userAddress].push(_vestingData);

			/// @notice We only have to do this check if the vesting was not found in user list.
			/// @dev If it exists with user, then this check is not required at all.
			if (vestingDatas[_vestingData].vestingType == 0) {
				vestingDatas[_vestingData] = VestingData(vestingCreationType, _cliff * INTERVAL, _duration * INTERVAL);
				vestingCreationType++;
			}
		}

		vestedBalances[_userAddress][_vestingData] = vestedBalances[_userAddress][_vestingData].add(_amount).sub(unlockedBal);

		emit VestedDeposited(msg.sender, _userAddress, _amount.sub(unlockedBal), _cliff, _duration, _basisPoint);
	}

	/**
	 * @notice Internal function to add Token to the user balance (Waited Unlocked and Unlocked Balance based on `_basisPoint`).
	 * @param _userAddress The user whose waited unlocked balance has to be updated with `_amount`.
	 * @param _amount The amount of Token to be added to the locked and/or unlocked balance.
	 * @param _basisPoint The % (in Basis Point)which determines how much will be unlocked immediately.
	 * @param _receiveTokens - True if tokens should be taken from caller, False otherwise.
	 */
	function _depositWaitedUnlocked(
		address _userAddress,
		uint256 _amount,
		uint256 _basisPoint,
		bool _receiveTokens
	) internal {
		// MAX_BASIS_POINT is not included because if 100% is unlocked, then this function is not required to be used.
		require(_basisPoint < MAX_BASIS_POINT, "LockedFund: Basis Point has to be less than 10000.");
		if (_receiveTokens) {
			token.safeTransferFrom(msg.sender, address(this), _amount);
		} else {
			missingBalance = missingBalance.add(_amount);
		}

		uint256 unlockedBal = _amount.mul(_basisPoint).div(MAX_BASIS_POINT);

		if (unlockedBal > 0) {
			unlockedBalances[_userAddress] = unlockedBalances[_userAddress].add(unlockedBal);
			emit UnlockedDeposited(msg.sender, _userAddress, _amount);
		}
		waitedUnlockedBalances[_userAddress] = waitedUnlockedBalances[_userAddress].add(_amount).sub(unlockedBal);

		emit WaitedUnlockedDeposited(msg.sender, _userAddress, _amount, _basisPoint);
	}

	/**
	 * @notice Internal function to call to deposit missing balance to create vesting/staking.
	 * @param _amount The amount being sent.
	 */
	function _depositMissingBalance(uint256 _amount) internal {
		uint256 _missingBalance = missingBalance;
		require(_amount > 0, "LockedFund: Amount to transfer should be higher than zero.");
		require(_missingBalance > 0, "LockedFund: Missing Balance should be higher than zero.");

		uint256 _transferAmount = _amount > _missingBalance ? _missingBalance : _amount;

		token.safeTransferFrom(msg.sender, address(this), _transferAmount);
		missingBalance = missingBalance.sub(_transferAmount);

		emit MissingBalanceDeposited(msg.sender, _transferAmount);
	}

	/**
	 * @notice A function to withdraw the waited unlocked balance.
	 * @param _sender The one who initiates the call, from this user the balance will be taken.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function _withdrawWaitedUnlockedBalance(address _sender, address _receiverAddress) internal {
		require(waitedTS < block.timestamp, "LockedFund: Wait Timestamp not yet passed.");

		address userAddr = _receiverAddress == address(0) ? _sender : _receiverAddress;

		uint256 amount = waitedUnlockedBalances[_sender];
		waitedUnlockedBalances[_sender] = 0;

		token.safeTransfer(userAddr, amount);

		emit WithdrawnWaitedUnlockedBalance(_sender, userAddr, amount);
	}

	/**
	 * @notice A function to withdraw unlocked balance.
	 * @param _sender The one who initiates the call, from this user the balance will be taken.
	 * @param _receiverAddress If specified, the unlocked balance will go to this address, else to msg.sender.
	 */
	function _withdrawUnlockedBalance(address _sender, address _receiverAddress) internal {
		address userAddr = _receiverAddress == address(0) ? _sender : _receiverAddress;

		uint256 amount = unlockedBalances[_sender];
		unlockedBalances[_sender] = 0;

		token.safeTransfer(userAddr, amount);

		emit WithdrawnUnlockedBalance(_sender, userAddr, amount);
	}

	/**
	 * @notice Creates a Vesting Contract for a user.
	 * @param _tokenOwner The owner of the vesting contract.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @return _vestingAddress The Vesting Contract Address.
	 * @dev Does not do anything if Vesting Contract was already created.
	 */
	function _createVesting(address _tokenOwner, bytes32 _vestingData) internal returns (address[] memory) {
		if (_vestingData == bytes32(0)) {
			address[] memory _vestingAddresses = new address[](userVestings[_tokenOwner].length);
			for (uint256 i = 0; i < userVestings[_tokenOwner].length; i++) {
				bytes32 vestingData = userVestings[_tokenOwner][i];
				uint256 _cliff = vestingDatas[vestingData].cliff;
				uint256 _duration = vestingDatas[vestingData].duration;
				uint256 _vestingType = vestingDatas[vestingData].vestingType;
				vestingRegistry.createVestingAddr(_tokenOwner, 0, _cliff, _duration, _vestingType);
				address _vestingAddress = _getVesting(_tokenOwner, _cliff, _duration, _vestingType);
				_vestingAddresses[i] = _vestingAddress;
				emit VestingCreated(msg.sender, _tokenOwner, _vestingAddress);
			}
			return _vestingAddresses;
		} else {
			/// @notice Will only create if user has some vesting balance.
			require(vestedBalances[_tokenOwner][_vestingData] > 0, "LockedFund: User has no vesting balance in this vesting schedule.");
			/// @notice We only need one slot for saving the vestingAddress.
			address[] memory _vestingAddresses = new address[](1);
			uint256 _cliff = vestingDatas[_vestingData].cliff;
			uint256 _duration = vestingDatas[_vestingData].duration;
			uint256 _vestingType = vestingDatas[_vestingData].vestingType;
			vestingRegistry.createVestingAddr(_tokenOwner, 0, _cliff, _duration, _vestingType);
			address _vestingAddress = _getVesting(_tokenOwner, _cliff, _duration, _vestingType);
			_vestingAddresses[0] = _vestingAddress;
			emit VestingCreated(msg.sender, _tokenOwner, _vestingAddress);
			return _vestingAddresses;
		}
	}

	/**
	 * @notice Returns the Vesting Contract Address.
	 * @param _tokenOwner The owner of the vesting contract.
	 * @param _cliff The cliff of the user vesting.
	 * @param _duration The duration of the user vesting.
	 * @param _vestingCreationType The Vesting Type of the user vesting.
	 * @return _vestingAddress The Vesting Contract Address.
	 */
	function _getVesting(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) internal view returns (address _vestingAddress) {
		return vestingRegistry.getVestingAddr(_tokenOwner, _cliff, _duration, _vestingCreationType);
	}

	/**
	 * @notice Stakes the tokens in a particular vesting contract.
	 * @param _sender The user wallet address.
	 * @param _vestingData The Vesting Contract Address.
	 */
	function _stakeTokens(address _sender, bytes32 _vestingData) internal {
		if (_vestingData == bytes32(0)) {
			for (uint256 i = 0; i < userVestings[_sender].length; i++) {
				bytes32 vestingData = userVestings[_sender][i];
				uint256 _cliff = vestingDatas[vestingData].cliff;
				uint256 _duration = vestingDatas[vestingData].duration;
				uint256 _vestingType = vestingDatas[vestingData].vestingType;
				address _vesting = _getVesting(_sender, _cliff, _duration, _vestingType);
				uint256 amount = vestedBalances[_sender][vestingData];
				vestedBalances[_sender][vestingData] = 0;
				token.safeTransfer(address(vestingRegistry), amount);
				vestingRegistry.stakeTokens(_vesting, amount);

				emit TokenStaked(_sender, _vesting, amount);
			}
			delete userVestings[_sender];
		} else {
			uint256 userVestingsLength = userVestings[_sender].length;
			uint256 index = userVestingsLength;
			for (uint256 i = 0; i < userVestingsLength; i++) {
				if (userVestings[_sender][i] == _vestingData) {
					index = i;
					address _vesting = _getVesting(
						_sender,
						vestingDatas[_vestingData].cliff,
						vestingDatas[_vestingData].duration,
						vestingDatas[_vestingData].vestingType
					);
					require(_vesting != address(0), "LockedFund: Vesting address invalid.");
					uint256 amount = vestedBalances[_sender][_vestingData];
					require(amount > 0, "LockedFund: Amount should be greater than zero.");
					vestedBalances[_sender][_vestingData] = 0;

					token.safeTransfer(address(vestingRegistry), amount);
					vestingRegistry.stakeTokens(_vesting, amount);

					emit TokenStaked(_sender, _vesting, amount);
				}
			}
			if (index != userVestingsLength) {
				userVestings[_sender][index] = userVestings[_sender][userVestingsLength - 1];
				userVestings[_sender].pop();
			}
		}
	}

	/**
	 * @notice Internal function to create vesting if not already created and Stakes tokens for a user.
	 * @param _sender The user wallet address.
	 */
	function _createVestingAndStake(address _sender) internal {
		uint256 userVestingsLength = userVestings[_sender].length;
		require(userVestingsLength != 0, "LockedFund: No Vesting for user available.");
		bytes32 _vestingData = userVestings[_sender][userVestingsLength - 1];

		uint256 _cliff = vestingDatas[_vestingData].cliff;
		uint256 _duration = vestingDatas[_vestingData].duration;
		uint256 _vestingType = vestingDatas[_vestingData].vestingType;
		address vestingAddr = _getVesting(_sender, _cliff, _duration, _vestingType);

		if (vestingAddr == address(0)) {
			_createVesting(_sender, _vestingData);
			vestingAddr = _getVesting(_sender, _cliff, _duration, _vestingType);
		}

		_stakeTokens(_sender, _vestingData);
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
	function getVestingRegistry() public view returns (address) {
		return address(vestingRegistry);
	}

	/**
	 * @notice The function to get the vested balance of a user.
	 * @param _addr The address of the user to check the vested balance.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @return _balance The vested balance of the address `_addr`.
	 */
	function getVestedBalance(address _addr, bytes32 _vestingData) external view returns (uint256 _balance) {
		return vestedBalances[_addr][_vestingData];
	}

	/**
	 * @notice The function to get the locked balance of a user.
	 * @param _addr The address of the user to check the locked balance.
	 * @param _lockingData The locking details like cliff & duration in short form.
	 * @return _balance The locked balance of the address `_addr`.
	 */
	function getLockedBalance(address _addr, bytes32 _lockingData) external view returns (uint256 _balance) {
		return lockedBalances[_addr][_lockingData];
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
	 * @notice The function to get the missing balance for the LockedFund contract.
	 * @return _balance The missing balance of the contract.
	 */
	function getMissingBalance() external view returns (uint256 _balance) {
		return missingBalance;
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
	 * @notice Function to read the cliff, duration and Type of a Vesting.
	 * @param _vestingData The address whose cliff and duration has to be found.
	 * @return _cliff The cliff of the user vesting.
	 * @return _duration The duration of the user vesting.
	 * @return _vestingType The Vesting Type of the user vesting.
	 */
	function getCliffDurationAndType(bytes32 _vestingData)
		external
		view
		returns (
			uint256 _cliff,
			uint256 _duration,
			uint256 vestingType
		)
	{
		return (vestingDatas[_vestingData].cliff, vestingDatas[_vestingData].duration, vestingDatas[_vestingData].vestingType);
	}

	/**
	 * @notice Returns the Vesting Contract Address.
	 * @param _tokenOwner The owner of the vesting contract.
	 * @param _cliff The cliff of the user vesting.
	 * @param _duration The duration of the user vesting.
	 * @param _vestingCreationType The Vesting Type of the user vesting.
	 * @return _vestingAddress The Vesting Contract Address.
	 */
	function getVesting(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) external view returns (address _vestingAddress) {
		return _getVesting(_tokenOwner, _cliff, _duration, _vestingCreationType);
	}

	/**
	 * @notice Function to get the user vestings of `_addr` or caller.
	 * @param _addr The address of the user to get the vesting of.
	 * @return _userVestings The vesting schedules of a user.
	 */
	function getUserVestingsOf(address _addr) external view returns (bytes32[] memory _userVestings) {
		if (_addr == address(0)) {
			return userVestings[msg.sender];
		} else {
			return userVestings[_addr];
		}
	}

	/**
	 * @notice Function to check if a user has a particular vesting schedule.
	 * @param _addr The address of the user to check the vesting of.
	 * @param _vestingData The vesting details like cliff & duration in short form.
	 * @return _status True if user has that vesting, False otherwise.
	 */
	function checkUserVestingsOf(address _addr, bytes32 _vestingData) external view returns (bool _status) {
		return _checkUserVestingsOf(_addr, _vestingData);
	}

	/**
	 * @notice Function to create the vesting data from cliff and duration.
	 * @param _cliff The cliff of the user vesting.
	 * @param _duration The duration of the user vesting.
	 * @return _vestingData The vesting data of a certain vesting schedule.
	 */
	function getVestingData(uint256 _cliff, uint256 _duration) external pure returns (bytes32 _vestingData) {
		return _getVestingData(_cliff, _duration);
	}
}
