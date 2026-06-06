// test/network.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { NodeToken, BridgeRouter, ValidatorNode } from "../typechain-types";
import { Signer } from "ethers";

describe.skip("Blockchain Network", function () {
  let nodeToken: NodeToken;
  let bridgeRouter: BridgeRouter;
  let validatorNode: ValidatorNode;
  let deployer: Signer;
  let user1: Signer;
  let user2: Signer;
  let validator: Signer;

	before(async() => {
		console.log('*******************************');
		console.log('******** Starting Tests *******');
		console.log('*******************************');
	});

	beforeEach(async() => {

	});

	afterEach(async() => {

	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});



	it("Initial Logs.", async() => {

	});

	/********************************************************************************************************/
	/************************************** Relayer Timelock Protection *************************************/
	/********************************************************************************************************/


	/********************************************************************************************************/
	/************************************** Relayer Votation Protection *************************************/
	/********************************************************************************************************/


	


});