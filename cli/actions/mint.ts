import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";

import { findMintConfigId, mint } from "../../sdk";

export const commandName = "mint";
export const description = "Mint a token from a mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  mintPhaseIx: 3,
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;
  const mintConfigId = findMintConfigId(configName);
  const [tx, outputMintKeypair] = await mint(
    connection,
    wallet,
    mintConfigId,
    args.mintPhaseIx
  );
  const txid = await executeTransaction(connection, tx, wallet, {
    signers: outputMintKeypair ? [outputMintKeypair] : [],
  });
  console.log(
    `[success] Minted from ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
