import { ethers, JsonRpcSigner, WebSocketProvider } from "ethers";
import { IERC7786GatewaySource__factory, IGatewayReceiver__factory } from "../../typechain-types";
import { universalInterface } from "../_testhelper";

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

  async listenAndRelay() {

		// relay from source to destination
		await this.relay(
			this.relayer1, this.provider1, this.sourceGatewayAddress,
			this.relayer2, this.provider2, this.destGatewayAddress
		);

		// relay from destination to source
		await this.relay(
			this.relayer2, this.provider2, this.destGatewayAddress,
			this.relayer1, this.provider1, this.sourceGatewayAddress
		);

    console.log("🚀 Listening for ERC-7786 MessagePosted events...");

	}

	private async relay(
		sourceRelayer: JsonRpcSigner, sourceProvider: WebSocketProvider, sourceGatewayAddress: string, 
		destRelayer: JsonRpcSigner, destProvider: WebSocketProvider, destGatewayAddress: string
	) {

    // Catch the official ERC-7786 standard outbox event
    const sourceGateway = IERC7786GatewaySource__factory.connect(sourceGatewayAddress, sourceProvider)
    sourceGateway.on(
      sourceGateway.filters.MessageSent(),
			async (event: any) => {

				// ************************************************************************************************
				// ************** Event request from source gateway sent to destination gateway *******************
				// ************************************************************************************************
				// Destructure event payload
				const [sendId, senderBOA,  recipientBOA, payload, value, attributes] = event.args; 

				console.log(`\n📨 Intercepted ERC-7786 message by relayer! Id: ${sendId}`);
        /*
        console.log(`🌍 senderBOA: ${senderBOA}`);
        console.log(`🌍 recipientBOA: ${recipientBOA}`);
        console.log(`🌍 payload: ${payload}`);
        console.log(`🌍 value: ${value}`);
        console.log(`🌍 attributes: ${attributes}`);*/

				console.log(`\n📨 Sending message ${sendId} to Destination Gateway ${destGatewayAddress}`);

				try {

					const tx1 = await IGatewayReceiver__factory
						.connect(destGatewayAddress, destRelayer)
						.sendRelayerMessageToToken(sendId, senderBOA,  recipientBOA, payload, value, attributes);

					console.log(`✅ ERC-7786 Message: SUCESSFULL operation on destination gateway. Hash: ${tx1?.hash}`);

					// ************************************************************************************************
					// ***************** Sending sucessfull operation callback notification to source *****************
					// ************************************************************************************************			
					// case of sucessfull call
					const tx2 = await IGatewayReceiver__factory
						.connect(sourceGatewayAddress, sourceRelayer)
						.onRelayerCallback(sendId, senderBOA, "0x00000000");

					console.log(`✅ ERC-7786 Message: SUCESSFULL callback sent to source gateway. Hash: ${tx2?.hash}`);
				} 

				// ************************************************************************************************
				// ********************* Sending failed operation callback notification to source *****************
				// ************************************************************************************************
				// When a standard require(condition, "Error message") fails, the EVM executes a REVERT operation. 
				// It outputs a byte string formatted exactly like a function call to a built-in error named Error(string).
				// The raw returned hex data always looks like this: 0x08c379a00000000000000000...[encoded string data]
				// - The first 4 bytes: This is the error selector for Error(string). 0x08c379a0
				//		- Standard require(cond, "Oops"): The generic error selector 0x08c379a0 followed by the string "Oops".
				//		- Custom revert MyCustomError(uint256 id): Uses a unique 4-byte selector derived from the hash of 
				//				MyCustomError(uint256), followed by the encoded id parameter.
				// - The remaining bytes. This is the ABI-encoded error message. Hex representation of "Error message"
				catch (error:any) {

					console.error("❌ Destination gateway notifies FAILED to execute message:", error);

					const rawHexData = error.data || error.error?.data || error.receipt?.data;
					console.error("❌ Error receipt:", rawHexData);
					const errorSelector: string = rawHexData.slice(0, 10);
					console.error("❌ Error selector:", errorSelector);

					const decoded = universalInterface.parseError(rawHexData);
				  console.error(`❌ Reverted with Name: ${decoded?.name}`);
				  console.error(`❌ Reverted with Selector: ${decoded?.selector}`);
				  console.error(`❌ Reverted with Signature: ${decoded?.signature}`);
				  console.error(`❌ Reverted with Fragment: ${decoded?.fragment}`);
					console.error(decoded?.fragment);

					console.error(`❌ ERC-7786 Message: Sending FAILED callback to source gateway.`);

					const tx = await IGatewayReceiver__factory
						.connect(sourceGatewayAddress, sourceRelayer)
						.onRelayerCallback(sendId, senderBOA, errorSelector);

					console.error(`❌ ERC-7786 Message: FAILED callback sent to source gateway. Hash: ${tx?.hash}`);

				}
				
      }
    );

	}

}
