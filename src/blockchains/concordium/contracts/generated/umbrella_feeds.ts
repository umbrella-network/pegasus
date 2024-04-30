import * as SDK from "@concordium/web-sdk";

/** The reference of the smart contract module supported by the provided client. */
export const moduleReference: SDK.ModuleReference.Type = /*#__PURE__*/ SDK.ModuleReference.fromHexString('efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b');

/** Client for an on-chain smart contract module with module reference 'efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b', can be used for instantiating new smart contract instances. */
class UmbrellaFeedsModule {
    /** Having a private field prevents similar structured objects to be considered the same type (similar to nominal typing). */
    private __nominal = true;
    /** Generic module client used internally. */
    public readonly internalModuleClient: SDK.ModuleClient.Type;

    /** Constructor is only ment to be used internally in this module. Use functions such as `create` or `createUnchecked` for construction. */
    constructor(internalModuleClient: SDK.ModuleClient.Type) {
        this.internalModuleClient = internalModuleClient;
    }
}

/** Client for an on-chain smart contract module with module reference 'efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b', can be used for instantiating new smart contract instances. */
export type Type = UmbrellaFeedsModule;

/**
 * Construct a UmbrellaFeedsModule client for interacting with a smart contract module on chain.
 * This function ensures the smart contract module is deployed on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The concordium node client to use.
 * @throws If failing to communicate with the concordium node or if the module reference is not present on chain.
 * @returns {UmbrellaFeedsModule} A module client ensured to be deployed on chain.
 */
export async function create(grpcClient: SDK.ConcordiumGRPCClient): Promise<UmbrellaFeedsModule> {
    const moduleClient = await SDK.ModuleClient.create(grpcClient, moduleReference);
    return new UmbrellaFeedsModule(moduleClient);
}

/**
 * Construct a UmbrellaFeedsModule client for interacting with a smart contract module on chain.
 * It is up to the caller to ensure the module is deployed on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The concordium node client to use.
 * @returns {UmbrellaFeedsModule}
 */
export function createUnchecked(grpcClient: SDK.ConcordiumGRPCClient): UmbrellaFeedsModule {
    const moduleClient = SDK.ModuleClient.createUnchecked(grpcClient, moduleReference);
    return new UmbrellaFeedsModule(moduleClient);
}

/**
 * Construct a UmbrellaFeedsModule client for interacting with a smart contract module on chain.
 * This function ensures the smart contract module is deployed on chain.
 * @param {UmbrellaFeedsModule} moduleClient - The client of the on-chain smart contract module with referecence 'efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b'.
 * @throws If failing to communicate with the concordium node or if the module reference is not present on chain.
 * @returns {UmbrellaFeedsModule} A module client ensured to be deployed on chain.
 */
export function checkOnChain(moduleClient: UmbrellaFeedsModule): Promise<void> {
    return SDK.ModuleClient.checkOnChain(moduleClient.internalModuleClient);
}

/**
 * Get the module source of the deployed smart contract module.
 * @param {UmbrellaFeedsModule} moduleClient - The client of the on-chain smart contract module with referecence 'efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b'.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or module not found.
 * @returns {SDK.VersionedModuleSource} Module source of the deployed smart contract module.
 */
export function getModuleSource(moduleClient: UmbrellaFeedsModule): Promise<SDK.VersionedModuleSource> {
    return SDK.ModuleClient.getModuleSource(moduleClient.internalModuleClient);
}

/** Parameter type transaction for instantiating a new 'umbrella_feeds' smart contract instance */
export type UmbrellaFeedsParameter = {
    registry: SDK.ContractAddress.Type,
    required_signatures: number,
    staking_bank: SDK.ContractAddress.Type,
    decimals: number,
    };

/**
 * Construct Parameter type transaction for instantiating a new 'umbrella_feeds' smart contract instance.
 * @param {UmbrellaFeedsParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createUmbrellaFeedsParameter(parameter: UmbrellaFeedsParameter): SDK.Parameter.Type {
    const field1 = parameter.registry;
    const contractAddress2 = SDK.ContractAddress.toSchemaValue(field1);
    const field3 = parameter.required_signatures;
    const field4 = parameter.staking_bank;
    const contractAddress5 = SDK.ContractAddress.toSchemaValue(field4);
    const field6 = parameter.decimals;
    const named0 = {
    registry: contractAddress2,
    required_signatures: field3,
    staking_bank: contractAddress5,
    decimals: field6,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAAEAAAACAAAAHJlZ2lzdHJ5DBMAAAByZXF1aXJlZF9zaWduYXR1cmVzAwwAAABzdGFraW5nX2JhbmsMCAAAAGRlY2ltYWxzAg==', named0);
    return out
}

/**
 * Send transaction for instantiating a new 'umbrella_feeds' smart contract instance.
 * @param {UmbrellaFeedsModule} moduleClient - The client of the on-chain smart contract module with referecence 'efc4ea2b19330518131b67b0b66ac6f628438bfd740d694fcf64a13412bf327b'.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract module.
 * @param {UmbrellaFeedsParameter} parameter - Parameter to provide as part of the transaction for the instantiation of a new smart contract contract.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If failing to communicate with the concordium node.
 * @returns {SDK.TransactionHash.Type}
 */
export function instantiateUmbrellaFeeds(moduleClient: UmbrellaFeedsModule, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UmbrellaFeedsParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return SDK.ModuleClient.createAndSendInitTransaction(
        moduleClient.internalModuleClient,
        SDK.ContractName.fromStringUnchecked('umbrella_feeds'),
        transactionMetadata,
        createUmbrellaFeedsParameter(parameter),
        signer
    );
}
