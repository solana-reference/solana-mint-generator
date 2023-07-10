import { chunkArray, tryPublicKey } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { AccountInfo, Connection } from "@solana/web3.js";

export const commandName = "checkMints";
export const description = "Get mints";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  entryFile: `cli/metadata/data/mint-list.csv`,
});

export const handler = async (
  connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const file = require("fs").readFileSync(args.entryFile, {
    encoding: "utf-8",
  }) as string;
  const mintIds = file
    .split("\n")
    .slice(1)
    .map((v) => {
      const [mintString] = v.split(",");
      const mint = tryPublicKey(mintString);
      if (!mint) {
        console.log(mintString);
        throw "Invalid csv input";
      }
      return mint;
    });

  const mints: (AccountInfo<Buffer> | null)[] = [];
  const mintIdChunks = chunkArray(mintIds, 100);
  for (let i = 0; i < mintIdChunks.length; i++) {
    console.log(`${i}/${mintIdChunks.length}`);
    const mintIds = mintIdChunks[i]!;
    const accountInfos = await connection.getMultipleAccountsInfo(mintIds);
    mints.push(...accountInfos);
  }
  const mintData = mintIds.map((mintId, i) => ({ mint: mints[i], mintId }));
  console.log(JSON.stringify(mintData.filter((m) => !m.mint)), null, 2);
  await new Promise((r) => setTimeout(r, 10));
};
