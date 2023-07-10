import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import { findMintConfigId, mintGeneratorProgram } from "../../sdk";

export const commandName = "closeMintConfig";
export const description = "Close a mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;

  const transaction = new Transaction();
  const mintConfigId = findMintConfigId(configName);
  const ix = await mintGeneratorProgram(connection, wallet)
    .methods.closeMintConfig()
    .accountsStrict({
      authority: wallet.publicKey,
      mintConfig: mintConfigId,
    })
    .instruction();
  transaction.add(ix);

  const txid = await executeTransaction(connection, transaction, wallet);
  console.log(
    `[success] Closed ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
