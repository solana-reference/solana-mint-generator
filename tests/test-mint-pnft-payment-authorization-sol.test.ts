import { executeTransaction, newAccountWithLamports } from "@cardinal/common";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  findMintConfigId,
  findMintPhaseAuthorizationId,
  mint,
  mintGeneratorProgram,
} from "../sdk";
import { createRulesetIx, getTestConfigName, getTestProvider } from "./utils";

let connection: Connection;
let wallet: Wallet;
let rulesetId: PublicKey;
let paymentTarget: PublicKey;
let mintConfigId: PublicKey;
let userAuthorized: Wallet;
const paymentAmount = LAMPORTS_PER_SOL;
const paymentMintId = PublicKey.default;
const configName = getTestConfigName();
beforeAll(async () => {
  const provider = await getTestProvider();
  connection = provider.connection;
  wallet = provider.wallet;
  mintConfigId = findMintConfigId(configName);
  paymentTarget = Keypair.generate().publicKey;

  userAuthorized = new NodeWallet(
    await newAccountWithLamports(connection, LAMPORTS_PER_SOL * 10)
  );
  // create ruleset
  const ruleset = createRulesetIx(provider);
  rulesetId = ruleset[1];

  await executeTransaction(
    connection,
    new Transaction().add(ruleset[0]),
    wallet
  );
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
          ruleset: rulesetId,
          creators: [{ address: wallet.publicKey, share: 100 }],
          merkleTree: null,
          releaseAuthority: null,
        },
        mintPhases: [
          {
            metadata: `{}`,
            startCondition: null,
            endCondition: null,
            tokenChecks: [
              {
                addressKind: { mint: undefined },
                address: paymentMintId,
                amount: new BN(paymentAmount),
                transferTarget: paymentTarget,
                mode: { transfer: undefined },
              },
            ],
            authorization: {
              mode: { defaultDisallowed: undefined },
            },
          },
        ],
        metadata: "",
      })
      .accountsStrict({
        mintConfig: mintConfigId,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
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
  expect(mintConfig.parsed.mintPhases.length).toEqual(1);
  expect(
    mintConfig.parsed.mintPhases[0]!.tokenChecks[0]!.address.toString()
  ).toEqual(paymentMintId.toString());
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
        mintConfig: mintConfigId,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintConfig = await fetchIdlAccount(
    connection,
    mintConfigId,
    "mintConfig"
  );
  expect(mintConfig.parsed.name).toEqual(configName);
  expect(mintConfig.parsed.authority.toString()).toEqual(
    wallet.publicKey.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(1);
  expect(Number(mintConfig.parsed.count)).toEqual(0);
});

test("Mint disallowed", async () => {
  const [tx, outputMintKeypair] = await mint(
    connection,
    userAuthorized,
    mintConfigId,
    0
  );
  if (!outputMintKeypair) throw "No output mint keypair";
  await expect(
    executeTransaction(connection, tx, userAuthorized, {
      signers: [outputMintKeypair],
      silent: true,
    })
  ).rejects.toThrow();
});

test("Authorize", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.setMintPhaseAuthorization({
        remaining: null,
        user: userAuthorized.publicKey,
        mintPhaseIx: 0,
      })
      .accountsStrict({
        mintConfig: mintConfigId,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        mintPhaseAuthorization: findMintPhaseAuthorizationId(
          mintConfigId,
          0,
          userAuthorized.publicKey
        ),
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintPhaseAuthorization = await fetchIdlAccount(
    connection,
    findMintPhaseAuthorizationId(mintConfigId, 0, userAuthorized.publicKey),
    "mintPhaseAuthorization"
  );
  expect(mintPhaseAuthorization.parsed.remaining).toEqual(null);
  expect(Number(mintPhaseAuthorization.parsed.count)).toEqual(0);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(userAuthorized.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});

test("Mint", async () => {
  const userLamportsBefore = await connection.getBalance(
    userAuthorized.publicKey
  );
  const targetLamportsBefore = await connection.getBalance(paymentTarget);

  const [tx, outputMintKeypair] = await mint(
    connection,
    userAuthorized,
    findMintConfigId(configName),
    0
  );
  if (!outputMintKeypair) throw "No output mint keypair";
  await executeTransaction(connection, tx, userAuthorized, {
    signers: [outputMintKeypair],
  });

  // check payment token account
  const userLamports = await connection.getBalance(userAuthorized.publicKey);
  expect(Number(userLamports)).toBeLessThan(userLamportsBefore - paymentAmount);

  // check payment target token account
  const targetLamports = await connection.getBalance(paymentTarget);
  expect(targetLamports).toEqual(targetLamportsBefore + paymentAmount);

  // check authorization
  const mintPhaseAuthorization = await fetchIdlAccount(
    connection,
    findMintPhaseAuthorizationId(mintConfigId, 0, userAuthorized.publicKey),
    "mintPhaseAuthorization"
  );
  expect(Number(mintPhaseAuthorization.parsed.count)).toEqual(1);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(userAuthorized.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});

test("Mint again fail", async () => {
  const [tx, outputMintKeypair] = await mint(
    connection,
    userAuthorized,
    findMintConfigId(configName),
    0
  );
  if (!outputMintKeypair) throw "No output mint keypair";
  await expect(
    executeTransaction(connection, tx, userAuthorized, {
      signers: [outputMintKeypair],
      silent: true,
    })
  ).rejects.toThrow();
});
