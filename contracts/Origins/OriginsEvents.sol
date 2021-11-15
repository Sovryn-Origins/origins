pragma solidity ^0.5.17;

import "./OriginsAdmin.sol";

/**
 *  @title A contract containing all the events of Origins Base.
 *  @author Franklin Richards - powerhousefrank@protonmail.com
 *  @notice You can use this contract for adding events into Origins Base.
 */
contract OriginsEvents is OriginsAdmin {
	/* Events */

	/**
	 * @notice Emitted when a new verified address is added.
	 * @param _initiator The one who initiates this event.
	 * @param _verifiedAddress The address which was veriried for the sale.
	 * @param _tierID The tier for which the address was verified.
	 */
	event AddressVerified(address indexed _initiator, address indexed _verifiedAddress, uint256 _tierID);

	/**
	 * @notice Emitted when the Deposit Address is updated.
	 * @param _initiator The one who initiates this event.
	 * @param _oldDepositAddr The address of the old deposit address.
	 * @param _newDepositAddr The address of the new deposit address.
	 */
	event DepositAddressUpdated(address indexed _initiator, address indexed _oldDepositAddr, address indexed _newDepositAddr);

	/**
	 * @notice Emitted when the Locked Fund is updated.
	 * @param _initiator The one who initiates this event.
	 * @param _oldLockedFund The address of the old locked fund address.
	 * @param _newLockedFund The address of the new locked fund address.
	 */
	event LockedFundUpdated(address indexed _initiator, address indexed _oldLockedFund, address indexed _newLockedFund);

	/**
	 * @notice Emitted when a new Tier is created.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The new tier ID which was created.
	 */
	event NewTierCreated(address indexed _initiator, uint256 _tierID);

	/**
	 * @notice Emitted when Tier Token Limit Parameters are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _minAmount The minimum asset amount required to participate in that tier.
	 * @param _maxAmount The maximum asset amount allowed to participate in that tier.
	 */
	event TierTokenLimitUpdated(address indexed _initiator, uint256 _tierID, uint256 _minAmount, uint256 _maxAmount);

	/**
	 * @notice Emitted when Tier Token Amount Parameters are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _remainingTokens The maximum number of tokens allowed to be sold in the tier.
	 */
	event TierTokenAmountUpdated(address indexed _initiator, uint256 _tierID, uint256 _remainingTokens);

	/**
	 * @notice Emitted when Tier Time Parameters are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _saleStartTS The Tier Sale Start Timestamp.
	 * @param _saleEnd The Tier Sale End Duration or Timestamp.
	 * @param _saleEndDurationOrTS The Tier Sale End Type for the Tier.
	 */
	event TierTimeUpdated(
		address indexed _initiator,
		uint256 _tierID,
		uint256 _saleStartTS,
		uint256 _saleEnd,
		SaleEndDurationOrTS _saleEndDurationOrTS
	);

	/**
	 * @notice Emitted when Tier Vesting/Lock Parameters are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _vestOrLockCliff The Vest/Lock Cliff in Seconds.
	 * @param _vestOrLockDuration The Vest/Lock Duration in Seconds.
	 * @param _unlockedBP The unlocked token amount in BP.
	 * @param _transferType The Tier Transfer Type for the Tier.
	 */
	event TierVestOrLockUpdated(
		address indexed _initiator,
		uint256 _tierID,
		uint256 _vestOrLockCliff,
		uint256 _vestOrLockDuration,
		uint256 _unlockedBP,
		TransferType _transferType
	);

	/**
	 * @notice Emitted when Tier Deposit Parameters are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _depositRate The rate is the, asset * rate = token.
	 * @param _depositToken The token for that particular Tier Sale.
	 * @param _depositType The type of deposit for the particular sale.
	 */
	event TierDepositUpdated(
		address indexed _initiator,
		uint256 _tierID,
		uint256 _depositRate,
		address indexed _depositToken,
		DepositType _depositType
	);

	/**
	 * @notice Emitted when the Tier Verification are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _verificationType The type of verification for the particular sale.
	 */
	event TierVerificationUpdated(address indexed _initiator, uint256 _tierID, VerificationType _verificationType);

	/**
	 * @notice Emitted when the Tier Stake Condition for Verification are updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * TODO
	 */
	event TierStakeConditionUpdated(
		address indexed _initiator,
		uint256 _tierID,
		uint256 _minStake,
		uint256 _maxStake,
		uint256[] _blockNumber,
		uint256[] _date,
		IStaking indexed _stakeAddr
	);

	/**
	 * @notice Emitted when the Tier Sale Ends.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 */
	event TierSaleEnded(address indexed _initiator, uint256 _tierID);

	/**
	 * @notice Emitted when the Tier Sale Minimum Deposit Amount is updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 */
	event TierSaleUpdatedMinimum(address indexed _initiator, uint256 _tierID);

	/**
	 * @notice Emitted when the Tier Sale Maximum Deposit Amount is updated.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _updatedMaxAmount The updated max amount for the Tier.
	 */
	event TierSaleUpdatedMaximum(address indexed _initiator, uint256 _tierID, uint256 _updatedMaxAmount);

	/**
	 * @notice Emitted when a user buys.
	 * @param _initiator The one who initiates this event.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _tokensBought The amount of tokens bought.
	 */
	event TokenBuy(address indexed _initiator, uint256 _tierID, uint256 _tokensBought);

	/**
	 * @notice Emitted when depositAddress or Owner withdraws a tier proceedings.
	 * @param _initiator The one who initiates this event.
	 * @param _receiver The one who receives the proceedings.
	 * @param _tierID The Tier ID of which the proceeding is withdrawn.
	 * @param _depositType The type of withdraw (RBTC or Token).
	 * @param _amount The amount of withdraw.
	 */
	event ProceedingWithdrawn(
		address indexed _initiator,
		address indexed _receiver,
		uint256 _tierID,
		DepositType _depositType,
		uint256 _amount
	);

	/**
	 * @notice Emitted when depositAddress or Owner withdraws a tier remaining token.
	 * @param _initiator The one who initiates this event.
	 * @param _receiver The one who receives the remaining tokens.
	 * @param _tierID The Tier ID of which the proceeding is withdrawn.
	 * @param _remainingToken The amount of tokens withdrawn.
	 */
	event RemainingTokenWithdrawn(address indexed _initiator, address indexed _receiver, uint256 _tierID, uint256 _remainingToken);
}
