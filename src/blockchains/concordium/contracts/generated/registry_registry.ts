import * as SDK from "@concordium/web-sdk";

/** The reference of the smart contract module supported by the provided client. */
export const moduleReference: SDK.ModuleReference.Type = /*#__PURE__*/ SDK.ModuleReference.fromHexString('b3938520c58bbcdedbd557a46616410c5d4e5a319c526af1fb4815e91a5cdb08');
/** Name of the smart contract supported by this client. */
export const contractName: SDK.ContractName.Type = /*#__PURE__*/ SDK.ContractName.fromStringUnchecked('registry');

/** Smart contract client for a contract instance on chain. */
class RegistryContract {
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
export type Type = RegistryContract;

/**
 * Construct an instance of `RegistryContract` for interacting with a 'registry' contract on chain.
 * Checking the information instance on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @param {SDK.BlockHash.Type} [blockHash] - Hash of the block to check the information at. When not provided the last finalized block is used.
 * @throws If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {RegistryContract}
 */
export async function create(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type, blockHash?: SDK.BlockHash.Type): Promise<RegistryContract> {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    await genericContract.checkOnChain({ moduleReference: moduleReference, blockHash: blockHash });
    return new RegistryContract(
        grpcClient,
        contractAddress,
        genericContract
    );
}

/**
 * Construct the `RegistryContract` for interacting with a 'registry' contract on chain.
 * Without checking the instance information on chain.
 * @param {SDK.ConcordiumGRPCClient} grpcClient - The client used for contract invocations and updates.
 * @param {SDK.ContractAddress.Type} contractAddress - Address of the contract instance.
 * @returns {RegistryContract}
 */
export function createUnchecked(grpcClient: SDK.ConcordiumGRPCClient, contractAddress: SDK.ContractAddress.Type): RegistryContract {
    const genericContract = new SDK.Contract(grpcClient, contractAddress, contractName);
    return new RegistryContract(
        grpcClient,
        contractAddress,
        genericContract,
    );
}

/**
 * Check if the smart contract instance exists on the blockchain and whether it uses a matching contract name and module reference.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.BlockHash.Type} [blockHash] A optional block hash to use for checking information on chain, if not provided the last finalized will be used.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 */
export function checkOnChain(contractClient: RegistryContract, blockHash?: SDK.BlockHash.Type): Promise<void> {
    return contractClient.genericContract.checkOnChain({moduleReference: moduleReference, blockHash: blockHash });
}

/** Contract event type for the 'registry' contract. */
export type Event = { type: 'LogRegistered', content: {
    destination: SDK.ContractAddress.Type,
    name: string,
    } } | { type: 'OwnershipTransferred', content: {
    previous_owner: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } },
    new_owner: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } },
    } };

/**
 * Parse the contract events logged by the 'registry' contract.
 * @param {SDK.ContractEvent.Type} event The unparsed contract event.
 * @returns {Event} The structured contract event.
 */
