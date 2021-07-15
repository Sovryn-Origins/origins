pragma solidity ^0.5.17;

/**
 *  @title Interface of the Origins Platform.
 *  @author Franklin Richards - powerhousefrank@protonmail.com
 */
contract IOrigins {
	/* Functions */

	/* Public & External Functions */

	/**
	 * @notice Function to set the deposit address.
	 * @param _depositAddress The address of deposit address where all the raised fund will go.
	 * @dev If this is not set, an owner can withdraw the funds. Here owner is supposed to be a multisig. Or a trusted party.
	 */
	function setDepositAddress(address payable _depositAddress) external;

	/**
	 * @notice Function to set the Locked Fund Contract Address.
	 * @param _lockedFund The address of new the Vesting registry.
	 */
	function setLockedFund(address _lockedFund) external;

	/**
	 * @notice Function to create a new tier.
	 * @param _maxAmount The maximum amount of asset which can be deposited.
	 * @param _remainingTokens Contains the remaining tokens for sale.
	 * @param _saleStartTS Contains the timestamp for the sale to start. Before which no user will be able to buy tokens.
	 * @param _saleEnd Contains the duration or timestamp for the sale to end. After which no user will be able to buy tokens.
	 * @param _unlockedBP Contains the unlock amount in Basis Point for Vesting/Lock.
	 * @param _vestOrLockCliff Contains the cliff of the vesting/lock for distribution.
	 * @param _vestOrLockDuration Contains the duration of the vesting/lock for distribution.
	 * @param _depositRate Contains the rate of the token w.r.t. the depositing asset.
	 * @param _verificationType Contains the method by which verification happens.
	 * @param _saleEndDurationOrTS Contains whether end of sale is by Duration or Timestamp.
	 * @param _transferType Contains the type of token transfer after a user buys to get the tokens.
	 * @return _tierID The newly created tier ID.
	 * @dev In the future this should be decoupled.
	 * Some are currently sent with default value due to Stack Too Deep problem.
	 */
	function createTier(
		uint256 _maxAmount,
		uint256 _remainingTokens,
		uint256 _saleStartTS,
		uint256 _saleEnd,
		uint256 _unlockedBP,
		uint256 _vestOrLockCliff,
		uint256 _vestOrLockDuration,
		uint256 _depositRate,
		uint256 _depositType,
		uint256 _verificationType,
		uint256 _saleEndDurationOrTS,
		uint256 _transferType
	) external returns (uint256 _tierID);

	/**
	 * @notice Function to set the Tier Verification Method.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _verificationType The type of verification for the particular sale.
	 */
	function setTierVerification(uint256 _tierID, uint256 _verificationType) external;

	/**
	 * @notice Function to set the Tier Deposit Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _depositRate The rate is the, asset * rate = token.
	 * @param _depositToken The token for that particular Tier Sale.
	 * @param _depositType The type of deposit for the particular sale.
	 */
	function setTierDeposit(
		uint256 _tierID,
		uint256 _depositRate,
		address _depositToken,
		uint256 _depositType
	) external;

	/**
	 * @notice Function to set the Tier Token Limit Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _minAmount The minimum asset amount required to participate in that tier.
	 * @param _maxAmount The maximum asset amount allowed to participate in that tier.
	 */
	function setTierTokenLimit(
		uint256 _tierID,
		uint256 _minAmount,
		uint256 _maxAmount
	) external;

	/**
	 * @notice Function to set the Tier Token Amount Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _remainingTokens The maximum number of tokens allowed to be sold in the tier.
	 */
	function setTierTokenAmount(uint256 _tierID, uint256 _remainingTokens) external;

	/**
	 * @notice Function to set the Tier Vest/Lock Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _vestOrLockCliff The Vest/Lock Cliff = A * LockedFund.Interval, where A is the cliff.
	 * @param _vestOrLockDuration The Vest/Lock Duration = A * LockedFund.Interval, where A is the duration.
	 * @param _unlockedBP The unlocked token amount in BP.
	 * @param _transferType The Tier Transfer Type for the Tier.
	 */
	function setTierVestOrLock(
		uint256 _tierID,
		uint256 _vestOrLockCliff,
		uint256 _vestOrLockDuration,
		uint256 _unlockedBP,
		uint256 _transferType
	) external;

	/**
	 * @notice Function to set the Tier Time Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _saleStartTS The Tier Sale Start Timestamp.
	 * @param _saleEnd The Tier Sale End Duration or Timestamp.
	 * @param _saleEndDurationOrTS The Tier Sale End Type for the Tier.
	 */
	function setTierTime(
		uint256 _tierID,
		uint256 _saleStartTS,
		uint256 _saleEnd,
		uint256 _saleEndDurationOrTS
	) external;

	/**
	 * @notice Function to verify a single address with a single tier.
	 * @param _addressToBeVerified The address which has to be veriried for the sale.
	 * @param _tierID The tier for which the address has to be verified.
	 */
	function addressVerification(address _addressToBeVerified, uint256 _tierID) external;

	/**
	 * @notice Function to verify a single address with multiple tiers.
	 * @param _addressToBeVerified The address which has to be veriried for the sale.
	 * @param _tierID The tiers for which the address has to be verified.
	 */
	function singleAddressMultipleTierVerification(address _addressToBeVerified, uint256[] calldata _tierID) external;

	/**
	 * @notice Function to verify multiple address with a single tier.
	 * @param _addressToBeVerified The addresses which has to be veriried for the sale.
	 * @param _tierID The tier for which the addresses has to be verified.
	 */
	function multipleAddressSingleTierVerification(address[] calldata _addressToBeVerified, uint256 _tierID) external;

	/**
	 * @notice Function to verify multiple address with multiple tiers.
	 * @param _addressToBeVerified The addresses which has to be veriried for the sale.
	 * @param _tierID The tiers for which the addresses has to be verified.
	 */
	function multipleAddressAndTierVerification(address[] calldata _addressToBeVerified, uint256[] calldata _tierID) external;

	/**
	 * @notice Function to buy tokens from sale based on tier.
	 * @param _tierID The Tier ID from which the token has to be bought.
	 * @param _amount The amount of token (deposit asset) which will be sent for purchasing.
	 * @dev If deposit type if RBTC, then _amount can be passed as zero.
	 */
	function buy(uint256 _tierID, uint256 _amount) external payable;

	/**
	 * @notice The function used by the admin or deposit address to withdraw the sale proceedings.
	 * @dev In the future this could be made to be accessible only to seller, rather than owner.
	 */
	function withdrawSaleDeposit() external;

	/* Getter Functions */

	/**
	 * @notice Function to read the tier count.
	 * @return The number of tiers present in the contract.
	 */
	function getTierCount() external view returns (uint256);

	/**
	 * @notice Function to read the deposit address.
	 * @return The address of the deposit address.
	 * @dev If zero is returned, any of the owners can withdraw the raised funds.
	 */
	function getDepositAddress() external view returns (address);

	/**
	 * @notice Function to read the token on sale.
	 * @return The Token contract address which is being sold in the contract.
	 */
	function getToken() external view returns (address);

	/**
	 * @notice Function to read the locked fund contract address.
	 * @return Address of Locked Fund Contract.
	 */
	function getLockDetails() external view returns (address);

	/**
	 * @notice Function to read a Tier parameter.
	 * @param _tierID The Tier whose info is to be read.
	 * @return _minAmount The minimum amount which can be deposited.
	 * @return _maxAmount The maximum amount which can be deposited.
	 * @return _remainingTokens Contains the remaining tokens for sale.
	 * @return _saleStartTS Contains the timestamp for the sale to start. Before which no user will be able to buy tokens.
	 * @return _saleEnd Contains the duration or timestamp for the sale to end. After which no user will be able to buy tokens.
	 * @return _unlockedBP Contains the unlock amount in Basis Point for Vesting/Lock.
	 * @return _vestOrLockCliff Contains the cliff of the vesting/lock for distribution.
	 * @return _vestOrLockDuration Contains the duration of the vesting/lock for distribution.
	 * @return _depositRate Contains the rate of the token w.r.t. the depositing asset.
	 */
	function readTierPartA(uint256 _tierID)
		external
		view
		returns (
			uint256 _minAmount,
			uint256 _maxAmount,
			uint256 _remainingTokens,
			uint256 _saleStartTS,
			uint256 _saleEnd,
			uint256 _unlockedBP,
			uint256 _vestOrLockCliff,
			uint256 _vestOrLockDuration,
			uint256 _depositRate
		);

	/**
	 * @notice Function to read a Tier parameter.
	 * @param _tierID The Tier whose info is to be read.
	 * @return _depositToken Contains the deposit token address if the deposit type is Token.
	 * @return _depositType The type of deposit for the particular sale.
	 * @return _verificationType Contains the method by which verification happens.
	 * @return _saleEndDurationOrTS Contains whether end of sale is by Duration or Timestamp.
	 * @return _transferType Contains the type of token transfer after a user buys to get the tokens.
	 */
	function readTierPartB(uint256 _tierID)
		external
		view
		returns (
			address _depositToken,
			uint256 _depositType,
			uint256 _verificationType,
			uint256 _saleEndDurationOrTS,
			uint256 _transferType
		);

	/**
	 * @notice Function to read tokens bought by an address on a particular tier.
	 * @param  _addr The address which has to be checked.
	 * @param _tierID The tier ID for which the address has to be checked.
	 * @return The amount of tokens bought by the address.
	 */
	function getTokensBoughtByAddressOnTier(address _addr, uint256 _tierID) external view returns (uint256);

	/**
	 * @notice Function to read participating wallet count per tier.
	 * @param  _tierID The tier ID for which the count has to be checked.
	 * @return The number of wallets who participated in that Tier.
	 * @dev Total participation of wallets cannot be determined by this.
	 * A user can participate on one round and not on other.
	 * In the future maybe a count on that can be created.
	 */
	function getParticipatingWalletCountPerTier(uint256 _tierID) external view returns (uint256);

	/**
	 * @notice Function to read total token allocation per tier.
	 * @param  _tierID The tier ID for which the metrics has to be checked.
	 * @return The amount of tokens allocation on that tier.
	 */
	function getTotalTokenAllocationPerTier(uint256 _tierID) external view returns (uint256);

	/**
	 * @notice Function to read tokens sold per tier.
	 * @param  _tierID The tier ID for which the sold metrics has to be checked.
	 * @return The amount of tokens sold on that tier.
	 */
	function getTokensSoldPerTier(uint256 _tierID) external view returns (uint256);

	/**
	 * @notice Function to check if a tier sale ended or not.
	 * @param _tierID The Tier whose info is to be read.
	 * @return True is sale ended, False otherwise.
	 * @dev A return of false does not necessary mean the sale is active. It can also be in inactive state.
	 */
	function checkSaleEnded(uint256 _tierID) external view returns (bool _status);

	/**
	 * @notice Function to read address which are approved for sale in a tier.
	 * @param  _addr The address which has to be checked.
	 * @param _tierID The tier ID for which the address has to be checked.
	 * @return True is allowed, False otherwise.
	 */
	function isAddressApproved(address _addr, uint256 _tierID) external view returns (bool);
}
