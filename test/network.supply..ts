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

  describe("Supply", function () {
		
    it("Should have correct initial supply on first network", async function () {
      const totalSupply = await nodeToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("Should allow to deploy more networks", async function () {


		});

		it("Should allow to transferring between networks", async function () {


		});

	});

});