import {
  executeTransaction,
  findMintMetadataId,
  findTokenRecordId,
} from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import {
  Metadata,
  TokenRecord,
  TokenStandard,
  TokenState,
} from "@metaplex-foundation/mpl-token-metadata";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  fetchIdlAccountNullable,
  findMintConfigId,
  findOutputMintPendingReleaseId,
  mint,
  MINT_ENTRY_SIZE,
  mintGeneratorProgram,
  releaseOutputMint,
} from "../sdk";
import { getTestConfigName, getTestProvider } from "./utils";

let connection: Connection;
let wallet: Wallet;
let outputMintId: PublicKey;
const configName = getTestConfigName();
beforeAll(async () => {
  const provider = await getTestProvider();
  connection = provider.connection;
  wallet = provider.wallet;
});

test("Init mint config", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.initMintConfig({
        authority: wallet.publicKey,
        name: configName,
        outputMintConfig: {
          sellerFeeBasisPoints: 10,
          tokenStandard: { programmableNonFungible: undefined },
          collection: null,
          ruleset: null,
          creators: [{ address: wallet.publicKey, share: 100 }],
          merkleTree: null,
          releaseAuthority: wallet.publicKey,
        },
        mintPhases: [
          {
            metadata: `{}`,
            startCondition: null,
            endCondition: null,
            tokenChecks: [],
            authorization: null,
          },
        ],
        metadata: "",
      })
      .accountsStrict({
        mintConfig: findMintConfigId(configName),
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintConfig = await fetchIdlAccount(
    connection,
    findMintConfigId(configName),
    "mintConfig"
  );
  expect(mintConfig.parsed.name).toEqual(configName);
  expect(mintConfig.parsed.authority.toString()).toEqual(
    wallet.publicKey.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(0);
  expect(
    Number(mintConfig.parsed.outputMintConfig.sellerFeeBasisPoints)
  ).toEqual(10);
});

test("Add entry", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.setMintEntry({
        index: new BN(0),
        name: "name1",
        symbol: "sym1",
        uri: "uri1",
      })
      .accountsStrict({
        mintConfig: findMintConfigId(configName),
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintConfig = await fetchIdlAccount(
    connection,
    findMintConfigId(configName),
    "mintConfig"
  );
  expect(mintConfig.parsed.name).toEqual(configName);
  expect(mintConfig.parsed.authority.toString()).toEqual(
    wallet.publicKey.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(1);
  expect(Number(mintConfig.parsed.count)).toEqual(0);
});

test("Mint", async () => {
  const mintConfigAccountBefore = await connection.getAccountInfo(
    findMintConfigId(configName)
  );
  const [tx, outputMintKeypair] = await mint(
    connection,
    wallet,
    findMintConfigId(configName),
    0
  );
  if (!outputMintKeypair) throw "No output mint keypair";
  await executeTransaction(connection, tx, wallet, {
    signers: [outputMintKeypair],
  });
  outputMintId = outputMintKeypair.publicKey;
  const mintConfig = await fetchIdlAccount(
    connection,
    findMintConfigId(configName),
    "mintConfig"
  );

  // check resize
  expect(mintConfigAccountBefore?.data.length).toEqual(
    mintConfig.data.length + MINT_ENTRY_SIZE
  );

  // check data
  expect(mintConfig.parsed.name).toEqual(configName);
  expect(mintConfig.parsed.authority.toString()).toEqual(
    wallet.publicKey.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(1);
  expect(Number(mintConfig.parsed.count)).toEqual(1);

  // check user account
  const outputMintUserTokenAccountId = getAssociatedTokenAddressSync(
    outputMintId,
    wallet.publicKey
  );
  const outputMintUserTokenAccount = await getAccount(
    connection,
    outputMintUserTokenAccountId
  );
  expect(Number(outputMintUserTokenAccount.amount)).toEqual(1);
  expect(outputMintUserTokenAccount.isFrozen).toEqual(true);

  // check mint release
  const outputMintPendingReleaseId = findOutputMintPendingReleaseId(
    mintConfig.pubkey,
    outputMintId
  );
  const outputMintPendingRelease = await fetchIdlAccount(
    connection,
    outputMintPendingReleaseId,
    "outputMintPendingRelease"
  );
  expect(outputMintPendingRelease.parsed.mint.toString()).toEqual(
    outputMintId.toString()
  );
  expect(outputMintPendingRelease.parsed.mintConfig.toString()).toEqual(
    mintConfig.pubkey.toString()
  );

  // check user token record
  const tokenRecord = await TokenRecord.fromAccountAddress(
    connection,
    findTokenRecordId(outputMintId, outputMintUserTokenAccountId)
  );
  expect(tokenRecord.state).toEqual(TokenState.Locked);

  // check output mint metadata
  const outputMintMetadata = await Metadata.fromAccountAddress(
    connection,
    findMintMetadataId(outputMintId)
  );
  expect(outputMintMetadata.data.sellerFeeBasisPoints).toEqual(
    mintConfig.parsed.outputMintConfig.sellerFeeBasisPoints
  );
  expect(outputMintMetadata.data.creators![0]!).toEqual({
    address: mintConfig.pubkey,
    verified: true,
    share: 0,
  });
  expect(outputMintMetadata.data.creators![1]!).toEqual({
    address: wallet.publicKey,
    verified: false,
    share: 100,
  });
  expect(outputMintMetadata.tokenStandard).toEqual(
    TokenStandard.ProgrammableNonFungible
  );
  expect(outputMintMetadata.data.name.replace(/\0/g, "")).toEqual("name1");
  expect(outputMintMetadata.data.symbol.replace(/\0/g, "")).toEqual("sym1");
  expect(outputMintMetadata.data.uri.replace(/\0/g, "")).toEqual("uri1");
});

test("Release", async () => {
  const outputMintUserTokenAccountId = getAssociatedTokenAddressSync(
    outputMintId,
    wallet.publicKey,
    true
  );
  const mintConfig = await fetchIdlAccount(
    connection,
    findMintConfigId(configName),
    "mintConfig"
  );
  const tx = await releaseOutputMint(
    connection,
    wallet,
    mintConfig,
    outputMintId,
    wallet.publicKey
  );
  await executeTransaction(connection, tx, wallet);

  // check user account
  const outputMintUserTokenAccount = await getAccount(
    connection,
    outputMintUserTokenAccountId
  );
  expect(Number(outputMintUserTokenAccount.amount)).toEqual(1);
  expect(outputMintUserTokenAccount.isFrozen).toEqual(true);

  // check mint release
  const outputMintPendingReleaseId = findOutputMintPendingReleaseId(
    mintConfig.pubkey,
    outputMintId
  );
  const outputMintPendingRelease = await fetchIdlAccountNullable(
    connection,
    outputMintPendingReleaseId,
    "outputMintPendingRelease"
  );
  expect(outputMintPendingRelease).toEqual(null);

  // check user token record
  const tokenRecord = await TokenRecord.fromAccountAddress(
    connection,
    findTokenRecordId(outputMintId, outputMintUserTokenAccountId)
  );
  expect(tokenRecord.state).toEqual(TokenState.Unlocked);
});