export function parseEvent(event: SDK.ContractEvent.Type): Event {
    const schemaJson = <{'LogRegistered' : [{
    destination: SDK.ContractAddress.SchemaValue,
    name: string,
    }] } | {'OwnershipTransferred' : [{
    previous_owner: {'None' : [] } | {'Some' : [{'Account' : [SDK.AccountAddress.SchemaValue] } | {'Contract' : [SDK.ContractAddress.SchemaValue] }] },
    new_owner: {'None' : [] } | {'Some' : [{'Account' : [SDK.AccountAddress.SchemaValue] } | {'Contract' : [SDK.ContractAddress.SchemaValue] }] },
    }] }>SDK.ContractEvent.parseWithSchemaTypeBase64(event, 'HwIAAAAADQAAAExvZ1JlZ2lzdGVyZWQBAQAAABQAAgAAAAsAAABkZXN0aW5hdGlvbgwEAAAAbmFtZRYCARQAAABPd25lcnNoaXBUcmFuc2ZlcnJlZAEBAAAAFAACAAAADgAAAHByZXZpb3VzX293bmVyFQIAAAAEAAAATm9uZQIEAAAAU29tZQEBAAAAFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAkAAABuZXdfb3duZXIVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAVAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAM');
    let match0: { type: 'LogRegistered', content: {
    destination: SDK.ContractAddress.Type,
    name: string,
    } } | { type: 'OwnershipTransferred', content: {
    previous_owner: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } },
    new_owner: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } },
    } };
    if ('LogRegistered' in schemaJson) {
       const variant1 = schemaJson.LogRegistered;
    const field2 = variant1[0].destination;
    const contractAddress3 = SDK.ContractAddress.fromSchemaValue(field2);
    const field4 = variant1[0].name;
    const named5 = {
    destination: contractAddress3,
    name: field4,
    };
       match0 = {
           type: 'LogRegistered',
           content: named5,
       };
    } else if ('OwnershipTransferred' in schemaJson) {
       const variant6 = schemaJson.OwnershipTransferred;
    const field7 = variant6[0].previous_owner;
    let match8: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } };
    if ('None' in field7) {
       match8 = {
           type: 'None',
       };
    } else if ('Some' in field7) {
       const variant10 = field7.Some;
    let match11: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type };
    if ('Account' in variant10[0]) {
       const variant12 = variant10[0].Account;
    const accountAddress13 = SDK.AccountAddress.fromSchemaValue(variant12[0]);
       match11 = {
           type: 'Account',
           content: accountAddress13,
       };
    } else if ('Contract' in variant10[0]) {
       const variant14 = variant10[0].Contract;
    const contractAddress15 = SDK.ContractAddress.fromSchemaValue(variant14[0]);
       match11 = {
           type: 'Contract',
           content: contractAddress15,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
       match8 = {
           type: 'Some',
           content: match11,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    const field16 = variant6[0].new_owner;
    let match17: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } };
    if ('None' in field16) {
       match17 = {
           type: 'None',
       };
    } else if ('Some' in field16) {
       const variant19 = field16.Some;
    let match20: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type };
    if ('Account' in variant19[0]) {
       const variant21 = variant19[0].Account;
    const accountAddress22 = SDK.AccountAddress.fromSchemaValue(variant21[0]);
       match20 = {
           type: 'Account',
           content: accountAddress22,
       };
    } else if ('Contract' in variant19[0]) {
       const variant23 = variant19[0].Contract;
    const contractAddress24 = SDK.ContractAddress.fromSchemaValue(variant23[0]);
       match20 = {
           type: 'Contract',
           content: contractAddress24,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
       match17 = {
           type: 'Some',
           content: match20,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    const named25 = {
    previous_owner: match8,
    new_owner: match17,
    };
       match0 = {
           type: 'OwnershipTransferred',
           content: named25,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match0;
}

/** Parameter type for update transaction for 'importAddresses' entrypoint of the 'registry' contract. */
export type ImportAddressesParameter = Array<{
    name: string,
    destination: SDK.ContractAddress.Type,
    }>;

/**
 * Construct Parameter for update transactions for 'importAddresses' entrypoint of the 'registry' contract.
 * @param {ImportAddressesParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createImportAddressesParameter(parameter: ImportAddressesParameter): SDK.Parameter.Type {
    const list26 = parameter.map((item27) => {
    const field29 = item27.name;
    const field30 = item27.destination;
    const contractAddress31 = SDK.ContractAddress.toSchemaValue(field30);
    const named28 = {
    name: field29,
    destination: contractAddress31,
    };
    return named28;
    });
    const out = SDK.Parameter.fromBase64SchemaType('EAEUAAIAAAAEAAAAbmFtZRYCCwAAAGRlc3RpbmF0aW9uDA==', list26);
    return out;
}

/**
 * Send an update-contract transaction to the 'importAddresses' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ImportAddressesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendImportAddresses(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ImportAddressesParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('importAddresses'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createImportAddressesParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'importAddresses' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ImportAddressesParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunImportAddresses(contractClient: RegistryContract, parameter: ImportAddressesParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('importAddresses'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createImportAddressesParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'importAddresses' entrypoint of the 'registry' contract. */
export type ErrorMessageImportAddresses = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};

/**
 * Get and parse the error message from dry-running update transaction for 'importAddresses' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageImportAddresses | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageImportAddresses(invokeResult: SDK.InvokeContractResult): ErrorMessageImportAddresses | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'NameNotRegistered' : [] } | {'UnauthorizedAccount' : [] } | {'InvokeContractError' : [] } | {'NoOwner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQcAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIRAAAATmFtZU5vdFJlZ2lzdGVyZWQCEwAAAFVuYXV0aG9yaXplZEFjY291bnQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBwAAAE5vT3duZXIC');
    let match32: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};
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
    } else if ('NameNotRegistered' in schemaJson) {
       match32 = {
           type: 'NameNotRegistered',
       };
    } else if ('UnauthorizedAccount' in schemaJson) {
       match32 = {
           type: 'UnauthorizedAccount',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match32 = {
           type: 'InvokeContractError',
       };
    } else if ('NoOwner' in schemaJson) {
       match32 = {
           type: 'NoOwner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match32
}

/** Parameter type for update transaction for 'importContracts' entrypoint of the 'registry' contract. */
export type ImportContractsParameter = Array<SDK.ContractAddress.Type>;

/**
 * Construct Parameter for update transactions for 'importContracts' entrypoint of the 'registry' contract.
 * @param {ImportContractsParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createImportContractsParameter(parameter: ImportContractsParameter): SDK.Parameter.Type {
    const list40 = parameter.map((item41) => {
    const contractAddress42 = SDK.ContractAddress.toSchemaValue(item41);
    return contractAddress42;
    });
    const out = SDK.Parameter.fromBase64SchemaType('EAEM', list40);
    return out;
}

/**
 * Send an update-contract transaction to the 'importContracts' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {ImportContractsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendImportContracts(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: ImportContractsParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('importContracts'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createImportContractsParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'importContracts' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {ImportContractsParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunImportContracts(contractClient: RegistryContract, parameter: ImportContractsParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('importContracts'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createImportContractsParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'importContracts' entrypoint of the 'registry' contract. */
export type ErrorMessageImportContracts = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};

/**
 * Get and parse the error message from dry-running update transaction for 'importContracts' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageImportContracts | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageImportContracts(invokeResult: SDK.InvokeContractResult): ErrorMessageImportContracts | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'NameNotRegistered' : [] } | {'UnauthorizedAccount' : [] } | {'InvokeContractError' : [] } | {'NoOwner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQcAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIRAAAATmFtZU5vdFJlZ2lzdGVyZWQCEwAAAFVuYXV0aG9yaXplZEFjY291bnQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBwAAAE5vT3duZXIC');
    let match43: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};
    if ('ParseParams' in schemaJson) {
       match43 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match43 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match43 = {
           type: 'LogMalformed',
       };
    } else if ('NameNotRegistered' in schemaJson) {
       match43 = {
           type: 'NameNotRegistered',
       };
    } else if ('UnauthorizedAccount' in schemaJson) {
       match43 = {
           type: 'UnauthorizedAccount',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match43 = {
           type: 'InvokeContractError',
       };
    } else if ('NoOwner' in schemaJson) {
       match43 = {
           type: 'NoOwner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match43
}

/** Parameter type for update transaction for 'atomicUpdate' entrypoint of the 'registry' contract. */
export type AtomicUpdateParameter = {
    module: SDK.HexString,
    migrate: { type: 'None'} | { type: 'Some', content: [string, SDK.HexString] },
    contract_address: SDK.ContractAddress.Type,
    };

/**
 * Construct Parameter for update transactions for 'atomicUpdate' entrypoint of the 'registry' contract.
 * @param {AtomicUpdateParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createAtomicUpdateParameter(parameter: AtomicUpdateParameter): SDK.Parameter.Type {
    const field52 = parameter.module;
    const field53 = parameter.migrate;
    let match54: {'None' : [] } | {'Some' : [[string, string]] };
    switch (field53.type) {
        case 'None':
            match54 = { None: [], };
        break;
        case 'Some':
    const pair55: [string, string] = [field53.content[0], field53.content[1]];
            match54 = { Some: [pair55], };
        break;
    }
    const field56 = parameter.contract_address;
    const contractAddress57 = SDK.ContractAddress.toSchemaValue(field56);
    const named51 = {
    module: field52,
    migrate: match54,
    contract_address: contractAddress57,
    };
    const out = SDK.Parameter.fromBase64SchemaType('FAADAAAABgAAAG1vZHVsZR4gAAAABwAAAG1pZ3JhdGUVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAPFgEdARAAAABjb250cmFjdF9hZGRyZXNzDA==', named51);
    return out;
}

/**
 * Send an update-contract transaction to the 'atomicUpdate' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {AtomicUpdateParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendAtomicUpdate(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: AtomicUpdateParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('atomicUpdate'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createAtomicUpdateParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'atomicUpdate' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {AtomicUpdateParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunAtomicUpdate(contractClient: RegistryContract, parameter: AtomicUpdateParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('atomicUpdate'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createAtomicUpdateParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'atomicUpdate' entrypoint of the 'registry' contract. */
export type ErrorMessageAtomicUpdate = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};

/**
 * Get and parse the error message from dry-running update transaction for 'atomicUpdate' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageAtomicUpdate | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageAtomicUpdate(invokeResult: SDK.InvokeContractResult): ErrorMessageAtomicUpdate | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'NameNotRegistered' : [] } | {'UnauthorizedAccount' : [] } | {'InvokeContractError' : [] } | {'NoOwner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQcAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIRAAAATmFtZU5vdFJlZ2lzdGVyZWQCEwAAAFVuYXV0aG9yaXplZEFjY291bnQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBwAAAE5vT3duZXIC');
    let match58: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};
    if ('ParseParams' in schemaJson) {
       match58 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match58 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match58 = {
           type: 'LogMalformed',
       };
    } else if ('NameNotRegistered' in schemaJson) {
       match58 = {
           type: 'NameNotRegistered',
       };
    } else if ('UnauthorizedAccount' in schemaJson) {
       match58 = {
           type: 'UnauthorizedAccount',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match58 = {
           type: 'InvokeContractError',
       };
    } else if ('NoOwner' in schemaJson) {
       match58 = {
           type: 'NoOwner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match58
}

/** Parameter type for update transaction for 'getAddress' entrypoint of the 'registry' contract. */
export type GetAddressParameter = string;

/**
 * Construct Parameter for update transactions for 'getAddress' entrypoint of the 'registry' contract.
 * @param {GetAddressParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createGetAddressParameter(parameter: GetAddressParameter): SDK.Parameter.Type {
    const out = SDK.Parameter.fromBase64SchemaType('FgI=', parameter);
    return out;
}

/**
 * Send an update-contract transaction to the 'getAddress' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {GetAddressParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendGetAddress(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: GetAddressParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('getAddress'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createGetAddressParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'getAddress' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {GetAddressParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunGetAddress(contractClient: RegistryContract, parameter: GetAddressParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('getAddress'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createGetAddressParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'getAddress' entrypoint of the 'registry' contract. */
export type ReturnValueGetAddress = SDK.ContractAddress.Type;

/**
 * Get and parse the return value from dry-running update transaction for 'getAddress' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueGetAddress | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueGetAddress(invokeResult: SDK.InvokeContractResult): ReturnValueGetAddress | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <SDK.ContractAddress.SchemaValue>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'DA==');
    const contractAddress66 = SDK.ContractAddress.fromSchemaValue(schemaJson);
    return contractAddress66;
}

/** Parameter type for update transaction for 'owner' entrypoint of the 'registry' contract. */
export type OwnerParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'owner' entrypoint of the 'registry' contract.
 * @param {OwnerParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createOwnerParameter(parameter: OwnerParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'owner' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {OwnerParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendOwner(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: OwnerParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('owner'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createOwnerParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'owner' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {OwnerParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunOwner(contractClient: RegistryContract, parameter: OwnerParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('owner'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createOwnerParameter(parameter),
        blockHash
    );
}

/** Return value for dry-running update transaction for 'owner' entrypoint of the 'registry' contract. */
export type ReturnValueOwner = { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } };

/**
 * Get and parse the return value from dry-running update transaction for 'owner' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not successful.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ReturnValueOwner | undefined} The structured return value or undefined if result was not a success.
 */
export function parseReturnValueOwner(invokeResult: SDK.InvokeContractResult): ReturnValueOwner | undefined {
    if (invokeResult.tag !== 'success') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'None' : [] } | {'Some' : [{'Account' : [SDK.AccountAddress.SchemaValue] } | {'Contract' : [SDK.ContractAddress.SchemaValue] }] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQIAAAAEAAAATm9uZQIEAAAAU29tZQEBAAAAFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADA==');
    let match67: { type: 'None'} | { type: 'Some', content: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type } };
    if ('None' in schemaJson) {
       match67 = {
           type: 'None',
       };
    } else if ('Some' in schemaJson) {
       const variant69 = schemaJson.Some;
    let match70: { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type };
    if ('Account' in variant69[0]) {
       const variant71 = variant69[0].Account;
    const accountAddress72 = SDK.AccountAddress.fromSchemaValue(variant71[0]);
       match70 = {
           type: 'Account',
           content: accountAddress72,
       };
    } else if ('Contract' in variant69[0]) {
       const variant73 = variant69[0].Contract;
    const contractAddress74 = SDK.ContractAddress.fromSchemaValue(variant73[0]);
       match70 = {
           type: 'Contract',
           content: contractAddress74,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
       match67 = {
           type: 'Some',
           content: match70,
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match67;
}

/** Parameter type for update transaction for 'renounceOwnership' entrypoint of the 'registry' contract. */
export type RenounceOwnershipParameter = SDK.Parameter.Type;

/**
 * Construct Parameter for update transactions for 'renounceOwnership' entrypoint of the 'registry' contract.
 * @param {RenounceOwnershipParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createRenounceOwnershipParameter(parameter: RenounceOwnershipParameter): SDK.Parameter.Type {
    return parameter;
}

/**
 * Send an update-contract transaction to the 'renounceOwnership' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {RenounceOwnershipParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendRenounceOwnership(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: RenounceOwnershipParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('renounceOwnership'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createRenounceOwnershipParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'renounceOwnership' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {RenounceOwnershipParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunRenounceOwnership(contractClient: RegistryContract, parameter: RenounceOwnershipParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('renounceOwnership'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createRenounceOwnershipParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'renounceOwnership' entrypoint of the 'registry' contract. */
export type ErrorMessageRenounceOwnership = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};

/**
 * Get and parse the error message from dry-running update transaction for 'renounceOwnership' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageRenounceOwnership | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageRenounceOwnership(invokeResult: SDK.InvokeContractResult): ErrorMessageRenounceOwnership | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'NameNotRegistered' : [] } | {'UnauthorizedAccount' : [] } | {'InvokeContractError' : [] } | {'NoOwner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQcAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIRAAAATmFtZU5vdFJlZ2lzdGVyZWQCEwAAAFVuYXV0aG9yaXplZEFjY291bnQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBwAAAE5vT3duZXIC');
    let match75: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};
    if ('ParseParams' in schemaJson) {
       match75 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match75 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match75 = {
           type: 'LogMalformed',
       };
    } else if ('NameNotRegistered' in schemaJson) {
       match75 = {
           type: 'NameNotRegistered',
       };
    } else if ('UnauthorizedAccount' in schemaJson) {
       match75 = {
           type: 'UnauthorizedAccount',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match75 = {
           type: 'InvokeContractError',
       };
    } else if ('NoOwner' in schemaJson) {
       match75 = {
           type: 'NoOwner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match75
}

/** Parameter type for update transaction for 'transferOwnership' entrypoint of the 'registry' contract. */
export type TransferOwnershipParameter = { type: 'Account', content: SDK.AccountAddress.Type } | { type: 'Contract', content: SDK.ContractAddress.Type };

/**
 * Construct Parameter for update transactions for 'transferOwnership' entrypoint of the 'registry' contract.
 * @param {TransferOwnershipParameter} parameter The structured parameter to construct from.
 * @returns {SDK.Parameter.Type} The smart contract parameter.
 */
export function createTransferOwnershipParameter(parameter: TransferOwnershipParameter): SDK.Parameter.Type {
    let match83: {'Account' : [SDK.AccountAddress.SchemaValue] } | {'Contract' : [SDK.ContractAddress.SchemaValue] };
    switch (parameter.type) {
        case 'Account':
    const accountAddress84 = SDK.AccountAddress.toSchemaValue(parameter.content);
            match83 = { Account: [accountAddress84], };
        break;
        case 'Contract':
    const contractAddress85 = SDK.ContractAddress.toSchemaValue(parameter.content);
            match83 = { Contract: [contractAddress85], };
        break;
    }
    const out = SDK.Parameter.fromBase64SchemaType('FQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADA==', match83);
    return out;
}

/**
 * Send an update-contract transaction to the 'transferOwnership' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractTransactionMetadata} transactionMetadata - Metadata related to constructing a transaction for a smart contract.
 * @param {TransferOwnershipParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.AccountSigner} signer - The signer of the update contract transaction.
 * @throws If the entrypoint is not successfully invoked.
 * @returns {SDK.TransactionHash.Type} Hash of the transaction.
 */
export function sendTransferOwnership(contractClient: RegistryContract, transactionMetadata: SDK.ContractTransactionMetadata, parameter: TransferOwnershipParameter, signer: SDK.AccountSigner): Promise<SDK.TransactionHash.Type> {
    return contractClient.genericContract.createAndSendUpdateTransaction(
        SDK.EntrypointName.fromStringUnchecked('transferOwnership'),
        SDK.Parameter.toBuffer,
        transactionMetadata,
        createTransferOwnershipParameter(parameter),
        signer
    );
}

/**
 * Dry-run an update-contract transaction to the 'transferOwnership' entrypoint of the 'registry' contract.
 * @param {RegistryContract} contractClient The client for a 'registry' smart contract instance on chain.
 * @param {SDK.ContractAddress.Type | SDK.AccountAddress.Type} invokeMetadata - The address of the account or contract which is invoking this transaction.
 * @param {TransferOwnershipParameter} parameter - Parameter to provide the smart contract entrypoint as part of the transaction.
 * @param {SDK.BlockHash.Type} [blockHash] - Optional block hash allowing for dry-running the transaction at the end of a specific block.
 * @throws {SDK.RpcError} If failing to communicate with the concordium node or if any of the checks fails.
 * @returns {SDK.InvokeContractResult} The result of invoking the smart contract instance.
 */
export function dryRunTransferOwnership(contractClient: RegistryContract, parameter: TransferOwnershipParameter, invokeMetadata: SDK.ContractInvokeMetadata = {}, blockHash?: SDK.BlockHash.Type): Promise<SDK.InvokeContractResult> {
    return contractClient.genericContract.dryRun.invokeMethod(
        SDK.EntrypointName.fromStringUnchecked('transferOwnership'),
        invokeMetadata,
        SDK.Parameter.toBuffer,
        createTransferOwnershipParameter(parameter),
        blockHash
    );
}

/** Error message for dry-running update transaction for 'transferOwnership' entrypoint of the 'registry' contract. */
export type ErrorMessageTransferOwnership = { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};

/**
 * Get and parse the error message from dry-running update transaction for 'transferOwnership' entrypoint of the 'registry' contract.
 * Returns undefined if the result is not a failure.
 * @param {SDK.InvokeContractResult} invokeResult The result from dry-running the transaction.
 * @returns {ErrorMessageTransferOwnership | undefined} The structured error message or undefined if result was not a failure or failed for other reason than contract rejectedReceive.
 */
export function parseErrorMessageTransferOwnership(invokeResult: SDK.InvokeContractResult): ErrorMessageTransferOwnership | undefined {
    if (invokeResult.tag !== 'failure' || invokeResult.reason.tag !== 'RejectedReceive') {
        return undefined;
    }
    if (invokeResult.returnValue === undefined) {
        throw new Error('Unexpected missing \'returnValue\' in result of invocation. Client expected a V1 smart contract.');
    }
    const schemaJson = <{'ParseParams' : [] } | {'LogFull' : [] } | {'LogMalformed' : [] } | {'NameNotRegistered' : [] } | {'UnauthorizedAccount' : [] } | {'InvokeContractError' : [] } | {'NoOwner' : [] }>SDK.ReturnValue.parseWithSchemaTypeBase64(invokeResult.returnValue, 'FQcAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIRAAAATmFtZU5vdFJlZ2lzdGVyZWQCEwAAAFVuYXV0aG9yaXplZEFjY291bnQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBwAAAE5vT3duZXIC');
    let match86: { type: 'ParseParams'} | { type: 'LogFull'} | { type: 'LogMalformed'} | { type: 'NameNotRegistered'} | { type: 'UnauthorizedAccount'} | { type: 'InvokeContractError'} | { type: 'NoOwner'};
    if ('ParseParams' in schemaJson) {
       match86 = {
           type: 'ParseParams',
       };
    } else if ('LogFull' in schemaJson) {
       match86 = {
           type: 'LogFull',
       };
    } else if ('LogMalformed' in schemaJson) {
       match86 = {
           type: 'LogMalformed',
       };
    } else if ('NameNotRegistered' in schemaJson) {
       match86 = {
           type: 'NameNotRegistered',
       };
    } else if ('UnauthorizedAccount' in schemaJson) {
       match86 = {
           type: 'UnauthorizedAccount',
       };
    } else if ('InvokeContractError' in schemaJson) {
       match86 = {
           type: 'InvokeContractError',
       };
    } else if ('NoOwner' in schemaJson) {
       match86 = {
           type: 'NoOwner',
       };
    }
     else {
       throw new Error("Unexpected enum variant");
    }
    return match86
}
