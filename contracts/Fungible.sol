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
//import "./erc-7786/LibERC7786ToEthAdapter.sol";
import "./erc-7786/IExtRelayerMessage.sol";
import "./erc-7786/IExtRelayerSupply.sol";
import "./erc-7786/IExtRelayerSyncSupply.sol";
import {LibERC7786ToEthAdapter} from "./erc-7786/LibERC7786ToEthAdapter.sol";

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

	// ************************************************************************************************
	// ************************************* ERC-20 Supply by Account *********************************
	// ************************************************************************************************
	mapping(address => uint256) private _balances;
	
	function balanceOf(address account) public view returns (uint256) {
		return _balances[account];
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
		console.log("burning", msg.sender);
		console.log("amount", amount);
		console.log("from", from);
		console.log("_balances[from]", _balances[from]);
		//require(msg.sender == _extGateway, "Gateway: must be provided");

		_balances[from] -= amount;
		_totalSupply -= amount;
		
		console.log("burned");
		emit Transfer(from, address(0), amount);
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
      require(!isBlocked, "Extension: Transfer blocked by Extension");
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

  function _sendMessage(uint256 toChain, address toAddress, bytes memory packedPayload) internal {
		console.log("toChain", toChain);
		console.log("toAddress", toAddress);

		// By doing this, this contract only interacts with the based networks. Be aware.
		bytes memory recipient = LibERC7786ToEthAdapter.generateERC7930Record(toChain, toAddress);

		bytes[] memory attributes = new bytes[](0);
		console.log("sendCrosschainSupply4", _extGateway);

    IERC7786GatewaySource(_extGateway).sendMessage{value: msg.value}(recipient, packedPayload, attributes);
	}

	function receiveMessage(bytes32 sendId, bytes calldata sender, bytes calldata payload) external override returns (bytes4) {
		require(msg.sender == _extGateway, "Gateway: only gateway allowed");
		console.log("MessageReceived");

		// Address Recovery: Convert the binary sender back into a standard EVM address
		address sourceSender = address(bytes20(sender[0:20]));

		// process payload
		if (false) {
			onCloneSupplies(payload);

		} else if (false) {
			onSyncSupplies(payload);

		} else if (false) {
			//onCrosschainSupply();

		} else if (false) {
			//onCrosschainMessage();
		}
		console.log("Message Processed. Returning");

		// Execution Simulation (Emit event for test verification)
		emit MessageReceived(sendId, sourceSender, payload);

		// Compliance Return: Return the exact function selector (0x3ca22197)
		return IERC7786Recipient.receiveMessage.selector;

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

	function getChains() external view returns (uint256[] memory) {
		return knownChains;
	}

	mapping(uint256 => address) public addresses;

	function getChainAddress(uint256 chainId) external view returns (address) {
		return addresses[chainId];
	}

	/*function addChain(uint32 chainId, address chainAddress) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(addresses[chainId] == address(0), "Network: thi chainId already has a contract");

		knownChains.push(chainId);
		addresses[chainId] = chainAddress;
	}*/

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

		//_syncSupplies(CHAIN_ID, _newMasterChain_, 0);

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

	function getChainSupply(uint256 chainId) external view returns (uint256) {
		return supplies[chainId];
	}

	function getChainSupplies() external view returns (uint256[] memory _supplies) {
		_supplies = new uint256[](knownChains.length);
		
		for (uint i = 0; i < knownChains.length; i++) {
			_supplies[i] = supplies[knownChains[i]];
		}
	}

	// ************************************************************************************************
	// ***************************** ERC-20X Supply by Chain Operations *******************************
	// ************************************************************************************************

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleSyncPayload {
		bytes op; 								// Type of operation
		bytes destChain;    			// The id of te target chain
		address destAddress;    	// The token contract address on the destination chain

		bytes fromChain;
		address fromAddress;
		bytes toChain;
		address toAddress;

		uint256 amount;          	// The total amount of tokens being moved
		//uint256 minOutputAmount; 	// Slippage protection metric
	}
	
	// Sync Chains
	function _syncSupplies(uint256 toChain, address toAddress, uint256 amount) internal {
		console.log("syncing1");

		// do nothing as this is the master chain
		if(_masterChain == CHAIN_ID) {
			return;
		}
		console.log("syncing2");

		// sync supplies on master chain
		if (_masterChain > 0) {
			syncSupplies(_masterChain, addresses[_masterChain], toChain, toAddress, amount, getSuppliesChecksum());
			return;
		}
		console.log("syncing3");

		// sync supplies on all chains
		for(uint i=0; i<knownChains.length; i++){
			syncSupplies(knownChains[i], addresses[knownChains[i]], toChain, toAddress, amount, getSuppliesChecksum());
		}

	}

	function syncSupplies(uint256 onChain, address onAddress, uint256 toChain, address toAddress, uint256 amount, bytes32 checksum) internal {
		require(msg.sender == _extGateway, "Gateway: must be provided");

    // Build your application's data package
    FungibleSyncPayload memory payload = FungibleSyncPayload({
			op: "SYS",
			destChain: abi.encode(toChain),
			destAddress: address(0),

			fromChain: abi.encodePacked(CHAIN_ID),
			fromAddress: msg.sender,
			toChain: abi.encode(toChain),
			toAddress: toAddress,

			amount: amount
			//minOutputAmount: 995e18
    });

		console.log("_sendMessage");
    bytes memory packedPayload = abi.encode(payload);

		_sendMessage(toChain, toAddress, packedPayload);
		
	}

	function onSyncSupplies(bytes calldata payload) internal {
		require(msg.sender == _extGateway, "Gateway: caller is not gateway");

		// Unpack the byte envelope straight back into the struct format
		FungibleSyncPayload memory payloadData = abi.decode(payload, (FungibleSyncPayload));

		// update supply
		//supplies[fromChain] -= amount;
		//supplies[toChain] += amount;

		// verify checsum
		//require(checksum == getSuppliesChecksum(), "SupplySyncer: checksums are not matching. Reverted");

		// run relayer extensions
		for(uint i=0; i<_extGatewaySyncSupply.length; i++){
			//bytes memory encodedData = abi.encodeWithSignature( "_afterSyncSupplyReceived(uint256 toChain, address toAddress, uint256 amount)", fromChain, toChain, amount );
			//_staticCall(_extGatewaySyncSupply[i], encodedData);
    }

	}

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleClonePayload {
		bytes op; 								// Type of operation
		bytes destChain;    			// The id of te target chain
		address destAddress;    	// The token contract address on the destination chain

		uint256[] chains;
		uint256[] supplies;       // The total amount of tokens being moved

		bytes32 checksum;					// checksum
	}

	function cloneSupplies(uint256 toChain, address toAddress) internal {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		uint256[] memory suppliesList = new uint256[](knownChains.length);
		for(uint i=0; i<knownChains.length; i++) {
			suppliesList[i] = supplies[knownChains[i]];
		}

    // Build your application's data package
    FungibleClonePayload memory payload = FungibleClonePayload({
			op: "CLO",
			destChain: abi.encode(toChain),
			destAddress: toAddress,

			chains: knownChains,
			supplies: suppliesList,

			checksum: getSuppliesChecksum()
    });


		console.log("_sendMessage");
    bytes memory packedPayload = abi.encode(payload);

		_sendMessage(toChain, toAddress, packedPayload);

	}

	function onCloneSupplies(bytes calldata payload) internal {
		// Unpack the byte envelope straight back into the struct format
		FungibleClonePayload memory payloadData = abi.decode(payload, (FungibleClonePayload));
	}

	function getSuppliesChecksum() public view returns (bytes32) {
		bytes32 checksum;
		for (uint256 i = 0; i < knownChains.length; i++) {
			checksum = keccak256(abi.encodePacked(checksum, knownChains[i], supplies[knownChains[i]]));
		}
		return checksum;
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
		console.log("transferX");

		// run INBLOCK extensions
		for(uint i=0; i<_extTrnInBlock.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINBlockX(uint256 from, address to, uint256 amount)", toChain, toAddress, amount );
			bytes memory resultBytes = _staticCall(_extTrnInBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
      require(!isBlocked, "Extension: Transfer blocked by Extension");
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
		console.log("transferring");
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
		console.log("transferring2");
		require(_extGateway != address(0), "Gateway: must be provided");
		console.log("transferrin3");

		// do supply transation
		sendCrosschainSupply(toChain, toAddress, amount);
		console.log("transferrin4");

		// update local ERC-20
		_burn(msg.sender, amount);

		console.log("burning from chain", CHAIN_ID);
		console.log("burning from supplies[CHAIN_ID]", supplies[CHAIN_ID]);
		console.log("burning to chain", toChain);
		console.log("burning to supplies[toChain]", supplies[toChain]);

		// update supplies
		supplies[CHAIN_ID] += amount;
		supplies[toChain] -= amount;
		console.log("transferrin5");

		// sync other networks
		_syncSupplies(toChain, toAddress, amount);

		return true;
	}

	function sendCrosschainSupply(uint256 toChain, address toAddress, uint256 amount) internal {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

    // Build your application's data package
    FungibleSyncPayload memory payload = FungibleSyncPayload({
			op: "SUP",
			destChain: abi.encode(toChain),
			destAddress: toAddress,

			fromChain: abi.encodePacked(CHAIN_ID),
			fromAddress: msg.sender,
			toChain: abi.encode(toChain),
			toAddress: toAddress,

			amount: amount
			//minOutputAmount: amount
    });

		console.log("_sendMessage");

    bytes memory packedPayload = abi.encode(payload);

		_sendMessage(toChain, toAddress, packedPayload);

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
		uint256 requiredVotes;
		uint256 numVotes;
	}

  uint[] private pendingResourceIds;

  mapping (uint => PendingResource) pendingResources;

	event ResourceAdded(address indexed newImplementation);

	event ResourceUpdated(address indexed oldImplementation, address indexed newImplementation);

	function addResource(uint16 _resourceId, uint16 _resourceType, address _newResourceAddress, uint256 releaseDate, uint256 requiredVotes, uint256 numVotes) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		require(_newResourceAddress != address(0), "Invalid address");
		require(_isContract(_newResourceAddress), "Address must be a contract");

		pendingResources[_resourceId] = PendingResource(_resourceType, _newResourceAddress, releaseDate, requiredVotes, numVotes, 0);
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
		require(releaseDate > 0, "Resource: releaseDate is not valid.");
		require(block.timestamp >= releaseDate, "Resource: cannot be released yet.");

		// check if the resource can be released by votes
		uint256 requiredVotes = pendingResource.requiredVotes;
		uint256 releaseNumVotes = pendingResource.releaseNumVotes;
		require(releaseNumVotes <= requiredVotes, "Resource: not enought votes to release resource.");

		// release resource
		uint resourceType = pendingResource.resourceType;
		address resourceAddress = pendingResource.resourceAddress;

		// access
		if (resourceType == uint(ExtensionType.EXT_OWNERSHIP_PROVIDER)) {
			_extOwnershipProvider = address(resourceAddress);

		// gateway
		} else if (resourceType == uint(ExtensionType.EXT_GATEWAY)) {
			_extGateway = address(resourceAddress);
			console.log("released gateway");
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
	// ************************************ Extensions Proxy ******************************************
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

	// ************************************************************************************************
	// ************************************ Extensions Config *****************************************
	// ************************************************************************************************
	
  // Key-value store for extensions configuration
  mapping(bytes32 => bytes32) private configStore;

	function writeConfig(bytes32 key, bytes32 value) external override {
		configStore[key] = value;
	}

	function readConfig(bytes32 key) external view override returns (bytes32) {
		return configStore[key];
	}

	// update the configuration
	function updateConfiguration(address extension, bytes calldata payload) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
					
    bytes32 result;

    assembly {
        // 1. Allocate memory pointer (free memory pointer)
        let memPtr := mload(0x40)
        
        // 2. Copy the actual payload from calldata into memory
        // calleePayload.offset gives the start position in calldata
        // calleePayload.length gives the exact byte size
        calldatacopy(memPtr, payload.offset, payload.length)
        
        // 3. Execute the delegatecall using the memory pointer and length
        result := delegatecall(gas(), extension, memPtr, payload.length, 0, 0)
        
        // 4. (Optional) Check success status
        if iszero(result) {
            revert(0, 0)
        }
    }
	}

}