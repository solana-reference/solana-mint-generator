import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";

import { getProgramIdlAccounts } from "../../sdk";

export const commandName = "getMintConfigsByAuthority";
export const description = "Get all mint configs by authority";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  _args: ReturnType<typeof getArgs>
) => {
  const mintConfigs = await getProgramIdlAccounts(connection, "mintConfig", {
    filters: [
      {
        memcmp: {
          offset: 9,
          bytes: wallet.publicKey.toBase58(),
        },
      },
    ],
  });
  console.log(
    `[success] Found`,
    JSON.stringify(
      mintConfigs.map((c) => ({ pubkey: c.pubkey, parsed: c.parsed })),
      null,
      2
    )
  );
};
