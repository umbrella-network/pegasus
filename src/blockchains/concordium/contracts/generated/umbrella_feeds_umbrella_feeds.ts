import * as SDK from "@concordium/web-sdk";

/** The reference of the smart contract module supported by the provided client. */
export const moduleReference: SDK.ModuleReference.Type = /*#__PURE__*/ SDK.ModuleReference.fromHexString('4b84fa711b2567af05b58a555ec7e52ecce043e8f8f8e98f9da6a4919fa304d2');
/** Name of the smart contract supported by this client. */
export const contractName: SDK.ContractName.Type = /*#__PURE__*/ SDK.ContractName.fromStringUnchecked('umbrella_feeds');

/** Smart contract client for a contract instance on chain. */
class UmbrellaFeedsContract {
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
export type Type = UmbrellaFeedsContract;

/**
 * Construct an instance of `UmbrellaFeedsContract` for interacting with a 'umbrella_feeds' contract on chain.
 * Checking the information instance on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @param {SDK.BlockHash.Type} [blockHash] - Hash of the block to check the information at. When not provided the last finalized block is used.
 * @throws If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {UmbrellaFeedsContract}
 */
export async function create(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type, blockHash?: SDK.BlockHash.Type): Promise<UmbrellaFeedsContract> {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    await genericContract.checkOnChain({ moduleReference: moduleReference, blockHash: blockHash });
    return new UmbrellaFeedsContract(
        grpcClient,
        contractAddress,
        genericContract
    );
}

/**
 * Construct the `UmbrellaFeedsContract` for interacting with a 'umbrella_feeds' contract on chain.
 * Without checking the instance information on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @returns {UmbrellaFeedsContract}
 */
export function createUnchecked(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type): UmbrellaFeedsContract {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    return new UmbrellaFeedsContract(
        grpcClient,
        contractAddress,
        genericContract,
    );
}

/**
 * Check if the smart contract instance exists on the blockchain and whether it uses a matching contract name and module reference.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.BlockHash.Type} [blockHash] A optional block hash to use for checking information on chain, if not provided the last finalized will be used.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 */
export function checkOnChain(contractClient: UmbrellaFeedsContract, blockHash?: SDK.BlockHash.Type): Promise<void> {
    return contractClient.genericContract.checkOnChain({moduleReference: moduleReference, blockHash: blockHash });
}

/** Parameter type for update transaction for 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract. */
export type UpgradeNativelyParameter = {
    module: SDK.HexString,
    migrate: { type: 'None'} | { type: 'Some', content: [string, SDK.HexString] },
    };

/**
 * Construct Parameter for update transactions for 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract.
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
 * Send an update-contract transaction to the 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {UpgradeNativelyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendUpgradeNatively(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UpgradeNativelyParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('upgradeNatively'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createUpgradeNativelyParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {UpgradeNativelyParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunUpgradeNatively(contractClient: UmbrellaFeedsContract, parameter: UpgradeNativelyParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('upgradeNatively'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createUpgradeNativelyParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract. */
export type ErrorMessageUpgradeNatively = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};

