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
import "./erc-7841/ERC7841Message.sol";
import "./erc-7786/IERC7786GatewaySource.sol";
import "./erc-7786/IERC7786Recipient.sol";
import {LibERC7786ToEthAdapter} from "./erc-7786/LibERC7786ToEthAdapter.sol";
import "./erc-7786/IExtMsgINBlockX.sol";
import "./erc-7786/IExtMsgINUpdateX.sol";
import "./erc-7786/IExtMsgINLogX.sol";

// erc-20n (multichain token)
import "gofungible-erc-20-multichain-supply-extension/contracts/IERC20x.sol";

import "gofungible-crosschain-atomic-messaging/contracts/IERC7786x.sol";

import "hardhat/console.sol";

contract Fungible is IFungible, ERC173, IERC20, IERC20x /*IERC7786Recipient,*/ {

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

  function gateway() view external returns(address) {
		return _extGateway;
	}

	// ************************************************************************************************
	// ************************************** ERC-7786 Messages ***************************************
	// ************************************************************************************************
  function _sendMessage(bytes32 operation, uint256 toChain, address toAddress, bytes memory packedPayload) internal returns (bytes32) {
		require(_extGateway != ZERO_ADDRESS, GatewayRequired(_extGateway));

		// By doing this, this contract only interacts with the based networks. Be aware.
		bytes memory recipient = LibERC7786ToEthAdapter.generateERC7930Record(toChain, toAddress);
		print(0, "[1-FUN] sendMessage", toChain, toAddress);

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

		// run INBLOCK extensions
		/*for(uint i=0; i<_extMsgOutBlock.length; i++) {
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINBlockX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			bytes memory resultBytes = _staticCall(_extMsgOutBlock[i], encodedData);
			bool isBlocked = abi.decode(resultBytes, (bool));
      require(!isBlocked, "Extension: Transfer blocked by Extension");
    }

		// run INUPDATE extensions
		for(uint i=0; i<_extMsgOutUpdate.length; i++) {
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINUpdateX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			bytes memory resultBytes = _delegateCall(_extMsgInUpdate[i], encodedData);
			amount = abi.decode(resultBytes, (uint256));
    }

		// run INLOG extensions
		for(uint i=0; i<_extMsgOutLog.length; i++) {
			bytes memory encodedData = abi.encodeWithSignature( "extTransportINLogX(uint256 from, address to, uint256 amount)", inChain, inAddress, amount );
			_staticCall(_extMsgOutLog[i], encodedData);
    }*/

		bytes[] memory attributes = new bytes[](0);
		//attributes[0] = abi.encodeWithSignature("minGasLimit(uint256)", 200000);

		// send message
    bytes32 id = IERC7786GatewaySource(_extGateway).sendMessage(recipient, packedMessage, attributes);
		require(id != bytes32(0), ErrorInGatewaySendingMessage());
		print(id, "[3-FUN] id returned by sendMessage from gateway.");

		// to really guarantee thaht this is the tx, we need to emit in the token
		// if we emit in the gateway, we can get the worng event
		//emit FungibleMessageSent(id, operation, toChain, toAddress, packedPayload);

		return id;
	}

	// TODO: Use EIP-712
	function receiveMessage(bytes32 id, bytes calldata senderBOA, bytes calldata messageBytes) external nonReentrant returns (bytes4) {
		print(id, "[6-FUN] Fungible received message!!!");
		require(_extGateway != ZERO_ADDRESS, GatewayRequired(msg.sender));
		require(msg.sender == _extGateway, OnlyGateway(msg.sender));

		//emit FungibleMessageReceived(id);

		// Validate sender from gateway data
		(uint256 srcChainId, address srcAddress) = LibERC7786ToEthAdapter.parseERC7930Record(senderBOA);
		// TODO
		// require....

		// get message info
		Message memory message = abi.decode(messageBytes, (Message));
		Header memory header = message.header;

		print(id, "[6-FUN] Fungible received message5!!!");
		console.logBytes32(header.op);

		if (!(
			(header.op == MSG_BND1)	||																																							// still unbound
			(_masterChain == CHAIN_ID && _masterAddress == address(this)) ||																				// is master chain
			(srcChainId == _masterChain && srcAddress == _masterAddress || addresses[srcChainId] == srcAddress)			// receive from master chain
		)) {
			revert OnlyMessageWithinThePerimenter(srcChainId);
		}
		print(id, "[6-FUN] Fungible received message6!!!");
		
		// bind / unbind operations
		// We cannot validate message comes from MasterChain for MSG_BND because token is unbound:
		// - MasterChain cannot yet be validated because is the bind process who associates the MasterChain
		// - The owner of the real MasterChain creates and only he knows the location of slave to be bound.
		if (header.op == MSG_BND1) {
			_doBindReceiver(message.payload);
			_sendResponse(id, MSG_BND2, srcChainId, srcAddress);

		} else if (header.op == MSG_BND2) {
			_doBindSender(message.payload);

		} else if (header.op == MSG_UBN1) {
			_doUnbindReceiver(message.payload);
			_sendResponse(id, MSG_UBN2, srcChainId, srcAddress);

		} else if (header.op == MSG_UBN2) {
			_doUnbindSender(message.payload);

		// supply operations
		} else if (header.op == MSG_SUP) {
			_doSupplyReceiver(message.payload);

		} else if (header.op == MSG_SUL1) {
			_undoSupplyReceiver(id);

		} else if (header.op == MSG_SUL2) {
			_undoSupplySender(id);

		// do custom messages
		} else {

		}

		return IERC7786Recipient.receiveMessage.selector;
	}

	// messages requiring response
	struct PendingCallbacks {
		bytes32 op;
		uint256 toChain;
		address toAddress;
		bytes payload;
	}
	mapping(bytes32 => PendingCallbacks) public pendingCallbacks;

	struct FungibleResponsePayload {
		bytes32 id;
	}
	function _sendResponse(bytes32 id, bytes32 op, uint256 toChain, address toAddress) internal {
		// send response message containing id
    bytes memory idPayload = abi.encode(FungibleResponsePayload({
			id: id
    }));
		print(id, "[6-FUN] Sending response!!!");
		bytes32 respId = _sendMessage(op, toChain, toAddress, idPayload);
		print(id, "[0-RES] Sent response!!!");
		console.logBytes32(respId);
	}

	// ************************************************************************************************
	// ********************************* ERC-7786 Custom Messages *************************************
	// ************************************************************************************************

	function customMessage() external payable {

	}

	function _doMessageReceiver(bytes memory payload) internal {
		print(0, "[6-FUN] _onMessage()");
	}

	function _doMessageSender(bytes memory payload) internal {

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
			_cloneState(_newMasterChain, _newMasterAddress);
		}

		// broadcast to all other chains
		// we cannot claim from every chain because this could leave temporary inconsistent state
		// ????????

		// change master to this chain
		_masterChain = _newMasterChain;

		emit MasterChainUpdated(_masterChain, _masterAddress, _newMasterChain, _newMasterAddress);
	}

	// ************************************************************************************************
	// ************************** ERC-20X: 3. Token Perimeter. Addresses ******************************
	// ************************************************************************************************  
	uint256[] knownChains;

	function getChains() external view returns (uint256[] memory) {
		return knownChains;
	}

	mapping(uint256 => address) public addresses;

	function getChainAddress(uint256 _chainId) external view returns (address) {
		return addresses[_chainId];
	}

	// ************************************************************************************************
	// **************************** ERC-20X: 3. Token Perimeter. Bind *********************************
	// ************************************************************************************************  
	/**
	 * @title FungibleBindPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleBindPayload {
		uint256 masterChain;
		address masterAddress;
	}

	// bind
	function bind(uint256 toChainId, address toChainAddress) external payable nonReentrant override {
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		print(0, "[0-BUS] bind", toChainId, toChainAddress);

		require(toChainAddress != ZERO_ADDRESS, NonZeroAddressRequired());
		require(toChainId != ZERO_VALUE, NonZeroValueRequired());

		require(toChainId != CHAIN_ID, OnlyBindToOtherChain());
		require(_masterChain == CHAIN_ID, OnlyBindFromMasterToken());
		require(supplies[toChainId] == ZERO_VALUE, OnlyBindToUnboundChain(toChainId));
		require(addresses[toChainId] == ZERO_ADDRESS, OnlyBindToUnboundChain(toChainId));

		// send message to the binding chain
    bytes memory packedPayload = abi.encode(FungibleBindPayload({
			masterChain: _masterChain,
			masterAddress: _masterAddress
    }));
		bytes32 id = _sendMessage(MSG_BND1, toChainId, toChainAddress, packedPayload);

		// store op data
		pendingCallbacks[id] = PendingCallbacks({
			op: MSG_BND1,
			toChain: toChainId,
			toAddress: toChainAddress,
			payload: packedPayload
		});
	}

	function _doBindReceiver(bytes memory payload) internal {
		require(_masterChain == ZERO_VALUE, OnlyBindToSingletonChain());
		require(_masterAddress == ZERO_ADDRESS, OnlyBindToSingletonChain());
		require(_totalSupply == ZERO_VALUE, OnlyBindToEmptyToken(_totalSupply));

		print(0, "[7-BUS] token bound1");
		FungibleBindPayload memory payloadData = abi.decode(payload, (FungibleBindPayload));
		_masterChain = payloadData.masterChain;
		_masterAddress = payloadData.masterAddress;
	}

	function _doBindSender(bytes memory idPayload) internal {
		// extract id
    bytes32 id = abi.decode(idPayload, (bytes32));

		// get transaction data
		PendingCallbacks memory pendingCallback = pendingCallbacks[id];
		uint256 toChainId = pendingCallback.toChain;
		address toChainAddress = pendingCallback.toAddress;

		// complete bind operation
		print(0, "[12-BUS] _doBindSender");
		knownChains.push(toChainId);
		addresses[toChainId] = toChainAddress;

		// delete pending operation
		delete pendingCallbacks[id];

		// notify operation completion
		emit FungibleBindOperationCompleted(toChainId, toChainAddress);
	}

	// ************************************************************************************************
	// *************************** ERC-20X: 3. Token Perimeter. Unbind ********************************
	// ************************************************************************************************  
	// unbind
	function unbind(uint256 fromChainId) external payable nonReentrant override {
		print(0, "[0-BUS] unbind");
		require(msg.sender == _owner, OnlyOwner(msg.sender));
		require(fromChainId != ZERO_VALUE, NonZeroValueRequired());
		require(_masterChain == CHAIN_ID, OnlyUnbindFromMasterChain());
		require(fromChainId != CHAIN_ID, OnlyUnbindFromOtherChain());
		require(addresses[fromChainId] != ZERO_ADDRESS, OnlyUnbindFromSlaveChain());
		require(supplies[fromChainId] == ZERO_VALUE, OnlyUnbindFromEmptyToken());
		print(0, "[0-BUS] unbin9");

		// send message to the unbinding chain
    bytes memory packedPayload = abi.encode(FungibleBindPayload({
			masterChain: _masterChain,
			masterAddress: _masterAddress
    }));
		bytes32 id = _sendMessage(MSG_UBN1, fromChainId, addresses[fromChainId], packedPayload);

		// store op data
		pendingCallbacks[id] = PendingCallbacks({
			op: MSG_UBN1,
			toChain: fromChainId,
			toAddress: addresses[fromChainId],
			payload: packedPayload
		});
	}

	function _doUnbindReceiver(bytes memory payload) internal {
		print(0, "[0-BUS] _doUnbindReceiver");
		require(_masterChain != ZERO_VALUE, OnlyUnbindFromSlaveChain());
		require(_masterAddress != ZERO_ADDRESS, OnlyUnbindFromSlaveChain());
		require(_totalSupply == ZERO_VALUE, OnlyUnbindFromSlaveChain());

		// verify is the masterchain and masteraddress
		print(0, "[0-BUS] _doUnbindReceiver1");
		FungibleBindPayload memory payloadData = abi.decode(payload, (FungibleBindPayload));
		require(_masterChain == payloadData.masterChain, OnlyUnbindFromMasterChain());
		require(_masterAddress == payloadData.masterAddress, OnlyUnbindFromMasterChain());

		// unbind
		print(0, "[0-BUS] _doUnbindReceiver2");
		_masterChain = 0;
		_masterAddress = ZERO_ADDRESS;
	}

	function _doUnbindSender(bytes memory idPayload) internal {
		print(0, "[0-BUS] _doUnbindSender");
		// extract id
    bytes32 id = abi.decode(idPayload, (bytes32));

		// get transaction data
		PendingCallbacks memory pendingCallback = pendingCallbacks[id];
		uint256 fromChainId = pendingCallback.toChain;
		address fromChainAddress = pendingCallback.toAddress;
		print(0, "[0-BUS] _doUnbindSender1");

		removeValueFromArray(knownChains, fromChainId);
		addresses[fromChainId] = ZERO_ADDRESS;
		supplies[fromChainId] = ZERO_VALUE;

		// delete pending operation
		delete pendingCallbacks[id];
		print(0, "[0-BUS] _doUnbindSender2");

		// notify operation completion
		emit FungibleUnbindOperationCompleted(fromChainId, fromChainAddress);
	}

	// ************************************************************************************************
	// *********************************** ERC-20X: 2. Network State **********************************
	// ************************************************************************************************
	/**
	 * @title FungibleStatePayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleStatePayload {
		string name;
		string symbol;
		uint8 decimals;
		uint256[] chains;
		uint256[] supplies;       				// The total amount of tokens being moved
	}

	function _cloneState(uint256 toChain, address toAddress) internal {
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

		_sendMessage(MSG_CLO, toChain, toAddress, packedPayload);
	}

	function _doCloneReceiver(bytes memory payload) internal returns (bytes4) {
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

	function _doCloneSender(bytes memory payload) internal {

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

	// ************************************************************************************************
	// ************************************* ERC-20X: 5. TransferX ************************************
	// ************************************************************************************************
	/**
	 * @title FungibleSupplyPayload
	 * @notice Message blueprint struct for cross-chain execution.
	 */
	struct FungibleSupplyPayload {
		uint256 outChain;
		address outAddress;
		uint256 inChain;
		address inAddress;
		uint256 amount;          	// The total amount of tokens being moved
	}

	// ERC-20X Extensions
	address[] public _extMsgOutBlock;

	address[] public _extMsgOutUpdate;

	address[] public _extMsgOutLog;

	// done by accounts of 2 holders between chains within the perimeter
	function pay(uint256 inChain, address inAddress, uint256 amount) external payable nonReentrant override {
		if (inChain == CHAIN_ID) {
			_transfer(msg.sender, inAddress, amount);
		} else {
			_transferX(inChain, inAddress, amount);
		}
	}

	// done by 2 accounts of 1 holders between chains within the perimeter
	function bridge(uint256 inChain, address inAddress, uint256 amount) external payable nonReentrant override {
		 _transferX(inChain, inAddress, amount);
	}

	// SenderSupplies
	struct SenderSupplies {
		bytes32 op;
		uint256 toChain;
		address toAddress;
		bytes payload;
	}
	mapping(bytes32 => SenderSupplies) public senderSupplies;

	// Performs supply transfer to an account of another chain
	// To prevents inconsistent state, whereas maintaining the same number of messages (gas), all transferX must go throught MasterChain.
	function _transferX(uint256 inChain, address inAddress, uint256 amount) internal {
		// sending to master chain or sending from master chain
		require(CHAIN_ID == _masterChain || inChain == _masterChain, OnlyTransferXThroughtMasterChain(inChain));
		print(0, "[0-BUS] _transferX Ok Chain", inChain, inAddress);

		// calculate toChain and toAddress
		uint256 toChain = inChain;
		address toAddress = inChain == _masterChain ? _masterAddress : addresses[inChain];
		require(toAddress != ZERO_ADDRESS, OnlyTransferXBoundTokens(inChain));
		print(0, "[0-BUS] _transferX OK Address", inChain, inAddress);

		// account must have the money
		amount = amount * 10 ** _decimals;
		require(balanceOf(msg.sender) > amount, OnlyTransferXWithFunds(amount));
		print(0, "[0-BUS] _transferX after validations", inChain, inAddress);

		// update remote chain
    bytes memory packedPayload = abi.encode(FungibleSupplyPayload({
			outChain: CHAIN_ID,
			outAddress: msg.sender,
			inChain: inChain,
			inAddress: inAddress,
			amount: amount
    }));
		print(0, "[0-BUS] _transferX before send", toChain, toAddress);
		bytes32 id = _sendMessage(MSG_SUP, toChain, toAddress, packedPayload);
		print(id, "[0-BUS] _transferX id returned", toChain, toAddress);

		// if message sending was not reverted we can record info for callback processing
		senderSupplies[id] = SenderSupplies({
			op: MSG_SUP,
			toChain: toChain,
			toAddress: toAddress,
			payload: packedPayload
    });
	}

	// Receives supply transfer
	function _doSupplyReceiver(bytes memory payload) internal {

		// Unpack the byte envelope straight back into the struct format
		FungibleSupplyPayload memory payloadData = abi.decode(payload, (FungibleSupplyPayload));
		uint256 outChain = payloadData.outChain;
		//address outAddress = payloadData.outAddress;
		uint256 inChain = payloadData.inChain;
		address inAddress = payloadData.inAddress;
		uint256 amount = payloadData.amount;

		// if destination, update ERC-20
		if (CHAIN_ID == inChain) {
			print(0, "[6-FUN] add money ", amount);
			_balances[inAddress] += amount;
			console.log(_totalSupply);
			_totalSupply += amount;
			console.log(_totalSupply);
		}

		// if MasterChain, update supplies
		if (CHAIN_ID == _masterChain) {
			print(0, "[6-FUN] move money ", amount);
			supplies[outChain] -= amount;
			supplies[inChain] += amount;
		}

		print(0, "[6-FUN] end _doSupplyReceiver");
	}

	function _undoSupplyReceiver(bytes32 id) internal {

	}

	function _doSupplySender(bytes memory payload) internal {
		print(0, "[12-BUS] _doSupplySender");

		// Unpack the byte envelope straight back into the struct format
		FungibleSupplyPayload memory payloadData = abi.decode(payload, (FungibleSupplyPayload));
		uint256 outChain = payloadData.outChain;
		address outAddress = payloadData.outAddress;
		uint256 inChain = payloadData.inChain;
		//address inAddress = payloadData.inAddress;
		uint256 amount = payloadData.amount;

		// if source, update ERC-20
		if (CHAIN_ID == outChain) {
			print(0, "[12-BUS] remove money ", amount);
			_balances[outAddress] -= amount;
			_totalSupply -= amount;
		}

		// if MasterChain, update supplies
		if (CHAIN_ID == _masterChain) {
			print(0, "[12-BUS] move money ", amount);
			supplies[outChain] -= amount;
			supplies[inChain] += amount;
		}
		
		print(0, "[12-BUS] end _doSupplySender");

	}

	function _undoSupplySender(bytes32 id) internal {

	}

	// *************************************************************************************************
	// ************************************ Extension: 1. Injection ************************************
	// *************************************************************************************************
	enum ExtensionType { 
		EXT_OWNERSHIP_PROVIDER,

		EXT_GATEWAY,

		EXT_TRX_IN_BLOCK,
		EXT_TRX_IN_UPDATE,
		EXT_TRX_IN_LOG,
		EXT_TRX_OUT_LOG,

		EXT_MSG_IN_BLOCKX,
		EXT_MSG_IN_UPDATE,
		EXT_MSG_IN_LOG
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

		// transfer
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_BLOCK)) {
			_extTrxInBlock.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_UPDATE)) {
			_extTrxInUpdate.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_IN_LOG)) {
			_extTrxInLog.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_TRX_OUT_LOG)) {
			_extTrxOutLog.push(resourceAddress);

		// message
		} else if (resourceType == uint(ExtensionType.EXT_MSG_IN_BLOCKX)) {
			_extMsgOutBlock.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_MSG_IN_UPDATE)) {
			_extMsgOutUpdate.push(resourceAddress);
		} else if (resourceType == uint(ExtensionType.EXT_MSG_IN_LOG)) {
			_extMsgOutLog.push(resourceAddress);
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

	// ************************************************************************************************
	// ************************************ Extensions: 4. Execute ************************************
	// ************************************************************************************************
	/*function _runBeforeExtensions() internal {


	}*/

}