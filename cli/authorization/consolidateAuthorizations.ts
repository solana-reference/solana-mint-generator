import { tryPublicKey } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { writeFileSync } from "fs";

export const commandName = "consolidateAuthorizations";
export const description = "Consolidate authorizations";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  entryFile: `cli/authorization/data/bodoggos-0.csv`,
  outFile: `cli/authorization/data/bodoggos-0-consolidated.csv`,
  dryRun: true,
});

export const handler = async (
  _connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { outFile } = args;
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

  const entriesByUser = entryDatas.reduce(
    (acc, { user, phaseIx, remaining }) => {
      if (acc[user.toString()] && acc[user.toString()]?.phaseIx !== phaseIx) {
        throw "Mismatched phase ix";
      }
      acc[user.toString()] = {
        phaseIx,
        remaining: (acc[user.toString()]?.remaining ?? 0) + remaining,
      };
      return acc;
    },
    {} as { [u: string]: { phaseIx: number; remaining: number } }
  );

  console.log(`[reset] ${outFile}`);
  writeFileSync(outFile, "name,symbol,uri");

  for (const [user, { phaseIx, remaining }] of Object.entries(entriesByUser)) {
    const entry = `\n${user},${phaseIx},${remaining}`;
    writeFileSync(outFile, entry, {
      flag: "a+",
    });
  }
  await new Promise((r) => setTimeout(r, 10));
  console.log(`[success] ${outFile}`);
};
