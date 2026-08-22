import { ethers, JsonRpcSigner, WebSocketProvider } from "ethers";
import { IERC7786GatewaySource__factory, IGatewayReceiver__factory } from "../../typechain-types";

export class ERC7786MockGatewayRelayer {
  private relayer1: JsonRpcSigner;						// needs relayer to send messages
  private relayer2: JsonRpcSigner;						// needs relayer to send messages
  private provider1: WebSocketProvider;			// needs WebSocketProvider to listen event continuously. JsonRpcProvider just polls
  private provider2: WebSocketProvider;			// needs WebSocketProvider to listen event continuously. JsonRpcProvider just polls
  private sourceGatewayAddress: string;
  private destGatewayAddress: string;

  constructor(relayer1: JsonRpcSigner, relayer2: JsonRpcSigner, node1Url: string, node2Url: string, sourceGateway: string, destGateway: string) {
		this.relayer1 = relayer1;
		this.relayer2 = relayer2;
    this.provider1 = new ethers.WebSocketProvider(node1Url);
    this.provider2 = new ethers.WebSocketProvider(node2Url);
    this.sourceGatewayAddress = sourceGateway;
    this.destGatewayAddress = destGateway;
  }

  async init() {
		console.log(`Initialized ERC7786MockGatewayRelayer`);
		return this;
	}

  listenAndRelay() {

    console.log("🚀 Listening for ERC-7786 MessagePosted events...");

    // Catch the official ERC-7786 standard outbox event
    const gateway1 = IERC7786GatewaySource__factory.connect(this.sourceGatewayAddress, this.provider1)
    gateway1.on(
      gateway1.filters.MessageSent(),
			async (event: any) => {

				// Destructure event payload
				const [sendId, senderBOA,  recipientBOA, payload, value, attributes] = event.args; 

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${sendId}`);
        console.log(`🌍 senderBOA: ${senderBOA}`);
        console.log(`🌍 recipientBOA: ${recipientBOA}`);
        console.log(`🌍 payload: ${payload}`);
        console.log(`🌍 value: ${value}`);
        console.log(`🌍 attributes: ${attributes}`);

				console.log(`Sending to gateway ${this.destGatewayAddress}`);

				try {

					const tx = await IGatewayReceiver__factory
						.connect(this.destGatewayAddress, this.relayer2)
						.executeRelayedMessage(sendId, senderBOA,  recipientBOA, payload, value, attributes);

						

				} catch (error:any) {

					console.error("❌ Failed to relay message:", error);

					const rawHexData = error.data || error.error?.data || error.receipt?.data;
					console.log("ERROR: ", rawHexData)

					if (rawHexData) {
						const errorSelector = rawHexData.slice(0, 10);
						console.log("ERROR: ", errorSelector)
				
						// 3. Match the selector
						/*if (errorSelector === MY_ERROR_SELECTOR) {
							return {
								status: 400,
								body: {
									success: false,
									error: "ONLY_BIND_TO_SINGLETON_CHAIN",
									message: "This operation is restricted to the singleton chain configuration."
								}
							};
						}*/
					}
					
				}
        
				console.log(`✅ ERC-7786 Message delivered to destination node! Tx`);
				//console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);
				
      }
    );

		const gateway2 = IERC7786GatewaySource__factory.connect(this.sourceGatewayAddress, this.provider2)
    gateway2.on(
      gateway2.filters.MessageSent(),
			async (event: any) => {

				// Destructure event payload
				const [sendId, senderBOA,  recipientBOA, payload, value, attributes] = event.args; 

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${sendId}`);
        console.log(`🌍 senderBOA: ${senderBOA}`);
        console.log(`🌍 recipientBOA: ${recipientBOA}`);
        console.log(`🌍 payload: ${payload}`);
        console.log(`🌍 value: ${value}`);
        console.log(`🌍 attributes: ${attributes}`);

				console.log(`Sending to gateway ${this.destGatewayAddress}`);

				try {

					const tx = await IGatewayReceiver__factory
						.connect(this.destGatewayAddress, this.relayer1)
						.executeRelayedMessage(sendId, senderBOA, recipientBOA, payload, value, attributes);

					const tx2 = await IGatewayReceiver__factory
						.connect(this.sourceGatewayAddress, this.relayer1)
						.onRelayerResponse(sendId, senderBOA, payload);

				} catch (error:any) {

					console.error("❌ Failed to relay message:", error);

					const rawHexData = error.data || error.error?.data || error.receipt?.data;
					console.log("ERROR: ", rawHexData)

					if (rawHexData) {
						const errorSelector = rawHexData.slice(0, 10);
						console.log("ERROR: ", errorSelector)
				
						// 3. Match the selector
						/*if (errorSelector === MY_ERROR_SELECTOR) {
							return {
								status: 400,
								body: {
									success: false,
									error: "ONLY_BIND_TO_SINGLETON_CHAIN",
									message: "This operation is restricted to the singleton chain configuration."
								}
							};
						}*/
					}

					const tx = await IGatewayReceiver__factory
						.connect(this.sourceGatewayAddress, this.relayer1)
						.onRelayerResponse(sendId, senderBOA, payload);

				}
        
				console.log(`✅ ERC-7786 Message delivered to destination node! Tx`);
				//console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);
				
      }
    );
	}
}
