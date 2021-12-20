pragma solidity ^0.5.17;

import "../../Openzeppelin/ERC20Detailed.sol";
import "../../Openzeppelin/ERC20.sol";
import "../../Openzeppelin/Ownable.sol";
import "../../Interfaces/IApproveAndCall.sol";

/**
 * @title Token is an ERC-20 token contract.
 *
 * @notice This contract accounts for all holders' balances.
 *
 * @dev This contract represents a token with dynamic supply.
 *   The owner of the token contract can mint/burn tokens to/from any account
 *   based upon previous governance voting and approval.
 * */
contract Token is ERC20Detailed, Ownable {
	string public NAME;
	string public SYMBOL;
	uint8 public DECIMALS;

	/**
	 * @notice Constructor called on deployment, initiates the contract.
	 * @dev On deployment, some amount of tokens will be minted for the owner.
	 * @param _initialAmount The amount of tokens to be minted on contract creation.
	 * */
	constructor(
		uint256 _initialAmount,
		string memory _name,
		string memory _symbol,
		uint8 _decimals
	) public ERC20Detailed(_name, _symbol, _decimals) {
		NAME = _name;
		SYMBOL = _symbol;
		DECIMALS = _decimals;
		if (_initialAmount != 0) {
			_mint(msg.sender, _initialAmount);
		}
	}

	/**
	 * @notice Creates new tokens and sends them to the recipient.
	 * @dev Don't create more than 2^96/10 tokens before updating the governance first.
	 * @param _account The recipient address to get the minted tokens.
	 * @param _amount The amount of tokens to be minted.
	 * */
	function mint(address _account, uint256 _amount) public onlyOwner {
		_mint(_account, _amount);
	}

	/**
	 * @notice Approves and then calls the receiving contract.
	 * Useful to encapsulate sending tokens to a contract in one call.
	 * Solidity has no native way to send tokens to contracts.
	 * ERC-20 tokens require approval to be spent by third parties, such as a contract in this case.
	 * @param _spender The contract address to spend the tokens.
	 * @param _amount The amount of tokens to be sent.
	 * @param _data Parameters for the contract call, such as endpoint signature.
	 * */
	function approveAndCall(
		address _spender,
		uint256 _amount,
		bytes memory _data
	) public {
		approve(_spender, _amount);
		IApproveAndCall(_spender).receiveApproval(msg.sender, _amount, address(this), _data);
	}
}
