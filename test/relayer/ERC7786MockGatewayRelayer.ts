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
				const [sendId, sender,  recipient, payload, value, attributes] = event.args; 

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${sendId}`);
        console.log(`🌍 sender: ${sender}`);
        console.log(`🌍 Recipient: ${recipient}`);
        console.log(`🌍 payload: ${payload}`);
        console.log(`🌍 value: ${value}`);
        console.log(`🌍 attributes: ${attributes}`);

				console.log(`Sending to gateway ${this.destGatewayAddress}`);

				try {

					const tx = await IGatewayReceiver__factory
						.connect(this.destGatewayAddress, this.relayer2)
						.executeRelayedMessage(sendId, sender,  recipient, payload, value, attributes);

				} catch (error) {
					console.error("❌ Failed to relay message:", error);
				}
        
				console.log(`✅ ERC-7786 Message delivered to destination node! Tx`);
				//console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);
				
      }
    );

		const gateway2 = IERC7786GatewaySource__factory.connect(this.destGatewayAddress, this.provider2)
    gateway2.on(
      gateway2.filters.MessageSent(),
			async (event: any) => {

        console.log(`\n📨 Intercepted ERC-7786 message! Id`);
        /*try {
          
					// Execute on destination gateway
          const tx = await gateway1.sendMessage(destinationChain, payload, attributes);
          const receipt = await tx.wait();
          console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);

        } catch (error) {
          console.error("❌ ERC-7786 Execution failed:", error);
        }*/
				
      }
    );
	}
}
