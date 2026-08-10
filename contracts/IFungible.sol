// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

abstract contract IFungible {

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




}