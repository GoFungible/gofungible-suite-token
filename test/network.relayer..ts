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

  describe("Relayer", function () {
		
    it("Should be able to add a relayer", async function () {

    });


    it("Should be Timelock Protected", async function () {


		});

    it("Should be Votation Protected", async function () {


		});

    it("Should be Version Protected", async function () {


		});

	});

});