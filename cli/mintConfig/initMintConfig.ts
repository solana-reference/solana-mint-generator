import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";

import { findMintConfigId, mintGeneratorProgram } from "../../sdk";

export const commandName = "initMintConfig";
export const description = "Initialize a mint config";

const START = 1687878000;

export const getArgs = (_connection: Connection, wallet: Wallet) => ({
  configName: "bodoggos",
  mintConfigData: {
    outputMintConfig: {
      sellerFeeBasisPoints: 420,
      tokenStandard: { programmableNonFungible: undefined },
      ruleset: null,
      collection: new PublicKey("69k55dCTwiUPNgaTZ8FVMADorTvEGJEGuAGEB7m1qB1S"),
      creators: [
        {
          address: new PublicKey(
            "3TNm6qLAwAwz3cYUWphB76qpah14goRuQpGcZg3PHrpS"
          ),
          share: 100,
        },
      ],
      merkleTree: null,
      releaseAuthority: wallet.publicKey,
    },
    mintPhases: [
      {
        metadata: JSON.stringify({
          title: "Phase 0",
          subtitle: "Pre-sale",
        }),
        startCondition: {
          timeSeconds: new BN(START - 60 * 60 * 1),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START),
          count: null,
        },
        tokenChecks: [],
        authorization: {
          mode: { defaultDisallowed: undefined },
        },
      },
      {
        metadata: JSON.stringify({
          title: "Phase 1",
          subtitle: "Allowlist 1 and Nifty Free NFT VIP Ticket Holders",
        }),
        startCondition: {
          timeSeconds: new BN(START),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START + 60 * 60 * 2),
          count: null,
        },
        tokenChecks: [
          {
            addressKind: { mint: undefined },
            address: PublicKey.default,
            amount: new BN(LAMPORTS_PER_SOL * 4.95),
            transferTarget: wallet.publicKey,
            mode: { transfer: undefined },
          },
        ],
        authorization: {
          mode: { defaultDisallowed: undefined },
        },
      },
      {
        metadata: JSON.stringify({
          title: "Phase 2",
          subtitle: "Allowlist 2 | Collaborations and Project Partnerships",
        }),
        startCondition: {
          timeSeconds: new BN(START + 60 * 60 * 2),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START + 60 * 60 * 4),
          count: null,
        },
        tokenChecks: [
          {
            addressKind: { mint: undefined },
            address: PublicKey.default,
            amount: new BN(LAMPORTS_PER_SOL * 4.95),
            transferTarget: wallet.publicKey,
            mode: { transfer: undefined },
          },
        ],
        authorization: {
          mode: { defaultDisallowed: undefined },
        },
      },
      {
        metadata: JSON.stringify({
          title: "Phase 3",
          subtitle: "Public",
        }),
        startCondition: {
          timeSeconds: new BN(START + 60 * 60 * 4),
          count: null,
        },
        endCondition: null,
        tokenChecks: [
          {
            addressKind: { mint: undefined },
            address: PublicKey.default,
            amount: new BN(LAMPORTS_PER_SOL * 4.95),
            transferTarget: wallet.publicKey,
            mode: { transfer: undefined },
          },
        ],
        authorization: null,
      },
    ],
    metadata: JSON.stringify({}),
  },
  dryRun: false,
});

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { configName } = args;

  const transaction = new Transaction();
  const mintConfigId = findMintConfigId(configName);
  const ix = await mintGeneratorProgram(connection, wallet)
    .methods.initMintConfig({
      name: configName,
      authority: wallet.publicKey,
      ...args.mintConfigData,
    })
    .accountsStrict({
      authority: wallet.publicKey,
      mintConfig: mintConfigId,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  transaction.add(ix);

  const txid = await executeTransaction(connection, transaction, wallet);
  console.log(
    `[success] Created ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
