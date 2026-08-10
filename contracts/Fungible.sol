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
import {LibERC7786ToEthAdapter} from "./erc-7786/LibERC7786ToEthAdapter.sol";
import "./erc-7841/ERC7841Message.sol";

// erc-20n (multichain token)
import "gofungible-erc-20-multichain-supply-extension/contracts/IERC20x.sol";
import "./erc-20n/IExtTransferINBlockX.sol";
import "./erc-20n/IExtTransferINUpdateX.sol";
import "./erc-20n/IExtTransferINLogX.sol";
import "./erc-20n/IExtTransferOUTLogX.sol";

import "hardhat/console.sol";

contract Fungible is IFungible, ERC173, IERC20, IERC20x, IERC7786Recipient {

	// ************************************************************************************************
	// ******************************************** Token *********************************************
	// ************************************************************************************************   
	uint256 public immutable CHAIN_ID;
	
	// slaves can only be initialized after creation to prevent issuer creating fakes
	constructor(string memory name_, string memory symbol_, uint256 globalSupply_) {
		CHAIN_ID = block.chainid;
		_owner = msg.sender;

		// metadata
		_name = name_;
		_symbol = symbol_;
		_decimals = 18;

		// mint all to this chain
		_globalSupply = globalSupply_ * 10 ** _decimals;
		supplies[CHAIN_ID] = _globalSupply;

		// mint all to owner
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
	// *************************************** Multichain State ***************************************
	// ************************************************************************************************
	// _synchronizationKey guarantees token has been initialized by master chain
	uint256 _synchronizationKey;

	function synchronizationKey() public view returns (uint256) {
		return _synchronizationKey;
	}

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleStatePayload {
		bytes op; 								// Type of operation

		string name;
		string symbol;
		uint8 decimals;
		uint256 globalSupply;
		uint256[] chains;
		uint256[] supplies;       // The total amount of tokens being moved

		bytes32 checksum;					// checksum
	}

	function cloneState(uint256 toChain) internal {
		require(_synchronizationKey != 0, "Token: only one sync is allowed");
		require(msg.sender == _owner, "Ownable: caller is not the owner");

		uint256[] memory suppliesList = new uint256[](knownChains.length);
		for(uint i=0; i<knownChains.length; i++) {
			suppliesList[i] = supplies[knownChains[i]];
		}

    // Build your application's data package
    FungibleStatePayload memory payload = FungibleStatePayload({
			op: "CLO",

			name: _name,
			symbol: _symbol,
			decimals: _decimals,
			globalSupply: _globalSupply,
			chains: knownChains,
			supplies: suppliesList,

			checksum: getSuppliesChecksum()
    });


		console.log("_sendMessage");
    bytes memory packedPayload = abi.encode(payload);

		_sendMessage(toChain, packedPayload);
	}

	function onCloneState(bytes memory payload) internal {
		require(knownChains.length == 0, "Clone: can only be done once");

		// Unpack the byte envelope straight back into the struct format
		FungibleStatePayload memory payloadData = abi.decode(payload, (FungibleStatePayload));

		// metadata
		_name = payloadData.name;
		_symbol = payloadData.symbol;
		_decimals = payloadData.decimals;

		// global supply
		_globalSupply = payloadData.globalSupply;

		// create knownChains
		knownChains = payloadData.chains;
		
		// create supplies
		for(uint i=0; i<knownChains.length; i++) {
			supplies[knownChains[i]] = payloadData.supplies[i];
		}

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

  function _sendMessage(uint256 toChain, bytes memory packedPayload) internal {
		require(_extGateway != address(0), "Gateway: must be defined");
		console.log("toChain", toChain);

		// By doing this, this contract only interacts with the based networks. Be aware.
		bytes memory recipient = LibERC7786ToEthAdapter.generateERC7930Record(toChain, addresses[toChain]);

		// message content
		Metadata memory metadata = Metadata({
			srcChainId: uint32(CHAIN_ID),
			destChainId: uint32(toChain),
			srcAddress: bytes32(uint256(uint160(address(this)))),
			destAddress: bytes32(uint256(uint160(addresses[toChain]))),
			sessionId: 0,
			nonce: 0
		});
		Message memory message = Message({
			metadata: metadata,
			payload: packedPayload
		});
		bytes memory packedMessage = abi.encode(message);

		bytes[] memory attributes = new bytes[](0);

		console.log("sendCrosschainSupply4", _extGateway);
    IERC7786GatewaySource(_extGateway).sendMessage{value: msg.value}(recipient, packedMessage, attributes);
	}

	function receiveMessage(bytes32 sendId, bytes calldata sender, bytes calldata messageBytes) external override returns (bytes4) {
		require(msg.sender == _extGateway, "Gateway: only gateway allowed");
		console.log("MessageReceived");

		Message memory message = abi.decode(messageBytes, (Message));
		bytes memory payload = message.payload;


		Metadata memory mefadata = message.metadata;
		uint32 srcChainId = mefadata.srcChainId;
		bytes32 srcAddress = mefadata.srcAddress;
		address fromAddress = address(uint160(uint256(srcAddress)));

		// Address Recovery: Convert the binary sender back into a standard EVM address
		address sourceSender = address(bytes20(sender[0:20]));

		// process payload
		if (false) {
			onCrosschainSupply(payload);

		} else if (false) {
			onCloneState(payload);

		} else if (false) {
			onCrosschainMessage(payload);
		}
		console.log("Message Processed. Returning");

		// Execution Simulation (Emit event for test verification)
		emit MessageReceived(sendId, sourceSender, messageBytes);

		// Compliance Return: Return the exact function selector (0x3ca22197)
		return IERC7786Recipient.receiveMessage.selector;

	}

	function onCrosschainMessage(bytes memory payload) internal {

		// run relayer extensions
		for(uint i=0; i<_extGatewaySendMessage.length; i++){
			//bytes memory encodedData = abi.encodeWithSignature( "_afterMessageReceived(uint256 toChain, address toAddress, string calldata message)", fromChain, srcAddress, message );
			//_staticCall(_extGatewaySendMessage[i], encodedData);
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
	function transferX(uint256 toTokenChain, address toAccountAddress, uint256 amount) external returns (bool) {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		console.log("transferX");

		// run INBLOCK extensions
		for(uint i=0; i<_extTrnInBlock.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINBlockX(uint256 from, address to, uint256 amount)", toTokenChain, toAccountAddress, amount );
			bytes memory resultBytes = _staticCall(_extTrnInBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
      require(!isBlocked, "Extension: Transfer blocked by Extension");
    }

		// run INUPDATE extensions
		for(uint i=0; i<_extTrnInUpdate.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINUpdateX(uint256 from, address to, uint256 amount)", toTokenChain, toAccountAddress, amount );
			bytes memory resultBytes = _delegateCall(_extTrnInUpdate[i], encodedData);
			amount = abi.decode(resultBytes, (uint256));
    }

		// run INLOG extensions
		for(uint i=0; i<_extTrnInLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINLogX(uint256 from, address to, uint256 amount)", toTokenChain, toAccountAddress, amount );
			_staticCall(_extTrnInLog[i], encodedData);
    }

		// burn in this chain
		_balances[msg.sender] -= amount;
		_totalSupply -= amount;

		// update supplies
		supplies[CHAIN_ID] -= amount;
		supplies[toTokenChain] += amount;

		// sync other networks
		console.log("syncing");
		sendCrosschainSupply(toTokenChain, toAccountAddress, amount);

		// run OUT extensions
		for(uint i=0; i<_extTrnOutLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportOUTX(uint256 from, address to, uint256 amount)", toTokenChain, toAccountAddress, amount );
			_staticCall(_extTrnOutLog[i], encodedData);
    }

		return true;
	}

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleSupplyPayload {
		bytes op; 								// Type of operation

		uint256 outChain;
		address outAddress;
		uint256 inChain;
		address inAddress;
		uint256 amount;          	// The total amount of tokens being moved

		bytes32 checksum;					// checksum
	}

	function sendCrosschainSupply(uint256 toChain, address toAddress, uint256 amount) internal {
		require(msg.sender == _owner, "Ownable: caller is not the owner");

    // Build your application's data package
    FungibleSupplyPayload memory payload = FungibleSupplyPayload({
			op: "SUP",

			outChain: CHAIN_ID,
			outAddress: msg.sender,
			inChain: toChain,
			inAddress: toAddress,
			amount: amount,

			//minOutputAmount: amount
			checksum: getSuppliesChecksum()
    });

		console.log("_sendMessage");

    bytes memory packedPayload = abi.encode(payload);

		console.log("syncing1");

		// notify receiver token
		_sendMessage(toChain, packedPayload);

		// sync supplies on master chain
		if (_masterChain > 0) {
			_sendMessage(_masterChain, packedPayload);
			return;
		}
		console.log("syncing3");

		// sync supplies on all chains
		for(uint i=0; i<knownChains.length; i++){
			_sendMessage(knownChains[i], packedPayload);
		}

	}

	// Receives supply transfer
	function onCrosschainSupply(bytes memory payload) internal {
		require(msg.sender == _extGateway, "Gateway: caller is not gateway");

		// Unpack the byte envelope straight back into the struct format
		FungibleSupplyPayload memory payloadData = abi.decode(payload, (FungibleSupplyPayload));

		uint256 outChain = payloadData.outChain;
		//address outAddress = payloadData.outAddress;
		uint256 inChain = payloadData.inChain;
		address inAddress = payloadData.inAddress;
		uint256 amount = payloadData.amount;

		// mint if this is the inChain
		if (CHAIN_ID == inChain) {
			_totalSupply += amount;
			_balances[inAddress] += amount;
		}

		// update 
		supplies[inChain] += amount;
		supplies[outChain] -= amount;

		// verify checsum
		bytes32 checksum = payloadData.checksum;
		require(checksum == getSuppliesChecksum(), "SupplySyncer: checksums are not matching. Reverted");

		// run relayer extensions
		for(uint i=0; i<_extGatewaySyncSupply.length; i++){
			//bytes memory encodedData = abi.encodeWithSignature( "_afterSupplyReceived(uint256 toChain, address toAddress, uint256 amount)", fromChain, toChain, amount );
			//_staticCall(_extGatewaySyncSupply[i], encodedData);
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