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

export const commandName = "updateMintConfig";
export const description = "Update a mint config";

const START = 1687878000 - 60 * 60 * 1;

export const getArgs = (_connection: Connection, wallet: Wallet) => ({
  configName: "bodoggos",
  mintConfigData: {
    outputMintConfig: {
      sellerFeeBasisPoints: 420,
      tokenStandard: { programmableNonFungible: undefined },
      ruleset: new PublicKey("HhDqsd8aSaGJARgzqzNvE4q5HAd6FoDn6VzMF18bjvK"),
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
      releaseAuthority: null,
    },
    mintPhases: [
      {
        metadata: JSON.stringify({
          title: "Phase 0",
          subtitle: "Pre-sale",
        }),
        startCondition: {
          timeSeconds: new BN(START),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START + 60 * 60 * 1),
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
          timeSeconds: new BN(START + 60 * 60 * 1),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START + 60 * 60 * 3),
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
          timeSeconds: new BN(START + 60 * 60 * 3),
          count: null,
        },
        endCondition: {
          timeSeconds: new BN(START + 60 * 60 * 5),
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
          timeSeconds: new BN(START + 60 * 60 * 5),
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
    .methods.updateMintConfig({
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
    `[success] Updated ${mintConfigId.toString()} https://explorer.solana.com/tx/${txid}.`
  );
};
