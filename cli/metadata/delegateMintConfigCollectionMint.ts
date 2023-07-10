import {
  executeTransaction,
  findMintMetadataId,
  findTokenRecordId,
} from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { createDelegateInstruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import {
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { findCollectionDelegateId, findMintConfigId } from "../../sdk";

export const commandName = "delegateMintConfigCollectionMint";
export const description =
  "Delegate an existing collection mint to a mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  collectionMintId: new PublicKey(
    "69k55dCTwiUPNgaTZ8FVMADorTvEGJEGuAGEB7m1qB1S"
  ),
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;
  const mintConfigId = findMintConfigId(configName);

  const transaction = new Transaction();
  const mintId = args.collectionMintId;
  const ata = getAssociatedTokenAddressSync(mintId, wallet.publicKey, true);
  const metadataId = findMintMetadataId(mintId);
  transaction.add(
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
  const txid = await executeTransaction(connection, transaction, wallet);
  console.log(
    `[success] Created collection mint ${mintId.toString()} for mintConfig ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
