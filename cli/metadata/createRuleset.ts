import { executeTransaction, findRuleSetId } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { RuleSetRevisionV1 } from "@metaplex-foundation/mpl-token-auth-rules";
import {
  createCreateOrUpdateInstruction,
  serializeRuleSetRevision,
} from "@metaplex-foundation/mpl-token-auth-rules";
import type { Connection } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

export const commandName = "createRuleset";
export const description = "Creates a new ruleset";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  rulesetName: "bodoggos",
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { rulesetName } = args;
  const tx = new Transaction();
  const rulesetId = findRuleSetId(wallet.publicKey, rulesetName);
  const ruleSet: RuleSetRevisionV1 = {
    libVersion: 1,
    ruleSetName: rulesetName,
    owner: [...wallet.publicKey.toBytes()],
    operations: {
      "Transfer:WalletToWallet": "Pass",
      "Transfer:Owner": "Pass",
      "Transfer:MigrationDelegate": "Pass",
      "Transfer:SaleDelegate": "Pass",
      "Transfer:TransferDelegate": "Pass",
      "Delegate:LockedTransfer": "Pass",
      "Delegate:Update": "Pass",
      "Delegate:Transfer": "Pass",
      "Delegate:Utility": "Pass",
      "Delegate:Staking": "Pass",
      "Delegate:Authority": "Pass",
      "Delegate:Collection": "Pass",
      "Delegate:Use": "Pass",
      "Delegate:Sale": "Pass",
    },
  };
  const serializedRuleSet = serializeRuleSetRevision(ruleSet);
  const rulesetIx = createCreateOrUpdateInstruction(
    {
      payer: wallet.publicKey,
      ruleSetPda: rulesetId,
    },
    {
      createOrUpdateArgs: {
        __kind: "V1",
        serializedRuleSet,
      },
    }
  );
  tx.add(rulesetIx);

  const txid = await executeTransaction(connection, tx, wallet);
  console.log(
    `[success] Created ruleset ${rulesetId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
