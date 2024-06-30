import * as SDK from "@concordium/web-sdk";

/** The reference of the smart contract module supported by the provided client. */
export const moduleReference: SDK.ModuleReference.Type = /*#__PURE__*/ SDK.ModuleReference.fromHexString('5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b');

/** Client for an on-chain smart contract module with module reference '5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b', can be used for instantiating new smart contract instances. */
class StakingBankModule {
    /** Having a private field prevents similar structured objects to be considered the same type (similar to nominal typing). */
    private __nominal = true;
    /** Generic module client used internally. */
    public readonly internalModuleClient: SDK.ModuleClient.Type;

    /** Constructor is only ment to be used internally in this module. Use functions such as `create` or `createUnchecked` for construction. */
    constructor(internalModuleClient: SDK.ModuleClient.Type) {
        this.internalModuleClient = internalModuleClient;
    }
}

/** Client for an on-chain smart contract module with module reference '5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b', can be used for instantiating new smart contract instances. */
export type Type = StakingBankModule;

/**
 * Construct a StakingBankModule client for interacting with a smart contract module on chain.
 * This function ensures the smart contract module is deployed on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The concordium node client to use.
 * @throws If failing to communicate with the concordium node or if the module reference is not present on chain.
 * @returns {StakingBankModule} A module client ensured to be deployed on chain.
 */
export async function create(grpcClient: SDK.ConcordiumGRPCClient): Promise<StakingBankModule> {
    const moduleClient = await SDK.ModuleClient.create(grpcClient, moduleReference);
    return new StakingBankModule(moduleClient);
}

/**
 * Construct a StakingBankModule client for interacting with a smart contract module on chain.
 * It is up to the caller to ensure the module is deployed on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The concordium node client to use.
 * @returns {StakingBankModule}
 */
export function createUnchecked(grpcClient: SDK.ConcordiumGRPCClient): StakingBankModule {
    const moduleClient = SDK.ModuleClient.createUnchecked(grpcClient, moduleReference);
    return new StakingBankModule(moduleClient);
}

/**
 * Construct a StakingBankModule client for interacting with a smart contract module on chain.
 * This function ensures the smart contract module is deployed on chain.
 * @param {StakingBankModule} moduleClient - The client of the on-chain smart contract module with referecence '5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b'.
 * @throws If failing to communicate with the concordium node or if the module reference is not present on chain.
 * @returns {StakingBankModule} A module client ensured to be deployed on chain.
 */
export function checkOnChain(moduleClient: StakingBankModule): Promise<void> {
    return SDK.ModuleClient.checkOnChain(moduleClient.internalModuleClient);
}

/**
 * Get the module source of the deployed smart contract module.
 * @param {StakingBankModule} moduleClient - The client of the on-chain smart contract module with referecence '5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b'.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or module not found.
 * @returns {SDK.VersionedModuleSource} Module source of the deployed smart contract module.
 */
export function getModuleSource(moduleClient: StakingBankModule): Promise<SDK.VersionedModuleSource> {
    return SDK.ModuleClient.getModuleSource(moduleClient.internalModuleClient);
}

/** Parameter type transaction for instantiating a new 'staking_bank' smart contract instance */
export type StakingBankParameter = SDK.Parameter.Type;

/**
 * Construct Parameter type transaction for instantiating a new 'staking_bank' smart contract instance.
 * @param {StakingBankParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createStakingBankParameter(parameter: StakingBankParameter): SDK.Parameter.Type {
    return parameter
}

/**
 * Send transaction for instantiating a new 'staking_bank' smart contract instance.
 * @param {StakingBankModule} moduleClient - The client of the on-chain smart contract module with referecence '5bd5b03d59b91ae3595289c84635fa6a6e3784c5874650785eda2a573a1a7a0b'.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract module.
 * @param {StakingBankParameter} parameter - Parameter to provide as part of the transaction for the instantiation of a new smart contract contract.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If failing to communicate with the concordium node.
 * @returns {SDK.TransactionHash.Type}
 */
export function instantiateStakingBank(moduleClient: StakingBankModule, transactionMetadata: SDK.ContractTransactionMetadata, parameter: StakingBankParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return SDK.ModuleClient.createAndSendInitTransaction(
        moduleClient.internalModuleClient,
        SDK.ContractName.fromStringUnchecked('staking_bank'),
        transactionMetadata,
        createStakingBankParameter(parameter),
        signer
    );
}
