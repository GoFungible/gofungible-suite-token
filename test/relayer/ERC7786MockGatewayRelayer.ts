import { ethers, JsonRpcProvider, JsonRpcSigner, toBeHex, WebSocketProvider, zeroPadValue } from "ethers";
import { IERC7786GatewaySource__factory } from "../../typechain-types";

export class ERC7786MockGatewayRelayer {
  private provider1: WebSocketProvider;			// needs WebSocketProvider to listen event continuously. JsonRpcProvider just polls
  private provider2: WebSocketProvider;			// needs WebSocketProvider to listen event continuously. JsonRpcProvider just polls
  private sourceGatewayAddress: string;
  private destGatewayAddress: string;

  constructor(node1Url: string, node2Url: string, sourceGateway: string, destGateway: string) {
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
    const gateway1 = IERC7786GatewaySource__factory.connect(this.sourceGatewayAddress, this.provider1)
    const gateway2 = IERC7786GatewaySource__factory.connect(this.destGatewayAddress, this.provider2)

    console.log("🚀 Listening for ERC-7786 MessagePosted events...");

    // Catch the official ERC-7786 standard outbox event
    gateway1.on(
      gateway1.filters.MessageSent(),
      async (outboxId, destinationChain, receiver, payload, value, attributes) => {

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${outboxId}`);
        console.log(`🌍 Target Chain: ${destinationChain} | Recipient: ${receiver}`);

        /*try {
          
					// Execute on destination gateway
          const tx = await gateway2.sendMessage(destinationChain, payload, attributes);
          const receipt = await tx.wait();
          console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);

        } catch (error) {
          console.error("❌ ERC-7786 Execution failed:", error);
        }*/
				
      }
    );

    gateway2.on(
      gateway2.filters.MessageSent(),
      async (outboxId, destinationChain, receiver, payload, value, attributes) => {

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${outboxId}`);
        console.log(`🌍 Target Chain: ${destinationChain} | Recipient: ${receiver}`);

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
