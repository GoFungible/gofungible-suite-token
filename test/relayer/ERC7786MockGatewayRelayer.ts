import { ethers, JsonRpcProvider, JsonRpcSigner, toBeHex, zeroPadValue } from "ethers";
import { IERC7786GatewaySource__factory } from "../../typechain-types";

// Official ERC-7786 ABIs
const gatewaySourceAbi = [
  "event MessagePosted(bytes32 indexed outboxId, string destinationChain, string receiver, bytes payload, bytes attributes)"
];

const gatewayDestAbi = [
  "function executeMessage(bytes32 outboxId, string sourceChain, string sender, address receiver, bytes calldata payload, bytes calldata attributes) external returns (bytes4)"
];

export class ERC7786MockGatewayRelayer {
  private provider1: JsonRpcProvider;
  private provider2: JsonRpcProvider;  
  private sourceGatewayAddress: string;
  private destGatewayAddress: string;

	//private destinationRelayer!: JsonRpcSigner;

  constructor(node1Url: string, node2Url: string, sourceGateway: string, destGateway: string) {
    this.provider1 = new ethers.JsonRpcProvider(node1Url);
    this.provider2 = new ethers.JsonRpcProvider(node2Url);
    this.sourceGatewayAddress = sourceGateway;
    this.destGatewayAddress = destGateway;
  }

  async init() {
    //const accounts2 = await this.provider2.listAccounts();
    //this.destinationRelayer = accounts2[0]; // Funded account on chain 2 to pay gas

		console.log(`Initialized ERC7786MockGatewayRelayer`);
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

        try {
          
					// Execute on destination gateway
          const tx = await gateway2.sendMessage(destinationChain, payload, attributes);
          const receipt = await tx.wait();
          console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);

        } catch (error) {
          console.error("❌ ERC-7786 Execution failed:", error);
        }
				
      }
    );

    gateway2.on(
      gateway2.filters.MessageSent(),
      async (outboxId, destinationChain, receiver, payload, value, attributes) => {

        console.log(`\n📨 Intercepted ERC-7786 message! Id: ${outboxId}`);
        console.log(`🌍 Target Chain: ${destinationChain} | Recipient: ${receiver}`);

        try {
          
					// Execute on destination gateway
          const tx = await gateway1.sendMessage(destinationChain, payload, attributes);
          const receipt = await tx.wait();
          console.log(`✅ ERC-7786 Message delivered to destination node! Tx: ${receipt?.hash}`);

        } catch (error) {
          console.error("❌ ERC-7786 Execution failed:", error);
        }
				
      }
    );
	}
}
