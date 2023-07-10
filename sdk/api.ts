import {
  findMintEditionId,
  findMintMetadataId,
  findTokenRecordId,
  METADATA_PROGRAM_ID,
  TOKEN_AUTH_RULES_ID,
} from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import type { IdlAccountData } from "./";
import {
  fetchIdlAccount,
  findOutputMintPendingReleaseId,
  mintGeneratorProgram,
} from "./";
import {
  getRemainingAccountsForTokenChecks,
  remainingAccountsForAuthorization,
  remainingAccountsForCollection,
  remainingAccountsForMintCnft,
  remainingAccountsForMintNft,
  remainingAccountsForRelease,
} from "./utils";

export const mint = async (
  connection: Connection,
  wallet: Wallet,
  mintConfigId: PublicKey,
  mintPhaseIx: number,
  options?: {
    payer?: PublicKey;
    outputMintKeypair?: Keypair;
    programId?: PublicKey;
    computeLimit?: number;
  }
): Promise<[Transaction, Keypair | null]> => {
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );
  return mintSync(connection, wallet, mintConfig, mintPhaseIx, options);
};

export const mintSync = async (
  connection: Connection,
  wallet: Wallet,
  mintConfig: IdlAccountData<"mintConfig">,
  mintPhaseIx: number,
  options?: {
    payer?: PublicKey;
    outputMintKeypair?: Keypair;
    programId?: PublicKey;
    computeLimit?: number;
  }
): Promise<[Transaction, Keypair | null]> => {
  const mintPhase = mintConfig.parsed.mintPhases[mintPhaseIx];
  if (!mintPhase) throw "Invalid mint phase";
  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: options?.computeLimit ?? 2_000_000,
    })
  );
  let outputMintKeypair: Keypair | null = null;
  const remainingAccounts = [
    ...(await getRemainingAccountsForTokenChecks(
      connection,
      mintPhase.tokenChecks,
      options?.payer ?? wallet.publicKey
    )),
    ...remainingAccountsForAuthorization(
      mintConfig.pubkey,
      mintPhaseIx,
      wallet.publicKey,
      options?.payer ?? wallet.publicKey,
      mintPhase.authorization
    ),
  ];

  if (mintConfig.parsed.outputMintConfig.merkleTree) {
    remainingAccounts.push(
      ...remainingAccountsForMintCnft(
        mintConfig.parsed.outputMintConfig.merkleTree
      )
    );
  } else {
    outputMintKeypair = options?.outputMintKeypair ?? Keypair.generate();
    remainingAccounts.push(
      ...remainingAccountsForMintNft(
        outputMintKeypair.publicKey,
        wallet.publicKey,
        mintConfig.parsed.outputMintConfig.ruleset
      ),
      ...remainingAccountsForCollection(
        mintConfig.pubkey,
        mintConfig.parsed.authority,
        mintConfig.parsed.outputMintConfig.collection
      ),
      ...remainingAccountsForRelease(
        mintConfig.pubkey,
        outputMintKeypair.publicKey,
        mintConfig.parsed.outputMintConfig.releaseAuthority
      )
    );
  }
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.mint({
        mintPhaseIx,
      })
      .accountsStrict({
        mintConfig: mintConfig.pubkey,
        user: wallet.publicKey,
        payer: options?.payer ?? wallet.publicKey,
        collector: mintConfig.parsed.authority,
        recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction()
  );

  return [tx, outputMintKeypair];
};

export const releaseOutputMint = async (
  connection: Connection,
  wallet: Wallet,
  mintConfigData: IdlAccountData<"mintConfig">,
  mintId: PublicKey,
  holder: PublicKey
): Promise<Transaction> => {
  const tx = new Transaction();
  const outputMintPendingReleaseId = findOutputMintPendingReleaseId(
    mintConfigData.pubkey,
    mintId
  );
  const outputMintUserTokenAccountId = getAssociatedTokenAddressSync(
    mintId,
    holder,
    true
  );
  const outputMintMetadataId = findMintMetadataId(mintId);
  const outputMintEditionId = findMintEditionId(mintId);
  const outputMintUserTokenRecordId = findTokenRecordId(
    mintId,
    outputMintUserTokenAccountId
  );

  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.releaseOutputMint()
      .accountsStrict({
        mintConfig: mintConfigData.pubkey,
        outputMintPendingRelease: outputMintPendingReleaseId,
        user: holder,
        outputMintUserTokenAccount: outputMintUserTokenAccountId,
        outputMint: mintId,
        outputMintMetadata: outputMintMetadataId,
        outputMintEdition: outputMintEditionId,
        outputMintUserTokenRecord: outputMintUserTokenRecordId,
        outputMintAuthorizationRules:
          mintConfigData.parsed.outputMintConfig.ruleset ?? METADATA_PROGRAM_ID,
        payer: wallet.publicKey,
        releaseAuthority: wallet.publicKey,
        collector: holder,
        systemProgram: SystemProgram.programId,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
      })
      .instruction()
  );
  return tx;
};
