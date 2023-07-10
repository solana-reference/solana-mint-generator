import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";

import { fetchIdlAccount, findMintConfigId } from "../../sdk";

export const commandName = "getMintConfig";
export const description = "Get a mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
});

export const handler = async (
  connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;

  const mintConfigId = findMintConfigId(configName);
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );
  console.log(
    `[success] Created ${mintConfigId.toString()}`,
    JSON.stringify(mintConfig.parsed, null, 2)
  );
};
