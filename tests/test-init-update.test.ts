import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import type { Connection } from "@solana/web3.js";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  mintGeneratorProgram,
} from "../sdk";
import { getTestConfigName, getTestProvider } from "./utils";

let connection: Connection;
let wallet: Wallet;
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
          tokenStandard: { nonFungible: undefined },
          collection: null,
          ruleset: null,
          creators: [],
          merkleTree: null,
          releaseAuthority: null,
        },
        mintPhases: [],
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

test("Update mint config", async () => {
  const newAuthority = Keypair.generate().publicKey;
  const newMetadata = `{"test":"value"}`;

  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.updateMintConfig({
        authority: newAuthority,
        outputMintConfig: {
          sellerFeeBasisPoints: 100,
          tokenStandard: { nonFungible: undefined },
          collection: null,
          ruleset: null,
          creators: [],
          merkleTree: null,
          releaseAuthority: null,
        },
        mintPhases: [
          {
            metadata: `{"name":"value"}`,
            startCondition: null,
            endCondition: null,
            tokenChecks: [],
            authorization: null,
          },
        ],
        metadata: `{"test":"value"}`,
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
    newAuthority.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(0);
  expect(
    Number(mintConfig.parsed.outputMintConfig.sellerFeeBasisPoints)
  ).toEqual(100);
  expect(mintConfig.parsed.metadata).toEqual(newMetadata);
  expect(
    (JSON.parse(mintConfig.parsed.metadata) as { test: string })["test"]
  ).toEqual("value");

  expect(mintConfig.parsed.mintPhases.length).toEqual(1);
  expect(
    (JSON.parse(mintConfig.parsed.mintPhases[0]!.metadata) as { name: string })[
      "name"
    ]
  ).toEqual("value");
});
