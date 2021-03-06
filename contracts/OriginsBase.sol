pragma solidity ^0.5.17;

import "./Interfaces/IOrigins.sol";
import "./OriginsEvents.sol";

/**
 *  @title A contract for Origins platform.
 *  @author Franklin Richards - powerhousefrank@protonmail.com
 *  @notice You can use this contract for creating a sale in the Origins Platform.
 *  @dev Don't forget to update the Interface: IOrigins, according to the changes in this.
 */
contract OriginsBase is IOrigins, OriginsEvents {
	/* Functions */

	/**
	 * @notice Setup the required parameters.
	 * @param _owners The list of owners to be added to the list.
	 * @param _token The token address.
	 * @param _depositAddress The address of deposit address where all the raised fund will go. (Optional)
	 */
	constructor(
		address[] memory _owners,
		address _token,
		address payable _depositAddress
	) public OriginsAdmin(_owners) {
		require(_token != address(0), "OriginsBase: Token Address cannot be zero.");

		token = IERC20(_token);

		if (_depositAddress != address(0)) {
			depositAddress = _depositAddress;
			emit DepositAddressUpdated(msg.sender, address(0), _depositAddress);
		}
	}

	/* Public & External Functions */

	/**
	 * @notice Function to set the deposit address.
	 * @param _depositAddress The address of deposit address where all the raised fund will go.
	 * @dev If this is not set, an owner can withdraw the funds. Here owner is supposed to be a multisig. Or a trusted party.
	 */
	function setDepositAddress(address payable _depositAddress) external onlyOwner {
		_setDepositAddress(_depositAddress);
	}

	/**
	 * @notice Function to set the Locked Fund Contract Address.
	 * @param _lockedFund The address of new the Vesting registry.
	 */
	function setLockedFund(address _lockedFund) external onlyOwner {
		_setLockedFund(_lockedFund);
	}

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
	) external onlyOwner returns (uint256 _tierID) {
		/// @notice `tierCount` should always start at 1, because else default value zero will result in verification process.
		tierCount++;

		_tierID = tierCount;

		/// @notice This will revert if any of the below fails. But if none fails, this event should fire first.
		emit NewTierCreated(msg.sender, _tierID);

		/// @notice Verification Parameter.
		_setTierVerification(_tierID, VerificationType(_verificationType));

		/// @notice Deposit Parameters. (IMPORTANT TODO, change deposit token address here.)
		_setTierDeposit(_tierID, _depositRate, address(0), DepositType(_depositType));

		/// @notice Token Amount Limit Parameters. (IMPORTANT TODO, change minimum amount.)
		_setTierTokenLimit(_tierID, 0, _maxAmount);

		/// @notice Tier Token Amount Parameters.
		_setTierTokenAmount(_tierID, _remainingTokens);

		/// @notice Vesting or Locking Parameters.
		_setTierVestOrLock(_tierID, _vestOrLockCliff, _vestOrLockDuration, _unlockedBP, TransferType(_transferType));

		/// @notice Time Parameters.
		_setTierTime(_tierID, _saleStartTS, _saleEnd, SaleEndDurationOrTS(_saleEndDurationOrTS));
	}

	/**
	 * @notice Function to set the Tier Verification Method.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _verificationType The type of verification for the particular sale.
	 */
	function setTierVerification(uint256 _tierID, uint256 _verificationType) external onlyOwner {
		_setTierVerification(_tierID, VerificationType(_verificationType));
	}

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
	) external onlyOwner {
		_setTierDeposit(_tierID, _depositRate, _depositToken, DepositType(_depositType));
	}

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
	) external onlyOwner {
		_setTierTokenLimit(_tierID, _minAmount, _maxAmount);
	}

	/**
	 * @notice Function to set the Tier Token Amount Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _remainingTokens The maximum number of tokens allowed to be sold in the tier.
	 */
	function setTierTokenAmount(uint256 _tierID, uint256 _remainingTokens) external onlyOwner {
		_setTierTokenAmount(_tierID, _remainingTokens);
	}

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
	) external onlyOwner {
		_setTierVestOrLock(_tierID, _vestOrLockCliff, _vestOrLockDuration, _unlockedBP, TransferType(_transferType));
	}

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
	) external onlyOwner {
		_setTierTime(_tierID, _saleStartTS, _saleEnd, SaleEndDurationOrTS(_saleEndDurationOrTS));
	}

	/**
	 * @notice Function to verify a single address with a single tier.
	 * @param _addressToBeVerified The address which has to be veriried for the sale.
	 * @param _tierID The tier for which the address has to be verified.
	 */
	function addressVerification(address _addressToBeVerified, uint256 _tierID) external onlyVerifier {
		_addressVerification(_addressToBeVerified, _tierID);
	}

	/**
	 * @notice Function to verify a single address with multiple tiers.
	 * @param _addressToBeVerified The address which has to be veriried for the sale.
	 * @param _tierID The tiers for which the address has to be verified.
	 */
	function singleAddressMultipleTierVerification(address _addressToBeVerified, uint256[] calldata _tierID) external onlyVerifier {
		for (uint256 index = 0; index < _tierID.length; index++) {
			_addressVerification(_addressToBeVerified, _tierID[index]);
		}
	}

	/**
	 * @notice Function to verify multiple address with a single tier.
	 * @param _addressToBeVerified The addresses which has to be veriried for the sale.
	 * @param _tierID The tier for which the addresses has to be verified.
	 */
	function multipleAddressSingleTierVerification(address[] calldata _addressToBeVerified, uint256 _tierID) external onlyVerifier {
		for (uint256 index = 0; index < _addressToBeVerified.length; index++) {
			_addressVerification(_addressToBeVerified[index], _tierID);
		}
	}

	/**
	 * @notice Function to verify multiple address with multiple tiers.
	 * @param _addressToBeVerified The addresses which has to be veriried for the sale.
	 * @param _tierID The tiers for which the addresses has to be verified.
	 */
	function multipleAddressAndTierVerification(address[] calldata _addressToBeVerified, uint256[] calldata _tierID) external onlyVerifier {
		require(_addressToBeVerified.length == _tierID.length, "OriginsBase: Address and Tier Array length mismatch.");
		for (uint256 index = 0; index < _addressToBeVerified.length; index++) {
			_addressVerification(_addressToBeVerified[index], _tierID[index]);
		}
	}

	/**
	 * @notice Function to buy tokens from sale based on tier.
	 * @param _tierID The Tier ID from which the token has to be bought.
	 * @param _amount The amount of token (deposit asset) which will be sent for purchasing.
	 * @dev If deposit type if RBTC, then _amount can be passed as zero.
	 */
	function buy(uint256 _tierID, uint256 _amount) external payable {
		_buy(_tierID, _amount);
	}

	/**
	 * @notice The function used by the admin or deposit address to withdraw the sale proceedings.
	 * @dev In the future this could be made to be accessible only to seller, rather than owner.
	 */
	function withdrawSaleDeposit() external {
		_withdrawSaleDeposit();
	}

	/* Internal Functions */

	/**
	 * @notice Internal function to set the deposit address.
	 * @param _depositAddress The address of deposit address where all the raised fund will go.
	 */
	function _setDepositAddress(address payable _depositAddress) internal {
		require(_depositAddress != address(0), "OriginsBase: Deposit Address cannot be zero.");

		emit DepositAddressUpdated(msg.sender, depositAddress, _depositAddress);

		depositAddress = _depositAddress;
	}

	/**
	 * @notice Function to set the Locked Fund Contract Address.
	 * @param _lockedFund The address of new the Vesting registry.
	 */
	function _setLockedFund(address _lockedFund) internal {
		require(_lockedFund != address(0), "OriginsBase: Locked Fund Address cannot be zero.");

		emit LockedFundUpdated(msg.sender, address(lockedFund), _lockedFund);

		lockedFund = ILockedFund(_lockedFund);
	}

	/**
	 * @notice Internal function to set the Tier Verification Method.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _verificationType The type of verification for the particular sale.
	 */
	function _setTierVerification(uint256 _tierID, VerificationType _verificationType) internal {
		tiers[_tierID].verificationType = _verificationType;

		emit TierVerificationUpdated(msg.sender, _tierID, _verificationType);
	}

	/**
	 * @notice Internal function to set the Tier Deposit Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _depositRate The rate is the, asset * rate = token.
	 * @param _depositToken The token for that particular Tier Sale.
	 * @param _depositType The type of deposit for the particular sale.
	 */
	function _setTierDeposit(
		uint256 _tierID,
		uint256 _depositRate,
		address _depositToken,
		DepositType _depositType
	) internal {
		require(_depositRate > 0, "OriginsBase: Deposit Rate cannot be zero.");
		if (DepositType(_depositType) == DepositType.Token) {
			require(_depositToken != address(0), "OriginsBase: Deposit Token Address cannot be zero.");
		}

		tiers[_tierID].depositRate = _depositRate;
		tiers[_tierID].depositToken = IERC20(_depositToken);
		tiers[_tierID].depositType = _depositType;

		emit TierDepositUpdated(msg.sender, _tierID, _depositRate, _depositToken, _depositType);
	}

	/**
	 * @notice Internal function to set the Tier Token Limit Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _minAmount The minimum asset amount required to participate in that tier.
	 * @param _maxAmount The maximum asset amount allowed to participate in that tier.
	 */
	function _setTierTokenLimit(
		uint256 _tierID,
		uint256 _minAmount,
		uint256 _maxAmount
	) internal {
		require(_minAmount <= _maxAmount, "OriginsBase: Min Amount cannot be higher than Max Amount.");

		tiers[_tierID].minAmount = _minAmount;
		tiers[_tierID].maxAmount = _maxAmount;

		emit TierTokenLimitUpdated(msg.sender, _tierID, _minAmount, _maxAmount);
	}

	/**
	 @notice Internal Function to returns the total remaining tokens in all tier.
	 @return _totalBal The total balance of tokens in all tier.
	 */
	function _getTotalRemainingTokens() internal view returns (uint256 _totalBal) {
		/// @notice Starting with 1 as Tier Count always starts from 1.
		for (uint256 index = 1; index <= tierCount; index++) {
			_totalBal = _totalBal.add(tiers[index].remainingTokens);
		}
	}

	/**
	 * @notice Internal function to set the Tier Token Amount Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _remainingTokens The maximum number of tokens allowed to be sold in the tier.
	 * @dev This function assumes the admin is a trusted party (multisig).
	 */
	function _setTierTokenAmount(uint256 _tierID, uint256 _remainingTokens) internal {
		require(_remainingTokens > 0, "OriginsBase: Total token to sell should be higher than zero.");
		require(
			tiers[_tierID].maxAmount.mul(tiers[_tierID].depositRate) <= _remainingTokens,
			"OriginsBase: Max Amount to buy should not be higher than token availability."
		);

		uint256 currentBal = token.balanceOf(address(this));
		uint256 requiredBal = _getTotalRemainingTokens().add(_remainingTokens).sub(tiers[_tierID].remainingTokens);

		/// @notice Checking if we have enough token for all tiers. If we have more, then we refund the extra.
		if (requiredBal > currentBal) {
			totalTokenAllocationPerTier[_tierID] = totalTokenAllocationPerTier[_tierID].add(requiredBal.sub(currentBal));
			bool txStatus = token.transferFrom(msg.sender, address(this), requiredBal.sub(currentBal));
			require(txStatus, "OriginsBase: Not enough token supplied for Token Distribution.");
		} else {
			totalTokenAllocationPerTier[_tierID] = totalTokenAllocationPerTier[_tierID].sub(currentBal.sub(requiredBal));
			bool txStatus = token.transfer(msg.sender, currentBal.sub(requiredBal));
			require(txStatus, "OriginsBase: Admin didn't received the tokens correctly.");
		}

		tiers[_tierID].remainingTokens = _remainingTokens;

		emit TierTokenAmountUpdated(msg.sender, _tierID, _remainingTokens);
	}

	/**
	 * @notice Internal function to set the Tier Vest/Lock Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _vestOrLockCliff The Vest/Lock Cliff = A * LockedFund.Interval, where A is the cliff.
	 * @param _vestOrLockDuration The Vest/Lock Duration = A * LockedFund.Interval, where A is the duration.
	 * @param _unlockedBP The unlocked token amount in BP.
	 * @param _transferType The Tier Transfer Type for the Tier.
	 */
	function _setTierVestOrLock(
		uint256 _tierID,
		uint256 _vestOrLockCliff,
		uint256 _vestOrLockDuration,
		uint256 _unlockedBP,
		TransferType _transferType
	) internal {
		/// @notice The below is mainly for TransferType of Vested and Locked, but should not hinder for other types as well.
		require(_vestOrLockCliff <= _vestOrLockDuration, "OriginsBase: Cliff has to be <= duration.");
		require(_unlockedBP <= MAX_BASIS_POINT, "OriginsBase: The basis point cannot be higher than 10K.");

		tiers[_tierID].vestOrLockCliff = _vestOrLockCliff;
		tiers[_tierID].vestOrLockDuration = _vestOrLockDuration;
		/// @notice Zero is also an accepted value, which means the unlock time is not yet decided.
		tiers[_tierID].unlockedBP = _unlockedBP;
		tiers[_tierID].transferType = _transferType;

		emit TierVestOrLockUpdated(msg.sender, _tierID, _vestOrLockCliff, _vestOrLockDuration, _unlockedBP, _transferType);
	}

	/**
	 * @notice Internal function to set the Tier Time Parameters.
	 * @param _tierID The Tier ID which is being updated.
	 * @param _saleStartTS The Tier Sale Start Timestamp.
	 * @param _saleEnd The Tier Sale End Duration or Timestamp.
	 * @param _saleEndDurationOrTS The Tier Sale End Type for the Tier.
	 */
	function _setTierTime(
		uint256 _tierID,
		uint256 _saleStartTS,
		uint256 _saleEnd,
		SaleEndDurationOrTS _saleEndDurationOrTS
	) internal {
		uint256 saleEndTS = _saleEnd;
		if (_saleStartTS != 0 && _saleEnd != 0 && _saleEndDurationOrTS == SaleEndDurationOrTS.Duration) {
			saleEndTS = _saleStartTS.add(_saleEnd);
		} else if ((_saleStartTS != 0 || _saleEnd != 0) && _saleEndDurationOrTS == SaleEndDurationOrTS.Timestamp) {
			require(_saleStartTS < _saleEnd, "OriginsBase: The sale start TS cannot be after sale end TS.");
		}

		if (saleEndTS != 0 && _saleEndDurationOrTS != SaleEndDurationOrTS.UntilSupply) {
			require(saleEndTS > block.timestamp, "OriginsBase: The sale end duration cannot be past already.");
		}

		tiers[_tierID].saleStartTS = _saleStartTS;
		tiers[_tierID].saleEnd = saleEndTS;
		tiers[_tierID].saleEndDurationOrTS = _saleEndDurationOrTS;

		emit TierTimeUpdated(msg.sender, _tierID, _saleStartTS, saleEndTS, _saleEndDurationOrTS);
	}

	/**
	 * @notice Internal function to verify a single address with a single tier.
	 * @param _addressToBeVerified The address which has to be veriried for the sale.
	 * @param _tierID The tier for which the address has to be verified.
	 * @dev It purposefully doesn't check if it is an already added address to avoid excess gas usage.
	 * 		Also to avoid the interuption when adding multiple address at once.
	 */
	function _addressVerification(address _addressToBeVerified, uint256 _tierID) internal {
		require(_addressToBeVerified != address(0), "OriginsBase: Address to be verified cannot be zero.");

		addressApproved[_addressToBeVerified][_tierID] = true;

		emit AddressVerified(msg.sender, _addressToBeVerified, _tierID);
	}

	/**
	 * @notice Function to check whether a sale on a tier is allowed or not.
	 * @param _id The Tier ID whose sale status has to be checked.
	 * @return True if the sale is allowed on that tier, False otherwise.
	 */
	function _saleAllowed(uint256 _id) internal returns (bool) {
		require(tiers[_id].saleStartTS != 0, "OriginsBase: Sale has not started yet.");
		require(!tierSaleEnded[_id], "OriginsBase: Sale ended.");
		if (tiers[_id].saleEndDurationOrTS == SaleEndDurationOrTS.None) {
			return false;
		} else if (tiers[_id].saleEnd < block.timestamp && tiers[_id].saleEndDurationOrTS != SaleEndDurationOrTS.UntilSupply) {
			tierSaleEnded[_id] = true;
			return false;
		}
		/// @notice Here another case of else if could have come based on remaining token.
		/// It didn't because on buy, it will check if the remaining amount is higher than but not equal to the deposit.
		/// In case it is equal or lesser than deposit amount, then tierSaleEnded should be set there.
		return true;
	}

	/**
	 * @notice Internal Function to transfer the token during buying.
	 * @param _tierDetails The Tier from which the tokens were bought.
	 * @param _tokensBought The number of tokens bought.
	 */
	function _tokenTransferOnBuy(Tier memory _tierDetails, uint256 _tokensBought) internal {
		require(_tierDetails.transferType != TransferType.None, "OriginsBase: Transfer Type not set by owner.");

		if (_tierDetails.transferType == TransferType.Unlocked) {
			bool txStatus = token.transfer(msg.sender, _tokensBought);
			require(txStatus, "OriginsBase: User didn't received the tokens correctly.");
		} else {
			token.approve(address(lockedFund), _tokensBought);
			if (_tierDetails.transferType == TransferType.WaitedUnlock) {
				lockedFund.depositWaitedUnlocked(msg.sender, _tokensBought, _tierDetails.unlockedBP);
			} else if (_tierDetails.transferType == TransferType.Vested) {
				lockedFund.depositVested(
					msg.sender,
					_tokensBought,
					_tierDetails.vestOrLockCliff,
					_tierDetails.vestOrLockDuration,
					_tierDetails.unlockedBP,
					uint256(UnlockType.Waited)
				);
			} else if (_tierDetails.transferType == TransferType.Locked) {
				lockedFund.depositLocked(
					msg.sender,
					_tokensBought,
					_tierDetails.vestOrLockCliff,
					_tierDetails.vestOrLockDuration,
					_tierDetails.unlockedBP,
					uint256(UnlockType.Waited)
				);
			}
		}
	}

	/**
	 * @notice Internal Function to update the Tier Token Details.
	 * @param _tierID The Tier ID whose Token Details are updated.
	 */
	function _updateTierTokenDetailsAfterBuy(uint256 _tierID) internal {
		Tier memory _tierDetails = tiers[_tierID];
		if (_tierDetails.remainingTokens < _tierDetails.maxAmount) {
			if (_tierDetails.remainingTokens <= _tierDetails.minAmount) {
				if (_tierDetails.remainingTokens == 0) {
					tierSaleEnded[_tierID] = true;
					emit TierSaleEnded(msg.sender, _tierID);
				}
				tiers[_tierID].minAmount = 0;
				emit TierSaleUpdatedMinimum(msg.sender, _tierID);
			}
			tiers[_tierID].maxAmount = _tierDetails.remainingTokens;
			emit TierSaleUpdatedMaximum(msg.sender, _tierID, _tierDetails.remainingTokens);
		}
	}

	/**
	 * @notice Internal function to update the wallet count and tier token sold stat.
	 * @notice _tierID The Tier ID whose stat has to be updated.
	 * @notice _deposit The amount of asset deposited by the user.
	 * @notice _tokensBoughtByAddress The amount of tokens bought by the user previously.
	 * @notice _tokensBought The amount of tokens bought during the current buy.
	 */
	function _updateWalletCount(
		uint256 _tierID,
		uint256 _deposit,
		uint256 _tokensBoughtByAddress,
		uint256 _tokensBought
	) internal {
		if (_tokensBoughtByAddress == 0) {
			participatingWalletCountPerTier[_tierID]++;
		}
		tokensSoldPerTier[_tierID] = tokensSoldPerTier[_tierID].add(_tokensBought);
	}

	/**
	 * @notice Internal function to buy tokens from sale based on tier.
	 * @param _tierID The Tier ID from which the token has to be bought.
	 * @param _amount The amount of token (deposit asset) which will be sent for purchasing.
	 */
	function _buy(uint256 _tierID, uint256 _amount) internal {
		/// @notice Checking if token sale is allowed or not.
		require(_saleAllowed(_tierID), "OriginsBase: Sale not allowed.");

		/// @notice Getting the required information of the Tier to participate.
		Tier memory tierDetails = tiers[_tierID];

		/// @notice Checking if verification is set and if user has permission.
		if (tierDetails.verificationType == VerificationType.None) {
			revert("OriginsBase: No one is allowed for sale.");
		} else if (tierDetails.verificationType == VerificationType.ByAddress) {
			/// @notice Checking if user is verified based on address.
			require(addressApproved[msg.sender][_tierID], "OriginsBase: User not approved for sale.");
		}

		/// @notice If user is verified on address or does not need verification, the following steps will be taken.
		uint256 tokensBoughtByAddress = tokensBoughtByAddressOnTier[msg.sender][_tierID];
		uint256 boughtInAsset = tokensBoughtByAddress.div(tierDetails.depositRate);

		/// @notice Checking if the user already reached the maximum amount.
		require(boughtInAsset < tierDetails.maxAmount, "OriginsBase: User already bought maximum allowed.");

		/// @notice Checking which deposit type is selected.
		uint256 deposit;
		if (tierDetails.depositType == DepositType.RBTC) {
			deposit = msg.value;
			require(deposit != 0, "OriginsBase: Amount cannot be zero.");
		} else {
			require(_amount != 0, "OriginsBase: Amount cannot be zero.");
			require(address(tierDetails.depositToken) != address(0), "OriginsBase: Deposit Token not set by owner.");
			bool txStatus = tierDetails.depositToken.transferFrom(msg.sender, address(this), _amount);
			require(txStatus, "OriginsBase: Not enough token supplied by user for buying.");
			deposit = _amount;
		}
		require(deposit >= tierDetails.minAmount, "OriginsBase: Deposit is less than minimum allowed.");

		/// @notice Checking what should be the allowed deposit amount.
		uint256 refund;
		if (tierDetails.maxAmount.sub(boughtInAsset) <= deposit) {
			refund = deposit.add(boughtInAsset).sub(tierDetails.maxAmount);
			deposit = tierDetails.maxAmount.sub(boughtInAsset);
		}

		/// @notice actual buying happens here.
		uint256 tokensBought = deposit.mul(tierDetails.depositRate);
		tiers[_tierID].remainingTokens = tierDetails.remainingTokens.sub(tokensBought);
		tokensBoughtByAddressOnTier[msg.sender][_tierID] = tokensBoughtByAddressOnTier[msg.sender][_tierID].add(tokensBought);

		/// @notice Checking what type of Transfer to do.
		_tokenTransferOnBuy(tierDetails, tokensBought);

		/// @notice Updating the tier token parameters.
		_updateTierTokenDetailsAfterBuy(_tierID);

		/// @notice Updating the stats.
		_updateWalletCount(_tierID, deposit, tokensBoughtByAddress, tokensBought);

		/// @notice Refunding the excess funds.
		if (refund > 0) {
			if (tierDetails.depositType == DepositType.RBTC) {
				msg.sender.transfer(refund);
			} else {
				bool txStatus = tierDetails.depositToken.transfer(msg.sender, refund);
				require(txStatus, "OriginsBase: Token refund not received by user correctly.");
			}
		}

		emit TokenBuy(msg.sender, _tierID, tokensBought);
	}

	/**
	 * @notice Internal function used by the admin or deposit address to withdraw the sale proceedings.
	 * @dev In the future this could be made to be accessible only to seller, rather than owner.
	 */
	function _withdrawSaleDeposit() internal {
		require(
			checkOwner(msg.sender) || depositAddress == msg.sender,
			"OriginsBase: Only owner or deposit address can call this function."
		);
		/// @notice Checks if deposit address is set or not.
		address payable receiver = msg.sender;
		if (depositAddress != address(0)) {
			receiver = depositAddress;
		}

		/// @notice Only withdraw is allowed where sale is ended. Premature withdraw is not allowed.
		for (uint256 index = 1; index <= tierCount; index++) {
			if ((tierSaleEnded[index] || !_saleAllowed(index)) && !tierSaleWithdrawn[index]) {
				tierSaleWithdrawn[index] = true;
				uint256 amount = tokensSoldPerTier[index].div(tiers[index].depositRate);

				if (tiers[index].depositType == DepositType.RBTC) {
					receiver.transfer(amount);
					emit ProceedingWithdrawn(msg.sender, receiver, index, DepositType.RBTC, amount);
				} else {
					bool txStatus = tiers[index].depositToken.transfer(receiver, amount);
					require(txStatus, "OriginsBase: Admin didn't received the tokens correctly.");
					emit ProceedingWithdrawn(msg.sender, receiver, index, DepositType.Token, amount);
				}

				uint256 remainingTokens = tiers[index].remainingTokens;
				if (remainingTokens > 0) {
					tiers[index].remainingTokens = 0;
					bool txStatus = token.transfer(receiver, remainingTokens);
					require(txStatus, "OriginsBase: User didn't received the tokens correctly.");
					emit RemainingTokenWithdrawn(msg.sender, receiver, index, remainingTokens);
				}
			}
		}
	}

	/* Getter Functions */

	/**
	 * @notice Function to read the tier count.
	 * @return The number of tiers present in the contract.
	 */
	function getTierCount() external view returns (uint256) {
		return tierCount;
	}

	/**
	 * @notice Function to read the deposit address.
	 * @return The address of the deposit address.
	 * @dev If zero is returned, any of the owners can withdraw the raised funds.
	 */
	function getDepositAddress() external view returns (address) {
		return depositAddress;
	}

	/**
	 * @notice Function to read the token on sale.
	 * @return The Token contract address which is being sold in the contract.
	 */
	function getToken() external view returns (address) {
		return address(token);
	}

	/**
	 * @notice Function to read the locked fund contract address.
	 * @return Address of Locked Fund Contract.
	 */
	function getLockDetails() external view returns (address) {
		return address(lockedFund);
	}

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
		)
	{
		Tier memory tier = tiers[_tierID];
		return (
			tier.minAmount,
			tier.maxAmount,
			tier.remainingTokens,
			tier.saleStartTS,
			tier.saleEnd,
			tier.unlockedBP,
			tier.vestOrLockCliff,
			tier.vestOrLockDuration,
			tier.depositRate
		);
	}

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
		)
	{
		Tier memory tier = tiers[_tierID];
		return (
			address(tier.depositToken),
			uint256(tier.depositType),
			uint256(tier.verificationType),
			uint256(tier.saleEndDurationOrTS),
			uint256(tier.transferType)
		);
	}

	/**
	 * @notice Function to read tokens bought by an address on a particular tier.
	 * @param  _addr The address which has to be checked.
	 * @param _tierID The tier ID for which the address has to be checked.
	 * @return The amount of tokens bought by the address.
	 */
	function getTokensBoughtByAddressOnTier(address _addr, uint256 _tierID) external view returns (uint256) {
		return tokensBoughtByAddressOnTier[_addr][_tierID];
	}

	/**
	 * @notice Function to read participating wallet count per tier.
	 * @param  _tierID The tier ID for which the count has to be checked.
	 * @return The number of wallets who participated in that Tier.
	 * @dev Total participation of wallets cannot be determined by this.
	 * A user can participate on one round and not on other.
	 * In the future maybe a count on that can be created.
	 */
	function getParticipatingWalletCountPerTier(uint256 _tierID) external view returns (uint256) {
		return participatingWalletCountPerTier[_tierID];
	}

	/**
	 * @notice Function to read total token allocation per tier.
	 * @param  _tierID The tier ID for which the metrics has to be checked.
	 * @return The amount of tokens allocation on that tier.
	 */
	function getTotalTokenAllocationPerTier(uint256 _tierID) external view returns (uint256) {
		return totalTokenAllocationPerTier[_tierID];
	}

	/**
	 * @notice Function to read tokens sold per tier.
	 * @param  _tierID The tier ID for which the sold metrics has to be checked.
	 * @return The amount of tokens sold on that tier.
	 */
	function getTokensSoldPerTier(uint256 _tierID) external view returns (uint256) {
		return tokensSoldPerTier[_tierID];
	}

	/**
	 * @notice Function to check if a tier sale ended or not.
	 * @param _tierID The Tier whose info is to be read.
	 * @return True is sale ended, False otherwise.
	 * @dev A return of false does not necessary mean the sale is active. It can also be in inactive state.
	 */
	function checkSaleEnded(uint256 _tierID) external view returns (bool _status) {
		return tierSaleEnded[_tierID];
	}

	/**
	 * @notice Function to read address which are approved for sale in a tier.
	 * @param  _addr The address which has to be checked.
	 * @param _tierID The tier ID for which the address has to be checked.
	 * @return True is allowed, False otherwise.
	 */
	function isAddressApproved(address _addr, uint256 _tierID) external view returns (bool) {
		return addressApproved[_addr][_tierID];
	}
}
