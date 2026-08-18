import { expect } from "chai";
import hre, { ethers, network } from "hardhat";
import { JsonRpcProvider, Wallet } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { spawn } from "child_process";
import path from "path";

describe("ERC-20X Supply", function () {
	let owner1: SignerWithAddress, addr11: SignerWithAddress, addr12: SignerWithAddress, addr13: SignerWithAddress, addrs1;
	let owner2: Wallet, addr21: Wallet, addr22: Wallet, addr23: Wallet, addrs2;
	let fungibleMasterAddress1: string, fungibleSlaveAddress1: string, fungibleSingletonAddress1: string, mockedERC7786GatewayAddress1: string;
	let fungibleMasterAddress2: string, fungibleSlaveAddress2: string, fungibleSingletonAddress2: string, mockedERC7786GatewayAddress2: string;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log(`\nTest Suite: ${this.title}`);
		console.log('*******************************');
	});

	beforeEach(async function (this: Mocha.Context) {
		console.log(`\nTest: ${this.currentTest?.title}`);
		console.log('***************************************************************************');

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Reset Nodes ********************************************************************
		// ***********************************************************************************************************************************************************
    const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
		await node1Provider.send("anvil_reset", []);
		const [owner1, addr11, addr12, addr13, ...addrs1] = await node1Provider.listAccounts(); 
		[owner1, addr11, addr12, addr13, ...addrs1].map(async (signer, index) => {
			const bal = await node1Provider.getBalance(signer.address);
			console.log(`Node1 Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});

    const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
		await node2Provider.send("anvil_reset", []);
		const [owner2, addr21, addr22, addr23, ...addrs2] = await node2Provider.listAccounts();
		[owner2, addr21, addr22, addr23, ...addrs2].map(async (signer, index) => {
			const bal = await node2Provider.getBalance(signer.address);
			console.log(`Node2 Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});

		// ***********************************************************************************************************************************************************
		// ******************************************************************** Deploy Tokens Hardhat Network ********************************************************
		// ***********************************************************************************************************************************************************
		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway1 = await ethers.getContractFactory("MockedERC7786Gateway", owner1);
		let mockedERC7786Gateway1 = await MockedERC7786Gateway1.deploy();
		expect(await mockedERC7786Gateway1.waitForDeployment()).to.not.be.reverted;
		mockedERC7786GatewayAddress1 = await mockedERC7786Gateway1.getAddress();
		console.log(`MockedERC7786Gateway1 deployed on ${await mockedERC7786Gateway1.chainId()} at ${mockedERC7786GatewayAddress1}`);

		// deploy FungibleMaster1
		const FungibleMaster1 = await ethers.getContractFactory("Fungible", owner1);
		let fungibleMaster1 = await FungibleMaster1.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungibleMaster1.waitForDeployment()).to.not.be.reverted;
		fungibleMasterAddress1 = await fungibleMaster1.getAddress();
		console.log(`FungibleMaster1 deployed on ${await fungibleMaster1.chainId()} at ${fungibleMasterAddress1}`);

		// deploy FungibleSlave1
		const FungibleSlave1 = await ethers.getContractFactory("Fungible", owner1);
		let fungibleSlave1 = await FungibleSlave1.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSlave1.waitForDeployment()).to.not.be.reverted;
		fungibleSlaveAddress1 = await fungibleSlave1.getAddress();
		console.log(`FungibleSlave1 deployed on ${await fungibleSlave1.chainId()} at ${fungibleSlaveAddress1}`);

		// deploy FungibleSingleton1
		const FungibleSingleton1 = await ethers.getContractFactory("Fungible", owner1);
		let fungibleSingleton1 = await FungibleSingleton1.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSingleton1.waitForDeployment()).to.not.be.reverted;
		fungibleSingletonAddress1 = await fungibleSingleton1.getAddress();
		console.log(`FungibleSingleton1 deployed on ${await fungibleSingleton1.chainId()} at ${fungibleSingletonAddress1}`);

		// ***********************************************************************************************************************************************************
		// ******************************************************************** Deploy Tokens Hardhat1 Network *******************************************************
		// ***********************************************************************************************************************************************************
		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway2 = await ethers.getContractFactory("MockedERC7786Gateway", owner2);
		let mockedERC7786Gateway2 = await MockedERC7786Gateway2.deploy();
		expect(await mockedERC7786Gateway2.waitForDeployment()).to.not.be.reverted;
		mockedERC7786GatewayAddress2 = await mockedERC7786Gateway2.getAddress();
		console.log(`MockedERC7786Gateway2 deployed on ${await mockedERC7786Gateway2.chainId()} at ${mockedERC7786GatewayAddress2}`);

		// deploy FungibleMaster2
		const FungibleMaster2 = await ethers.getContractFactory("Fungible", owner2);
		let fungibleMaster2 = await FungibleMaster2.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungibleMaster2.waitForDeployment()).to.not.be.reverted;
		fungibleMasterAddress2 = await fungibleMaster2.getAddress();
		console.log(`FungibleMaster2 deployed on ${await fungibleMaster2.chainId()} at ${fungibleMasterAddress2}`);

		// deploy FungibleSlave2
		const FungibleSlave2 = await ethers.getContractFactory("Fungible", owner2);
		let fungibleSlave2 = await FungibleSlave2.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSlave2.waitForDeployment()).to.not.be.reverted;
		fungibleSlaveAddress2 = await fungibleSlave2.getAddress();
		console.log(`FungibleSlave2 deployed on ${await fungibleSlave2.chainId()} at ${fungibleSlaveAddress2}`);

		// deploy FungibleSingleton2
		const FungibleSingleton2 = await ethers.getContractFactory("Fungible", owner2);
		let fungibleSingleton2 = await FungibleSingleton2.deploy("FungiTest", "FGT", 0);
		expect(await fungibleSingleton2.waitForDeployment()).to.not.be.reverted;
		fungibleSingletonAddress2 = await fungibleSingleton2.getAddress();
		console.log(`FungibleSingleton2 deployed on ${await fungibleSingleton2.chainId()} at ${fungibleSingletonAddress2}`);
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
	/************************************************** Bind ************************************************/
	/********************************************************************************************************/
	/*it("WHO. Only owner can bind.", async() => {
		// Tokens
		const fungibleMaster1 = await ethers.getContractAt('Fungible', fungibleMasterAddress1)
		const fungibleSlave2 = await ethers.getContractAt('Fungible', fungibleSlaveAddress2)

		// TEST CASE: can not bind if not owner
		await expect(fungibleMaster1.connect(addr13).bindChain(1337, fungibleSlaveAddress2)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyOwner");
	});*/

	/*it.skip("FROM. Should only bind from MasterChain token.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: cannot bind if no MasterChain on Fungible1
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "OnlyMasterChain");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});*/

	/*it.skip("HOW. Gateway is required to bind.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// TEST CASE: cannot bind if no gateway on Fungible1
		expect(await fungible1.gateway()).to.equal(ethers.ZeroAddress);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "GatewayRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// TEST CASE: cannot bind if no gateway on Fungible2
		expect(await fungible2.gateway()).to.equal(ethers.ZeroAddress);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "GatewayRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});*/

	/*it.skip("TO. Should only bind to Singleton empty token.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		const fungible9 = await ethers.getContractAt('Fungible', fungibleAddress9)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set Fungible2 as MasterChain
		expect(await fungible2.getMasterChain()).to.equal(0);
		await expect(fungible2.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(await fungible2.chainId());
		console.log(`Fungible2 ${await fungible2.chainId()} set as MasterChain`);

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// set gateway to Fungible2
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// set gateway to Fungible9
		await expect(fungible9.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible9.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible9.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible9.gateway()) + " attached to Fungible2.");

		// TEST CASE: cannot bind a MasterChain
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "OnlySingletonChain");

		// TEST CASE: cannot bind a token with supply
		await expect(fungible1.bindChain(1337, fungibleAddress9)).to.be.revertedWithCustomError(fungible1, "ZeroValueRequired");
	});*/

	/*it.skip("OK. Should be able to bind if conditions met.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// set gateway to Fungible2
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);
	});*/

	/*it.skip("TO. Should not bind a second token in the same chain.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		const fungible3 = await ethers.getContractAt('Fungible', fungibleAddress3)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// set gateway to Fungible2
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// set gateway to Fungible3
		await expect(fungible3.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible3.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible3.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible3.gateway()) + " attached to Fungible3.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);

		// TEST CASE: cannot bind a second token
		// TODO: mock second chain
		//await expect(fungible1.bindChain(1337, fungibleAddress3)).to.be.revertedWithCustomError(fungible1, "OnlySingletonChain");
	});*/

	/********************************************************************************************************/
	/************************************************** Bind ************************************************/
	/********************************************************************************************************/
	/*it.skip("WHO. Only owner can unbind.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: can not unbind if not owner
		await expect(fungible1.connect(addr13).unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "OnlyOwner");
	});*/

	/*it.skip("FROM. Should only unbind from MasterChain token.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: cannot unbind if no MasterChain on Fungible1
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "OnlyMasterChain");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});*/

	/*it.skip("TO. Should only unbind Slave empty tokens.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// TEST CASE: should not unbind Singleton token
		expect(await fungible2.getMasterChain()).to.equal(0);
		await expect(fungible1.unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "ZeroAddressRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");



	});*/

	it.skip("HOW. Gateway is required to unbind.", async() => {

	});

	it.skip("OK. Should be able to unbind if conditions met.", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it.skip("OK. Should be able to unbind if conditions met.", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
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