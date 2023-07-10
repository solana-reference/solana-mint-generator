import {
  createMintTx,
  executeTransaction,
  newAccountWithLamports,
} from "@cardinal/common";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
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
let paymentMintId: PublicKey;
let paymentTarget: PublicKey;
let mintConfigId: PublicKey;
let userAuthorized: Wallet;
const paymentAmount = 10;
const configName = getTestConfigName();
beforeAll(async () => {
  const provider = await getTestProvider();
  connection = provider.connection;
  wallet = provider.wallet;
  mintConfigId = findMintConfigId(configName);

  userAuthorized = new NodeWallet(await newAccountWithLamports(connection));
  // create ruleset
  const ruleset = createRulesetIx(provider);
  rulesetId = ruleset[1];

  // create payment mint
  paymentTarget = Keypair.generate().publicKey;
  const paymentMintKeypair = Keypair.generate();
  paymentMintId = paymentMintKeypair.publicKey;
  const [paymentMintTx] = await createMintTx(
    provider.connection,
    paymentMintId,
    provider.wallet.publicKey,
    { amount: paymentAmount * 10 }
  );
  await executeTransaction(
    connection,
    new Transaction().add(ruleset[0], ...paymentMintTx.instructions),
    wallet,
    {
      signers: [paymentMintKeypair],
    }
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
    wallet,
    mintConfigId,
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

test("Authorize", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.setMintPhaseAuthorization({
        remaining: null,
        user: wallet.publicKey,
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
          wallet.publicKey
        ),
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintPhaseAuthorization = await fetchIdlAccount(
    connection,
    findMintPhaseAuthorizationId(mintConfigId, 0, wallet.publicKey),
    "mintPhaseAuthorization"
  );
  expect(Number(mintPhaseAuthorization.parsed.count)).toEqual(0);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(wallet.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});

test("Authorize someone else", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.setMintPhaseAuthorization({
        remaining: new BN(10),
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
  expect(Number(mintPhaseAuthorization.parsed.remaining)).toEqual(10);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(userAuthorized.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});

test("Update authorization", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.setMintPhaseAuthorization({
        remaining: new BN(4),
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
  expect(Number(mintPhaseAuthorization.parsed.remaining)).toEqual(4);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(userAuthorized.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});

test("Close authorization", async () => {
  const tx = new Transaction();
  tx.add(
    await mintGeneratorProgram(connection, wallet)
      .methods.closeMintPhaseAuthorization()
      .accountsStrict({
        mintConfig: mintConfigId,
        authority: wallet.publicKey,
        mintPhaseAuthorization: findMintPhaseAuthorizationId(
          mintConfigId,
          0,
          userAuthorized.publicKey
        ),
      })
      .instruction()
  );
  await executeTransaction(connection, tx, wallet);
  const mintPhaseAuthorization = await connection.getAccountInfo(
    findMintPhaseAuthorizationId(mintConfigId, 0, userAuthorized.publicKey)
  );
  expect(mintPhaseAuthorization).toEqual(null);
});

test("Mint", async () => {
  const paymentMintUserTokenAccountId = getAssociatedTokenAddressSync(
    paymentMintId,
    wallet.publicKey
  );
  const paymentMintUserTokenAccountBefore = await getAccount(
    connection,
    paymentMintUserTokenAccountId
  );

  const paymentMintTargetTokenAccountId = getAssociatedTokenAddressSync(
    paymentMintId,
    paymentTarget
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

  // check payment token account
  const paymentMintUserTokenAccount = await getAccount(
    connection,
    paymentMintUserTokenAccountId
  );
  expect(Number(paymentMintUserTokenAccount.amount)).toEqual(
    Number(paymentMintUserTokenAccountBefore.amount) - paymentAmount
  );

  // check payment target token account
  const paymentMintTargetTokenAccount = await getAccount(
    connection,
    paymentMintTargetTokenAccountId
  );
  expect(Number(paymentMintTargetTokenAccount.amount)).toEqual(paymentAmount);

  // check authorization
  const mintPhaseAuthorization = await fetchIdlAccount(
    connection,
    findMintPhaseAuthorizationId(mintConfigId, 0, wallet.publicKey),
    "mintPhaseAuthorization"
  );
  expect(Number(mintPhaseAuthorization.parsed.count)).toEqual(1);
  expect(mintPhaseAuthorization.parsed.mintConfig.toString()).toEqual(
    mintConfigId.toString()
  );
  expect(mintPhaseAuthorization.parsed.user).toEqual(wallet.publicKey);
  expect(mintPhaseAuthorization.parsed.mintPhaseIndex).toEqual(0);
});
