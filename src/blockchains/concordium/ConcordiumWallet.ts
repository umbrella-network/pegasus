// import {TransactionRequest} from "@ethersproject/providers";
// import {Logger} from "winston";
//
// import {ChainsIds} from '../../types/ChainsIds';
// import {IWallet} from '../../interfaces/IWallet';
// import {ProviderFactory} from "../../factories/ProviderFactory";
// import {ProviderInterface} from "../../interfaces/ProviderInterface";
// import {ExecutedTx} from "../../types/Consensus";
// import logger from '../../lib/logger';
// import {AccountAddress, NextAccountNonce, parseWallet} from "@concordium/node-sdk";
// import {ConcordiumGRPCClient} from "@concordium/common-sdk";
// import {WalletExportFormat} from "@concordium/common-sdk/lib/types";
//
// export class ConcordiumWallet implements IWallet {
//   protected logger!: Logger;
//   protected loggerPrefix!: string;
//   readonly chainId = ChainsIds.CONCORDIUM;
//   readonly provider!: ProviderInterface;
//   address!: string;
//   rawWallet!: WalletExportFormat;
//
//   constructor(privateKeyPem: string) {
//     this.loggerPrefix = '[ConcordiumWallet]';
//     this.logger = logger;
//
//     this.provider = ProviderFactory.create(ChainsIds.CONCORDIUM);
//
//     // const walletFile = fs.readFileSync('cli.flags.walletFile', 'utf8');
//     try {
//       this.rawWallet = parseWallet(privateKeyPem);
//     } catch (e) {
//       throw new Error(`${this.loggerPrefix} invalid key or path to the file: ${e.message}`);
//     }
//
//     this.address = this.rawWallet.value.address;
//   }
//
//   getRawWallet<T>(): T {
//     return this.rawWallet as unknown as T;
//   }
//
//   async getBalance(): Promise<bigint> {
//     return this.provider.getBalance(this.address);
//   }
//
//   async getNextNonce(): Promise<number> {
//     const sender = new AccountAddress(this.address);
//     const nextNonce: NextAccountNonce = await this.provider.getRawProvider<ConcordiumGRPCClient>().getNextAccountNonce(sender);
//
//     if (nextNonce.nonce > 1) {
//       this.logger.error(`${this.loggerPrefix} nonce overflow ${nextNonce.nonce} => ${Number(nextNonce.nonce)}`);
//     }
//
//     return Number(nextNonce.nonce);
//   }
//
//   async sendTransaction(tr: TransactionRequest): Promise<ExecutedTx> {
//     throw Error(`${this.loggerPrefix} sendTransaction(): TODO`);
//   }
// }
