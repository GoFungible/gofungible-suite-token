import { ERC7786MockGatewayRelayer } from "./ERC7786MockGatewayRelayer";

describe("Cross-Chain End-to-End Test", () => {
  let relayer: ERC7786MockGatewayRelayer;

  /*before(async () => {
    // ... code to deploy your SourceBridge on node1 and DestBridge on node2 ...

    // Instantiate and start the relayer background process
    relayer = new ERC7786MockGatewayRelayer(
      "http://127.0.0.1:8545", // Node 1 RPC
      "http://127.0.0.1:8546", // Node 2 RPC
      sourceBridgeAddress,
      destBridgeAddress
    );

    await relayer.init();
    relayer.listenAndRelay(); // Starts listening asynchronously
  });

  it("should trigger cross-chain action automatically", async () => {
    // Triggering a tx on Node 1 that emits `MessageSent`
    const tx = await sourceBridge.sendCrossChainData("0xTargetOnChain2", "0x123456");
    await tx.wait();

    // Small delay to allow the asynchronous relayer thread to catch up and process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify state changes on Node 2
    const dataReceived = await targetContractOnChain2.someState();
    expect(dataReceived).to.be.true;
  });*/


});
