import { chunkArray, tryPublicKey } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import type { IdlAccountData } from "../../sdk";
import {
  findMintConfigId,
  findMintPhaseAuthorizationId,
  getProgramIdlAccounts,
  mintGeneratorProgram,
} from "../../sdk";
import { executeTransactionBatches } from "../utils";

export const commandName = "setMintPhaseAuthorizations";
export const description = "Set an authorization";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  entryFile: `cli/authorization/data/bodoggos-1.csv`,
  batchSize: 10,
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const file = require("fs").readFileSync(args.entryFile, {
    encoding: "utf-8",
  }) as string;
  const entryDatas = file
    .split("\n")
    .slice(1)
    .map((v) => {
      const [userString, phaseIxString, remainingString] = v.split(",");
      const user = tryPublicKey(userString);
      const phaseIx = Number(phaseIxString);
      const remaining = Number(remainingString);
      if (!user) {
        console.log(userString);
        throw "Invalid csv input";
      }
      return {
        user,
        phaseIx,
        remaining,
      };
    });

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
        ],
      }
    );
  const mintPhaseAuthorizationsById = mintPhaseAuthorizations.reduce(
    (acc, a) => {
      if (a.parsed) {
        acc[a.pubkey.toString()] = a.parsed;
      }
      return acc;
    },
    {} as { [s: string]: IdlAccountData<"mintPhaseAuthorization">["parsed"] }
  );

  console.log(`\n2/3 Building transactions...`);
  const txs = [];
  const chunks = chunkArray(entryDatas, args.batchSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const tx = new Transaction();
    console.log(`> ${i}/${chunks.length}`);
    for (let j = 0; j < chunk.length; j++) {
      const { user, remaining, phaseIx } = chunk[j]!;
      const mintPhaseAuthorizationId = findMintPhaseAuthorizationId(
        mintConfigId,
        phaseIx,
        user
      );
      const isSet =
        (mintPhaseAuthorizationsById[
          mintPhaseAuthorizationId.toString()
        ]?.remaining?.toNumber() ?? 0) +
          (mintPhaseAuthorizationsById[
            mintPhaseAuthorizationId.toString()
          ]?.count?.toNumber() ?? 0) ===
        remaining;
      console.log(
        `>>[${j}/${chunk.length}][${isSet.toString()}] ${user.toString()}`
      );
      if (!isSet) {
        const ix = await mintGeneratorProgram(connection, wallet)
          .methods.setMintPhaseAuthorization({
            remaining: new BN(remaining),
            user: user,
            mintPhaseIx: phaseIx,
          })
          .accountsStrict({
            mintConfig: mintConfigId,
            mintPhaseAuthorization: mintPhaseAuthorizationId,
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
