import {ChainsIds} from "../../../types/ChainsIds";

export interface DeviationSignerInterface {
  apply(chainId: ChainsIds, dataHash: string): Promise<string>;
}
