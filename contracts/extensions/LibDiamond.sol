// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/
import { IDiamondCut } from "./IDiamondCut.sol";
import { LibDiamondStorage } from "./LibDiamondStorage.sol";
import "hardhat/console.sol";

// Remember to add the loupe functions from DiamondLoupeFacet to the diamond.
// The loupe functions are required by the EIP2535 Diamonds standard
error InitializationFunctionReverted(address _initializationContractAddress, bytes _calldata);

library LibDiamond {

    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut);

    // Internal function version of diamondCut
    function executeDiamondCut(IDiamondCut.FacetCut[] memory _diamondCut) internal {
			for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
				IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
				if (action == IDiamondCut.FacetCutAction.Add) {
						addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
				} else if (action == IDiamondCut.FacetCutAction.Replace) {
						replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
				} else if (action == IDiamondCut.FacetCutAction.Remove) {
						removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
				} else {
						revert("LibDiamondCut: Incorrect FacetCutAction");
				}
			}
			emit DiamondCut(_diamondCut);
    }

    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
			require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
			require(_facetAddress != address(0), "LibDiamondCut: Add facet can't be address(0)");

			// add Facet if does not exist
			LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage.diamondStorage();
			uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facetAddress].functionSelectors.length);
			if (selectorPosition == 0) {
				addFacet(ds, _facetAddress);
			}

			// add Functions
			for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
				bytes4 selector = _functionSelectors[selectorIndex];
				address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
				require(oldFacetAddress == address(0), "LibDiamondCut: Can't add function that already exists");
				addFunction(ds, selector, selectorPosition, _facetAddress);
				selectorPosition++;
			}
    }

    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
        require(_facetAddress != address(0), "LibDiamondCut: Add facet can't be address(0)");

				// add Facet if does not exist
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage.diamondStorage();
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        if (selectorPosition == 0) {
            addFacet(ds, _facetAddress);
        }

				// replace Functions
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress != _facetAddress, "LibDiamondCut: Can't replace function with same function");
            removeFunction(ds, oldFacetAddress, selector);
            addFunction(ds, selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
				console.log('address %s', _facetAddress);
        require(_facetAddress == address(0), "LibDiamondCut: Remove facet address must be address(0)");
        LibDiamondStorage.DiamondStorage storage ds = LibDiamondStorage.diamondStorage();

        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            removeFunction(ds, oldFacetAddress, selector);
        }
    }

    function addFacet(LibDiamondStorage.DiamondStorage storage ds, address _facetAddress) internal {
        enforceHasContractCode(_facetAddress, "LibDiamondCut: New facet has no code");
        ds.facetFunctionSelectors[_facetAddress].facetAddressPosition = ds.facetAddresses.length;
        ds.facetAddresses.push(_facetAddress);
    }    


    function addFunction(LibDiamondStorage.DiamondStorage storage ds, bytes4 _selector, uint96 _selectorPosition, address _facetAddress) internal {
        ds.selectorToFacetAndPosition[_selector].functionSelectorPosition = _selectorPosition;
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.push(_selector);
        ds.selectorToFacetAndPosition[_selector].facetAddress = _facetAddress;
    }

    function removeFunction(LibDiamondStorage.DiamondStorage storage ds, address _facetAddress, bytes4 _selector) internal {        
        require(_facetAddress != address(0), "LibDiamondCut: Can't remove function that doesn't exist");
        // an immutable function is a function defined directly in a diamond
        require(_facetAddress != address(this), "LibDiamondCut: Can't remove immutable function");
				
        // replace selector with last selector, then delete last selector
        uint256 selectorPosition = ds.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = ds.facetFunctionSelectors[_facetAddress].functionSelectors.length - 1;
        // if not the same then replace _selector with lastSelector
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[_facetAddress].functionSelectors[lastSelectorPosition];
            ds.facetFunctionSelectors[_facetAddress].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        // delete the last selector
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.pop();
        delete ds.selectorToFacetAndPosition[_selector];

        // if no more selectors for facet address then delete the facet address
        if (lastSelectorPosition == 0) {
            // replace facet address with last facet address and delete last facet address
            uint256 lastFacetAddressPosition = ds.facetAddresses.length - 1;
            uint256 facetAddressPosition = ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = ds.facetAddresses[lastFacetAddressPosition];
                ds.facetAddresses[facetAddressPosition] = lastFacetAddress;
                ds.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
        }
    }

    function enforceHasContractCode(address _contract, string memory _errorMessage) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }
}
