pragma solidity ^0.5.17;

import "./OriginsStorage.sol";

/**
 *  @title An owner contract with granular access for multiple parties.
 *  @author Franklin Richards - powerhousefrank@protonmail.com
 *  @notice You can use this contract for creating multiple owners with different access.
 *  @dev To add a new role, add the corresponding array and mapping, along with add, remove and get functions.
 */
contract OriginsAdmin is OriginsStorage {
	/* Storage */

	address[] private owners;
	address[] private verifiers;

	mapping(address => bool) private isOwner;
	mapping(address => bool) private isVerifier;
	/**
	 * @notice In the future new list can be added based on the required limit.
	 * When adding a new list, a new array & mapping has to be created.
	 * Adding/Removing functions, getter for array and mapping.
	 * Events for Adding/Removing and modifier to check the validity.
	 */

	/* Events */

	/**
	 * @notice Emitted when a new owner is added.
	 * @param _initiator The one who initiates this event.
	 * @param _newOwner The new owner who has been added recently.
	 */
	event OwnerAdded(address indexed _initiator, address _newOwner);

	/**
	 * @notice Emitted when an owner is removed.
	 * @param _initiator The one who initiates this event.
	 * @param _removedOwner The owner who has been removed.
	 */
	event OwnerRemoved(address indexed _initiator, address _removedOwner);

	/**
	 * @notice Emitted when a verifier is added.
	 * @param _initiator The one who initiates this event.
	 * @param _newVerifier The new verifier who has been added recently.
	 */
	event VerifierAdded(address indexed _initiator, address _newVerifier);

	/**
	 * @notice Emitted when a verifier is removed.
	 * @param _initiator The one who initiates this event.
	 * @param _removedVerifier The verifier who has been removed.
	 */
	event VerifierRemoved(address indexed _initiator, address _removedVerifier);

	/* Modifiers */

	/**
	 * @dev Throws if called by any account other than the owner.
	 */
	modifier onlyOwner() {
		require(isOwner[msg.sender], "OriginsAdmin: Only owner can call this function.");
		_;
	}

	/**
	 * @dev Throws if called by any account other than the verifier.
	 */
	modifier onlyVerifier() {
		require(isVerifier[msg.sender], "OriginsAdmin: Only verifier can call this function.");
		_;
	}

	/* Functions */

	/**
	 * @dev Initializes the contract, setting the deployer as the initial owner.
	 * @param _owners The owners list.
	 */
	constructor(address[] memory _owners) public {
		uint256 len = _owners.length;
		for (uint256 index = 0; index < len; index++) {
			require(!isOwner[_owners[index]], "OriginsAdmin: Each owner can be added only once.");
			isOwner[_owners[index]] = true;
			owners.push(_owners[index]);
			emit OwnerAdded(msg.sender, _owners[index]);
		}
	}

	/**
	 * @notice The function to add a new owner.
	 * @param _newOwner The address of the new owner.
	 * @dev Only callable by an Owner.
	 */
	function addOwner(address _newOwner) public onlyOwner {
		_addOwner(_newOwner);
	}

	/**
	 * @notice The function to remove an owner.
	 * @param _ownerToRemove The address of the owner which should be removed.
	 * @dev Only callable by an Owner.
	 */
	function removeOwner(address _ownerToRemove) public onlyOwner {
		_removeOwner(_ownerToRemove);
	}

	/**
	 * @notice The function to add a new verifier.
	 * @param _newVerifier The address of the new verifier.
	 * @dev Only callable by an Owner.
	 */
	function addVerifier(address _newVerifier) public onlyOwner {
		_addVerifier(_newVerifier);
	}

	/**
	 * @notice The function to remove an verifier.
	 * @param _verifierToRemove The address of the verifier which should be removed.
	 * @dev Only callable by an Owner.
	 */
	function removeVerifier(address _verifierToRemove) public onlyOwner {
		_removeVerifier(_verifierToRemove);
	}

	/* Internal Functions */

	/**
	 * @notice The internal function to add a new owner.
	 * @param _newOwner The address of the new owner.
	 */
	function _addOwner(address _newOwner) internal {
		require(_newOwner != address(0), "OriginsAdmin: Invalid Address.");
		require(!isOwner[_newOwner], "OriginsAdmin: Address is already an owner.");
		isOwner[_newOwner] = true;
		owners.push(_newOwner);

		emit OwnerAdded(msg.sender, _newOwner);
	}

	/**
	 * @notice The internal function to remove an owner.
	 * @param _ownerToRemove The address of the owner which should be removed.
	 */
	function _removeOwner(address _ownerToRemove) internal {
		require(isOwner[_ownerToRemove], "OriginsAdmin: Address is not an owner.");
		isOwner[_ownerToRemove] = false;
		uint256 len = owners.length;
		for (uint256 index = 0; index < len; index++) {
			if (_ownerToRemove == owners[index]) {
				owners[index] = owners[len - 1];
				break;
			}
		}
		owners.pop();

		emit OwnerRemoved(msg.sender, _ownerToRemove);
	}

	/**
	 * @notice The internal function to add a new verifier.
	 * @param _newVerifier The address of the new verifier.
	 */
	function _addVerifier(address _newVerifier) internal {
		require(_newVerifier != address(0), "OriginsAdmin: Invalid Address.");
		require(!isVerifier[_newVerifier], "OriginsAdmin: Address is already a verifier.");
		isVerifier[_newVerifier] = true;
		verifiers.push(_newVerifier);

		emit VerifierAdded(msg.sender, _newVerifier);
	}

	/**
	 * @notice The internal function to remove an verifier.
	 * @param _verifierToRemove The address of the verifier which should be removed.
	 */
	function _removeVerifier(address _verifierToRemove) internal {
		require(isVerifier[_verifierToRemove], "OriginsAdmin: Address is not a verifier.");
		isVerifier[_verifierToRemove] = false;
		uint256 len = verifiers.length;
		for (uint256 index = 0; index < len; index++) {
			if (_verifierToRemove == verifiers[index]) {
				verifiers[index] = verifiers[len - 1];
				break;
			}
		}
		verifiers.pop();

		emit VerifierRemoved(msg.sender, _verifierToRemove);
	}

	/* Getter Functions */

	/**
	 * @notice Checks if the passed address is an owner or not.
	 * @param _addr The address to check.
	 * @return True if Owner, False otherwise.
	 */
	function checkOwner(address _addr) public view returns (bool) {
		return isOwner[_addr];
	}

	/**
	 * @notice Checks if the passed address is a verifier or not.
	 * @param _addr The address to check.
	 * @return True if Verifier, False otherwise.
	 */
	function checkVerifier(address _addr) public view returns (bool) {
		return isVerifier[_addr];
	}

	/**
	 * @dev Returns the address array of the owners.
	 * @return The list of owners.
	 */
	function getOwners() public view returns (address[] memory) {
		return owners;
	}

	/**
	 * @dev Returns the address array of the verifier.
	 * @return The list of verifiers.
	 */
	function getVerifiers() public view returns (address[] memory) {
		return verifiers;
	}
}
