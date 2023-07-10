import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { writeFileSync } from "fs";

export const commandName = "createNumberedUris";
export const description = "Create numbered URIs from a base URI";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos-test-ipfs",
  symbol: "BDG",
  baseUri:
    "https://ipfs.io/ipfs/QmPqkDQ9bfvYaTBE43AsJceMncy8PVYBBxBSoAN8xPMm3Q/",
  baseName: "Bodoggos #",
  count: 10,
});

const METADATA_PREFIX = `cli/metadata/data`;

export const handler = async (
  _connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName, baseName, symbol, count, baseUri } = args;
  const mintEntriesOutFile = `${METADATA_PREFIX}/${configName}.csv`;

  console.log(`[reset] ${mintEntriesOutFile}`);
  writeFileSync(mintEntriesOutFile, "name,symbol,uri");

  for (let i = 1; i < count + 1; i++) {
    const mintEntry = `\n${baseName}${i},${symbol},${baseUri}${i}`;
    writeFileSync(mintEntriesOutFile, mintEntry, {
      flag: "a+",
    });
  }
  await new Promise((r) => setTimeout(r, 10));
  console.log(`[success](${count}) ${mintEntriesOutFile}`);
};
