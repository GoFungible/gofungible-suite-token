// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "hardhat/console.sol";

abstract contract IFungible {

	// ************************************************************************************************
	// *************************************** Slots - Variables **************************************
	// ************************************************************************************************
  uint256 constant ZERO_VALUE = 0;
  address constant ZERO_ADDRESS = address(0);
	bytes32 constant MSG_BND = "BND";
	bytes32 constant MSG_UBD = "UBD";
	bytes32 constant MSG_CLO = "CLO";
	bytes32 constant MSG_SUP = "SUP";

	// ************************************************************************************************
	// ******************************************** Errors ********************************************
	// ************************************************************************************************
  error ZeroAddressRequired(address nonZeroAddress);
  error ZeroValueRequired(uint256 nonZeroVaue);
  error NonZeroAddressRequired();
  error NonZeroValueRequired();

  error OnlyOwner(address sender);
  error OnlyGateway(address sender);

  error UnexpectedCallback(bytes32 id);
  error GatewayRequired(address sender);

  error OnlyBindToOtherChain();									//  
  error OnlyBindFromMasterChain();							//			
  error OnlyBindToSingletonChain();							//			
  error OnlyUnbindFromOtherChain();							//  
  error OnlyUnbindFromMasterChain();						//  
  error OnlyUnbindFromSlaveChain();							//  

  error OnlyMasterChain(uint256 chain);					//  _masterChain matches CHAIN_ID
  error OnlySlaveChain(uint256 chain);					//  _masterChain no matches CHAIN_ID
  error OnlySingletonChain(uint256 chain);			//  _masterChain is unassigned

	error ErrorInCrossChainMessage();
	error ErrorInCrossChainBind();




	// ************************************************************************************************
	// ********************************************* Defaut *******************************************
	// ************************************************************************************************
	// NO receive() function is declared here.
	/*receive() external payable {

	}*/

	// Fallback handles missing function calls but rejects Ether
	fallback() external {
		// Any transaction trying to send Ether here will fail automatically.
		// If you want a custom error message, you can uncomment the line below:
		// require(msg.value == 0, "No Ether allowed");
	}




	// here the operation is completed by the source
	function _onCrosschainMessageCallback(bytes32 sendId, bytes32 operation, bytes4 selectorIfError) external virtual;

	event FungibleMessageSent(bytes32 indexed sendId, bytes32 operation, uint256 toChain, address toAddress, bytes packedPayload);

	event FungibleMessageReceived(bytes32 indexed sendId);
	
	event FungibleMessageCallback(bytes32 indexed sendId, bytes4 selectorIfError);

	// ************************************************************************************************
	// ********************************************* Modifiers ****************************************
	// ************************************************************************************************
	// Gas-efficient status flags (avoiding zero values saves gas)
	uint256 private constant _NOT_ENTERED = 1;
	uint256 private constant _ENTERED = 2;
		uint256 private _status;

	// Custom reentrancy guard modifier
	modifier nonReentrant() {
		// On the second call (reentrancy), this check will fail
		require(_status != _ENTERED, "REENTRANCY_REJECTED");

		// Lock the contract
		_status = _ENTERED;

		// Execute the function code
		_;

		// Unlock the contract after execution finishes
		_status = _NOT_ENTERED;
	}

	// ************************************************************************************************
	// ******************************************* Extensions *****************************************
	// ************************************************************************************************  
	function writeConfig(bytes32 key, bytes32 value) external virtual;

  function readConfig(bytes32 key) external view virtual returns (bytes32);

	// ************************************************************************************************
	// ************************************** Good Practices Applied **********************************
	// ************************************************************************************************
	// * Code:
	// 			- CEI Pattern (Checks-Effects-Interactions)
	// 			- nonReentrant
	// 			- Cross-Contract Reentrancy
	// 			- Use non-zero values (like 1 and 2) as changing a storage slot from 0 to 1 costs more gas than changing it from 1 to 2.
	// 			- Place interactions at the very end to minimize reentrancy risks.
	// * On creation:
	// 			- cannot create a fake token because a timestamp is stored in both sides. synchronizationKey in master and slave

	event MasterChainUpdated(uint256 fromMasterChain, address fromMasterAddress, uint256 toMasterChain, address toMasterAddress);

	function getMasterChain() external view virtual returns (uint256);

	function getMasterAddress() external view virtual returns (address);

	function setAsMasterChain() external virtual;

	function transferMasterChain(uint256 chainId) external virtual;

	function bindChain(uint256 toChainId, address toChainAddress) external payable virtual;

	function unbindChain(uint256 fromChainId) external payable virtual;

	// ************************************************************************************************
	// ********************************************* Helpers ******************************************
	// ************************************************************************************************
		/**
	 * @notice Removes a specific number from a target array by value.
	 * @param _array The dynamic storage array you want to modify.
	 * @param _value The actual uint256 number you want to remove.
	 */
	// TODO: make a mapping with order
	function removeValueFromArray(uint256[] storage _array, uint256 _value) internal {
		uint256 length = _array.length;
		bool found = false;
		uint256 indexToDelete;

		// 1. Search for the number's position in the passed array
		for (uint256 i = 0; i < length; i++) {
			if (_array[i] == _value) {
				indexToDelete = i;
				found = true;
				break; 
			}
		}

		// 2. Revert if the number does not exist
		require(found, "Value not found in target array");

		// 3. Swap-and-Pop: Replace item with the last element and shrink array
		_array[indexToDelete] = _array[length - 1];
		_array.pop();
	}

	// ************************************************************************************************
	// *********************************************** Log ********************************************
	// ************************************************************************************************
	function print(bytes32 id, string memory message) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message)));
	}
	function print(bytes32 id, string memory message, uint256 data) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, data)));
	}
	function print(bytes32 id, string memory message, address _address) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, string(abi.encodePacked(_address)))));
	}
	function print(bytes32 id, string memory message, uint256 data, address _address) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, data, string(abi.encodePacked(_address)))));
	}
	function _toHexString(bytes32 data) internal pure returns (string memory) {
			bytes memory alphabet = "0123456789abcdef";
			bytes memory str = new bytes(64);
			for (uint256 i = 0; i < 32; i++) {
					str[i*2] = alphabet[uint8(data[i] >> 4)];
					str[i*2 + 1] = alphabet[uint8(data[i] & 0x0f)];
			}
			return string(str);
	}

}