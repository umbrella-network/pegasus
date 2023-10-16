// import {AccountAddress, AccountInfo, BlockInfo, createConcordiumClient} from "@concordium/node-sdk";
// import {ConcordiumGRPCClient} from "@concordium/common-sdk";
// import {credentials} from "@grpc/grpc-js";
//
// import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
// import {Logger} from "winston";
//
// import {ProviderInterface} from '../../interfaces/ProviderInterface';
// import {ChainsIds} from '../../types/ChainsIds';
// import {NetworkStatus} from '../../types/Network';
// import Settings from "../../types/Settings";
// import logger from '../../lib/logger';
// import settings from "../../config/settings";
//
// // https://github.com/Concordium/concordium-node-sdk-js/tree/main/examples/client
// export class ConcordiumProvider implements ProviderInterface {
//   protected logger!: Logger;
//   protected loggerPrefix!: string;
//   protected settings!: Settings;
//   protected readonly chainId = ChainsIds.CONCORDIUM;
//   protected provider: ConcordiumGRPCClient | undefined;
//   protected readonly providerUrl!: string;
//   protected readonly timeout = 5000;
//
//   constructor(providerUrl: string) {
//     this.logger = logger;
//     this.loggerPrefix = '[ConcordiumProvider]';
//     this.settings = settings;
//     this.providerUrl = providerUrl;
//
//     const [address, port] = providerUrl.split(':');
//
//     this.provider = createConcordiumClient(
//       address,
//       parseInt(port, 10),
//       credentials.createInsecure()
//     );
//   }
//
//   getRawProvider<T>(): T {
//     return (this.provider) as unknown as T;
//   }
//
//   async getBlockNumber(): Promise<bigint> {
//     if (!this.provider) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);
//
//     const blockInfo: BlockInfo = await this.provider.getBlockInfo();
//     return blockInfo.blockHeight;
//   }
//
//   async getBlockTimestamp(): Promise<number> {
//     if (!this.provider) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);
//
//     const blockInfo: BlockInfo = await this.provider.getBlockInfo();
//     // console.dir(blockInfo, { depth: null, colors: true });
//     return Math.trunc(new Date(blockInfo.blockSlotTime).getTime() / 1000);
//   }
//
//   async getBalance(address: string): Promise<bigint> {
//     if (!this.provider) throw Error(`${this.loggerPrefix} getBalance(): provider not set`);
//
//     const accountAddress = new AccountAddress(address);
//     const accountInfo: AccountInfo = await this.provider.getAccountInfo(accountAddress);
//
//     return accountInfo.accountAmount;
//   }
//
//   async getNetwork(): Promise<NetworkStatus> {
//     if (!this.provider) throw new Error(`${this.loggerPrefix} getNetwork(): no provider`);
//
//     return {name: ChainsIds.CONCORDIUM, id: 0};
//   }
//
//   async getTransactionCount(address: string): Promise<number> {
//     throw Error(`${this.loggerPrefix} getTransactionCount(): use Wallet`);
//   }
//
//   async waitForTx(txHash: string, timeoutMs: number): Promise<boolean> {
//     if (!this.provider) throw new Error(`${this.loggerPrefix} waitForTx: provider not set`);
//
//     throw Error(`${this.loggerPrefix} waitForTx(): TODO`);
//   }
//
//   async waitUntilNextBlock(currentBlockNumber: bigint): Promise<bigint> {
//     throw Error(`${this.loggerPrefix} waitUntilNextBlock(): TODO`);
//   }
//
//   async call(transaction: { to: string; data: string }): Promise<string> {
//     // this is only needed for new chain architecture detection
//     // once we create new chain for solana, we will need to implement this method
//     throw new Error(`${this.loggerPrefix} .call not supported yet`);
//   }
//
//   async gasEstimation(minGasPrice: number, maxGasPrice: number): Promise<GasEstimation> {
//     console.log(`Provider TODO gasEstimation`);
//
//     return {
//       baseFeePerGas: 0,
//       gasPrice: 0,
//       maxPriorityFeePerGas: 0,
//       maxFeePerGas: 0,
//       isTxType2: true,
//       min: minGasPrice,
//       max: maxGasPrice,
//       avg: 1
//     }
//   }
//
//   isNonceError(): boolean {
//     return false;
//   }
//
//   getBlock(): Promise<void> {
//     throw new Error(`${this.loggerPrefix} getBlock(): not supported`)
//   }
// }
