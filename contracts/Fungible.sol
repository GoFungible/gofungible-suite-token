// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// core
import "./IFungible.sol";

// erc-173 (access)
import "./erc-173/ERC173.sol";
import "./erc-173/IOwnershipProvider.sol";

// erc-20 (token)
import "./erc-20/IERC20.sol";
import "./erc-20/IExtTransferINBlock.sol";
import "./erc-20/IExtTransferINUpdate.sol";
import "./erc-20/IExtTransferINLog.sol";
import "./erc-20/IExtTransferOUTLog.sol";

// gateway (relayers)
import "./erc-7786/IERC7786GatewaySource.sol";
import "./erc-7786/IERC7786Recipient.sol";
import "./erc-7786/IExtRelayerMessage.sol";
import "./erc-7786/IExtRelayerSupply.sol";
import "./erc-7786/IExtRelayerSyncSupply.sol";

// erc-20n (multichain token)
import "gofungible-erc-20-multichain-supply-extension/contracts/IERC20x.sol";
import "./erc-20n/IExtTransferINBlockX.sol";
import "./erc-20n/IExtTransferINUpdateX.sol";
import "./erc-20n/IExtTransferINLogX.sol";
import "./erc-20n/IExtTransferOUTLogX.sol";

import "hardhat/console.sol";

