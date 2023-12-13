import * as SDK from "@concordium/web-sdk";

/** The reference of the smart contract module supported by the provided client. */
export const moduleReference: SDK.ModuleReference.Type = /*#__PURE__*/ SDK.ModuleReference.fromHexString('7aa4deb0b74e4c107ecbf8fc2addeb919a139926bc34e4833eebf729cdf4ecd7');
/** Name of the smart contract supported by this client. */
export const contractName: SDK.ContractName.Type = /*#__PURE__*/ SDK.ContractName.fromStringUnchecked('staking_bank');

/** Smart contract client for a contract instance on chain. */
class StakingBankContract {
    /** Having a private field prevents similar structured objects to be considered the same type (similar to nominal typing). */
    private __nominal = true;
    /** The gRPC connection used by this client. */
    public readonly grpcClient: SDK.ConcordiumGRPCClient;
    /** The contract address used by this client. */
    public readonly contractAddress: SDK.ContractAddress.Type;
    /** Generic contract client used internally. */
    public readonly genericContract: SDK.Contract;

    constructor(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type, genericContract: SDK.Contract) {
        this.grpcClient = grpcClient;
        this.contractAddress = contractAddress;
        this.genericContract = genericContract;
    }
}

/** Smart contract client for a contract instance on chain. */
export type Type = StakingBankContract;

/**
 * Construct an instance of `StakingBankContract` for interacting with a 'staking_bank' contract on chain.
 * Checking the information instance on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @param {SDK.BlockHash.Type} [blockHash] - Hash of the block to check the information at. When not provided the last finalized block is used.
 * @throws If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {StakingBankContract}
 */
export async function create(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type, blockHash?: SDK.BlockHash.Type): Promise<StakingBankContract> {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    await genericContract.checkOnChain({ moduleReference: moduleReference, blockHash: blockHash });
    return new StakingBankContract(
        grpcClient,
        contractAddress,
        genericContract
    );
}

/**
 * Construct the `StakingBankContract` for interacting with a 'staking_bank' contract on chain.
 * Without checking the instance information on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @returns {StakingBankContract}
 */
export function createUnchecked(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type): StakingBankContract {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    return new StakingBankContract(
        grpcClient,
        contractAddress,
        genericContract,
    );
}

/**
 * Check if the smart contract instance exists on the blockchain and whether it uses a matching contract name and module reference.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.BlockHash.Type} [blockHash] A optional block hash to use for checking information on chain, if not provided the last finalized will be used.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 */
export function checkOnChain(contractClient: StakingBankContract, blockHash?: SDK.BlockHash.Type): Promise<void> {
    return contractClient.genericContract.checkOnChain({moduleReference: moduleReference, blockHash: blockHash });
}

/** Parameter type for update transaction for 'validators' entrypoint of the 'staking_bank' contract. */
export type ValidatorsParameter = SDK.HexString;

/**
 * Construct Parameter for update transactions for 'validators' entrypoint of the 'staking_bank' contract.
 * @param {ValidatorsParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createValidatorsParameter(parameter: ValidatorsParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('HiAAAAA=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'validators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendValidators(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ValidatorsParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('validators'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createValidatorsParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'validators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunValidators(contractClient: StakingBankContract, parameter: ValidatorsParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('validators'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createValidatorsParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'validators' entrypoint of the 'staking_bank' contract. */
export type ReturnValueValidators = [SDK.HexString, string];

