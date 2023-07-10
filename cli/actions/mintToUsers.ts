import { chunkArray, emptyWallet } from "@cardinal/common";
import { utils } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  getProgramIdlAccounts,
  mintSync,
} from "../../sdk";
import { executeTransactionBatches } from "../utils";

export const commandName = "mintToUsers";
export const description = "Mint tokens for users";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  phaseIx: 0,
  batchSize: 1,
  parallelBatchSize: 20,
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName, phaseIx } = args;
  const mintConfigId = findMintConfigId(configName);
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );

  console.log(`\n1/3 Fetching data...`);
  const mintPhaseAuthorizations =
    await getProgramIdlAccounts<"mintPhaseAuthorization">(
      connection,
      "mintPhaseAuthorization",
      {
        filters: [
          {
            memcmp: {
              offset: 9,
              bytes: mintConfigId.toBase58(),
            },
          },
          {
            memcmp: {
              offset: 9 + 32,
              bytes: utils.bytes.bs58.encode(
                new BN(phaseIx).toArrayLike(Buffer, "le", 1)
              ),
            },
          },
        ],
      }
    );

  console.log(`\n2/3 Building transactions...`);
  const txs: { tx: Transaction; signers: Keypair[] }[] = [];
  const groupedAuthorizations = mintPhaseAuthorizations
    .sort((a, b) =>
      (a.parsed?.user.toString() ?? "").localeCompare(
        b.parsed?.user.toString() ?? ""
      )
    )
    .reduce((acc, mintPhaseAuthorization, i) => {
      if (!mintPhaseAuthorization.parsed) throw "No data found";
      const isSet = mintPhaseAuthorization.parsed?.remaining?.toNumber() === 0;
      console.log(
        `>>[${i}/${
          mintPhaseAuthorizations.length
        }][${isSet.toString()}] ${mintPhaseAuthorization.parsed.user.toString()},${mintPhaseAuthorization.parsed.count.toString()},${
          mintPhaseAuthorization.parsed?.remaining?.toString() ?? ""
        }`
      );
      for (
        let j = 0;
        j < (mintPhaseAuthorization.parsed.remaining?.toNumber() ?? 0);
        j++
      ) {
        acc.push({ user: mintPhaseAuthorization.parsed.user });
      }
      return acc;
    }, [] as { user: PublicKey }[]);
  const chunks = chunkArray(groupedAuthorizations, args.batchSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const tx = new Transaction();
    const signers: Keypair[] = [];
    console.log(`> ${i}/${chunks.length}`);
    for (let j = 0; j < chunk.length; j++) {
      const { user } = chunk[j]!;
      console.log(`>>[${j}/${chunk.length}] ${user.toString()}`);
      const [transaction, outputMintKeypair] = await mintSync(
        connection,
        emptyWallet(user),
        mintConfig,
        args.phaseIx,
        {
          payer: wallet.publicKey,
        }
      );
      if (outputMintKeypair) {
        signers.push(outputMintKeypair);
      }
      tx.add(...transaction.instructions);
    }
    if (tx.instructions.length > 0) {
      txs.push({ tx, signers });
    }
  }

  console.log(
    `\n3/3 Executing ${txs.length} transactions batches=${args.parallelBatchSize}...`
  );
  if (!args.dryRun) {
    await executeTransactionBatches(
      connection,
      txs.map(({ tx }) => tx),
      wallet,
      {
        signers: txs.map(({ signers }) => signers),
        batchSize: args.parallelBatchSize,
        successHandler: (txid, { i, j, it, jt }) =>
          console.log(
            `>> ${i + 1}/${it} ${
              j + 1
            }/${jt} https://explorer.solana.com/tx/${txid}`
          ),
        errorHandler: (e, { i, j, it, jt }) =>
          console.log(`>> ${i + 1}/${it} ${j + 1}/${jt} error=`, e),
      }
    );
  }
};
