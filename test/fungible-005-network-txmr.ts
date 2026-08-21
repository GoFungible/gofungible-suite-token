import { expect } from "chai";
import { ethers } from "hardhat";
import { JsonRpcSigner, ZeroAddress } from "ethers";
import { MockedERC7786Gateway } from "../typechain-types";
import { Fungible} from "../typechain-types/contracts/Fungible";
import { ERC7786MockGatewayRelayer } from "./relayer/ERC7786MockGatewayRelayer";

describe("ERC-20X Supply", function () {
	let owner1: JsonRpcSigner, relayer1: JsonRpcSigner, addr11: JsonRpcSigner, addr12: JsonRpcSigner, addr13: JsonRpcSigner, addrs1: JsonRpcSigner[];
	let owner2: JsonRpcSigner, relayer2: JsonRpcSigner, addr21: JsonRpcSigner, addr22: JsonRpcSigner, addr23: JsonRpcSigner, addrs2: JsonRpcSigner[];
	let fungibleMaster1: Fungible, fungibleSingleton1: Fungible, otherMaster1: Fungible, otherSlave1: Fungible, mockedERC7786Gateway1: MockedERC7786Gateway;
	let fungibleMaster2: Fungible, fungibleSingleton2: Fungible, otherMaster2: Fungible, otherSlave2: Fungible, mockedERC7786Gateway2: MockedERC7786Gateway;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log(`\nTest Suite: ${this.title}`);
		console.log('*******************************');

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Reset Nodes ********************************************************************
		// ***********************************************************************************************************************************************************

    const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
		[owner1, relayer1, addr11, addr12, addr13, ...addrs1] = await node1Provider.listAccounts();
		await node1Provider.send("anvil_reset", []);
		[owner1, relayer1, addr11, addr12, addr13, ...addrs1].map(async (signer, index) => {
			const bal = await node1Provider.getBalance(signer.address);
			const net1 = await node1Provider.getNetwork();
			console.log(`Node1 ChainId ${net1.chainId} Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});
	
    const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
		[owner2, relayer2, addr21, addr22, addr23, ...addrs2] = await node2Provider.listAccounts();
		await node2Provider.send("anvil_reset", []);
		[owner2, relayer2, addr21, addr22, addr23, ...addrs2].map(async (signer, index) => {
			const bal = await node2Provider.getBalance(signer.address);
			const net2 = await node2Provider.getNetwork();
			console.log(`Node2 ChainId ${net2.chainId} Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Deploy Network *****************************************************************
		// ***********************************************************************************************************************************************************
		console.log(`Initializing network`);

		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway1 = await ethers.getContractFactory("MockedERC7786Gateway", owner1);
		mockedERC7786Gateway1 = await MockedERC7786Gateway1.deploy();
		expect(await mockedERC7786Gateway1.waitForDeployment()).to.not.be.reverted;
		expect(await mockedERC7786Gateway1.chainId()).to.equal(1111);
		const mockedERC7786GatewayAddress1 = await mockedERC7786Gateway1.getAddress();
		console.log(`MockedERC7786Gateway1 deployed on ${await mockedERC7786Gateway1.chainId()} at ${mockedERC7786GatewayAddress1}`);

		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway2 = await ethers.getContractFactory("MockedERC7786Gateway", owner2);
		mockedERC7786Gateway2 = await MockedERC7786Gateway2.deploy();
		expect(await mockedERC7786Gateway2.waitForDeployment()).to.not.be.reverted;
		expect(await mockedERC7786Gateway2.chainId()).to.equal(2222);
		const mockedERC7786GatewayAddress2 = await mockedERC7786Gateway2.getAddress();
		console.log(`MockedERC7786Gateway2 deployed on ${await mockedERC7786Gateway2.chainId()} at ${mockedERC7786GatewayAddress2}`);

		// launch relayer
		const relayer = await new ERC7786MockGatewayRelayer(relayer1, relayer2, "http://127.0.0.1:8545", "http://127.0.0.1:8546", mockedERC7786GatewayAddress1, mockedERC7786GatewayAddress2).init();
		relayer.listenAndRelay();

		console.log(`Initialized network`);

		// ***********************************************************************************************************************************************************
		// ****************************************************************************** Deploy Tokens  *************************************************************
		// ***********************************************************************************************************************************************************
		// deploy FungibleMaster1
		const FungibleMaster1 = await ethers.getContractFactory("Fungible", owner1);
		fungibleMaster1 = await FungibleMaster1.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungibleMaster1.waitForDeployment()).to.not.be.reverted;
		const fungibleMasterAddress1 = await fungibleMaster1.getAddress();
		expect(await fungibleMaster1.chainId()).to.equal(1111);
		expect(await fungibleMaster1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungibleMaster1.getMasterChain()).to.equal(1111);
		expect(await fungibleMaster1.getMasterAddress()).to.equal(fungibleMasterAddress1);
		expect(await fungibleMaster1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.gateway()).to.equal(mockedERC7786GatewayAddress1);		
		console.log(`FungibleMaster1 deployed on ${await fungibleMaster1.chainId()} at ${fungibleMasterAddress1}`);

		// deploy FungibleSingleton1
		const FungibleSingleton1 = await ethers.getContractFactory("Fungible", owner1);
		fungibleSingleton1 = await FungibleSingleton1.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSingleton1.waitForDeployment()).to.not.be.reverted;
		const fungibleSingletonAddress1 = await fungibleSingleton1.getAddress();
		expect(await fungibleSingleton1.chainId()).to.equal(1111);
		expect(await fungibleSingleton1.getMasterChain()).to.equal(0);
		expect(await fungibleSingleton1.getMasterAddress()).to.equal(ZeroAddress);
		expect(await fungibleSingleton1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleSingleton1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleSingleton1.gateway()).to.equal(mockedERC7786GatewayAddress1);
		console.log(`FungibleSingleton1 deployed on ${await fungibleSingleton1.chainId()} at ${fungibleSingletonAddress1}`);

		// deploy OtherMaster1
		const OtherMaster1 = await ethers.getContractFactory("Fungible", owner1);
		otherMaster1 = await OtherMaster1.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await otherMaster1.waitForDeployment()).to.not.be.reverted;
		const otherMasterAddress1 = await otherMaster1.getAddress();
		expect(await otherMaster1.chainId()).to.equal(1111);
		expect(await otherMaster1.setAsMasterChain()).to.not.be.reverted;
		expect(await otherMaster1.getMasterChain()).to.equal(1111);
		expect(await otherMaster1.getMasterAddress()).to.equal(otherMasterAddress1);
		expect(await otherMaster1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherMaster1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherMaster1.gateway()).to.equal(mockedERC7786GatewayAddress1);
		console.log(`OtherMaster1 deployed on ${await otherMaster1.chainId()} at ${otherMasterAddress1}`);

		// deploy OtherSlave1
		const OtherSlave1 = await ethers.getContractFactory("Fungible", owner1);
		otherSlave1 = await OtherSlave1.deploy("FungiTest", "FGT", 0);
		expect(await otherSlave1.waitForDeployment()).to.not.be.reverted;
		const otherSlaveAddress1 = await otherSlave1.getAddress();
		expect(await otherSlave1.chainId()).to.equal(1111);
		expect(await otherSlave1.getMasterChain()).to.equal(0);
		expect(await otherSlave1.getMasterAddress()).to.equal(ZeroAddress);
		expect(await otherSlave1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSlave1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSlave1.gateway()).to.equal(mockedERC7786GatewayAddress1);
		console.log(`OtherSlave1 deployed on ${await otherSlave1.chainId()} at ${otherSlaveAddress1}`);

		// ***********************************************************************************************************************************************************
		// ******************************************************************** Deploy Tokens Hardhat1 Network *******************************************************
		// ***********************************************************************************************************************************************************
		// deploy FungibleMaster2
		const FungibleMaster2 = await ethers.getContractFactory("Fungible", owner2);
		fungibleMaster2 = await FungibleMaster2.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungibleMaster2.waitForDeployment()).to.not.be.reverted;
		const fungibleMasterAddress2 = await fungibleMaster2.getAddress();
		expect(await fungibleMaster2.chainId()).to.equal(2222);
		expect(await fungibleMaster2.setAsMasterChain()).to.not.be.reverted;
		expect(await fungibleMaster2.getMasterChain()).to.equal(2222);
		expect(await fungibleMaster2.getMasterAddress()).to.equal(fungibleMasterAddress2);
		expect(await fungibleMaster2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleMaster2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleMaster2.gateway()).to.equal(mockedERC7786GatewayAddress2);
		console.log(`FungibleMaster2 deployed on ${await fungibleMaster2.chainId()} at ${fungibleMasterAddress2}`);

		// deploy FungibleSingleton2
		const FungibleSingleton2 = await ethers.getContractFactory("Fungible", owner2);
		fungibleSingleton2 = await FungibleSingleton2.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSingleton2.waitForDeployment()).to.not.be.reverted;
		const fungibleSingletonAddress2 = await fungibleSingleton2.getAddress();
		expect(await fungibleSingleton2.chainId()).to.equal(2222);
		expect(await fungibleSingleton2.getMasterChain()).to.equal(0);
		expect(await fungibleSingleton2.getMasterAddress()).to.equal(ZeroAddress);
		expect(await fungibleSingleton2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleSingleton2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleSingleton2.gateway()).to.equal(mockedERC7786GatewayAddress2);
		console.log(`FungibleSingleton2 deployed on ${await fungibleSingleton2.chainId()} at ${fungibleSingletonAddress2}`);

		// deploy OtherMaster2
		const OtherMaster2 = await ethers.getContractFactory("Fungible", owner2);
		otherMaster2 = await OtherMaster2.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await otherMaster2.waitForDeployment()).to.not.be.reverted;
		const otherMasterAddress2 = await otherMaster2.getAddress();
		expect(await otherMaster2.chainId()).to.equal(2222);
		expect(await otherMaster2.setAsMasterChain()).to.not.be.reverted;
		expect(await otherMaster2.getMasterChain()).to.equal(2222);
		expect(await otherMaster2.getMasterAddress()).to.equal(otherMasterAddress2);
		expect(await otherMaster2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await otherMaster2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherMaster2.gateway()).to.equal(mockedERC7786GatewayAddress2);
		console.log(`OtherMaster2 deployed on ${await otherMaster2.chainId()} at ${otherMasterAddress2}`);

		// deploy FungibleSlave2
		const OtherSlave2 = await ethers.getContractFactory("Fungible", owner2);
		otherSlave2 = await OtherSlave2.deploy("FungiTest", "FGT", 0);
		expect(await otherSlave2.waitForDeployment()).to.not.be.reverted;
		const otherSlaveAddress2 = await otherSlave2.getAddress();
		expect(await otherSlave2.chainId()).to.equal(2222);
		expect(await otherSlave2.getMasterChain()).to.equal(0);
		expect(await otherSlave2.getMasterAddress()).to.equal(ZeroAddress);
		expect(await otherSlave2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSlave2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSlave2.gateway()).to.equal(mockedERC7786GatewayAddress2);
		console.log(`OtherSlave2 deployed on ${await otherSlave2.chainId()} at ${otherSlaveAddress2}`);

		// ***********************************************************************************************************************************************************
		// *************************************************************** Mock OtherSlave2 and OtherSlave1 **********************************************************
		// ***********************************************************************************************************************************************************
		// bind OtherMaster1 and OtherSlave2
		console.log(`Bind will fire event`);
		expect(await otherMaster1.bindChain(2222, otherSlaveAddress2)).to.not.be.reverted;
		await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sec
		expect(await otherSlave2.getMasterChain()).to.equal(1111);
		expect(await otherSlave2.getMasterAddress()).to.equal(otherMasterAddress1);

		// bind OtherMaster2 and OtherSlave1
		expect(await otherMaster2.bindChain(1111, otherSlaveAddress1)).to.not.be.reverted;
		await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sec
		expect(await otherSlave1.getMasterChain()).to.equal(2222);
		expect(await otherSlave1.getMasterAddress()).to.equal(otherMasterAddress2);

	});

	beforeEach(async function (this: Mocha.Context) {
		console.log(`\nTest: ${this.currentTest?.title}`);
		console.log('***************************************************************************');

	});

	afterEach(async() => {
		console.log('--------------------');
	});
	
	after(async() => {
		console.log(`--------- End Test Suite ${this.title}  --------`);
	});

  it("should communicate with two completely separate in-memory networks", async () => {
		// verify node1
		const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const net1 = await node1Provider.getNetwork();
    expect(Number(net1.chainId)).to.equal(1111);

		// verify node2
		const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
    const net2 = await node2Provider.getNetwork();
    expect(Number(net2.chainId)).to.equal(2222);
  });

	/********************************************************************************************************/
	/************************************************ Addresses *********************************************/
	/********************************************************************************************************/
	it.skip("Should be able to read chain addresses", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	/********************************************************************************************************/
	/******************************************** Transfer MasterChain **************************************/
	/********************************************************************************************************/
	it.skip("Should be able to transfer master chain status", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

});