/**
 * Get and parse the return value from dry-running update transaction for 'validators' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueValidators | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueValidators(invokeResult: SDK.InvokeContractResult): ReturnValueValidators | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <[string, string]>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Dx4gAAAAFgI=');
    const pair0: [SDK.HexString, string] = [schemaJson[0], schemaJson[1]];
    return pair0;
}

/** Parameter type for update transaction for 'getPublicKeys' entrypoint of the 'staking_bank' contract. */
export type GetPublicKeysParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'getPublicKeys' entrypoint of the 'staking_bank' contract.
 * @param {GetPublicKeysParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetPublicKeysParameter(parameter: GetPublicKeysParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'getPublicKeys' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetPublicKeysParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetPublicKeys(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetPublicKeysParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getPublicKeys'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetPublicKeysParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getPublicKeys' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetPublicKeysParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetPublicKeys(contractClient: StakingBankContract, parameter: GetPublicKeysParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getPublicKeys'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetPublicKeysParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getPublicKeys' entrypoint of the 'staking_bank' contract. */
export type ReturnValueGetPublicKeys = [SDK.HexString, SDK.HexString];

/**
 * Get and parse the return value from dry-running update transaction for 'getPublicKeys' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetPublicKeys | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetPublicKeys(invokeResult: SDK.InvokeContractResult): ReturnValueGetPublicKeys | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <[string, string]>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'EwIAAAAeIAAAAA==');
    return schemaJson;
}

/** Parameter type for update transaction for 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract. */
export type NUMBEROFVALIDATORSParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract.
 * @param {NUMBEROFVALIDATORSParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createNUMBEROFVALIDATORSParameter(parameter: NUMBEROFVALIDATORSParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {NUMBEROFVALIDATORSParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendNUMBEROFVALIDATORS(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: NUMBEROFVALIDATORSParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('NUMBER_OF_VALIDATORS'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createNUMBEROFVALIDATORSParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {NUMBEROFVALIDATORSParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunNUMBEROFVALIDATORS(contractClient: StakingBankContract, parameter: NUMBEROFVALIDATORSParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('NUMBER_OF_VALIDATORS'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createNUMBEROFVALIDATORSParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract. */
export type ReturnValueNUMBEROFVALIDATORS = number;

/**
 * Get and parse the return value from dry-running update transaction for 'NUMBER_OF_VALIDATORS' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueNUMBEROFVALIDATORS | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueNUMBEROFVALIDATORS(invokeResult: SDK.InvokeContractResult): ReturnValueNUMBEROFVALIDATORS | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'ONE' entrypoint of the 'staking_bank' contract. */
export type ONEParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'ONE' entrypoint of the 'staking_bank' contract.
 * @param {ONEParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createONEParameter(parameter: ONEParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'ONE' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ONEParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendONE(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ONEParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('ONE'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createONEParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'ONE' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ONEParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunONE(contractClient: StakingBankContract, parameter: ONEParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('ONE'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createONEParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'ONE' entrypoint of the 'staking_bank' contract. */
export type ReturnValueONE = number;

/**
 * Get and parse the return value from dry-running update transaction for 'ONE' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueONE | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueONE(invokeResult: SDK.InvokeContractResult): ReturnValueONE | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'verifyValidators' entrypoint of the 'staking_bank' contract. */
export type VerifyValidatorsParameter = Array<SDK.HexString>;

/**
 * Construct Parameter for update transactions for 'verifyValidators' entrypoint of the 'staking_bank' contract.
 * @param {VerifyValidatorsParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createVerifyValidatorsParameter(parameter: VerifyValidatorsParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('EAIeIAAAAA==', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'verifyValidators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {VerifyValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendVerifyValidators(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: VerifyValidatorsParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('verifyValidators'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createVerifyValidatorsParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'verifyValidators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {VerifyValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunVerifyValidators(contractClient: StakingBankContract, parameter: VerifyValidatorsParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('verifyValidators'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createVerifyValidatorsParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'verifyValidators' entrypoint of the 'staking_bank' contract. */
export type ReturnValueVerifyValidators = boolean;

/**
 * Get and parse the return value from dry-running update transaction for 'verifyValidators' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueVerifyValidators | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueVerifyValidators(invokeResult: SDK.InvokeContractResult): ReturnValueVerifyValidators | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <boolean>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'AQ==');
    return schemaJson;
}

/** Parameter type for update transaction for 'getBalances' entrypoint of the 'staking_bank' contract. */
export type GetBalancesParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'getBalances' entrypoint of the 'staking_bank' contract.
 * @param {GetBalancesParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetBalancesParameter(parameter: GetBalancesParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'getBalances' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetBalancesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetBalances(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetBalancesParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getBalances'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetBalancesParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getBalances' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetBalancesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetBalances(contractClient: StakingBankContract, parameter: GetBalancesParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getBalances'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetBalancesParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getBalances' entrypoint of the 'staking_bank' contract. */
export type ReturnValueGetBalances = Array<number>;

/**
 * Get and parse the return value from dry-running update transaction for 'getBalances' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetBalances | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetBalances(invokeResult: SDK.InvokeContractResult): ReturnValueGetBalances | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <Array<number>>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'EAIC');
    return schemaJson;
}

/** Parameter type for update transaction for 'publicKey' entrypoint of the 'staking_bank' contract. */
export type PublicKeyParameter = number;

/**
 * Construct Parameter for update transactions for 'publicKey' entrypoint of the 'staking_bank' contract.
 * @param {PublicKeyParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createPublicKeyParameter(parameter: PublicKeyParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('Ag==', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'publicKey' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {PublicKeyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendPublicKey(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: PublicKeyParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('publicKey'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createPublicKeyParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'publicKey' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {PublicKeyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunPublicKey(contractClient: StakingBankContract, parameter: PublicKeyParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('publicKey'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createPublicKeyParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'publicKey' entrypoint of the 'staking_bank' contract. */
export type ReturnValuePublicKey = SDK.HexString;

/**
 * Get and parse the return value from dry-running update transaction for 'publicKey' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValuePublicKey | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValuePublicKey(invokeResult: SDK.InvokeContractResult): ReturnValuePublicKey | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <string>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'HiAAAAA=');
    return schemaJson;
}

/** Parameter type for update transaction for 'balanceOf' entrypoint of the 'staking_bank' contract. */
export type BalanceOfParameter = SDK.HexString;

/**
 * Construct Parameter for update transactions for 'balanceOf' entrypoint of the 'staking_bank' contract.
 * @param {BalanceOfParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createBalanceOfParameter(parameter: BalanceOfParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('HiAAAAA=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'balanceOf' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {BalanceOfParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendBalanceOf(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: BalanceOfParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('balanceOf'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createBalanceOfParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'balanceOf' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {BalanceOfParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunBalanceOf(contractClient: StakingBankContract, parameter: BalanceOfParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('balanceOf'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createBalanceOfParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'balanceOf' entrypoint of the 'staking_bank' contract. */
export type ReturnValueBalanceOf = number;

/**
 * Get and parse the return value from dry-running update transaction for 'balanceOf' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueBalanceOf | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueBalanceOf(invokeResult: SDK.InvokeContractResult): ReturnValueBalanceOf | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'getName' entrypoint of the 'staking_bank' contract. */
export type GetNameParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'getName' entrypoint of the 'staking_bank' contract.
 * @param {GetNameParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetNameParameter(parameter: GetNameParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'getName' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetNameParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetName(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetNameParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getName'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetNameParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getName' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetNameParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetName(contractClient: StakingBankContract, parameter: GetNameParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getName'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetNameParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getName' entrypoint of the 'staking_bank' contract. */
export type ReturnValueGetName = string;

/**
 * Get and parse the return value from dry-running update transaction for 'getName' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetName | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetName(invokeResult: SDK.InvokeContractResult): ReturnValueGetName | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <string>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FgI=');
    return schemaJson;
}

/** Parameter type for update transaction for 'upgradeNatively' entrypoint of the 'staking_bank' contract. */
export type UpgradeNativelyParameter = {
    module: SDK.HexString,
    migrate: { type: 'None'} | { type: 'Some', content: [string, SDK.HexString] },
    };

/**
 * Construct Parameter for update transactions for 'upgradeNatively' entrypoint of the 'staking_bank' contract.
 * @param {UpgradeNativelyParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createUpgradeNativelyParameter(parameter: UpgradeNativelyParameter): SDK.Parameter.Type {
    const field8 = parameter.module;
    const field9 = parameter.migrate;
    let match10: {'None' : [] } | {'Some' : [[string, string]] };
    switch (field9.type) {
        case 'None':
            match10 = { None: [], };
        break;
        case 'Some':
    const pair11: [string, string] = [field9.content[0], field9.content[1]];
            match10 = { Some: [pair11], };
        break;
    }
    const named7 = {
    module: field8,
    migrate: match10,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAACAAAABgAAAG1vZHVsZR4gAAAABwAAAG1pZ3JhdGUVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAPFgEdAQ==', named7);
    return out;
}

/**
 * Send an update-contract transaction to the 'upgradeNatively' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {UpgradeNativelyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendUpgradeNatively(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UpgradeNativelyParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('upgradeNatively'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createUpgradeNativelyParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'upgradeNatively' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {UpgradeNativelyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunUpgradeNatively(contractClient: StakingBankContract, parameter: UpgradeNativelyParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('upgradeNatively'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createUpgradeNativelyParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'upgradeNatively' entrypoint of the 'staking_bank' contract. */
export type ErrorMessageUpgradeNatively = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'NotValidator'};

/**
 * Get and parse the error message from dry-running update transaction for 'upgradeNatively' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageUpgradeNatively | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageUpgradeNatively(invokeResult: SDK.InvokeContractResult): ErrorMessageUpgradeNatively | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'InvokeContractError' : [] } | {'NotValidator' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQUAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgIMAAAATm90VmFsaWRhdG9yAg==');
    let match12: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'NotValidator'};
    if ('ParseParams' in schemaJson) {
       match12 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match12 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match12 = {
           type: 'LogMalformed',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match12 = {
           type: 'InvokeContractError',
       };
    } else if ('NotValidator' in schemaJson) {
       match12 = {
           type: 'NotValidator',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match12
}

/** Parameter type for update transaction for 'unregister' entrypoint of the 'staking_bank' contract. */
export type UnregisterParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'unregister' entrypoint of the 'staking_bank' contract.
 * @param {UnregisterParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createUnregisterParameter(parameter: UnregisterParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'unregister' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {UnregisterParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendUnregister(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UnregisterParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('unregister'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createUnregisterParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'unregister' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {UnregisterParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunUnregister(contractClient: StakingBankContract, parameter: UnregisterParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('unregister'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createUnregisterParameter(parameter),
        blockHash
    );
}

/** Parameter type for update transaction for 'balances' entrypoint of the 'staking_bank' contract. */
export type BalancesParameter = SDK.HexString;

/**
 * Construct Parameter for update transactions for 'balances' entrypoint of the 'staking_bank' contract.
 * @param {BalancesParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createBalancesParameter(parameter: BalancesParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('HiAAAAA=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'balances' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {BalancesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendBalances(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: BalancesParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('balances'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createBalancesParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'balances' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {BalancesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunBalances(contractClient: StakingBankContract, parameter: BalancesParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('balances'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createBalancesParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'balances' entrypoint of the 'staking_bank' contract. */
export type ReturnValueBalances = number;

/**
 * Get and parse the return value from dry-running update transaction for 'balances' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueBalances | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueBalances(invokeResult: SDK.InvokeContractResult): ReturnValueBalances | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract. */
export type TOTALSUPPLYParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract.
 * @param {TOTALSUPPLYParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createTOTALSUPPLYParameter(parameter: TOTALSUPPLYParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {TOTALSUPPLYParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendTOTALSUPPLY(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: TOTALSUPPLYParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('TOTAL_SUPPLY'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createTOTALSUPPLYParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {TOTALSUPPLYParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunTOTALSUPPLY(contractClient: StakingBankContract, parameter: TOTALSUPPLYParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('TOTAL_SUPPLY'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createTOTALSUPPLYParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract. */
export type ReturnValueTOTALSUPPLY = number;

/**
 * Get and parse the return value from dry-running update transaction for 'TOTAL_SUPPLY' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueTOTALSUPPLY | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueTOTALSUPPLY(invokeResult: SDK.InvokeContractResult): ReturnValueTOTALSUPPLY | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'getNumberOfValidators' entrypoint of the 'staking_bank' contract. */
export type GetNumberOfValidatorsParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'getNumberOfValidators' entrypoint of the 'staking_bank' contract.
 * @param {GetNumberOfValidatorsParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetNumberOfValidatorsParameter(parameter: GetNumberOfValidatorsParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'getNumberOfValidators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetNumberOfValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetNumberOfValidators(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetNumberOfValidatorsParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getNumberOfValidators'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetNumberOfValidatorsParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getNumberOfValidators' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetNumberOfValidatorsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetNumberOfValidators(contractClient: StakingBankContract, parameter: GetNumberOfValidatorsParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getNumberOfValidators'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetNumberOfValidatorsParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getNumberOfValidators' entrypoint of the 'staking_bank' contract. */
export type ReturnValueGetNumberOfValidators = number;

/**
 * Get and parse the return value from dry-running update transaction for 'getNumberOfValidators' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetNumberOfValidators | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetNumberOfValidators(invokeResult: SDK.InvokeContractResult): ReturnValueGetNumberOfValidators | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'totalSupply' entrypoint of the 'staking_bank' contract. */
export type TotalSupplyParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'totalSupply' entrypoint of the 'staking_bank' contract.
 * @param {TotalSupplyParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createTotalSupplyParameter(parameter: TotalSupplyParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'totalSupply' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {TotalSupplyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendTotalSupply(contractClient: StakingBankContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: TotalSupplyParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('totalSupply'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createTotalSupplyParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'totalSupply' entrypoint of the 'staking_bank' contract.
 * @param {StakingBankContract} contractClient The client for a 'staking_bank' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {TotalSupplyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunTotalSupply(contractClient: StakingBankContract, parameter: TotalSupplyParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('totalSupply'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createTotalSupplyParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'totalSupply' entrypoint of the 'staking_bank' contract. */
export type ReturnValueTotalSupply = number;

/**
 * Get and parse the return value from dry-running update transaction for 'totalSupply' entrypoint of the 'staking_bank' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueTotalSupply | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueTotalSupply(invokeResult: SDK.InvokeContractResult): ReturnValueTotalSupply | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}
