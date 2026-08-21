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

  /*it("should communicate with two completely separate in-memory networks", async () => {
		// verify node1
		const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const net1 = await node1Provider.getNetwork();
    expect(Number(net1.chainId)).to.equal(1111);

		// verify node2
		const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
    const net2 = await node2Provider.getNetwork();
    expect(Number(net2.chainId)).to.equal(2222);
  });*/

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