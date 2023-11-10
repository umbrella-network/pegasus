import {BlockchainType} from './Settings.js';

export type NumberOfSignatures = Record<BlockchainType, number>;
export type NumberOfSignaturesPerChain = Record<string, NumberOfSignatures>;
