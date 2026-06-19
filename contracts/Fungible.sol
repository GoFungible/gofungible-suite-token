// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import "./erc-20/IERC20.sol";
import "./erc-20/IERC8054.sol";
import "gofungible-erc-20-multichain-supply-extension/contracts/IERC20x.sol";
import "gofungible-erc-20-multichain-relayer-extension/contracts/IRelayer.sol";
import "./extensions/framework/LibDiamondStorage.sol";
import "./extensions/IEntryFacet.sol";
import "./IFungible.sol";

import "hardhat/console.sol";

contract Fungible is IERC20, IERC20x, IERC20Checkpointed, IFungible {

	// ************************************************************************************************
	// ******************************************** Contract ******************************************
	// ************************************************************************************************   
	uint256 public immutable CHAIN_ID;

	address public _owner;
	
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
	// ******************************************** ERC-20 ********************************************
	// ************************************************************************************************   
	uint256 private _totalSupply;
	
	mapping(address => uint256) private _balances;
	mapping(address => mapping(address => uint256)) private _allowances;
			
	// ERC-20 Functions	
	function totalSupply() public view returns (uint256) {
			return _totalSupply;
	}
	
	function balanceOf(address account) public view returns (uint256) {
			return _balances[account];
	}
	
	// ************************************************************************************************
	// ********************************** Supply Version Protected (IERC8054) *************************
	// ************************************************************************************************
	function totalSupplyAt(uint48 checkpoint) external view returns (uint256) {
		return 0;
	}

	function balanceOfAt(address account, uint48 checkpoint) external view returns (uint256) {
		return 0;
	}

	function checkpointNonce() external view returns (uint48) {
		return 0;
	}

	// ************************************************************************************************
	// **************************************** ERC-20 Transfer ***************************************
	// ************************************************************************************************
	// transfer
	function transfer(address to, uint256 amount) public returns (bool) {
		_transfer(msg.sender, to, amount);
		return true;
	}

	function transferFrom(address from, address to, uint256 amount) public returns (bool) {
		_spendAllowance(from, msg.sender, amount);
		_transfer(from, to, amount);
		return true;
	}
	
	function _transfer(address from, address to, uint256 amount) internal {
		require(from != address(0), "ERC20: transfer from zero address");
		require(to != address(0), "ERC20: transfer to zero address");
		require(_balances[from] >= amount, "ERC20: insufficient balance");

		if (address(entryFacet) != address(0)) {
			entryFacet._beforeTokenTransfer(from, to, amount);
		}
		
		_balances[from] -= amount;
		_balances[to] += amount;
		
		if (address(entryFacet) != address(0)) {
			entryFacet._afterTokenTransfer(from, to, amount);
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
	// ******************************************** Relayer *******************************************
	// ************************************************************************************************
	// Storage for the interface implementation
	IRelayer public myRelayer;

	event RelayerUpdated(address indexed oldImplementation, address indexed newImplementation);

	function setRelayer(address _newImplementation) external {
			require(msg.sender == _owner, "Ownable: caller is not the owner");
			require(_newImplementation != address(0), "Invalid address");
			require(_isContract(_newImplementation), "Address must be a contract");
			
			address oldImplementation = address(myRelayer);
			myRelayer = IRelayer(_newImplementation);
			
			emit RelayerUpdated(oldImplementation, _newImplementation);
	}
	
	// Get the current implementation
	function getRelayer() external view returns (address) {
			return address(myRelayer);
	}

	// ************************************************************************************************
	// ******************************* Relayer Timelock Protection ************************************
	// ************************************************************************************************

	uint256 DELAY = 0 days;

	string public currentResource1;
	string public timelockedResource;
	uint256 public availableFromTime; // 0 = no pending change

	function scheduleByTimelock(string calldata _new) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		timelockedResource = _new;
		availableFromTime = block.timestamp + DELAY;
	}
	
	function getResourceByTimelock() public returns (string memory) {
			// Auto-switch to new resource if timelock has passed
			if (availableFromTime > 0 && block.timestamp >= availableFromTime) {
					currentResource1 = timelockedResource;
					delete timelockedResource;
					delete availableFromTime;
					delete DELAY;
			}
			return currentResource1;
	}
	
	function getPendingTimelock() public view returns (string memory, uint256) {
			return (timelockedResource, availableFromTime);
	}

	// ************************************************************************************************
	// ******************************* Relayer Votation Protected *************************************
	// ************************************************************************************************

	uint256 VOTES = 0;
	mapping(string => uint256) public proposalVotes;
	mapping(address => mapping(string => bool)) public hasVoted;

	string public currentResource2;
	string public votedResource;
	uint256 public availableFromVote;

	function scheduleByVotes(string calldata _new) external {
		require(msg.sender == _owner, "Ownable: caller is not the owner");
		votedResource = _new;
		availableFromVote = block.timestamp + DELAY;
	}

	function vote() external {
			require(bytes(votedResource).length > 0, "No active proposal");
			require(!hasVoted[msg.sender][votedResource], "Already voted");
			
			bool userVoted = hasVoted[msg.sender][votedResource];
			require(!userVoted, "No voting power");
			
			hasVoted[msg.sender][votedResource] = true;
	}
	
	function getResourceByVotes() public returns (string memory) {
			// Auto-switch to new resource if timelock has passed
			if (availableFromVote > 0 && block.timestamp >= availableFromVote) {
					currentResource2 = votedResource;
					delete votedResource;
					delete availableFromVote;
					delete VOTES;
			}
			return currentResource2;
	}
	
	function getPendingVotes() public view returns (string memory, uint256) {
			return (votedResource, availableFromVote);
	}

	// ************************************************************************************************
	// *************************************** ERC-20X ************************************************
	// ************************************************************************************************   
	uint256 private _globalSupply;

	uint256[] public knownChains;

	mapping(uint256 => uint256) public supplies;

	mapping(uint256 => address) public addresses;

	event RemoteSupplyUpdated(uint256 indexed chainId, uint256 newSupply);

	event LocalSupplyUpdated(uint256 indexed chainId, uint256 newSupply);

	function globalSupply() external view returns (uint256) {
		return _globalSupply;
	}
	
	function getAllRemoteSupplies() external view returns (uint256[] memory chainIds, uint256[] memory _supplies) {
			chainIds = knownChains;
			_supplies = new uint256[](knownChains.length);
			
			for (uint i = 0; i < knownChains.length; i++) {
					_supplies[i] = supplies[knownChains[i]];
			}
	}

	function balanceOfX(address _account) external view returns (uint256) {
		return _balances[_account] ;
	}

	// ************************************************************************************************
	// ************************************** SupplyX Version Protected *******************************
	// ************************************************************************************************




	// ************************************************************************************************
	// ************************************* Supplies Migration Protection ****************************
	// ************************************************************************************************




	// ************************************************************************************************
	// ******************************************* TransferX ******************************************
	// ************************************************************************************************
	// Performs supply transfer
	function transferX(uint256 toChain, address toAddress, uint256 amount) external returns (bool) {

		// do supply transation
		_transferCrosschainTransaction(toChain, toAddress, amount);

		// update local ERC-20
		_burn(msg.sender, amount);

		// update supplies
		supplies[CHAIN_ID] += amount;
		supplies[toChain] -= amount;

		// sync both supplies on all other networks
		for (uint i = 0; i < knownChains.length; i++) {
			_sendSyncNodesTransaction(CHAIN_ID, toChain, amount);
		}

		// emit event

		return true;

	}

	/*function transferXFrom(address from, uint256 toChain, address toAddress, uint256 amount) external returns (bool) {
		return true;
	}*/

	// Receives supply transfer
	function receiveCrosschain(uint256 sourceChain, uint256 destChain, uint256 amount) internal {
			
		// update both supplies locally
		_mint(addresses[destChain], amount);
		supplies[sourceChain] -= amount;
		supplies[destChain] += amount;

		// emit event

	}

	// Update remote supply transfer
	function receiveSyncNodes(uint256 sourceChain, uint256 destChain, uint256 amount) internal {
			
		// receive supply
		supplies[sourceChain] -= amount;
		supplies[destChain] += amount;

		// emit event

	}

	function _mint(address to, uint256 amount) internal {
			require(to != address(0), "ERC20: mint to zero address");
			
			_totalSupply += amount;
			_balances[to] += amount;
			
			emit Transfer(address(0), to, amount);
	}
	
	function _burn(address from, uint256 amount) internal {
			require(from != address(0), "ERC20: burn from zero address");
			require(_balances[from] >= amount, "ERC20: insufficient balance");
			
			_balances[from] -= amount;
			_totalSupply -= amount;
			
			emit Transfer(from, address(0), amount);
	}

	function _transferCrosschainTransaction(uint256 destChain, address destAddress, uint256 amount) internal {
		myRelayer.sendCrosschainSupply(destChain, destAddress, amount);
	}
	function receiveCrosschainTransaction(uint256 sourceChain, uint256 destChain, uint256 amount) external {
		receiveCrosschain(sourceChain, destChain, amount);
	}
	// Update remote supply transfer
	function _sendSyncNodesTransaction(uint256 sourceChain, uint256 destChain, uint256 amount) internal {
	}
	// Update remote supply transfer
	function receiveSyncNodesTransaction(uint256 sourceChain, uint256 destChain, uint256 amount) external {
			receiveSyncNodes(sourceChain, destChain, amount);
	}

	// ************************************************************************************************
	// ******************************************* Extensions *****************************************
	// ************************************************************************************************

	// Storage for the interface implementation
	IEntryFacet public entryFacet;

	event FacetUpdated(address indexed oldImplementation, address indexed newImplementation);

	function setEntryFacet(address _newImplementation) external {
			require(_newImplementation != address(0), "Invalid address");
			
			// Optional: Verify the address implements the interface
			require(_isContract(_newImplementation), "Address must be a contract");
			
			address oldImplementation = address(myRelayer);
			entryFacet = IEntryFacet(_newImplementation);
			
			emit FacetUpdated(oldImplementation, _newImplementation);
	}

	function _isContract(address _addr) private view returns (bool) {
			uint32 size;
			assembly {
					size := extcodesize(_addr)
			}
			return size > 0;
	}

	// Get the current implementation
	function getEntryFacet() external view returns (address) {
			return address(myRelayer);
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