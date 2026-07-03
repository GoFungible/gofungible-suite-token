// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// core
import "./IFungible.sol";
import "./erc-173/ERC173.sol";
import "./erc-20/IERC20.sol";
import "gofungible-erc-20-multichain-supply-extension/contracts/IERC20x.sol";
import "gofungible-erc-20-multichain-relayer-extension/contracts/IMultichainToken.sol";
import "gofungible-erc-20-multichain-relayer-extension/contracts/ISupplyRelayer.sol";
import "gofungible-erc-20-multichain-relayer-extension/contracts/ISupplySyncer.sol";

// resources
import "./extensions/IOwnershipProvider.sol";
import "./extensions/IExtTransferINBlock.sol";
import "./extensions/IExtTransferINUpdate.sol";
import "./extensions/IExtTransferINLog.sol";
import "./extensions/IExtTransferOUT.sol";
import "./extensions/IExtTransferINBlockX.sol";
import "./extensions/IExtTransferINUpdateX.sol";
import "./extensions/IExtTransferINLogX.sol";
import "./extensions/IExtTransferOUTX.sol";

import "./extensions/framework/LibDiamondStorage.sol";

import "hardhat/console.sol";

contract Fungible is IFungible, ERC173, IERC20, IERC20x, IMultichainToken {

	// ************************************************************************************************
	// ******************************************** Contract ******************************************
	// ************************************************************************************************   
	uint256 public immutable CHAIN_ID;
	
	constructor(string memory name_, string memory symbol_, uint256 globalSupply_) {
		CHAIN_ID = block.chainid;
		_owner = msg.sender;

		// metadata
		_name = name_;
		_symbol = symbol_;
		_decimals = 18;
		
		// Mint global supply to owner. No more external mints allowed.
		_globalSupply = globalSupply_ * 10 ** _decimals;
		_totalSupply = _globalSupply;
		_balances[_owner] = _globalSupply;
	}

	// ************************************************************************************************
	// ******************************************** Owner *********************************************
	// ************************************************************************************************
	address private _owner;

  function owner() view external returns(address) {
		return _owner;
	}

	function transferOwnership(address _newOwner) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		address oldOwner = _owner;

		if (_ownershipProvider != address(0)) {
			_owner = IOwnershipProvider(_ownershipProvider).transferOwnership(oldOwner, _newOwner);
		} else {
			_owner = _newOwner;
		}

		emit OwnershipTransferred(oldOwner, _owner);
	}

	// ************************************************************************************************
	// ******************************************* Metadata *******************************************
	// ************************************************************************************************   
	string private _name;
	string private _symbol;
	uint8 private _decimals;

	function name() public view returns (string memory) {
		return _name;
	}
	
	function symbol() public view returns (string memory) {
		return _symbol;
	}
	
	function decimals() public view returns (uint8) {
		return _decimals;
	}

	// ************************************************************************************************
	// ************************************** ERC-20 Total Supply *************************************
	// ************************************************************************************************   
	uint256 private _totalSupply;

	// ERC-20 Functions	
	function totalSupply() public view returns (uint256) {
		return _totalSupply;
	}

	function _mint(address to, uint256 amount) internal {
		require(to != address(0), "ERC20: mint to zero address");
		require(msg.sender == _supplyRelayer, "Relayer: must be defined");

		_totalSupply += amount;
		_balances[to] += amount;
		
		emit Transfer(address(0), to, amount);
	}
	
	function _burn(address from, uint256 amount) internal {
		require(from != address(0), "ERC20: burn from zero address");
		require(_balances[from] >= amount, "ERC20: insufficient balance");
		require(msg.sender == _supplyRelayer, "Relayer: must be defined");

		_balances[from] -= amount;
		_totalSupply -= amount;
		
		emit Transfer(from, address(0), amount);
	}

	// ************************************************************************************************
	// ************************************* ERC-20 Supply by Account *********************************
	// ************************************************************************************************
	mapping(address => uint256) private _balances;
	
	function balanceOf(address account) public view returns (uint256) {
		return _balances[account];
	}
	
	// ************************************************************************************************
	// **************************************** ERC-20 Transfer ***************************************
	// ************************************************************************************************
	mapping(address => mapping(address => uint256)) private _allowances;

	// transfer
	function transferFrom(address from, address to, uint256 amount) public returns (bool) {
		_spendAllowance(from, msg.sender, amount);
		_transfer(from, to, amount);
		return true;
	}

	function transfer(address to, uint256 amount) public returns (bool) {

		// do the actual operation
		_transfer(msg.sender, to, amount);

		return true;
	}
	
	function _transfer(address from, address to, uint256 amount) internal {
		require(from != address(0), "ERC20: transfer from zero address");
		require(to != address(0), "ERC20: transfer to zero address");
		require(_balances[from] >= amount, "ERC20: insufficient balance");

		// run INBLOCK extensions
		for(uint i=0; i<extTransportINBlock.length; i++){
      if (IExtTransferINBlock(extTransportINBlock[i])._beforeTokenTransferBlock(from, to, amount))
				return;
    }

		// run INUPDATE extensions
		for(uint i=0; i<extTransportINUpdate.length; i++){
      amount = IExtTransferINUpdate(extTransportINUpdate[i])._beforeTokenTransferUpdate(from, to, amount);
    }

		// run INLOG extensions
		for(uint i=0; i<extTransportINLog.length; i++){
      IExtTransferINLog(extTransportINLog[i])._beforeTokenTransferLog(from, to, amount);
    }
		
		_balances[from] -= amount;
		_balances[to] += amount;
		
		// run OUT extensions
		for(uint i=0; i<extTransportOUT.length; i++){
      IExtTransferOUT(extTransportOUT[i])._afterTokenTransfer(from, to, amount);
    }

		emit Transfer(from, to, amount);
	}

	// allowance
	function allowance(address owner_, address spender) public view returns (uint256) {
		return _allowances[owner_][spender];
	}
	
	function approve(address spender, uint256 amount) public returns (bool) {
		_approve(msg.sender, spender, amount);
		return true;
	}

	function _approve(address owner_, address spender, uint256 amount) internal {
		require(owner_ != address(0), "ERC20: approve from zero address");
		require(spender != address(0), "ERC20: approve to zero address");
		
		_allowances[owner_][spender] = amount;
		emit Approval(owner_, spender, amount);
	}
	
	function _spendAllowance(address owner_, address spender, uint256 amount) internal {
		uint256 currentAllowance = _allowances[owner_][spender];
		require(currentAllowance >= amount, "ERC20: insufficient allowance");
		
		_approve(owner_, spender, currentAllowance - amount);
	}

	// ************************************************************************************************
	// *********************************** ERC-20X Master Chain ***************************************
	// ************************************************************************************************  
	// master chain
	uint256 _masterChain;

	event MasterChainUpdated(uint256 fromMasterChain, uint256 toMasterChain);

	function getMasterChain() external view returns (uint256) {
		return _masterChain;
	}
	function setMasterChain(uint256 masterChain_) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(masterChain_ > 0, "MasterChain: must be chainid");

		_syncChains(CHAIN_ID, masterChain_, 0);

		emit MasterChainUpdated(_masterChain, masterChain_);

		_masterChain = masterChain_;
	}

	// ************************************************************************************************
	// *********************************** ERC-20X Global Supply **************************************
	// ************************************************************************************************   
	uint256 private _globalSupply;

	function globalSupply() external view returns (uint256) {
		return _globalSupply;
	}

	// ************************************************************************************************
	// ********************************** ERC-20X Supply by Chain *************************************
	// ************************************************************************************************
	uint256[] knownChains;

	mapping(uint256 => uint256) public supplies;

	function getAllRemoteSupplies() external view returns (uint256[] memory chainIds, uint256[] memory _supplies) {
			chainIds = knownChains;
			_supplies = new uint256[](knownChains.length);
			
			for (uint i = 0; i < knownChains.length; i++) {
					_supplies[i] = supplies[knownChains[i]];
			}
	}

	// Sync Chains
	function _syncChains(uint256 fromChain, uint256 toChain, uint256 amount) internal {

		// do nothing as this is the master chain
		if (_masterChain == CHAIN_ID) {
			return;
		}

		// sync both supplies on master chain
		if (_masterChain != 0) {
			uint256[] memory master = new uint256[](1);
			master[0] = _masterChain;
			ISupplySyncer(_supplySyncer).sendSyncNodesTransaction(master, fromChain, toChain, amount);
			return;
		}

		// sync both supplies on all other chains	
		if (_masterChain == 0) {
			ISupplySyncer(_supplySyncer).sendSyncNodesTransaction(knownChains, fromChain, toChain, amount);
			return;
		}

	}

	function receiveSyncNodesTransaction(uint256 sourceChain, uint256 destChain, uint256 amount) external {
		require(msg.sender == _supplySyncer, "SupplySyncer: must be defined");

		// receive supply
		supplies[sourceChain] -= amount;
		supplies[destChain] += amount;

		// emit event

	}

	// ************************************************************************************************
	// ************************************* ERC-20X TransferX ****************************************
	// ************************************************************************************************
	mapping(uint256 => address) public addresses;

	event RemoteSupplyUpdated(uint256 fromChain, uint256 toChain, uint256 amount);

	// Performs supply transfer
	function transferX(uint256 toChain, address toAddress, uint256 amount) external returns (bool) {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		// run INBLOCK extensions
		for(uint i=0; i<extTransportINBlockX.length; i++){
      if (IExtTransferINBlockX(extTransportINBlockX[i])._beforeTokenTransferBlock(toChain, toAddress, amount))
				return false;
    }

		// run INUPDATE extensions
		for(uint i=0; i<extTransportINUpdateX.length; i++){
      amount = IExtTransferINUpdateX(extTransportINUpdateX[i])._beforeTokenTransferUpdate(toChain, toAddress, amount);
    }

		// run INLOG extensions
		for(uint i=0; i<extTransportINLogX.length; i++){
      IExtTransferINLogX(extTransportINLogX[i])._beforeTokenTransferLog(toChain, toAddress, amount);
    }

		// do real transation
		_transferX(toChain, toAddress, amount);

		// run OUT extensions
		for(uint i=0; i<extTransportOUT.length; i++){
      IExtTransferOUTX(extTransportOUT[i])._afterTokenTransfer(toChain, toAddress, amount);
    }

		// emit event

		return true;
	}

	function _transferX(uint256 toChain, address toAddress, uint256 amount) internal returns (bool) {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		//require(_supplyRelayer, "Relayer: must be defined");

		// do supply transation
		ISupplyRelayer(_supplyRelayer).sendCrosschainSupply(toChain, toAddress, amount);

		// update local ERC-20
		_burn(msg.sender, amount);

		// update supplies
		supplies[CHAIN_ID] += amount;
		supplies[toChain] -= amount;

		// sync other networks
		_syncChains(CHAIN_ID, toChain, amount);

		emit RemoteSupplyUpdated(CHAIN_ID, toChain, amount);

		return true;
	}

	// Receives supply transfer
	function receiveCrosschainSupply(uint256 sourceChain, uint256 destChain, uint256 amount) external {
		require(msg.sender == _supplyRelayer, "Relayer: must be defined");

		// update both supplies locally
		_mint(addresses[destChain], amount);
		supplies[sourceChain] -= amount;
		supplies[destChain] += amount;

		// emit event

	}

	// *************************************************************************************************
	// ************************************* Approved Resources ****************************************
	// *************************************************************************************************
	enum ResourceTypes{ 
		OWNERSHIP_PROVIDER,
		SUPPLY_RELAYER,
		SUPPLY_SYNCER,
		INBLOCK,
		INUPDATE,
		INLOG,
		OUT 
	}

	// Ownership
	address private _ownershipProvider;

	// Relayers
	address private _supplyRelayer;

	address private _supplySyncer;

	// ERC-20 Extensions
	address[] public extTransportINLog;

	address[] public extTransportINUpdate;

	address[] public extTransportINBlock;

	address[] public extTransportOUT;

	// ERC-20X Extensions
	address[] public extTransportINLogX;

	address[] public extTransportINUpdateX;

	address[] public extTransportINBlockX;

	address[] public extTransportOUTX;

	// *************************************************************************************************
	// ************************************** Resources Injection **************************************
	// *************************************************************************************************
	struct PendingResource {
		uint resourceType;
		address resourceAddress;
		uint256 releaseDate;
		uint256 releaseNumVotes;
		uint256 minVotes;
		uint256 numVotes;
	}

  uint[] public pendingResourceIds;

  mapping (uint => PendingResource) pendingResources;

	event ResourceAdded(address indexed newImplementation);

	event ResourceUpdated(address indexed oldImplementation, address indexed newImplementation);

	function addResource(uint16 _resourceId, uint16 _resourceType, address _newResourceAddress, uint256 releaseDate, uint256 minVotes, uint256 numVotes) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(_newResourceAddress != address(0), "Invalid address");
		require(_isContract(_newResourceAddress), "Address must be a contract");

		pendingResources[_resourceId] = PendingResource(_resourceType, _newResourceAddress, releaseDate, minVotes, numVotes, 0);
		pendingResourceIds.push(_resourceId);
				
		emit ResourceAdded(_newResourceAddress);
	}

	function getPendingResourcesIds() external view returns (uint[] memory) {
		return pendingResourceIds;
	}

	function releaseResource(uint16 _resourceId, uint16 _position) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(_resourceId != pendingResourceIds[_position], "Position: position does not match resource");

		PendingResource memory pendingResource = pendingResources[_resourceId];

		// check if the resource can be released by time
		uint256 releaseDate = pendingResource.releaseDate;
		if (releaseDate > 0 && block.timestamp >= releaseDate)
			return;

		// check if the resource can be released by votes
		uint256 minVotes = pendingResource.minVotes;
		uint256 releaseNumVotes = pendingResource.releaseNumVotes;
		if (releaseNumVotes < minVotes)
			return;

		// release resource
		uint resourceType = pendingResource.resourceType;
		address resourceAddress = pendingResource.resourceAddress;
		if (resourceType == uint(ResourceTypes.OWNERSHIP_PROVIDER)) {
			_ownershipProvider = address(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.SUPPLY_RELAYER)) {
			_supplyRelayer = address(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.SUPPLY_SYNCER)) {
			_supplySyncer = address(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.INBLOCK)) {
			extTransportINBlock.push(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.INUPDATE)) {
			extTransportINUpdate.push(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.INLOG)) {
			extTransportINLog.push(resourceAddress);
		} else if (resourceType == uint(ResourceTypes.OUT)) {
			extTransportOUT.push(resourceAddress);
		}

		// remove resource from the pending list
		delete pendingResources[_resourceId];
		delete pendingResourceIds[_position];
	}

	function _isContract(address _addr) view internal returns (bool) {
		uint32 size;
		assembly {
			size := extcodesize(_addr)
		}
		return size > 0;
	}

	// ************************************************************************************************
	// ********************************************* Proxy ********************************************
	// ************************************************************************************************

	// Find facet for function that is called and execute the
	// function if a facet is found and return any value.
	fallback() external payable {

		// get facet from function selector
		address facet = LibDiamondStorage.diamondStorage().selectorToFacetAndPosition[msg.sig].facetAddress;
		require(facet != address(0), "Diamond: Function does not exist");

		// Execute external function from facet using delegatecall and return any value.
		assembly {
			// copy function selector and any arguments
			calldatacopy(0, 0, calldatasize())
			// execute function call using the facet
			let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
			// get any return value
			returndatacopy(0, 0, returndatasize())
			// return any return value or error back to the caller
			switch result
				case 0 {
					revert(0, returndatasize())
				}
				default {
					return(0, returndatasize())
				}
		}
	}

	receive() external payable {

		// get diamond storage
		LibDiamondStorage.DiamondStorage storage ds;
		bytes32 position = LibDiamondStorage.DIAMOND_STORAGE_POSITION;
		assembly {
			ds.slot := position
		}
	
		require(ds.receiveFacet !=  address(0), "Diamond: Address cannot be null");

		// get facet from function selector
		address facet = ds.receiveFacet;

		// Execute external function from facet using delegatecall and return any value.
		assembly {
			// copy function selector and any arguments
			calldatacopy(0, 0, calldatasize())
			// execute function call using the facet
			let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
			// get any return value
			returndatacopy(0, 0, returndatasize())
			// return any return value or error back to the caller
			switch result
				case 0 {
					revert(0, returndatasize())
				}
				default {
					return(0, returndatasize())
				}
		}
	}

	function setReceiveFacet(address payable receiveFacet_) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(receiveFacet_ !=  address(0), "Diamond: Address cannot be null");

		LibDiamondStorage.DiamondStorage storage ds;
		bytes32 position = LibDiamondStorage.DIAMOND_STORAGE_POSITION;
		assembly {
			ds.slot := position
		}

		//console.log('setReceiveFacet', receiveFacet_);
		ds.receiveFacet = receiveFacet_;
	}


}