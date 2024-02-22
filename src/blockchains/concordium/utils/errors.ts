import {FailedTransactionSummary, RejectedReceive, InvokeContractFailedResult} from '@concordium/web-sdk';

enum UmbrellaFeedsCustomContractErrors {
  /// Failed to parse the parameter.
  ParseParams = -1,
  /// Failed to log because the log is full.
  LogFull = -2,
  /// Failed to log because the log is malformed.
  LogMalformed = -3,
  /// Failed to invoke a contract.
  InvokeContractError = -4,
  /// Failed to provide enough signatures.
  InvalidRequiredSignatures = -5,
  /// Failed to because the data is outdated.
  OldData = -6,
  /// Failed because it is the wrong contract.
  WrongContract = -7,
  /// Failed because the signature is outdated.
  Expired = -8,
  /// Failed because the feed does not exist.
  FeedNotExist = -9,
  /// Failed because of unauthorized invoke of the entry point.
  Unauthorized = -10,
  /// Upgrade failed because the new module does not exist.
  FailedUpgradeMissingModule = -11,
  /// Upgrade failed because the new module does not contain a contract with a
  /// matching name.
  FailedUpgradeMissingContract = -12,
  /// Upgrade failed because the smart contract version of the module is not
  /// supported.
  FailedUpgradeUnsupportedModuleVersion = -13,
  /// Failed to verify signature because data was malformed.
  MalformedData = -14,
  /// Failed signature verification because of an invalid signature.
  WrongSignature = -15,
  /// Failed because the account is missing on the chain.
  MissingAccount = -16,
  /// Failed because not enough signatures were provided.
  NotEnoughSignatures = -17,
  /// Failed because the signatures are not in order.
  SignaturesOutOfOrder = -18,
  /// Failed because one of the given signers is not a validator.
  InvalidSigner = -19,
}

const umbrellaFeedsCustomContractErrorsDesc: Record<string, string> = {
  ParseParams: 'Failed to parse the parameter.',
  LogFull: 'Failed to log because the log is full.',
  LogMalformed: 'Failed to log because the log is malformed.',
  InvokeContractError: 'Failed to invoke a contract.',
  InvalidRequiredSignatures: 'Failed to provide enough signatures.',
  OldData: 'Failed to because the data is outdated.',
  WrongContract: 'Failed because it is the wrong contract.',
  Expired: 'Failed because the signature is outdated.',
  FeedNotExist: 'Failed because the feed does not exist.',
  Unauthorized: 'Failed because of unauthorized invoke of the entry point.',
  FailedUpgradeMissingModule: 'Upgrade failed because the new module does not exist.',
  FailedUpgradeMissingContract:
    'Upgrade failed because the new module does not contain a contract with a matching name.',
  FailedUpgradeUnsupportedModuleVersion:
    'Upgrade failed because the smart contract version of the module is not supported.',
  MalformedData: 'Failed to verify signature because data was malformed.',
  WrongSignature: 'Failed signature verification because of an invalid signature.',
  MissingAccount: 'Failed because the account is missing on the chain.',
  NotEnoughSignatures: 'Failed because not enough signatures were provided.',
  SignaturesOutOfOrder: 'Failed because the signatures are not in order.',
  InvalidSigner: 'Failed because one of the given signers is not a validator.',
};

export function resolveError(index: number): string {
  if (UmbrellaFeedsCustomContractErrors[index]) {
    const key = UmbrellaFeedsCustomContractErrors[index];
    return `[${index}] ${key} - ${umbrellaFeedsCustomContractErrorsDesc[key]}`;
  }

  return `[${index}] unknown erorr`;
}

export function decodeDryRunError(summary: InvokeContractFailedResult): string {
  return summary.reason.tag == 'RejectedReceive'
    ? resolveError((summary.reason as unknown as RejectedReceive).rejectReason)
    : `rejectReason: ${summary.reason.tag}`;
}

export function decodeError(summary: FailedTransactionSummary): string {
  return summary.rejectReason.tag == 'RejectedReceive'
    ? resolveError((summary.rejectReason as unknown as RejectedReceive).rejectReason)
    : `rejectReason: ${summary.rejectReason.tag}`;
}
