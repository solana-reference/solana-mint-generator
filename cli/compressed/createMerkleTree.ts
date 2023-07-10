import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { createCreateTreeInstruction } from "@metaplex-foundation/mpl-bubblegum";
import type { ValidDepthSizePair } from "@solana/spl-account-compression";
import {
  createAllocTreeIx,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import type { Connection } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import { findMerkleTreeAuthorityId } from "../../sdk";

export const commandName = "createMerkleTree";
export const description = "Create merkle tree for compressed nfts";

export const getArgs = (
  _connection: Connection,
  _wallet: Wallet
): { config: ValidDepthSizePair; dryRun: boolean } => ({
  config: { maxDepth: 14, maxBufferSize: 64 },
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { config } = args;
  const tx = new Transaction();
  const merkleTreeKeypair = Keypair.generate();
  const merkleTreeId = merkleTreeKeypair.publicKey;
  tx.add(
    await createAllocTreeIx(
      connection,
      merkleTreeId,
      wallet.publicKey,
      config,
      1
    )
  );
  tx.add(
    createCreateTreeInstruction(
      {
        treeAuthority: findMerkleTreeAuthorityId(merkleTreeId),
        merkleTree: merkleTreeId,
        payer: wallet.publicKey,
        treeCreator: wallet.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      },
      {
        maxDepth: config.maxDepth,
        maxBufferSize: config.maxBufferSize,
        public: false,
      }
    )
  );
  const txid = await executeTransaction(connection, tx, wallet, {
    signers: [merkleTreeKeypair],
  });

  console.log(
    `[success] Created tree ${merkleTreeId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
