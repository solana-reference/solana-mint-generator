import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { beforeAll, test } from "@jest/globals";
import {
  createCreateTreeInstruction,
  createSetTreeDelegateInstruction,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createAllocTreeIx,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import type { Connection, PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";

import {
  fetchIdlAccount,
  findMerkleTreeAuthorityId,
  findMintConfigId,
  mint,
  MINT_ENTRY_SIZE,
  mintGeneratorProgram,
} from "../sdk";
import { getTestConfigName, getTestProvider } from "./utils";

let connection: Connection;
let wallet: Wallet;
let merkleTreeId: PublicKey;
const configName = getTestConfigName();
const maxDepth = 14;
const maxBufferSize = 64;
beforeAll(async () => {
  const provider = await getTestProvider(LAMPORTS_PER_SOL * 20);
  connection = provider.connection;
  wallet = provider.wallet;

  const tx = new Transaction();
  const merkleTreeKeypair = Keypair.generate();
  merkleTreeId = merkleTreeKeypair.publicKey;
  tx.add(
    await createAllocTreeIx(
      connection,
      merkleTreeId,
      wallet.publicKey,
      {
        maxDepth,
        maxBufferSize,
      },
      1
    )
  );
  tx.add(
    createCreateTreeInstruction(
      {
        treeAuthority: findMerkleTreeAuthorityId(merkleTreeId),
        merkleTree: merkleTreeId,
        payer: wallet.publicKey,
        treeCreator: wallet.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      },
      {
        maxDepth,
        maxBufferSize,
        public: false,
      }
    )
  );
  await executeTransaction(connection, tx, wallet, {
    signers: [merkleTreeKeypair],
  });
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
          merkleTree: merkleTreeId,
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

test("Delegate tree", async () => {
  const tx = new Transaction();
  tx.add(
    createSetTreeDelegateInstruction({
      treeAuthority: findMerkleTreeAuthorityId(merkleTreeId),
      merkleTree: merkleTreeId,
      treeCreator: wallet.publicKey,
      newTreeDelegate: findMintConfigId(configName),
    })
  );
  await executeTransaction(connection, tx, wallet);
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
  await executeTransaction(connection, tx, wallet, {
    signers: outputMintKeypair ? [outputMintKeypair] : [],
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

  // check data
  expect(mintConfig.parsed.name).toEqual(configName);
  expect(mintConfig.parsed.authority.toString()).toEqual(
    wallet.publicKey.toString()
  );
  expect(Number(mintConfig.parsed.supply)).toEqual(1);
  expect(Number(mintConfig.parsed.count)).toEqual(1);
});
