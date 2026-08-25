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
	uint256 private immutable CHAIN_ID;
	
	// slaves can only be initialized after creation to prevent issuer creating fakes
	constructor(string memory name_, string memory symbol_, uint256 totalSupply_) {
		// chains
		CHAIN_ID = block.chainid;
		console.log(CHAIN_ID);

		// owner
		_owner = msg.sender;

		// metadata
		_name = name_;
		_symbol = symbol_;
		_decimals = 18;

		// mint all to this chain
		_totalSupply = totalSupply_ * 10 ** _decimals;
		supplies[CHAIN_ID] = _totalSupply;

		// mint all to owner
		_totalSupply = _totalSupply;
		_balances[_owner] = _totalSupply;
	}

  function chainId() view external returns(uint256) {
		return CHAIN_ID;
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
		require(msg.sender == _owner, OnlyOwner(msg.sender));

		address oldOwner = _owner;

		if (_extOwnershipProvider == ZERO_ADDRESS) {
			_owner = _newOwner;
		} else {
			bytes memory encodedData = abi.encodeWithSignature( "transferOwnership(address _owner)", _owner);
			bytes memory resultBytes = _staticCall(_extOwnershipProvider, encodedData);
			_owner = abi.decode(resultBytes, (address));
		}

		emit OwnershipTransferred(oldOwner, _owner);
	}

	// ************************************************************************************************
	// ************************************** ERC-20: 1. Metadata *************************************
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
	// ************************************** ERC-20: 2. Supply ***************************************
	// ************************************************************************************************   
	uint256 private _totalSupply;

	// ERC-20 Functions	
	function totalSupply() public view returns (uint256) {
		return _totalSupply;
	}

	// ************************************************************************************************
	// *************************************** ERC-20: 3. Balance *************************************
	// ************************************************************************************************
	mapping(address => uint256) private _balances;
	
	function balanceOf(address account) public view returns (uint256) {
		return _balances[account];
	}
	
	// ************************************************************************************************
	// **************************************** ERC-20: 4. Transfer ***********************************
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
	
	function _transfer(address from, address to, uint256 amount) internal returns (bool) {
		require(from != ZERO_ADDRESS, NonZeroAddressRequired());
		require(to != ZERO_ADDRESS, NonZeroAddressRequired());
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

		return true;
	}

	// ************************************************************************************************
	// ************************************* ERC-20: 5. Allowances ************************************
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
		require(owner_ != ZERO_ADDRESS, NonZeroAddressRequired());
		require(spender != ZERO_ADDRESS, NonZeroAddressRequired());
		
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

  function _sendMessage(bytes32 operation, uint256 toChain, address toAddress, bytes memory packedPayload) internal returns (bytes32) {
		require(_extGateway != ZERO_ADDRESS, GatewayRequired(_extGateway));

		// By doing this, this contract only interacts with the based networks. Be aware.
		bytes memory recipient = LibERC7786ToEthAdapter.generateERC7930Record(toChain, toAddress);

		// message content
		Message memory message = Message({
			metadata: Metadata({
				srcChainId: uint32(CHAIN_ID),
				destChainId: uint32(toChain),
				srcAddress: bytes32(uint256(uint160(address(this)))),
				destAddress: bytes32(uint256(uint160(addresses[toChain]))),
				sessionId: 0,
				nonce: 0
			}),
			header: Header({
				op: operation
			}),
			payload: packedPayload
		});
		bytes memory packedMessage = abi.encode(message);

		bytes[] memory attributes = new bytes[](0);

    bytes32 id = IERC7786GatewaySource(_extGateway).sendMessage(recipient, packedMessage, attributes);
		require(id != bytes32(0), ErrorInCrossChainMessage());
		print(id, "id returned by sendMessage from gateway.");

		return id;
	}

	function _onCrosschainMessageCallback(bytes32 id, bytes32 operation, bytes4 selectorIfError) external override {
		print(id, "Source token was confirmed on status of message operation");

		if (selectorIfError != bytes4(0)) {
			emit MessageExecutionFinished(id, selectorIfError);
			print(id, "Event emitted to listeners. Operation rolled back");
			return;
		}

		if (operation == MSG_BND) {
			_onCrosschainBindCallback(operation);

		} else if (operation == MSG_SUP) {
			_onCrosschainSupplyCallback(operation);

		} else if (operation == MSG_CLO) {
			_onCrosschainCloneStateCallback(operation);

		} else {
			//return _onCrosschainMessageCallback(payload);
		}

		emit MessageExecutionFinished(id, selectorIfError);
		print(id, "Event emitted to listeners. Operation finally committed on source token");
	}

	// TODO: Use EIP-712
	function receiveMessage(bytes32 id, bytes calldata senderBOA, bytes calldata messageBytes) external override returns (bytes4) {
		print(id, "Fungible received message!!!");
		require(_extGateway != ZERO_ADDRESS, GatewayRequired(msg.sender));
		require(msg.sender == _extGateway, OnlyGateway(msg.sender));
		print(id, "Fungible received message1!!!");

		// Validate sender from gateway data
		(uint256 srcChainId, address srcAddress) = LibERC7786ToEthAdapter.parseERC7930Record(senderBOA);
		// TODO
		// require....

		// Acknowdledge message
		emit MessageReceived(id, srcChainId, srcAddress, messageBytes);
		print(id, "Fungible received message3!!!");

		// get message info
		Message memory message = abi.decode(messageBytes, (Message));
		bytes memory payload = message.payload;
		Header memory header = message.header;
		print(id, "Fungible received message4!!!");

		// We cannot validate message comes from MasterChain because token is unbound:
		// - MasterChain cannot yet be validated because is the bind process who associates the MasterChain
		// - The owner of the real MasterChain creates and only he knows the location of slave to be bound.
		// - A fake MasterChain can bind a slave token. Not a problem for the real MasterChain.
		if (header.op == MSG_BND) {
			require(_masterChain == ZERO_VALUE, OnlyBindToSingletonChain());										// not master chain
			require(_masterAddress == ZERO_ADDRESS, OnlyBindToSingletonChain());								// not master address
			require(_totalSupply == ZERO_VALUE, ZeroValueRequired(_totalSupply));								// not supply yet

			return _onCrosschainBind(payload);
		}
		print(id, "Fungible received message5!!!");
		
		// verify sender is valid.
		require(srcChainId == _masterChain, OnlyMasterChain(srcChainId));
		require(srcAddress == _masterAddress, OnlyMasterChain(srcChainId));
		print(id, "Fungible received message6!!!");

		if (header.op == MSG_SUP) {
			return _onCrosschainSupply(payload);

		} else if (header.op == MSG_CLO) {
			return _onCrosschainCloneState(payload);

		} else {
			return _onCrosschainMessage(payload);
		}
	}

	function _onCrosschainMessage(bytes memory payload) internal returns (bytes4) {

		// run relayer extensions
		for(uint i=0; i<_extGatewaySendMessage.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "_afterMessageReceived(bytes memory payload)", payload );
			_staticCall(_extGatewaySendMessage[i], encodedData);
    }

		return IERC7786Recipient.receiveMessage.selector;
	}

	// ************************************************************************************************
	// ********************************* ERC-20X: 3. Token Perimeter **********************************
	// ************************************************************************************************  
	uint256[] knownChains;

	function getChains() external view returns (uint256[] memory) {
		return knownChains;
	}

	function bindChain(uint256 toChainId, address toChainAddress) external payable override returns (bytes32) {
		require(msg.sender == _owner, OnlyOwner(msg.sender));

		require(toChainAddress != ZERO_ADDRESS, NonZeroAddressRequired());
		require(toChainId != ZERO_VALUE, NonZeroValueRequired());

		require(toChainId != CHAIN_ID, OnlyBindToOtherChain());
		require(_masterChain == CHAIN_ID, OnlyBindFromMasterChain());
		require(supplies[toChainId] == ZERO_VALUE, OnlyBindToSingletonChain());		
		require(addresses[toChainId] == ZERO_ADDRESS, OnlyBindToSingletonChain());

		bytes32 id = _sendCrosschainBind(toChainId, toChainAddress, true);
		require (id != bytes32(0), ErrorInCrossChainBind());

		// TODO: this should be on _onCrosschainBindCallback
		knownChains.push(toChainId);
		addresses[toChainId] = toChainAddress;

		print(id, "bindChain allocated id");
		return id;
	}

	function unbindChain(uint256 fromChainId) external payable override returns (bytes32) {
		require(msg.sender == _owner, OnlyOwner(msg.sender));

		require(supplies[fromChainId] != ZERO_VALUE, NonZeroValueRequired());

		require(fromChainId != CHAIN_ID, OnlyUnbindFromOtherChain());
		require(_masterChain == CHAIN_ID, OnlyUnbindFromMasterChain());
		require(supplies[fromChainId] != ZERO_VALUE, OnlyUnbindFromSlaveChain());
		require(addresses[fromChainId] != ZERO_ADDRESS, OnlyUnbindFromSlaveChain());

		bytes32 id = _sendCrosschainBind(fromChainId, ZERO_ADDRESS, false);
		require (id != bytes32(0), ErrorInCrossChainBind());

		// TODO: this should be on _onCrosschainBindCallback
		removeValueFromArray(knownChains, fromChainId);
		addresses[fromChainId] = ZERO_ADDRESS;

		return id;
	}
	
	/**
	 * @title FungibleBindPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleBindPayload {
		bool flag;
		uint256 masterChain;
		address masterAddress;
	}

	function _sendCrosschainBind(uint256 toChain, address toAddres, bool isBound) internal returns (bytes32) {
    // Build your application's data package
    FungibleBindPayload memory payload = FungibleBindPayload({
			flag: isBound,
			masterChain: _masterChain,
			masterAddress: _masterAddress
    });
    bytes memory packedPayload = abi.encode(payload);

		bytes32 id = _sendMessage(MSG_BND, toChain, toAddres, packedPayload);
		return id;
	}

	function _onCrosschainBindCallback(bytes32 operation) internal returns (bytes4) {

	}

	function _onCrosschainBind(bytes memory payload) internal returns (bytes4) {
		require(_masterChain == ZERO_VALUE, OnlyBindToSingletonChain());
		require(_masterAddress == ZERO_ADDRESS, OnlyBindToSingletonChain());

		// Unpack the byte envelope straight back into the struct format
		print(0, "token bound1");
		FungibleBindPayload memory payloadData = abi.decode(payload, (FungibleBindPayload));
		console.log("token bound2", payloadData.flag);
		console.log("token bound2", payloadData.masterChain);
		console.log("token bound2", payloadData.masterAddress);
		_masterChain = payloadData.flag ? payloadData.masterChain : 0;
		_masterAddress = payloadData.flag ? payloadData.masterAddress : ZERO_ADDRESS;
		console.log("token bound3");

		return IERC7786Recipient.receiveMessage.selector;
	}

	// ************************************************************************************************
	// ********************************** ERC-20X: 4. Address by Chain ********************************
	// ************************************************************************************************
	mapping(uint256 => address) public addresses;

	function getChainAddress(uint256 _chainId) external view returns (address) {
		return addresses[_chainId];
	}

	// ************************************************************************************************
	// *********************************** ERC-20X: 1. Master Chain ***********************************
	// ************************************************************************************************
	/*
	** All need to know which one is the master chain to forward to it to provide many of the services
	*/
	// master chain
	uint256 _masterChain;

	address _masterAddress;

	function getMasterChain() external view override returns (uint256) {
		return _masterChain;
	}

	function getMasterAddress() external view override returns (address) {
		return _masterAddress;
	}

	function setAsMasterChain() external override {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		require(_masterChain == ZERO_VALUE, OnlySingletonChain(CHAIN_ID));
		_masterChain = CHAIN_ID;
		_masterAddress = address(this);
	}

	function transferMasterChain(uint256 _newMasterChain) external override {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		require(_masterChain == CHAIN_ID, OnlyMasterChain(CHAIN_ID));
		require(_newMasterChain > ZERO_VALUE, "MasterChain: must be chainid");

		// chain must be already in the network so _newMasterAddress must be already known
		address _newMasterAddress = _newMasterChain == CHAIN_ID ? address(this) : addresses[_newMasterChain];
		require(_newMasterAddress != ZERO_ADDRESS, NonZeroAddressRequired());

		// transfer state to new master
		if (_newMasterChain != CHAIN_ID) {
			bytes32 id = _cloneState(_newMasterChain, _newMasterAddress);
			require (id != bytes32(0), "MasterChain: state transfer failed");
		}

		// broadcast to all other chains
		// we cannot claim from every chain because this could leave temporary inconsistent state
		// ????????

		// change master to this chain
		_masterChain = _newMasterChain;

		emit MasterChainUpdated(_masterChain, _masterAddress, _newMasterChain, _newMasterAddress);
	}

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleStatePayload {
		string name;
		string symbol;
		uint8 decimals;
		uint256[] chains;
		uint256[] supplies;       				// The total amount of tokens being moved
	}

	function _cloneState(uint256 toChain, address toAddress) internal returns (bytes32) {
		require(msg.sender == _owner, OnlyOwner(msg.sender));

		uint256[] memory suppliesList = new uint256[](knownChains.length);
		for(uint i=0; i<knownChains.length; i++) {
			suppliesList[i] = supplies[knownChains[i]];
		}

    // Build your application's data package
    FungibleStatePayload memory payload = FungibleStatePayload({
			name: _name,
			symbol: _symbol,
			decimals: _decimals,
			chains: knownChains,
			supplies: suppliesList
    });

    bytes memory packedPayload = abi.encode(payload);

		bytes32 id = _sendMessage(MSG_CLO, toChain, toAddress, packedPayload);
		return id;
	}

	function _onCrosschainCloneStateCallback(bytes32 operation) internal returns (bytes4) {

	}

	function _onCrosschainCloneState(bytes memory payload) internal returns (bytes4) {
		require(knownChains.length == ZERO_VALUE, "Clone: can only be done once");

		// Unpack the byte envelope straight back into the struct format
		FungibleStatePayload memory payloadData = abi.decode(payload, (FungibleStatePayload));

		// metadata
		_name = payloadData.name;
		_symbol = payloadData.symbol;
		_decimals = payloadData.decimals;

		// create knownChains
		knownChains = payloadData.chains;
		
		// create supplies
		for(uint i=0; i<knownChains.length; i++) {
			supplies[knownChains[i]] = payloadData.supplies[i];
		}

		return IERC7786Recipient.receiveMessage.selector;

	}

	// https://github.com/ZeframLou/token-migrator
	// https://forum.openzeppelin.com/t/how-to-migrate-a-non-upgradeable-erc20-token-to-a-new-version/3406/8
	// https://johnjvester.medium.com/bridging-the-gap-better-token-standards-for-cross-chain-assets-6a5793a215c3
	/*function migratetoken(address newToken) external {

	}*/

	// ************************************************************************************************
	// ********************************** ERC-20X: 4. Supply by Chain *********************************
	// ************************************************************************************************
	mapping(uint256 => uint256) public supplies;

	function getChainSupply(uint256 _chainId) external view returns (uint256) {
		return supplies[_chainId];
	}

	/*function getSuppliesChecksum() public view returns (bytes32) {
		bytes32 checksum;
		for (uint256 i = 0; i < knownChains.length; i++) {
			checksum = keccak256(abi.encodePacked(checksum, knownChains[i], supplies[knownChains[i]]));
		}
		return checksum;
	}*/

	// ************************************************************************************************
	// ************************************* ERC-20X: 5. Bridge ***************************************
	// ************************************************************************************************
	// ERC-20X Extensions
	address[] public _extTrnInBlock;

	address[] public _extTrnInUpdate;

	address[] public _extTrnInLog;

	address[] public _extTrnOutLog;

	// transfer supply to another account, either in this chain, or in other chain
	function pay(uint256 inChain, address inAddress, uint256 amount) external returns (bool) {
		if (inChain == CHAIN_ID) {
			return _transfer(msg.sender, inAddress, amount);
		} else {
			return _transferX(inChain, inAddress, amount);
		}
	}

	// transfer supply to another account in other chain for the same user
	// A multichain token must be able to bridge itself without external support
	function bridge(uint256 inChain, address inAddress, uint256 amount) external returns (bool) {
		return _transferX(inChain, inAddress, amount);
	}

	// Performs supply transfer to an account of another chain
	function _transferX(uint256 inChain, address inAddress, uint256 amount) internal returns (bool) {
		require(msg.sender == _owner, OnlyOwner(msg.sender));

		// run INBLOCK extensions
		for(uint i=0; i<_extTrnInBlock.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINBlockX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			bytes memory resultBytes = _staticCall(_extTrnInBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
      require(!isBlocked, "Extension: Transfer blocked by Extension");
    }

		// run INUPDATE extensions
		for(uint i=0; i<_extTrnInUpdate.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINUpdateX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			bytes memory resultBytes = _delegateCall(_extTrnInUpdate[i], encodedData);
			amount = abi.decode(resultBytes, (uint256));
    }

		// run INLOG extensions
		for(uint i=0; i<_extTrnInLog.length; i++){
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINLogX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			_staticCall(_extTrnInLog[i], encodedData);
    }

		// if transferring from master update remote before, then update master
		if (CHAIN_ID == _masterChain) {

			bytes32 id = _sendCrosschainSupply(inChain, inAddress, amount);
			require (id != bytes32(0), "Transfer failure");

			// burn in this chain
			_balances[msg.sender] -= amount;
			_totalSupply -= amount;

			// burn from chain
			supplies[CHAIN_ID] -= amount;
			supplies[inChain] += amount;

			// run OUT extensions
			for(uint i=0; i<_extTrnOutLog.length; i++){
				bytes memory encodedData = abi.encodeWithSignature( "extTransportOUTX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
				_staticCall(_extTrnOutLog[i], encodedData);
			}

			return true;
		}

		// if transferring from no master to no master send to master, then update
		else {
			bytes32 id = _sendCrosschainSupply(_masterChain, _masterAddress, amount);
			require (id != bytes32(0), "Transfer failure");

			// burn in this chain
			_balances[msg.sender] -= amount;
			_totalSupply -= amount;
		}

		return true;
	}

	/**
	 * @title FungibleSyncPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleSupplyPayload {
		uint256 outChain;
		address outAddress;
		uint256 inChain;
		address inAddress;
		uint256 amount;          	// The total amount of tokens being moved
	}

	function _sendCrosschainSupply(uint256 toChain, address toAddress, uint256 amount) internal returns (bytes32) {
    // Build your application's data package
    FungibleSupplyPayload memory payload = FungibleSupplyPayload({
			outChain: CHAIN_ID,
			outAddress: address(this),
			inChain: toChain,
			inAddress: toAddress,
			amount: amount
    });
    bytes memory packedPayload = abi.encode(payload);

		bytes32 id = _sendMessage(MSG_SUP, _masterChain, _masterAddress, packedPayload);
		return id;
	}

	function _onCrosschainSupplyCallback(bytes32 operation) internal returns (bytes4) {

	}

	// Receives supply transfer
	function _onCrosschainSupply(bytes memory payload) internal returns (bytes4) {

		// Unpack the byte envelope straight back into the struct format
		FungibleSupplyPayload memory payloadData = abi.decode(payload, (FungibleSupplyPayload));
		uint256 outChain = payloadData.outChain;
		address outAddress = payloadData.outAddress;
		uint256 inChain = payloadData.inChain;
		address inAddress = payloadData.inAddress;
		uint256 amount = payloadData.amount;


		// is not master just update
		if (CHAIN_ID != _masterChain) {
			_totalSupply += amount;
			_balances[inAddress] += amount;
		}

		// is master and supply sent to master
		else if (CHAIN_ID == _masterChain && inChain == CHAIN_ID) {
			_totalSupply += amount;
			_balances[inAddress] += amount;
			supplies[inChain] += amount;
			supplies[outChain] -= amount;
		}

		// is master and supply not sent to master
		else if (CHAIN_ID == _masterChain && inChain != CHAIN_ID) {

			// forward to inChain
			bytes32 id = _sendCrosschainSupply(inChain, inAddress, amount);
			if (id != bytes32(0)) {
				supplies[inChain] += amount;
				supplies[outChain] -= amount;
			}

			// rollback outChain
			else {
				bytes32 id1 = _sendCrosschainSupply(outChain, outAddress, /*-1 **/ amount);
				if (id1 == bytes32(0)) {
					// problem here
					// manual retry
				}
			}

		}

		// run relayer extensions
		for(uint i=0; i<_extGatewaySyncSupply.length; i++){
			//bytes memory encodedData = abi.encodeWithSignature( "_afterSupplyReceived(uint256 toChain, address toAddress, uint256 amount)", fromChain, toChain, amount );
			//_staticCall(_extGatewaySyncSupply[i], encodedData);
    }

		return IERC7786Recipient.receiveMessage.selector;

	}

	// *************************************************************************************************
	// ************************************ Extension: 1. Injection ************************************
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
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		require(_newResourceAddress != ZERO_ADDRESS, NonZeroAddressRequired());
		require(_isContract(_newResourceAddress), "Address must be a contract");

		pendingResources[_resourceId] = PendingResource(_resourceType, _newResourceAddress, releaseDate, requiredVotes, numVotes, 0);
		pendingResourceIds.push(_resourceId);
				
		emit ResourceAdded(_newResourceAddress);
	}

	function getPendingResourcesIds() external view returns (uint[] memory) {
		return pendingResourceIds;
	}

	function releaseResource(uint16 _resourceId, uint16 _position) external {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		require(pendingResourceIds.length > 0, "Resource: no resources to release");
		require(_resourceId == pendingResourceIds[_position], "Position: position does not match resource");

		PendingResource memory pendingResource = pendingResources[_resourceId];

		// check if the resource can be released by time
		uint256 releaseDate = pendingResource.releaseDate;
		require(releaseDate > ZERO_VALUE, "Resource: releaseDate is not valid.");
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

	// ************************************************************************************************
	// ************************************ Extensions: 2. Proxy **************************************
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
	// ************************************ Extensions: 3. Config *************************************
	// ************************************************************************************************
	
  // Key-value store for extensions configuration
  mapping(bytes32 => bytes32) private configStore;

	function writeConfig(bytes32 key, bytes32 value) external override {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		configStore[key] = value;
	}

	function readConfig(bytes32 key) external view override returns (bytes32) {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		return configStore[key];
	}

	// update the configuration
	function updateConfiguration(address extension, bytes calldata payload) external {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
					
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