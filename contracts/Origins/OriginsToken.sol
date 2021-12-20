pragma solidity ^0.5.17;

import "../Openzeppelin/ERC20Detailed.sol";
import "../Openzeppelin/ERC20.sol";
import "../Openzeppelin/Ownable.sol";
import "../Interfaces/IApproveAndCall.sol";

/**
 * @title Sovryn Origins Token
 * @dev Implementation of Sovryn Origins Token.
 * Inherits from ERC20Detailed with implemented
 * mint and burn functions along with MarketMaker and Presale.
 */

contract OriginsToken is ERC20Detailed, Ownable {
	/**
	 * @dev Emitted when market maker address is changed.
	 * @param _address Address of new market maker.
	 */
	event MarketMakerChanged(address indexed _address);

	/**
	 * @dev Emitted when presale address is changed.
	 * @param _address Address of new presale.
	 */
	event PresaleChanged(address indexed _address);

	address public marketMaker = address(0);
	address public presale = address(0);

	/**
	 * @notice Constructor called on deployment, initiates the contract.
	 * */
	constructor(
		string memory _name,
		string memory _symbol,
		uint8 _decimals
	) public ERC20Detailed(_name, _symbol, _decimals) {}

	/**
	 * @notice setMarketMaker sets the token's market maker address
	 * @param _address The address of the market maker contract
	 * */
	function setMarketMaker(address _address) public onlyOwner {
		require(_address != address(0), "OriginsToken: Invalid Address");
		marketMaker = _address;
		emit MarketMakerChanged(_address);
	}

	/**
	 * @notice setPresale sets the token's presale contract
	 * @param _address The address of the presale contract
	 * */
	function setPresale(address _address) public onlyOwner {
		require(_address != address(0), "OriginsToken: Invalid Address");
		presale = _address;
		emit PresaleChanged(_address);
	}

	/**
	 * @notice Creates new tokens and sends them to the recipient.
	 * @param _account The recipient address to get the minted tokens.
	 * @param _amount The amount of tokens to be minted.
	 */
	function mint(address _account, uint256 _amount) public {
		// only the presale contract and the market maker are allowed to mint
		require(msg.sender == presale || msg.sender == marketMaker, "OriginsToken: Not Allowed");
		_mint(_account, _amount);
	}

	/**
	 * @notice Burns tokens for the given account.
	 * @param _account The recipient address to get the minted tokens.
	 * @param _amount The amount of tokens to be minted.
	 */
	function burn(address _account, uint256 _amount) public {
		// only the market maker is allowed to burn tokens,
		// ...and the user is allowed to burn his own tokens
		require(msg.sender == marketMaker || msg.sender == _account, "OriginsToken: Not Allowed");
		_burn(_account, _amount);
	}

	/**
	 * @notice Approves and then calls the receiving contract.
	 * Useful to encapsulate sending tokens to a contract in one call.
	 * Solidity has no native way to send tokens to contracts.
	 * ERC-20 tokens require approval to be spent by third parties, such as a contract in this case.
	 * @param _spender The contract address to spend the tokens.
	 * @param _amount The amount of tokens to be sent.
	 * @param _data Parameters for the contract call, such as endpoint signature.
	 */
	function approveAndCall(
		address _spender,
		uint256 _amount,
		bytes memory _data
	) public {
		approve(_spender, _amount);
		IApproveAndCall(_spender).receiveApproval(msg.sender, _amount, address(this), _data);
	}
}
