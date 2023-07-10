import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { createSetTreeDelegateInstruction } from "@metaplex-foundation/mpl-bubblegum";
import type { Connection } from "@solana/web3.js";
import { PublicKey, Transaction } from "@solana/web3.js";

import { findMerkleTreeAuthorityId, findMintConfigId } from "../../sdk";

export const commandName = "delegateMerkleTreeForMint";
export const description = "Delegate a merkle tree for minting";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "compressed-test",
  merkleTreeId: new PublicKey("29kF84mdWusi3HSyFWTXXs5vP9hwkHLAYg6VmAk8XC9r"),
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName, merkleTreeId } = args;
  const tx = new Transaction();
  tx.add(
    createSetTreeDelegateInstruction({
      treeAuthority: findMerkleTreeAuthorityId(merkleTreeId),
      merkleTree: merkleTreeId,
      treeCreator: wallet.publicKey,
      newTreeDelegate: findMintConfigId(configName),
    })
  );
  const txid = await executeTransaction(connection, tx, wallet);

  console.log(
    `[success] Tree delegated to mint ${configName} https://explorer.solana.com/tx/${txid}.`
  );
};