contract Fungible is IFungible, ERC173, IERC20, IERC20x, IERC7786Recipient {

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
	// ******************************************** Access ********************************************
	// ************************************************************************************************
	address private _owner;

	address private _extOwnershipProvider;

  function owner() view external returns(address) {
		return _owner;
	}

	function transferOwnership(address _newOwner) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		address oldOwner = _owner;

		if (_extOwnershipProvider == address(0)) {
			_owner = _newOwner;
		} else {
			bytes memory encodedData = abi.encodeWithSignature( "transferOwnership(address _owner)", _owner);
			bytes memory resultBytes = _staticCall(_extOwnershipProvider, encodedData);
			_owner = abi.decode(resultBytes, (address));
		}

		emit OwnershipTransferred(oldOwner, _owner);
	}

	// ************************************************************************************************
	// ************************************** ERC-20 Metadata *****************************************
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

	function _mint(address to, uint256 amount) private {
		require(to != address(0), "ERC20: mint to zero address");
		require(msg.sender == _extGateway, "Gateway: must be provided");

		_totalSupply += amount;
		_balances[to] += amount;
		
		emit Transfer(address(0), to, amount);
	}
	
	function _burn(address from, uint256 amount) private {
		require(from != address(0), "ERC20: burn from zero address");
		require(_balances[from] >= amount, "ERC20: insufficient balance");
		require(msg.sender == _extGateway, "Gateway: must be provided");

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
	// ERC-20 Extensions
	address[] public _extTrxInBlock;

	address[] public _extTrxInUpdate;

	address[] public _extTrxInLog;

	address[] public _extTrxOutLog;

	// transfer
	function transferFrom(address from, address to, uint256 amount) external returns (bool) {
		_spendAllowance(from, msg.sender, amount);
		_transfer(from, to, amount);
		return true;
	}

	function transfer(address to, uint256 amount) external returns (bool) {

		// do the actual operation
		_transfer(msg.sender, to, amount);

		return true;
	}
	
	function _transfer(address from, address to, uint256 amount) internal {
		require(from != address(0), "ERC20: transfer from zero address");
		require(to != address(0), "ERC20: transfer to zero address");
		require(_balances[from] >= amount, "ERC20: insufficient balance");

		// run INBLOCK extensions
		for(uint i=0; i<_extTrxInBlock.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_beforeTransferBlock(address from, address to, uint256 amount)", from, to, amount );
			bytes memory resultBytes = _staticCall(_extTrxInBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
			if (isBlocked)
				return;
    }

		// run INUPDATE extensions
		for(uint i=0; i<_extTrxInUpdate.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_beforeTransferUpdate(address from, address to, uint256 amount)", from, to, amount );
			bytes memory resultBytes = _delegateCall(_extTrxInUpdate[i], encodedData);
			amount = abi.decode(resultBytes, (uint256));
    }

		// run INLOG extensions
		for(uint i=0; i<_extTrxInLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_beforerTransferLog(address from, address to, uint256 amount)", from, to, amount );
			_staticCall(_extTrxInLog[i], encodedData);
    }
		
		_balances[from] -= amount;
		_balances[to] += amount;
		
		// run OUT extensions
		for(uint i=0; i<_extTrxOutLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_afterTransferLog(address from, address to, uint256 amount)", from, to, amount );
			_staticCall(_extTrxOutLog[i], encodedData);
    }

		emit Transfer(from, to, amount);
	}

	// ************************************************************************************************
	// ************************************* ERC-20 Allowances ****************************************
	// ************************************************************************************************
	mapping(address => mapping(address => uint256)) private _allowances;

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
	// ************************************ ERC-7786 Gateway ******************************************
	// ************************************************************************************************
	// Gateway Extensions
	address private _extGateway;

	address[] public _extGatewaySendMessage;

	address[] public _extGatewaySendSupply;

	address[] public _extGatewaySyncSupply;

  function gateway() view external returns(address) {
		return _extGateway;
	}

	function sendCrosschainSupply(uint256 destChain, address destAddress, uint256 amount) internal view {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		// IERC7786GatewaySource(_gateway).sendMessage();

	}

	function sendCrosschainSyncSupplies(uint256 onChain, address onAddress, uint256 fromChain, uint256 toChain, uint256 amount, bytes32 checksum) internal {
		require(msg.sender == _extGateway, "Gateway: must be provided");

		// IERC7786GatewaySource(_gateway).sendMessage();
		
	}

	function receiveMessage(bytes32 sendId, bytes calldata sender, bytes calldata payload) external returns (bytes4) {
		require(msg.sender == _extGateway, "Gateway: must be provided");

		if (true) {
			//onCrosschainMessage();

		} else if (false) {
			//onCrosschainSupply();

		} else if (false) {
			//onCrossChainSyncSupplies();
		}

	}

	function onCrosschainMessage(uint256 toChain, address toAddress, string calldata message) internal {

		// run relayer extensions
		for(uint i=0; i<_extGatewaySendMessage.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_afterMessageReceived(uint256 toChain, address toAddress, string calldata message)", toChain, toAddress, message );
			_staticCall(_extGatewaySendMessage[i], encodedData);
    }

	}

	// ************************************************************************************************
	// ************************************* ERC-20X Network ******************************************
	// ************************************************************************************************  
	uint256[] knownChains;

	mapping(uint256 => address) public addresses;

	function addChain(uint256 chainId, address chainAddress) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(addresses[chainId] == address(0), "Network: thi chainId already has a contract");

		knownChains.push(chainId);
		addresses[chainId] = chainAddress;
	}

	// ************************************************************************************************
	// *********************************** ERC-20X Master Chain ***************************************
	// ************************************************************************************************  
	// master chain
	uint256 _masterChain;

	function getMasterChain() external view returns (uint256) {
		return _masterChain;
	}
	function setMasterChain(uint256 _newMasterChain_) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(_newMasterChain_ > 0, "MasterChain: must be chainid");

		_syncSupplies(CHAIN_ID, _newMasterChain_, 0);

		emit MasterChainUpdated(_masterChain, _newMasterChain_);

		_masterChain = _newMasterChain_;
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
	mapping(uint256 => uint256) public supplies;

	function getAllRemoteSupplies() external view returns (uint256[] memory chainIds, uint256[] memory _supplies) {
			chainIds = knownChains;
			_supplies = new uint256[](knownChains.length);
			
			for (uint i = 0; i < knownChains.length; i++) {
				_supplies[i] = supplies[knownChains[i]];
			}
	}

	function getSuppliesChecksum() public view returns (bytes32) {
			bytes32 checksum;
			for (uint256 i = 0; i < knownChains.length; i++) {
				checksum = keccak256(abi.encodePacked(checksum, knownChains[i], supplies[knownChains[i]]));
			}
			return checksum;
	}

	// Sync Chains
	function _syncSupplies(uint256 fromChain, uint256 toChain, uint256 amount) internal {

		// do nothing as this is the master chain
		if (_masterChain == CHAIN_ID) {
			return;
		}

		// sync supplies on master chain
		if (_masterChain > 0) {
			sendCrosschainSyncSupplies(_masterChain, addresses[_masterChain], fromChain, toChain, amount, getSuppliesChecksum());
			return;
		}

		// sync supplies on all chains
		for(uint i=0; i<knownChains.length; i++){
			sendCrosschainSyncSupplies(_masterChain, addresses[_masterChain], fromChain, toChain, amount, getSuppliesChecksum());
		}

	}

	function onCrossChainSyncSupplies(uint256 onChain, address onAddress, uint256 fromChain, uint256 toChain, uint256 amount, bytes32 checksum) internal {
		require(msg.sender == _extGateway, "Gateway: caller is not gateway");

		// update supply
		supplies[fromChain] -= amount;
		supplies[toChain] += amount;

		// verify checsum
		require(checksum == getSuppliesChecksum(), "SupplySyncer: checksums are not matching. Reverted");

		// run relayer extensions
		for(uint i=0; i<_extGatewaySyncSupply.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_afterSyncSupplyReceived(uint256 toChain, address toAddress, uint256 amount)", toChain, onChain, amount );
			_staticCall(_extGatewaySyncSupply[i], encodedData);
    }

	}

	// ************************************************************************************************
	// ************************************* ERC-20X TransferX ****************************************
	// ************************************************************************************************
	// ERC-20X Extensions
	address[] public _extTrnInBlock;

	address[] public _extTrnInUpdate;

	address[] public _extTrnInLog;

	address[] public _extTrnOutLog;

	// Performs supply transfer
	function transferX(uint256 toChain, address toAddress, uint256 amount) external returns (bool) {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		// run INBLOCK extensions
		for(uint i=0; i<_extTrnInBlock.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINBlockX(uint256 from, address to, uint256 amount)", toChain, toAddress, amount );
			bytes memory resultBytes = _staticCall(_extTrnInBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
			if (isBlocked)
				return false;
    }

		// run INUPDATE extensions
		for(uint i=0; i<_extTrnInUpdate.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINUpdateX(uint256 from, address to, uint256 amount)", toChain, toAddress, amount );
			bytes memory resultBytes = _delegateCall(_extTrnInUpdate[i], encodedData);
			amount = abi.decode(resultBytes, (uint256));
    }

		// run INLOG extensions
		for(uint i=0; i<_extTrnInLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINLogX(uint256 from, address to, uint256 amount)", toChain, toAddress, amount );
			_staticCall(_extTrnInLog[i], encodedData);
    }

		// do real transation
		_transferX(toChain, toAddress, amount);

		// run OUT extensions
		for(uint i=0; i<_extTrnOutLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportOUTX(uint256 from, address to, uint256 amount)", toChain, toAddress, amount );
			_staticCall(_extTrnOutLog[i], encodedData);
    }

		return true;
	}

	function _transferX(uint256 toChain, address toAddress, uint256 amount) internal returns (bool) {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(_extGateway != address(0), "Gateway: must be provided");

		// do supply transation
		sendCrosschainSupply(toChain, toAddress, amount);

		// update local ERC-20
		_burn(msg.sender, amount);

		// update supplies
		supplies[CHAIN_ID] += amount;
		supplies[toChain] -= amount;

		// sync other networks
		_syncSupplies(CHAIN_ID, toChain, amount);

		return true;
	}

	// Receives supply transfer
	function onCrosschainSupply(uint256 destChain, address destAddress, uint256 amount) internal {
		require(msg.sender == _extGateway, "Gateway: must be provided");

		// update both supplies locally
		_mint(addresses[destChain], amount);
		//supplies[sourceChain] -= amount;
		supplies[destChain] += amount;

		// run relayer extensions
		for(uint i=0; i<_extGatewaySendSupply.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_afterSupplyReceived(uint256 toChain, address toAddress, uint256 amount)", destChain, destAddress, amount );
			_staticCall(_extGatewaySendSupply[i], encodedData);
    }

	}

	// *************************************************************************************************
	// ************************************** Extension Injection **************************************
	// *************************************************************************************************
	enum ExtensionType { 
		EXT_OWNERSHIP_PROVIDER,

		EXT_GATEWAY,
		EXT_GATEWAY_SEND_MESSAGE,
		EXT_GATEWAY_SEND_SUPPLY,
		EXT_GATEWAY_SEND_SYNC_SUPPLY,

		EXT_TRX_IN_BLOCK,
		EXT_TRX_IN_UPDATE,
		EXT_TRX_IN_LOG,
		EXT_TRX_OUT_LOG,

		EXT_TRN_IN_BLOCKX,
		EXT_TRN_IN_UPDATE,
		EXT_TRN_IN_LOG,
		EXT_TRN_OUT_LOG 
	}

	struct PendingResource {
		uint resourceType;
		address resourceAddress;
		uint256 releaseDate;
		uint256 releaseNumVotes;
		uint256 minVotes;
		uint256 numVotes;
	}

  uint[] private pendingResourceIds;

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
		require(pendingResourceIds.length > 0, "Resource: no resources to release");
		console.log(_resourceId);
		console.log(pendingResourceIds[_position]);
		require(_resourceId == pendingResourceIds[_position], "Position: position does not match resource");

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

		// access
		if (resourceType == uint(ExtensionType.EXT_OWNERSHIP_PROVIDER)) {
			_extOwnershipProvider = address(resourceAddress);

		// gateway
		} else if (resourceType == uint(ExtensionType.EXT_GATEWAY)) {
			_extGateway = address(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_GATEWAY_SEND_MESSAGE)) {
			_extGatewaySendMessage.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_GATEWAY_SEND_SUPPLY)) {
			_extGatewaySendSupply.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_GATEWAY_SEND_SYNC_SUPPLY)) {
			_extGatewaySyncSupply.push(resourceAddress);

		// transfer
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_BLOCK)) {
			_extTrxInBlock.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_UPDATE)) {
			_extTrxInUpdate.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_LOG)) {
			_extTrxInLog.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_OUT_LOG)) {
			_extTrxOutLog.push(resourceAddress);

		// transfern
		} else if (resourceType == uint(ExtensionType.EXT_TRN_IN_BLOCKX)) {
			_extTrnInBlock.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRN_IN_UPDATE)) {
			_extTrnInUpdate.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRN_IN_LOG)) {
			_extTrnInLog.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRN_OUT_LOG)) {
			_extTrnOutLog.push(resourceAddress);
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

	// https://github.com/ZeframLou/token-migrator
	// https://forum.openzeppelin.com/t/how-to-migrate-a-non-upgradeable-erc20-token-to-a-new-version/3406/8
	// https://johnjvester.medium.com/bridging-the-gap-better-token-standards-for-cross-chain-assets-6a5793a215c3
	function migratetoken(address newToken) external {

	}

	// ************************************************************************************************
	// ************************************ Resources Proxy *******************************************
	// ************************************************************************************************
	function _delegateCall(address implementation, bytes memory encodedData) internal virtual returns (bytes memory returnData) {
		assembly {
			let result := delegatecall(
				gas(), 
				implementation, 
				add(encodedData, 0x20), 
				mload(encodedData), 
				0x00, 
				0x20
			)

			let size := returndatasize()
			mstore(0x00, size)
			returndatacopy(0x20, 0x00, size)
			
			returnData := add(0x00, 0x20)
			
			if iszero(result) {
					revert(0x20, size)
			}
		}
	}

	function _staticCall(address implementation, bytes memory encodedData) internal virtual returns (bytes memory returnData) {
		assembly {
			let result := staticcall(
				gas(), 
				implementation, 
				add(encodedData, 0x20), 
				mload(encodedData), 
				0x00, 
				0x20
			)

			let size := returndatasize()
			mstore(0x00, size)
			returndatacopy(0x20, 0x00, size)
			
			returnData := add(0x00, 0x20)
			
			if iszero(result) {
					revert(0x20, size)
			}
		}
	}

}