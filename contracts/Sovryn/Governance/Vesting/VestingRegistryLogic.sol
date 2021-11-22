pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../../../Interfaces/IFeeSharingProxy.sol";
import "../../../Interfaces/IVesting.sol";
import "../../../Interfaces/ITeamVesting.sol";
import "../../../Interfaces/IVestingLogic.sol";
import "./VestingRegistryStorage.sol";

contract VestingRegistryLogic is VestingRegistryStorage {
	event TokenTransferred(address indexed receiver, uint256 amount);
	event VestingCreated(
		address indexed tokenOwner,
		address vesting,
		uint256 cliff,
		uint256 duration,
		uint256 amount,
		uint256 vestingCreationType
	);
	event TeamVestingCreated(
		address indexed tokenOwner,
		address vesting,
		uint256 cliff,
		uint256 duration,
		uint256 amount,
		uint256 vestingCreationType
	);
	event TokensStaked(address indexed vesting, uint256 amount);

	/**
	 * @notice Replace constructor with initialize function for Upgradable Contracts
	 * This function will be called only once by the owner
	 * */
	function initialize(
		address _vestingFactory,
		address _token,
		address _staking,
		address _feeSharingProxy,
		address _vestingOwner,
		address _lockedFund
	) external onlyOwner initializer {
		require(_token != address(0), "token address invalid");
		require(_staking != address(0), "staking address invalid");
		require(_feeSharingProxy != address(0), "feeSharingProxy address invalid");
		require(_vestingOwner != address(0), "vestingOwner address invalid");
		require(_lockedFund != address(0), "lockedFund address invalid");

		_setVestingFactory(_vestingFactory);
		token = _token;
		staking = _staking;
		feeSharingProxy = _feeSharingProxy;
		vestingOwner = _vestingOwner;
		lockedFund = ILockedFund(_lockedFund);
	}

	/**
	 * @notice sets vesting factory address
	 * @param _vestingFactory the address of vesting factory contract
	 */
	function setVestingFactory(address _vestingFactory) external onlyOwner {
		_setVestingFactory(_vestingFactory);
	}

	/**
	 * @notice Internal function that sets vesting factory address
	 * @param _vestingFactory the address of vesting factory contract
	 */
	function _setVestingFactory(address _vestingFactory) internal {
		require(_vestingFactory != address(0), "vestingFactory address invalid");
		vestingFactory = IVestingFactory(_vestingFactory);
	}

	/**
	 * @notice transfers tokens to given address
	 * @param _receiver the address of the token receiver
	 * @param _amount the amount to be transferred
	 */
	function transferToken(address _receiver, uint256 _amount) external onlyOwner {
		require(_receiver != address(0), "receiver address invalid");
		require(_amount != 0, "amount invalid");
		require(IERC20(token).transfer(_receiver, _amount), "transfer failed");
		emit TokenTransferred(_receiver, _amount);
	}

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
	) external onlyAuthorized {
		createVestingAddr(_tokenOwner, _amount, _cliff, _duration, 0);
	}

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
	) public onlyAuthorized {
		address vesting = _getOrCreateVesting(_tokenOwner, _cliff, _duration, uint256(VestingType.Vesting), _vestingCreationType);
		emit VestingCreated(_tokenOwner, vesting, _cliff, _duration, _amount, _vestingCreationType);
	}

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
	) external onlyAuthorized {
		address vesting = _getOrCreateVesting(_tokenOwner, _cliff, _duration, uint256(VestingType.TeamVesting), _vestingCreationType);
		emit TeamVestingCreated(_tokenOwner, vesting, _cliff, _duration, _amount, _vestingCreationType);
	}

	/**
	 * @notice stakes tokens according to the vesting schedule
	 * @param _vesting the address of Vesting contract
	 * @param _amount the amount of tokens to stake
	 */
	function stakeTokens(address _vesting, uint256 _amount) external onlyAuthorized {
		require(_vesting != address(0), "vesting address invalid");
		require(_amount > 0, "amount invalid");

		IERC20(token).approve(_vesting, _amount);
		IVesting(_vesting).stakeTokens(_amount);
		emit TokensStaked(_vesting, _amount);
	}

	/**
	 * @notice public function that returns vesting contract address for the given token owner, cliff, duration
	 * @dev Important: Please use this instead of getVesting function
	 */
	function getVestingAddr(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public view returns (address) {
		uint256 type_ = uint256(VestingType.Vesting);
		uint256 uid = uint256(keccak256(abi.encodePacked(_tokenOwner, type_, _cliff, _duration, _vestingCreationType)));
		return vestings[uid].vestingAddress;
	}

	/**
	 * @notice returns team vesting contract address for the given token owner, cliff, duration
	 */
	function getTeamVesting(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _vestingCreationType
	) public view returns (address) {
		uint256 type_ = uint256(VestingType.TeamVesting);
		uint256 uid = uint256(keccak256(abi.encodePacked(_tokenOwner, type_, _cliff, _duration, _vestingCreationType)));
		return vestings[uid].vestingAddress;
	}

	/**
	 * @notice Internal function to deploy Vesting/Team Vesting contract
	 * @param _tokenOwner the owner of the tokens
	 * @param _cliff the cliff in seconds
	 * @param _duration the total duration in seconds
	 * @param _type the type of vesting
	 * @param _vestingCreationType the type of vesting created(e.g. Origin, Bug Bounty etc.)
	 */
	function _getOrCreateVesting(
		address _tokenOwner,
		uint256 _cliff,
		uint256 _duration,
		uint256 _type,
		uint256 _vestingCreationType
	) internal returns (address) {
		address vesting;
		uint256 uid = uint256(keccak256(abi.encodePacked(_tokenOwner, _type, _cliff, _duration, _vestingCreationType)));
		if (vestings[uid].vestingAddress == address(0)) {
			if (_type == 1) {
				vesting = vestingFactory.deployVesting(token, staking, _tokenOwner, _cliff, _duration, feeSharingProxy, _tokenOwner);
			} else {
				vesting = vestingFactory.deployTeamVesting(token, staking, _tokenOwner, _cliff, _duration, feeSharingProxy, vestingOwner);
			}
			vestings[uid] = VestingDetail(_type, _vestingCreationType, vesting);
			vestingsOf[_tokenOwner].push(uid);
			isVesting[vesting] = true;
		}
		return vestings[uid].vestingAddress;
	}

	/**
	 * @notice returns all vesting details for the given token owner
	 */
	function getVestingsOf(address _tokenOwner) external view returns (VestingDetail[] memory) {
		uint256[] memory vestingIds = vestingsOf[_tokenOwner];
		uint256 length = vestingIds.length;
		VestingDetail[] memory _vestings = new VestingDetail[](vestingIds.length);
		for (uint256 i = 0; i < length; i++) {
			_vestings[i] = vestings[vestingIds[i]];
		}
		return _vestings;
	}

	/**
	 * @notice returns cliff and duration for Vesting & TeamVesting contracts
	 */
	function getVestingDetails(address _vestingAddress) external view returns (uint256 cliff, uint256 duration) {
		IVestingLogic vesting = IVestingLogic(_vestingAddress);
		return (vesting.cliff(), vesting.duration());
	}

	/**
	 * @notice returns if the address is a vesting address
	 */
	function isVestingAdress(address _vestingAddress) external view returns (bool isVestingAddr) {
		return isVesting[_vestingAddress];
	}
}
