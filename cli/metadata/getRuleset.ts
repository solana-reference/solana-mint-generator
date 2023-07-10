import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { getLatestRuleSetRevision } from "@metaplex-foundation/mpl-token-auth-rules";
import { type Connection, PublicKey } from "@solana/web3.js";

export const commandName = "getRuleset";
export const description = "Get a ruleset";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  rulesetId: new PublicKey("HhDqsd8aSaGJARgzqzNvE4q5HAd6FoDn6VzMF18bjvK"),
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { rulesetId } = args;
  const rulesetData = await connection.getAccountInfo(rulesetId);
  if (!rulesetData) throw "Ruleset not found";
  const ruleset = getLatestRuleSetRevision(rulesetData.data);
  console.log(JSON.stringify(ruleset, null, 2));
  await new Promise((r) => setTimeout(r, 10));
};
