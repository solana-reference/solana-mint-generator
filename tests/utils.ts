import type { CardinalProvider } from "@cardinal/common";
import {
  findMintEditionId,
  findMintMetadataId,
  findRuleSetId,
  findTokenRecordId,
  getTestConnection,
  newAccountWithLamports,
} from "@cardinal/common";
import { Wallet } from "@coral-xyz/anchor";
import { createCreateOrUpdateInstruction } from "@metaplex-foundation/mpl-token-auth-rules";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createDelegateInstruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { encode } from "@msgpack/msgpack";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { findCollectionDelegateId } from "../sdk";

export async function getTestProvider(
  lamports?: number
): Promise<CardinalProvider> {
  const connection = getTestConnection();
  const keypair = await newAccountWithLamports(connection, lamports);
  const wallet = new Wallet(keypair);
  return {
    connection,
    wallet,
  };
}

export const getTestConfigName = () => {
  return `test-${Math.floor(Math.random() * 100000)}`;
};

export const createRulesetIx = (
  provider: CardinalProvider
): [TransactionInstruction, PublicKey] => {
  const rulesetName = `rs-${Math.floor(Date.now() / 1000)}`;
  const rulesetId = findRuleSetId(provider.wallet.publicKey, rulesetName);
  const rulesetIx = createCreateOrUpdateInstruction(
    {
      payer: provider.wallet.publicKey,
      ruleSetPda: rulesetId,
    },
    {
      createOrUpdateArgs: {
        __kind: "V1",
        serializedRuleSet: encode([
          1,
          provider.wallet.publicKey.toBuffer().reduce((acc, i) => {
            acc.push(i);
            return acc;
          }, [] as number[]),
          rulesetName,
          {},
        ]),
      },
    }
  );
  return [rulesetIx, rulesetId];
};

export const createMasterEditionTx = async (
  connection: Connection,
  mintId: PublicKey,
  authority: PublicKey,
  collectionAuthority: PublicKey,
  options?: {
    uri?: string;
    target?: PublicKey;
    collectionAuthority?: PublicKey;
  }
) => {
  const target = options?.target ?? authority;
  const ata = getAssociatedTokenAddressSync(mintId, target);
  const editionId = findMintEditionId(mintId);
  const metadataId = findMintMetadataId(mintId);

  return new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: authority,
      newAccountPubkey: mintId,
      space: MINT_SIZE,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mintId, 0, authority, authority),
    createAssociatedTokenAccountInstruction(authority, ata, target, mintId),
    createMintToInstruction(mintId, ata, authority, 1),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        mint: mintId,
        updateAuthority: authority,
        mintAuthority: authority,
        payer: authority,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: `name-${Math.random()}`,
            symbol: "SYMB",
            uri: options?.uri ?? "uri",
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          collectionDetails: {
            __kind: "V1",
            size: 0,
          },
          isMutable: true,
        },
      }
    ),
    createCreateMasterEditionV3Instruction(
      {
        edition: editionId,
        mint: mintId,
        updateAuthority: authority,
        mintAuthority: authority,
        metadata: metadataId,
        payer: authority,
      },
      { createMasterEditionArgs: { maxSupply: 0 } }
    ),
    createDelegateInstruction(
      {
        payer: authority,
        metadata: metadataId,
        mint: mintId,
        delegate: collectionAuthority,
        authority: authority,
        token: ata,
        tokenRecord: findTokenRecordId(mintId, ata),
        delegateRecord: findCollectionDelegateId(
          mintId,
          authority,
          collectionAuthority
        ),
        splTokenProgram: TOKEN_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        delegateArgs: {
          __kind: "CollectionV1",
          authorizationData: null,
        },
      }
    )
  );
};
