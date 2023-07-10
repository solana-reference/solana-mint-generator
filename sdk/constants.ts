import type { IdlAccountData as cIdlAccountData } from "@cardinal/common";
import { emptyWallet } from "@cardinal/common";
import type { IdlTypes as cIdlTypes } from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { AllAccountsMap } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";

import type { MintGenerator as ProgramType } from "./idl/mint_generator";
import { IDL } from "./idl/mint_generator";

export const MINT_GENERATOR_IDL = IDL;
export type MintGenerator = ProgramType;
export const MINT_GENERATOR_PROGRAM_ID = new PublicKey(
  "mintjBhypUqvbKvCePPsQN55AYBY3DwFWpuR5PDURdH"
);

export const STRING_PREFIX_LENGTH = 4;
export const MAX_NAME_LENGTH = 32;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_URI_LENGTH = 200;
export const MINT_ENTRY_SIZE =
  MAX_NAME_LENGTH + MAX_SYMBOL_LENGTH + MAX_URI_LENGTH;

export type IdlAccountData<T extends keyof AllAccountsMap<MintGenerator>> =
  cIdlAccountData<T, MintGenerator>;
export type IdlTypes = cIdlTypes<MintGenerator>;

export const mintGeneratorProgram = (
  connection: Connection,
  wallet?: Wallet,
  options?: {
    programId?: PublicKey;
    confirmOptions?: ConfirmOptions;
  }
) => {
  return new Program<MintGenerator>(
    MINT_GENERATOR_IDL,
    options?.programId ?? MINT_GENERATOR_PROGRAM_ID,
    new AnchorProvider(
      connection,
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      options?.confirmOptions ?? {}
    )
  );
};
