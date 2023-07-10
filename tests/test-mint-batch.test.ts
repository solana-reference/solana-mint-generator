import { executeTransaction, findMintMetadataId } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import {
  Metadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  mint,
  MINT_ENTRY_SIZE,
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
          creators: [{ address: wallet.publicKey, share: 100 }],
          merkleTree: null,
          releaseAuthority: null,
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
  for (let i = 0; i < 10; i++) {
    const mintConfigAccountBefore = await connection.getAccountInfo(
      findMintConfigId(configName)
    );
    const tx = new Transaction();
    tx.add(
      await mintGeneratorProgram(connection, wallet)
        .methods.setMintEntry({
          index: new BN(i),
          name: `name${i}`,
          symbol: `sym${i}`,
          uri: `uri${i}`,
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

    // check resize
    expect(mintConfig.data.length).toEqual(
      mintConfigAccountBefore!.data.length + MINT_ENTRY_SIZE
    );

    // check data
    expect(mintConfig.parsed.name).toEqual(configName);
    expect(mintConfig.parsed.authority.toString()).toEqual(
      wallet.publicKey.toString()
    );
    expect(Number(mintConfig.parsed.supply)).toEqual(i + 1);
    expect(Number(mintConfig.parsed.count)).toEqual(0);
  }
});

test("Mint 10", async () => {
  const mintedNames = [];
  for (let i = 0; i < 10; i++) {
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
    const mintConfig = await fetchIdlAccount(
      connection,
      findMintConfigId(configName),
      "mintConfig"
    );

    // check resize
    expect(mintConfigAccountBefore?.data.length).toEqual(
      mintConfig.data.length + MINT_ENTRY_SIZE
    );

    // check ddata
    expect(mintConfig.parsed.name).toEqual(configName);
    expect(mintConfig.parsed.authority.toString()).toEqual(
      wallet.publicKey.toString()
    );
    expect(Number(mintConfig.parsed.supply)).toEqual(10);
    expect(Number(mintConfig.parsed.count)).toEqual(i + 1);

    // check user account
    const outputMintUserTokenAccountId = getAssociatedTokenAddressSync(
      outputMintKeypair.publicKey,
      wallet.publicKey
    );
    const outputMintUserTokenAccount = await getAccount(
      connection,
      outputMintUserTokenAccountId
    );
    expect(Number(outputMintUserTokenAccount.amount)).toEqual(1);
    expect(outputMintUserTokenAccount.isFrozen).toEqual(false);

    // check output mint metadata
    const outputMintMetadata = await Metadata.fromAccountAddress(
      connection,
      findMintMetadataId(outputMintKeypair.publicKey)
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
    expect(outputMintMetadata.tokenStandard).toEqual(TokenStandard.NonFungible);
    expect(mintedNames.includes(outputMintMetadata.data.name)).toBeFalsy();
    mintedNames.push(outputMintMetadata.data.name);
  }
});

test("Mint no more", async () => {
  const [tx, outputMintKeypair] = await mint(
    connection,
    wallet,
    findMintConfigId(configName),
    0
  );
  if (!outputMintKeypair) throw "No output mint keypair";
  await expect(
    executeTransaction(connection, tx, wallet, {
      signers: [outputMintKeypair],
      silent: true,
    })
  ).rejects.toThrow();
});
