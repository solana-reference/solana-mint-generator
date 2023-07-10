import { chunkArray } from "@cardinal/common";
import { utils } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  MAX_NAME_LENGTH,
  MINT_ENTRY_SIZE,
  mintGeneratorProgram,
  STRING_PREFIX_LENGTH,
} from "../../sdk";
import { executeTransactionBatches } from "../utils";

export const commandName = "setMintEntries";
export const description = "Set mint config entries";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  // file to read entry mints from
  entryFile: `cli/metadata/data/bodoggos.csv`,
  entryDatas: [] as {
    index: number;
    name: string;
    symbol: string;
    uri: string;
  }[],
  // number of entries per transaction
  batchSize: 6,
  // number of transactions in parallel
  parallelBatchSize: 6,
  startCount: 0,
  endCount: 10000,
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;
  const mintConfigId = findMintConfigId(configName);

  // read entries
  let entryDatas: {
    index: number;
    name: string;
    symbol: string;
    uri: string;
  }[] = args.entryDatas || [];

  if (args.entryFile && entryDatas.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const file = require("fs").readFileSync(args.entryFile, {
      encoding: "utf-8",
    }) as string;
    entryDatas = file
      .split("\n")
      .slice(1)
      .map((v, i) => {
        const [name, symbol, uri] = v.split(",");
        if (!symbol || !name || !uri) throw "Invalid csv input";
        return {
          index: i,
          symbol,
          name,
          uri,
        };
      })
      .slice(args.startCount, args.endCount);
  }

  console.log(`\n1/3 Fetching data...`);
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );
  const remainingTokens = mintConfig.parsed.supply
    .sub(mintConfig.parsed.count)
    .toNumber();
  const mintEntryBytes = mintConfig?.data.slice(
    mintConfig.data.length - MINT_ENTRY_SIZE * remainingTokens
  );

  console.log(`\n2/3 Building transactions...`);
  const txs = [];
  const chunks = chunkArray(entryDatas, args.batchSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const tx = new Transaction();
    console.log(`> ${i}/${chunks.length}`);
    for (let j = 0; j < chunk.length; j++) {
      const { index, symbol, name, uri } = chunk[j]!;
      const startOffset = index * MINT_ENTRY_SIZE;
      const configLineBytes = mintEntryBytes?.slice(
        startOffset,
        startOffset + MINT_ENTRY_SIZE
      );
      const isSet =
        utils.bytes.utf8
          .decode(configLineBytes.slice(STRING_PREFIX_LENGTH, MAX_NAME_LENGTH))
          .replace(/\0/g, "") === name;
      console.log(
        `>>[${j}/${chunk.length}][${isSet.toString()}] ${name.toString()}`
      );
      if (!isSet) {
        const ix = await mintGeneratorProgram(connection, wallet)
          .methods.setMintEntry({
            index: new BN(index),
            symbol: symbol,
            name: name,
            uri: uri,
          })
          .accountsStrict({
            mintConfig: mintConfigId,
            authority: wallet.publicKey,
            payer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(ix);
      }
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
