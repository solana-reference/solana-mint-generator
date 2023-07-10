import { Wallet } from "@coral-xyz/anchor";
import type { Cluster } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import * as readline from "readline";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import * as mint from "./actions/mint";
import * as mintToUsers from "./actions/mintToUsers";
import * as releaseTokens from "./actions/releaseTokens";
import * as consolidateAuthorizations from "./authorization/consolidateAuthorizations";
import * as setMintPhaseAuthorizations from "./authorization/setMintPhaseAuthorizations";
import * as createMerkleTree from "./compressed/createMerkleTree";
import * as delegateMerkleTreeForMint from "./compressed/delegateMerkleTreeForMint";
import * as checkMints from "./metadata/checkMints";
import * as createMintConfigCollectionMint from "./metadata/createMintConfigCollectionMint";
import * as createNumberedUris from "./metadata/createNumberedUris";
import * as createRuleset from "./metadata/createRuleset";
import * as delegateMintConfigCollectionMint from "./metadata/delegateMintConfigCollectionMint";
import * as getMetadata from "./metadata/getMetadata";
import * as getRuleset from "./metadata/getRuleset";
import * as uploadShadowDrive from "./metadata/uploadShadowDrive";
import * as closeMintConfig from "./mintConfig/closeMintConfig";
import * as getMintConfig from "./mintConfig/getMintConfig";
import * as getMintConfigsByAuthority from "./mintConfig/getMintConfigsByAuthority";
import * as initMintConfig from "./mintConfig/initMintConfig";
import * as setMintConfigMetadata from "./mintConfig/setMintConfigMetadata";
import * as setMintEntries from "./mintConfig/setMintEntries";
import * as updateMintConfig from "./mintConfig/updateMintConfig";
import { keypairFrom } from "./utils";

dotenv.config();

export type ProviderParams = {
  cluster: string;
  wallet: string;
};

const networkURLs: { [key in Cluster | "mainnet" | "localnet"]: string } = {
  ["mainnet-beta"]:
    process.env.MAINNET_PRIMARY_URL ?? "https://solana-api.projectserum.com",
  mainnet:
    process.env.MAINNET_PRIMARY_URL ?? "https://solana-api.projectserum.com",
  devnet: "https://api.devnet.solana.com/",
  testnet: "https://api.testnet.solana.com/",
  localnet: "http://localhost:8899/",
};

export const connectionFor = (
  cluster: Cluster | "mainnet" | "localnet",
  defaultCluster = "mainnet"
) => {
  return new Connection(
    process.env.RPC_URL || networkURLs[cluster || defaultCluster],
    "recent"
  );
};

const commandBuilder = <T>(command: {
  commandName: string;
  description: string;
  getArgs: (c: Connection, w: Wallet) => T;
  handler: (c: Connection, w: Wallet, a: T) => Promise<void>;
}): CommandModule<ProviderParams, ProviderParams> => {
  return {
    command: command.commandName,
    describe: command.description,
    handler: async ({
      cluster,
      wallet,
    }: ArgumentsCamelCase<ProviderParams>) => {
      const clusterString = process.env.CLUSTER || cluster;
      const c = connectionFor(clusterString as Cluster);
      const w = new Wallet(keypairFrom(process.env.WALLET || wallet, "wallet"));
      const a = command.getArgs(c, w);
      console.log(command.description);
      console.log(
        `[cluster=${clusterString}] [wallet=${w.publicKey.toString()}]`
      );
      console.log(`\n(modify args in ${command.commandName}.ts)`);
      console.log(JSON.stringify(a, null, 2));
      await question("\nExecute... [enter]");
      await command.handler(c, w, a);
    },
  };
};

export const question = async (query: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

void yargs(hideBin(process.argv))
  .positional("wallet", {
    describe: "Wallet to use - default to WALLET environment variable",
    default: "process.env.WALLET",
  })
  .positional("cluster", {
    describe:
      "Solana cluster moniker to use [mainnet, devnet] - ovverride url with RPC_URL environment variable or mainnet moniker with MAINNET_PRIMARY environment variable",
    default: "devnet",
  })
  // mint config
  .command(commandBuilder(initMintConfig))
  .command(commandBuilder(updateMintConfig))
  .command(commandBuilder(setMintConfigMetadata))
  .command(commandBuilder(closeMintConfig))
  .command(commandBuilder(getMintConfig))
  .command(commandBuilder(getMintConfigsByAuthority))
  .command(commandBuilder(setMintEntries))
  .command(commandBuilder(createMintConfigCollectionMint))
  .command(commandBuilder(delegateMintConfigCollectionMint))
  .command(commandBuilder(createRuleset))
  .command(commandBuilder(getMetadata))
  .command(commandBuilder(getRuleset))
  // authorization
  .command(commandBuilder(setMintPhaseAuthorizations))
  .command(commandBuilder(consolidateAuthorizations))
  // metadata
  .command(commandBuilder(uploadShadowDrive))
  .command(commandBuilder(createNumberedUris))
  .command(commandBuilder(checkMints))
  // actions
  .command(commandBuilder(mint))
  .command(commandBuilder(mintToUsers))
  .command(commandBuilder(releaseTokens))
  // compressed
  .command(commandBuilder(createMerkleTree))
  .command(commandBuilder(delegateMerkleTreeForMint))
  .strict()
  .demandCommand()
  .help("h")
  .alias({ h: "help" }).argv;
