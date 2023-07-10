import {BlockchainType} from './Settings';

export type NumberOfSignatures = Record<BlockchainType, number>;
export type NumberOfSignaturesPerChain = Record<string, NumberOfSignatures>;
