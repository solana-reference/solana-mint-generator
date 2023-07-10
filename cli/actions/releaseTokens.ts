import { chunkArray, executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { type Connection, SystemProgram, Transaction } from "@solana/web3.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  getProgramIdlAccounts,
  mintGeneratorProgram,
  releaseOutputMint,
} from "../../sdk";
import { executeTransactionBatches } from "../utils";

export const commandName = "releaseTokens";
export const description = "Release frozen tokens from mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos-test-ipfs",
  batchSize: 5,
  parallelBatchSize: 10,
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;
  const mintConfigId = findMintConfigId(configName);
  const mintConfigData = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );

  const outputMintsPendingRelease = await getProgramIdlAccounts(
    connection,
    "outputMintPendingRelease",
    {
      filters: [{ memcmp: { offset: 9, bytes: mintConfigId.toBase58() } }],
    }
  );

  console.log(`\n1/3 Removing release authority...`);
  if (mintConfigData.parsed.outputMintConfig.releaseAuthority) {
    const tx = new Transaction();
    const ix = await mintGeneratorProgram(connection, wallet)
      .methods.updateMintConfig({
        ...mintConfigData.parsed,
        outputMintConfig: {
          ...mintConfigData.parsed.outputMintConfig,
          releaseAuthority: null,
        },
      })
      .accountsStrict({
        authority: wallet.publicKey,
        mintConfig: mintConfigId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    tx.add(ix);
    const txid = await executeTransaction(connection, tx, wallet);
    console.log(
      `Removed release authority https://explorer.solana.com/tx/${txid}`
    );
  }

  console.log(`\n2/3 Building transactions...`);
  const txs = [];
  const chunks = chunkArray(outputMintsPendingRelease, args.batchSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const tx = new Transaction();
    console.log(`> ${i}/${chunks.length}`);
    for (let j = 0; j < chunk.length; j++) {
      const data = chunk[j]!;
      const transaction = await releaseOutputMint(
        connection,
        wallet,
        mintConfigData,
        data.parsed!.mint,
        data.parsed!.holder
      );
      tx.instructions = [...tx.instructions, ...transaction.instructions];
    }
    if (tx.instructions.length > 0) {
      txs.push(tx);
    }
  }

  console.log(
    `\n3/3 Executing ${txs.length} transactions batches=${args.parallelBatchSize}...`
  );
  if (!args.dryRun) {
    await executeTransactionBatches(connection, txs, wallet, {
      batchSize: args.parallelBatchSize,
      successHandler: (txid, { i, j, it, jt }) =>
        console.log(
          `>> ${i + 1}/${it} ${
            j + 1
          }/${jt} https://explorer.solana.com/tx/${txid}`
        ),
      errorHandler: (e, { i, j, it, jt }) =>
        console.log(`>> ${i + 1}/${it} ${j + 1}/${jt} error=`, e),
    });
  }
};