/**
 * Get and parse the error message from dry-running update transaction for 'upgradeNatively' entrypoint of the 'umbrella_feeds' contract.
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
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'InvokeContractError' : [] } | {'InvalidRequiredSignatures' : [] } | {'OldData' : [] } | {'WrongContract' : [] } | {'Expired' : [] } | {'FeedNotExist' : [] } | {'Unauthorized' : [] } | {'FailedUpgradeMissingModule' : [] } | {'FailedUpgradeMissingContract' : [] } | {'FailedUpgradeUnsupportedModuleVersion' : [] } | {'MalformedData' : [] } | {'WrongSignature' : [] } | {'MissingAccount' : [] } | {'NotEnoughSignatures' : [] } | {'SignaturesOutOfOrder' : [] } | {'InvalidSigner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FRMAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgIZAAAASW52YWxpZFJlcXVpcmVkU2lnbmF0dXJlcwIHAAAAT2xkRGF0YQINAAAAV3JvbmdDb250cmFjdAIHAAAARXhwaXJlZAIMAAAARmVlZE5vdEV4aXN0AgwAAABVbmF1dGhvcml6ZWQCGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAg0AAABNYWxmb3JtZWREYXRhAg4AAABXcm9uZ1NpZ25hdHVyZQIOAAAATWlzc2luZ0FjY291bnQCEwAAAE5vdEVub3VnaFNpZ25hdHVyZXMCFAAAAFNpZ25hdHVyZXNPdXRPZk9yZGVyAg0AAABJbnZhbGlkU2lnbmVyAg==');
    let match12: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};
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
    } else if ('InvalidRequiredSignatures' in schemaJson) {
       match12 = {
           type: 'InvalidRequiredSignatures',
       };
    } else if ('OldData' in schemaJson) {
       match12 = {
           type: 'OldData',
       };
    } else if ('WrongContract' in schemaJson) {
       match12 = {
           type: 'WrongContract',
       };
    } else if ('Expired' in schemaJson) {
       match12 = {
           type: 'Expired',
       };
    } else if ('FeedNotExist' in schemaJson) {
       match12 = {
           type: 'FeedNotExist',
       };
    } else if ('Unauthorized' in schemaJson) {
       match12 = {
           type: 'Unauthorized',
       };
    } else if ('FailedUpgradeMissingModule' in schemaJson) {
       match12 = {
           type: 'FailedUpgradeMissingModule',
       };
    } else if ('FailedUpgradeMissingContract' in schemaJson) {
       match12 = {
           type: 'FailedUpgradeMissingContract',
       };
    } else if ('FailedUpgradeUnsupportedModuleVersion' in schemaJson) {
       match12 = {
           type: 'FailedUpgradeUnsupportedModuleVersion',
       };
    } else if ('MalformedData' in schemaJson) {
       match12 = {
           type: 'MalformedData',
       };
    } else if ('WrongSignature' in schemaJson) {
       match12 = {
           type: 'WrongSignature',
       };
    } else if ('MissingAccount' in schemaJson) {
       match12 = {
           type: 'MissingAccount',
       };
    } else if ('NotEnoughSignatures' in schemaJson) {
       match12 = {
           type: 'NotEnoughSignatures',
       };
    } else if ('SignaturesOutOfOrder' in schemaJson) {
       match12 = {
           type: 'SignaturesOutOfOrder',
       };
    } else if ('InvalidSigner' in schemaJson) {
       match12 = {
           type: 'InvalidSigner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match12
}

/** Parameter type for update transaction for 'migration' entrypoint of the 'umbrella_feeds' contract. */
export type MigrationParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'migration' entrypoint of the 'umbrella_feeds' contract.
 * @param {MigrationParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createMigrationParameter(parameter: MigrationParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'migration' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {MigrationParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendMigration(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: MigrationParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('migration'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createMigrationParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'migration' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {MigrationParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunMigration(contractClient: UmbrellaFeedsContract, parameter: MigrationParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('migration'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createMigrationParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'migration' entrypoint of the 'umbrella_feeds' contract. */
export type ErrorMessageMigration = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};

/**
 * Get and parse the error message from dry-running update transaction for 'migration' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageMigration | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageMigration(invokeResult: SDK.InvokeContractResult): ErrorMessageMigration | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'InvokeContractError' : [] } | {'InvalidRequiredSignatures' : [] } | {'OldData' : [] } | {'WrongContract' : [] } | {'Expired' : [] } | {'FeedNotExist' : [] } | {'Unauthorized' : [] } | {'FailedUpgradeMissingModule' : [] } | {'FailedUpgradeMissingContract' : [] } | {'FailedUpgradeUnsupportedModuleVersion' : [] } | {'MalformedData' : [] } | {'WrongSignature' : [] } | {'MissingAccount' : [] } | {'NotEnoughSignatures' : [] } | {'SignaturesOutOfOrder' : [] } | {'InvalidSigner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FRMAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgIZAAAASW52YWxpZFJlcXVpcmVkU2lnbmF0dXJlcwIHAAAAT2xkRGF0YQINAAAAV3JvbmdDb250cmFjdAIHAAAARXhwaXJlZAIMAAAARmVlZE5vdEV4aXN0AgwAAABVbmF1dGhvcml6ZWQCGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAg0AAABNYWxmb3JtZWREYXRhAg4AAABXcm9uZ1NpZ25hdHVyZQIOAAAATWlzc2luZ0FjY291bnQCEwAAAE5vdEVub3VnaFNpZ25hdHVyZXMCFAAAAFNpZ25hdHVyZXNPdXRPZk9yZGVyAg0AAABJbnZhbGlkU2lnbmVyAg==');
    let match32: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};
    if ('ParseParams' in schemaJson) {
       match32 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match32 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match32 = {
           type: 'LogMalformed',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match32 = {
           type: 'InvokeContractError',
       };
    } else if ('InvalidRequiredSignatures' in schemaJson) {
       match32 = {
           type: 'InvalidRequiredSignatures',
       };
    } else if ('OldData' in schemaJson) {
       match32 = {
           type: 'OldData',
       };
    } else if ('WrongContract' in schemaJson) {
       match32 = {
           type: 'WrongContract',
       };
    } else if ('Expired' in schemaJson) {
       match32 = {
           type: 'Expired',
       };
    } else if ('FeedNotExist' in schemaJson) {
       match32 = {
           type: 'FeedNotExist',
       };
    } else if ('Unauthorized' in schemaJson) {
       match32 = {
           type: 'Unauthorized',
       };
    } else if ('FailedUpgradeMissingModule' in schemaJson) {
       match32 = {
           type: 'FailedUpgradeMissingModule',
       };
    } else if ('FailedUpgradeMissingContract' in schemaJson) {
       match32 = {
           type: 'FailedUpgradeMissingContract',
       };
    } else if ('FailedUpgradeUnsupportedModuleVersion' in schemaJson) {
       match32 = {
           type: 'FailedUpgradeUnsupportedModuleVersion',
       };
    } else if ('MalformedData' in schemaJson) {
       match32 = {
           type: 'MalformedData',
       };
    } else if ('WrongSignature' in schemaJson) {
       match32 = {
           type: 'WrongSignature',
       };
    } else if ('MissingAccount' in schemaJson) {
       match32 = {
           type: 'MissingAccount',
       };
    } else if ('NotEnoughSignatures' in schemaJson) {
       match32 = {
           type: 'NotEnoughSignatures',
       };
    } else if ('SignaturesOutOfOrder' in schemaJson) {
       match32 = {
           type: 'SignaturesOutOfOrder',
       };
    } else if ('InvalidSigner' in schemaJson) {
       match32 = {
           type: 'InvalidSigner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match32
}

/** Parameter type for update transaction for 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract. */
export type ViewMessageHashParameter = {
    signers_and_signatures: Array<[SDK.HexString, SDK.HexString]>,
    message: {
    contract_address: SDK.ContractAddress.Type,
    timestamp: SDK.Timestamp.Type,
    price_feed: Array<[string, {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    }]>,
    },
    };

/**
 * Construct Parameter for update transactions for 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract.
 * @param {ViewMessageHashParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createViewMessageHashParameter(parameter: ViewMessageHashParameter): SDK.Parameter.Type {
    const field53 = parameter.signers_and_signatures;
    const list54 = field53.map((item55) => {
    const pair56: [string, string] = [item55[0], item55[1]];
    return pair56;
    });
    const field57 = parameter.message;
    const field59 = field57.contract_address;
    const contractAddress60 = SDK.ContractAddress.toSchemaValue(field59);
    const field61 = field57.timestamp;
    const timestamp62 = SDK.Timestamp.toSchemaValue(field61);
    const field63 = field57.price_feed;
    const list64 = field63.map((item65) => {
    const field68 = item65[1].data;
    const field69 = item65[1].heartbeat;
    const number70 = BigInt(field69);
    const field71 = item65[1].timestamp;
    const timestamp72 = SDK.Timestamp.toSchemaValue(field71);
    const field73 = item65[1].price;
    const number74 = BigInt(field73).toString();
    const named67 = {
    data: field68,
    heartbeat: number70,
    timestamp: timestamp72,
    price: number74,
    };
    const pair66: [string, {
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }] = [item65[0], named67];
    return pair66;
    });
    const named58 = {
    contract_address: contractAddress60,
    timestamp: timestamp62,
    price_feed: list64,
    };
    const named52 = {
    signers_and_signatures: list54,
    message: named58,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAACAAAAFgAAAHNpZ25lcnNfYW5kX3NpZ25hdHVyZXMQAg8eIAAAAB5AAAAABwAAAG1lc3NhZ2UUAAMAAAAQAAAAY29udHJhY3RfYWRkcmVzcwwJAAAAdGltZXN0YW1wDQoAAABwcmljZV9mZWVkEAIPFgIUAAQAAAAEAAAAZGF0YQIJAAAAaGVhcnRiZWF0BQkAAAB0aW1lc3RhbXANBQAAAHByaWNlFw==', named52);
    return out;
}

/**
 * Send an update-contract transaction to the 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ViewMessageHashParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendViewMessageHash(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ViewMessageHashParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('viewMessageHash'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createViewMessageHashParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ViewMessageHashParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunViewMessageHash(contractClient: UmbrellaFeedsContract, parameter: ViewMessageHashParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('viewMessageHash'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createViewMessageHashParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueViewMessageHash = SDK.HexString;

/**
 * Get and parse the return value from dry-running update transaction for 'viewMessageHash' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueViewMessageHash | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueViewMessageHash(invokeResult: SDK.InvokeContractResult): ReturnValueViewMessageHash | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <string>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'HiAAAAA=');
    return schemaJson;
}

/** Parameter type for update transaction for 'verifySignatures' entrypoint of the 'umbrella_feeds' contract. */
export type VerifySignaturesParameter = {
    signers_and_signatures: Array<[SDK.HexString, SDK.HexString]>,
    message: {
    contract_address: SDK.ContractAddress.Type,
    timestamp: SDK.Timestamp.Type,
    price_feed: Array<[string, {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    }]>,
    },
    };

/**
 * Construct Parameter for update transactions for 'verifySignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {VerifySignaturesParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createVerifySignaturesParameter(parameter: VerifySignaturesParameter): SDK.Parameter.Type {
    const field76 = parameter.signers_and_signatures;
    const list77 = field76.map((item78) => {
    const pair79: [string, string] = [item78[0], item78[1]];
    return pair79;
    });
    const field80 = parameter.message;
    const field82 = field80.contract_address;
    const contractAddress83 = SDK.ContractAddress.toSchemaValue(field82);
    const field84 = field80.timestamp;
    const timestamp85 = SDK.Timestamp.toSchemaValue(field84);
    const field86 = field80.price_feed;
    const list87 = field86.map((item88) => {
    const field91 = item88[1].data;
    const field92 = item88[1].heartbeat;
    const number93 = BigInt(field92);
    const field94 = item88[1].timestamp;
    const timestamp95 = SDK.Timestamp.toSchemaValue(field94);
    const field96 = item88[1].price;
    const number97 = BigInt(field96).toString();
    const named90 = {
    data: field91,
    heartbeat: number93,
    timestamp: timestamp95,
    price: number97,
    };
    const pair89: [string, {
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }] = [item88[0], named90];
    return pair89;
    });
    const named81 = {
    contract_address: contractAddress83,
    timestamp: timestamp85,
    price_feed: list87,
    };
    const named75 = {
    signers_and_signatures: list77,
    message: named81,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAACAAAAFgAAAHNpZ25lcnNfYW5kX3NpZ25hdHVyZXMQAg8eIAAAAB5AAAAABwAAAG1lc3NhZ2UUAAMAAAAQAAAAY29udHJhY3RfYWRkcmVzcwwJAAAAdGltZXN0YW1wDQoAAABwcmljZV9mZWVkEAIPFgIUAAQAAAAEAAAAZGF0YQIJAAAAaGVhcnRiZWF0BQkAAAB0aW1lc3RhbXANBQAAAHByaWNlFw==', named75);
    return out;
}

/**
 * Send an update-contract transaction to the 'verifySignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {VerifySignaturesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendVerifySignatures(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: VerifySignaturesParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('verifySignatures'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createVerifySignaturesParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'verifySignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {VerifySignaturesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunVerifySignatures(contractClient: UmbrellaFeedsContract, parameter: VerifySignaturesParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('verifySignatures'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createVerifySignaturesParameter(parameter),
        blockHash
    );
}

/** Parameter type for update transaction for 'update' entrypoint of the 'umbrella_feeds' contract. */
export type UpdateParameter = {
    signers_and_signatures: Array<[SDK.HexString, SDK.HexString]>,
    message: {
    contract_address: SDK.ContractAddress.Type,
    timestamp: SDK.Timestamp.Type,
    price_feed: Array<[string, {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    }]>,
    },
    };

/**
 * Construct Parameter for update transactions for 'update' entrypoint of the 'umbrella_feeds' contract.
 * @param {UpdateParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createUpdateParameter(parameter: UpdateParameter): SDK.Parameter.Type {
    const field99 = parameter.signers_and_signatures;
    const list100 = field99.map((item101) => {
    const pair102: [string, string] = [item101[0], item101[1]];
    return pair102;
    });
    const field103 = parameter.message;
    const field105 = field103.contract_address;
    const contractAddress106 = SDK.ContractAddress.toSchemaValue(field105);
    const field107 = field103.timestamp;
    const timestamp108 = SDK.Timestamp.toSchemaValue(field107);
    const field109 = field103.price_feed;
    const list110 = field109.map((item111) => {
    const field114 = item111[1].data;
    const field115 = item111[1].heartbeat;
    const number116 = BigInt(field115);
    const field117 = item111[1].timestamp;
    const timestamp118 = SDK.Timestamp.toSchemaValue(field117);
    const field119 = item111[1].price;
    const number120 = BigInt(field119).toString();
    const named113 = {
    data: field114,
    heartbeat: number116,
    timestamp: timestamp118,
    price: number120,
    };
    const pair112: [string, {
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }] = [item111[0], named113];
    return pair112;
    });
    const named104 = {
    contract_address: contractAddress106,
    timestamp: timestamp108,
    price_feed: list110,
    };
    const named98 = {
    signers_and_signatures: list100,
    message: named104,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAACAAAAFgAAAHNpZ25lcnNfYW5kX3NpZ25hdHVyZXMQAg8eIAAAAB5AAAAABwAAAG1lc3NhZ2UUAAMAAAAQAAAAY29udHJhY3RfYWRkcmVzcwwJAAAAdGltZXN0YW1wDQoAAABwcmljZV9mZWVkEAIPFgIUAAQAAAAEAAAAZGF0YQIJAAAAaGVhcnRiZWF0BQkAAAB0aW1lc3RhbXANBQAAAHByaWNlFw==', named98);
    return out;
}

/**
 * Send an update-contract transaction to the 'update' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {UpdateParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendUpdate(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UpdateParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('update'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createUpdateParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'update' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {UpdateParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunUpdate(contractClient: UmbrellaFeedsContract, parameter: UpdateParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('update'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createUpdateParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'update' entrypoint of the 'umbrella_feeds' contract. */
export type ErrorMessageUpdate = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};

/**
 * Get and parse the error message from dry-running update transaction for 'update' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageUpdate | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageUpdate(invokeResult: SDK.InvokeContractResult): ErrorMessageUpdate | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'InvokeContractError' : [] } | {'InvalidRequiredSignatures' : [] } | {'OldData' : [] } | {'WrongContract' : [] } | {'Expired' : [] } | {'FeedNotExist' : [] } | {'Unauthorized' : [] } | {'FailedUpgradeMissingModule' : [] } | {'FailedUpgradeMissingContract' : [] } | {'FailedUpgradeUnsupportedModuleVersion' : [] } | {'MalformedData' : [] } | {'WrongSignature' : [] } | {'MissingAccount' : [] } | {'NotEnoughSignatures' : [] } | {'SignaturesOutOfOrder' : [] } | {'InvalidSigner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FRMAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgIZAAAASW52YWxpZFJlcXVpcmVkU2lnbmF0dXJlcwIHAAAAT2xkRGF0YQINAAAAV3JvbmdDb250cmFjdAIHAAAARXhwaXJlZAIMAAAARmVlZE5vdEV4aXN0AgwAAABVbmF1dGhvcml6ZWQCGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAg0AAABNYWxmb3JtZWREYXRhAg4AAABXcm9uZ1NpZ25hdHVyZQIOAAAATWlzc2luZ0FjY291bnQCEwAAAE5vdEVub3VnaFNpZ25hdHVyZXMCFAAAAFNpZ25hdHVyZXNPdXRPZk9yZGVyAg0AAABJbnZhbGlkU2lnbmVyAg==');
    let match121: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'InvokeContractError'} | { type: 'InvalidRequiredSignatures'} | { type: 'OldData'} | { type: 'WrongContract'} | { type: 'Expired'} | { type: 'FeedNotExist'} | { type: 'Unauthorized'} | { type: 'FailedUpgradeMissingModule'} | { type: 'FailedUpgradeMissingContract'} | { type: 'FailedUpgradeUnsupportedModuleVersion'} | { type: 'MalformedData'} | { type: 'WrongSignature'} | { type: 'MissingAccount'} | { type: 'NotEnoughSignatures'} | { type: 'SignaturesOutOfOrder'} | { type: 'InvalidSigner'};
    if ('ParseParams' in schemaJson) {
       match121 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match121 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match121 = {
           type: 'LogMalformed',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match121 = {
           type: 'InvokeContractError',
       };
    } else if ('InvalidRequiredSignatures' in schemaJson) {
       match121 = {
           type: 'InvalidRequiredSignatures',
       };
    } else if ('OldData' in schemaJson) {
       match121 = {
           type: 'OldData',
       };
    } else if ('WrongContract' in schemaJson) {
       match121 = {
           type: 'WrongContract',
       };
    } else if ('Expired' in schemaJson) {
       match121 = {
           type: 'Expired',
       };
    } else if ('FeedNotExist' in schemaJson) {
       match121 = {
           type: 'FeedNotExist',
       };
    } else if ('Unauthorized' in schemaJson) {
       match121 = {
           type: 'Unauthorized',
       };
    } else if ('FailedUpgradeMissingModule' in schemaJson) {
       match121 = {
           type: 'FailedUpgradeMissingModule',
       };
    } else if ('FailedUpgradeMissingContract' in schemaJson) {
       match121 = {
           type: 'FailedUpgradeMissingContract',
       };
    } else if ('FailedUpgradeUnsupportedModuleVersion' in schemaJson) {
       match121 = {
           type: 'FailedUpgradeUnsupportedModuleVersion',
       };
    } else if ('MalformedData' in schemaJson) {
       match121 = {
           type: 'MalformedData',
       };
    } else if ('WrongSignature' in schemaJson) {
       match121 = {
           type: 'WrongSignature',
       };
    } else if ('MissingAccount' in schemaJson) {
       match121 = {
           type: 'MissingAccount',
       };
    } else if ('NotEnoughSignatures' in schemaJson) {
       match121 = {
           type: 'NotEnoughSignatures',
       };
    } else if ('SignaturesOutOfOrder' in schemaJson) {
       match121 = {
           type: 'SignaturesOutOfOrder',
       };
    } else if ('InvalidSigner' in schemaJson) {
       match121 = {
           type: 'InvalidSigner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match121
}

/** Parameter type for update transaction for 'getName' entrypoint of the 'umbrella_feeds' contract. */
export type GetNameParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'getName' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetNameParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetNameParameter(parameter: GetNameParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'getName' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetNameParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetName(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetNameParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getName'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetNameParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getName' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetNameParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetName(contractClient: UmbrellaFeedsContract, parameter: GetNameParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getName'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetNameParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getName' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetName = string;

/**
 * Get and parse the return value from dry-running update transaction for 'getName' entrypoint of the 'umbrella_feeds' contract.
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

/** Parameter type for update transaction for 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract. */
export type GetManyPriceDataParameter = Array<string>;

/**
 * Construct Parameter for update transactions for 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetManyPriceDataParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetManyPriceDataParameter(parameter: GetManyPriceDataParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('EAIWAg==', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetManyPriceDataParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetManyPriceData(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetManyPriceDataParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getManyPriceData'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetManyPriceDataParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetManyPriceDataParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetManyPriceData(contractClient: UmbrellaFeedsContract, parameter: GetManyPriceDataParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getManyPriceData'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetManyPriceDataParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetManyPriceData = Array<{
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    }>;

/**
 * Get and parse the return value from dry-running update transaction for 'getManyPriceData' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetManyPriceData | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetManyPriceData(invokeResult: SDK.InvokeContractResult): ReturnValueGetManyPriceData | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <Array<{
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }>>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'EAIUAAQAAAAEAAAAZGF0YQIJAAAAaGVhcnRiZWF0BQkAAAB0aW1lc3RhbXANBQAAAHByaWNlFw==');
    const list143 = schemaJson.map((item144) => {
    const field145 = item144.data;
    const field146 = item144.heartbeat;
    const field147 = item144.timestamp;
    const timestamp148 = SDK.Timestamp.fromSchemaValue(field147);
    const field149 = item144.price;
    const named150 = {
    data: field145,
    heartbeat: field146,
    timestamp: timestamp148,
    price: BigInt(field149),
    };
    return named150;
    });
    return list143;
}

/** Parameter type for update transaction for 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract. */
export type GetManyPriceDataRawParameter = Array<string>;

/**
 * Construct Parameter for update transactions for 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetManyPriceDataRawParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetManyPriceDataRawParameter(parameter: GetManyPriceDataRawParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('EAIWAg==', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetManyPriceDataRawParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetManyPriceDataRaw(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetManyPriceDataRawParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getManyPriceDataRaw'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetManyPriceDataRawParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetManyPriceDataRawParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetManyPriceDataRaw(contractClient: UmbrellaFeedsContract, parameter: GetManyPriceDataRawParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getManyPriceDataRaw'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetManyPriceDataRawParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetManyPriceDataRaw = Array<{ type: 'None'} | { type: 'Some', content: {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    } }>;

/**
 * Get and parse the return value from dry-running update transaction for 'getManyPriceDataRaw' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetManyPriceDataRaw | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetManyPriceDataRaw(invokeResult: SDK.InvokeContractResult): ReturnValueGetManyPriceDataRaw | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <Array<{'None' : [] } | {'Some' : [{
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }] }>>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'EAIVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAUAAQAAAAEAAAAZGF0YQIJAAAAaGVhcnRiZWF0BQkAAAB0aW1lc3RhbXANBQAAAHByaWNlFw==');
    const list153 = schemaJson.map((item154) => {
    let match155: { type: 'None'} | { type: 'Some', content: {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    } };
    if ('None' in item154) {
       match155 = {
           type: 'None',
       };
    } else if ('Some' in item154) {
       const variant157 = item154.Some;
    const field158 = variant157[0].data;
    const field159 = variant157[0].heartbeat;
    const field160 = variant157[0].timestamp;
    const timestamp161 = SDK.Timestamp.fromSchemaValue(field160);
    const field162 = variant157[0].price;
    const named163 = {
    data: field158,
    heartbeat: field159,
    timestamp: timestamp161,
    price: BigInt(field162),
    };
       match155 = {
           type: 'Some',
           content: named163,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match155;
    });
    return list153;
}

/** Parameter type for update transaction for 'getPriceData' entrypoint of the 'umbrella_feeds' contract. */
export type GetPriceDataParameter = string;

/**
 * Construct Parameter for update transactions for 'getPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetPriceDataParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetPriceDataParameter(parameter: GetPriceDataParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('FgI=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetPriceDataParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetPriceData(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetPriceDataParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getPriceData'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetPriceDataParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getPriceData' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetPriceDataParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetPriceData(contractClient: UmbrellaFeedsContract, parameter: GetPriceDataParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getPriceData'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetPriceDataParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getPriceData' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetPriceData = {
    data: number,
    heartbeat: number | bigint,
    timestamp: SDK.Timestamp.Type,
    price: number | bigint,
    };

/**
 * Get and parse the return value from dry-running update transaction for 'getPriceData' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetPriceData | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetPriceData(invokeResult: SDK.InvokeContractResult): ReturnValueGetPriceData | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{
    data: number,
    heartbeat: bigint,
    timestamp: SDK.Timestamp.SchemaValue,
    price: string,
    }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FAAEAAAABAAAAGRhdGECCQAAAGhlYXJ0YmVhdAUJAAAAdGltZXN0YW1wDQUAAABwcmljZRc=');
    const field164 = schemaJson.data;
    const field165 = schemaJson.heartbeat;
    const field166 = schemaJson.timestamp;
    const timestamp167 = SDK.Timestamp.fromSchemaValue(field166);
    const field168 = schemaJson.price;
    const named169 = {
    data: field164,
    heartbeat: field165,
    timestamp: timestamp167,
    price: BigInt(field168),
    };
    return named169;
}

/** Parameter type for update transaction for 'getPrice' entrypoint of the 'umbrella_feeds' contract. */
export type GetPriceParameter = string;

/**
 * Construct Parameter for update transactions for 'getPrice' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetPriceParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetPriceParameter(parameter: GetPriceParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('FgI=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getPrice' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetPriceParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetPrice(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetPriceParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getPrice'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetPriceParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getPrice' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetPriceParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetPrice(contractClient: UmbrellaFeedsContract, parameter: GetPriceParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getPrice'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetPriceParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getPrice' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetPrice = number | bigint;

/**
 * Get and parse the return value from dry-running update transaction for 'getPrice' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetPrice | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetPrice(invokeResult: SDK.InvokeContractResult): ReturnValueGetPrice | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <string>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Fw==');
    return BigInt(schemaJson);
}

/** Parameter type for update transaction for 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract. */
export type GetPriceTimestampParameter = string;

/**
 * Construct Parameter for update transactions for 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetPriceTimestampParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetPriceTimestampParameter(parameter: GetPriceTimestampParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('FgI=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetPriceTimestampParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetPriceTimestamp(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetPriceTimestampParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getPriceTimestamp'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetPriceTimestampParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetPriceTimestampParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetPriceTimestamp(contractClient: UmbrellaFeedsContract, parameter: GetPriceTimestampParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getPriceTimestamp'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetPriceTimestampParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetPriceTimestamp = SDK.Timestamp.Type;

/**
 * Get and parse the return value from dry-running update transaction for 'getPriceTimestamp' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetPriceTimestamp | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetPriceTimestamp(invokeResult: SDK.InvokeContractResult): ReturnValueGetPriceTimestamp | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <SDK.Timestamp.SchemaValue>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'DQ==');
    const timestamp170 = SDK.Timestamp.fromSchemaValue(schemaJson);
    return timestamp170;
}

/** Parameter type for update transaction for 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract. */
export type GetPriceTimestampHeartbeatParameter = string;

/**
 * Construct Parameter for update transactions for 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract.
 * @param {GetPriceTimestampHeartbeatParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetPriceTimestampHeartbeatParameter(parameter: GetPriceTimestampHeartbeatParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('FgI=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetPriceTimestampHeartbeatParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetPriceTimestampHeartbeat(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetPriceTimestampHeartbeatParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getPriceTimestampHeartbeat'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetPriceTimestampHeartbeatParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetPriceTimestampHeartbeatParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetPriceTimestampHeartbeat(contractClient: UmbrellaFeedsContract, parameter: GetPriceTimestampHeartbeatParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getPriceTimestampHeartbeat'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetPriceTimestampHeartbeatParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueGetPriceTimestampHeartbeat = {
    price: number | bigint,
    timestamp: SDK.Timestamp.Type,
    heartbeat: number | bigint,
    };

/**
 * Get and parse the return value from dry-running update transaction for 'getPriceTimestampHeartbeat' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetPriceTimestampHeartbeat | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetPriceTimestampHeartbeat(invokeResult: SDK.InvokeContractResult): ReturnValueGetPriceTimestampHeartbeat | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{
    price: string,
    timestamp: SDK.Timestamp.SchemaValue,
    heartbeat: bigint,
    }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FAADAAAABQAAAHByaWNlFwkAAAB0aW1lc3RhbXANCQAAAGhlYXJ0YmVhdAU=');
    const field171 = schemaJson.price;
    const field172 = schemaJson.timestamp;
    const timestamp173 = SDK.Timestamp.fromSchemaValue(field172);
    const field174 = schemaJson.heartbeat;
    const named175 = {
    price: BigInt(field171),
    timestamp: timestamp173,
    heartbeat: field174,
    };
    return named175;
}

/** Parameter type for update transaction for 'DECIMALS' entrypoint of the 'umbrella_feeds' contract. */
export type DECIMALSParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'DECIMALS' entrypoint of the 'umbrella_feeds' contract.
 * @param {DECIMALSParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createDECIMALSParameter(parameter: DECIMALSParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'DECIMALS' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {DECIMALSParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendDECIMALS(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: DECIMALSParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('DECIMALS'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createDECIMALSParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'DECIMALS' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {DECIMALSParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunDECIMALS(contractClient: UmbrellaFeedsContract, parameter: DECIMALSParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('DECIMALS'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createDECIMALSParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'DECIMALS' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueDECIMALS = number;

/**
 * Get and parse the return value from dry-running update transaction for 'DECIMALS' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueDECIMALS | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueDECIMALS(invokeResult: SDK.InvokeContractResult): ReturnValueDECIMALS | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Ag==');
    return schemaJson;
}

/** Parameter type for update transaction for 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract. */
export type RequiredSignaturesParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {RequiredSignaturesParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createRequiredSignaturesParameter(parameter: RequiredSignaturesParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {RequiredSignaturesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendRequiredSignatures(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: RequiredSignaturesParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('requiredSignatures'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createRequiredSignaturesParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {RequiredSignaturesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunRequiredSignatures(contractClient: UmbrellaFeedsContract, parameter: RequiredSignaturesParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('requiredSignatures'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createRequiredSignaturesParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueRequiredSignatures = number;

/**
 * Get and parse the return value from dry-running update transaction for 'requiredSignatures' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueRequiredSignatures | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueRequiredSignatures(invokeResult: SDK.InvokeContractResult): ReturnValueRequiredSignatures | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <number>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'Aw==');
    return schemaJson;
}

/** Parameter type for update transaction for 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract. */
export type ViewContractSetupParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract.
 * @param {ViewContractSetupParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createViewContractSetupParameter(parameter: ViewContractSetupParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ViewContractSetupParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendViewContractSetup(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ViewContractSetupParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('viewContractSetup'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createViewContractSetupParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ViewContractSetupParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunViewContractSetup(contractClient: UmbrellaFeedsContract, parameter: ViewContractSetupParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('viewContractSetup'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createViewContractSetupParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract. */
export type ReturnValueViewContractSetup = {
    deployed_at: SDK.Timestamp.Type,
    registry: SDK.ContractAddress.Type,
    staking_bank: SDK.ContractAddress.Type,
    };

/**
 * Get and parse the return value from dry-running update transaction for 'viewContractSetup' entrypoint of the 'umbrella_feeds' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueViewContractSetup | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueViewContractSetup(invokeResult: SDK.InvokeContractResult): ReturnValueViewContractSetup | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{
    deployed_at: SDK.Timestamp.SchemaValue,
    registry: SDK.ContractAddress.SchemaValue,
    staking_bank: SDK.ContractAddress.SchemaValue,
    }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FAADAAAACwAAAGRlcGxveWVkX2F0DQgAAAByZWdpc3RyeQwMAAAAc3Rha2luZ19iYW5rDA==');
    const field176 = schemaJson.deployed_at;
    const timestamp177 = SDK.Timestamp.fromSchemaValue(field176);
    const field178 = schemaJson.registry;
    const contractAddress179 = SDK.ContractAddress.fromSchemaValue(field178);
    const field180 = schemaJson.staking_bank;
    const contractAddress181 = SDK.ContractAddress.fromSchemaValue(field180);
    const named182 = {
    deployed_at: timestamp177,
    registry: contractAddress179,
    staking_bank: contractAddress181,
    };
    return named182;
}

/** Parameter type for update transaction for 'unregister' entrypoint of the 'umbrella_feeds' contract. */
export type UnregisterParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'unregister' entrypoint of the 'umbrella_feeds' contract.
 * @param {UnregisterParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createUnregisterParameter(parameter: UnregisterParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'unregister' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {UnregisterParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendUnregister(contractClient: UmbrellaFeedsContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: UnregisterParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('unregister'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createUnregisterParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'unregister' entrypoint of the 'umbrella_feeds' contract.
 * @param {UmbrellaFeedsContract} contractClient The client for a 'umbrella_feeds' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {UnregisterParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunUnregister(contractClient: UmbrellaFeedsContract, parameter: UnregisterParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('unregister'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createUnregisterParameter(parameter),
        blockHash
    );
}
