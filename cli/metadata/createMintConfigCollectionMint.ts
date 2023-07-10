import {
  executeTransaction,
  findMintEditionId,
  findMintMetadataId,
  findTokenRecordId,
} from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createDelegateInstruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { findCollectionDelegateId, findMintConfigId } from "../../sdk";

export const commandName = "createMintConfigCollectionMint";
export const description =
  "Create a collection mint and assign authority to mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos-team",
  collectionName: "Bodoggos",
  collectionSymbol: "DOG",
  collectionUri:
    "https://ipfs.io/ipfs/QmTSzoK7azwsomPbUeXBWRZxcQzwQunXRU6EnJpYrqSXKA",
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName, collectionName, collectionSymbol, collectionUri } = args;
  const mintConfigId = findMintConfigId(configName);

  const transaction = new Transaction();
  const collectionMintKeypair = Keypair.generate();
  const mintId = collectionMintKeypair.publicKey;
  const ata = getAssociatedTokenAddressSync(mintId, wallet.publicKey, true);
  const editionId = findMintEditionId(mintId);
  const metadataId = findMintMetadataId(mintId);
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintId,
      space: MINT_SIZE,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mintId,
      0,
      wallet.publicKey,
      wallet.publicKey
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      ata,
      wallet.publicKey,
      mintId
    ),
    createMintToInstruction(mintId, ata, wallet.publicKey, 1),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        mint: mintId,
        updateAuthority: wallet.publicKey,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: collectionName,
            symbol: collectionSymbol,
            uri: collectionUri,
            sellerFeeBasisPoints: 10000,
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
        updateAuthority: wallet.publicKey,
        mintAuthority: wallet.publicKey,
        metadata: metadataId,
        payer: wallet.publicKey,
      },
      { createMasterEditionArgs: { maxSupply: 0 } }
    ),
    createDelegateInstruction(
      {
        payer: wallet.publicKey,
        metadata: metadataId,
        mint: mintId,
        delegate: mintConfigId,
        authority: wallet.publicKey,
        token: ata,
        tokenRecord: findTokenRecordId(mintId, ata),
        delegateRecord: findCollectionDelegateId(
          mintId,
          wallet.publicKey,
          mintConfigId
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
  const txid = await executeTransaction(connection, transaction, wallet, {
    signers: [collectionMintKeypair],
  });
  console.log(
    `[success] Created collection mint ${collectionMintKeypair.publicKey.toString()} (${collectionMintKeypair.secretKey.toString()}) for mintConfig ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
