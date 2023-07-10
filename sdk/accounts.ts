import type {
  NullableIdlAccountData,
  NullableIdlAccountInfo,
  ParsedIdlAccount,
} from "@cardinal/common";
import {
  decodeIdlAccount as cDecodeIdlAccount,
  decodeIdlAccountUnknown as cDecodeIdlAccountUnknown,
  fetchIdlAccount as cFetchIdlAccount,
  fetchIdlAccountNullable as cFetchIdlAccountNullable,
  getBatchedMultipleAccounts,
  getProgramIdlAccounts as cGetProgramIdlAccounts,
  tryDecodeIdlAccount as cTryDecodeIdlAccount,
  tryDecodeIdlAccountUnknown as cTryDecodeIdlAccountUnknown,
} from "@cardinal/common";
import type { AllAccountsMap } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import type {
  AccountInfo,
  Connection,
  GetAccountInfoConfig,
  GetProgramAccountsConfig,
  PublicKey,
} from "@solana/web3.js";

import type { MintGenerator as PROGRAM_TYPE } from "./constants";
import {
  MINT_GENERATOR_IDL as IDL,
  MINT_GENERATOR_PROGRAM_ID as PROGRAM_ID,
} from "./constants";

/**
 * Fetch an account with idl types
 * @param connection
 * @param pubkey
 * @param accountType
 * @param config
 * @returns
 */
export const fetchIdlAccount = async <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  connection: Connection,
  pubkey: PublicKey,
  accountType: T,
  config?: GetAccountInfoConfig
) => {
  return cFetchIdlAccount<T, PROGRAM_TYPE>(
    connection,
    pubkey,
    accountType,
    IDL,
    config
  );
};

/**
 * Fetch a possibly null account with idl types of a specific type
 * @param connection
 * @param pubkey
 * @param accountType
 * @param config
 * @param idl
 * @returns
 */
export const fetchIdlAccountNullable = async <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  connection: Connection,
  pubkey: PublicKey,
  accountType: T,
  config?: GetAccountInfoConfig
) => {
  return cFetchIdlAccountNullable<T, PROGRAM_TYPE>(
    connection,
    pubkey,
    accountType,
    IDL,
    config
  );
};

/**
 * Decode an account with idl types of a specific type
 * @param accountInfo
 * @param accountType
 * @param idl
 * @returns
 */
export const decodeIdlAccount = <T extends keyof AllAccountsMap<PROGRAM_TYPE>>(
  accountInfo: AccountInfo<Buffer>,
  accountType: T
) => {
  return cDecodeIdlAccount<T, PROGRAM_TYPE>(accountInfo, accountType, IDL);
};

/**
 * Try to decode an account with idl types of specific type
 * @param accountInfo
 * @param accountType
 * @param idl
 * @returns
 */
export const tryDecodeIdlAccount = <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  accountInfo: AccountInfo<Buffer>,
  accountType: T
) => {
  return cTryDecodeIdlAccount<T, PROGRAM_TYPE>(accountInfo, accountType, IDL);
};

/**
 * Decode an idl account of unknown type
 * @param accountInfo
 * @param idl
 * @returns
 */
export const decodeIdlAccountUnknown = <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  accountInfo: AccountInfo<Buffer> | null
): AccountInfo<Buffer> & ParsedIdlAccount<PROGRAM_TYPE>[T] => {
  return cDecodeIdlAccountUnknown<T, PROGRAM_TYPE>(accountInfo, IDL);
};

/**
 * Try to decode an account with idl types of unknown type
 * @param accountInfo
 * @param idl
 * @returns
 */
export const tryDecodeIdlAccountUnknown = <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  accountInfo: AccountInfo<Buffer>
): NullableIdlAccountInfo<T, PROGRAM_TYPE> => {
  return cTryDecodeIdlAccountUnknown<T, PROGRAM_TYPE>(accountInfo, IDL);
};

/**
 * Get program accounts of a specific idl type
 * @param connection
 * @param accountType
 * @param config
 * @param programId
 * @param idl
 * @returns
 */
export const getProgramIdlAccounts = async <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  connection: Connection,
  accountType: T,
  config?: GetProgramAccountsConfig
) => {
  return cGetProgramIdlAccounts<T, PROGRAM_TYPE>(
    connection,
    accountType,
    PROGRAM_ID,
    IDL,
    config
  );
};

export type IdlAccountDataById<T extends keyof AllAccountsMap<PROGRAM_TYPE>> = {
  [accountId: string]: NullableIdlAccountData<T, PROGRAM_TYPE>;
};

/**
 * Decode account infos with corresponding ids
 * @param accountIds
 * @param accountInfos
 * @returns
 */
export const decodeAccountInfos = <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  accountIds: PublicKey[],
  accountInfos: (AccountInfo<Buffer> | null)[]
): IdlAccountDataById<T> => {
  return accountInfos.reduce((acc, accountInfo, i) => {
    if (!accountInfo?.data) return acc;
    const accoutIdString = accountIds[i]?.toString() ?? "";
    const ownerString = accountInfo.owner.toString();
    const baseData = {
      timestamp: Date.now(),
      pubkey: accountIds[i]!,
    };
    switch (ownerString) {
      // stakePool
      case PROGRAM_ID.toString(): {
        acc[accoutIdString] = {
          ...baseData,
          ...tryDecodeIdlAccountUnknown<T>(accountInfo),
        };
        return acc;
      }
      // fallback
      default:
        acc[accoutIdString] = {
          ...baseData,
          ...accountInfo,
          type: "unknown",
          parsed: null,
        };
        return acc;
    }
  }, {} as IdlAccountDataById<T>);
};

/**
 * Batch fetch a map of accounts and their corresponding ids
 * @param connection
 * @param ids
 * @returns
 */
export const fetchIdlAccountDataById = async <
  T extends keyof AllAccountsMap<PROGRAM_TYPE>
>(
  connection: Connection,
  ids: (PublicKey | null)[]
): Promise<IdlAccountDataById<T>> => {
  const filteredIds = ids.filter((id): id is PublicKey => id !== null);
  const accountInfos = await getBatchedMultipleAccounts(
    connection,
    filteredIds
  );
  return decodeAccountInfos(filteredIds, accountInfos);
};
