import { executeTransaction } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { Connection } from "@solana/web3.js";
import { SystemProgram, Transaction } from "@solana/web3.js";

import { findMintConfigId, mintGeneratorProgram } from "../../sdk";

export const commandName = "setMintConfigMetadata";
export const description = "Set metedata for a mint config";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos",
  mintConfigData: {
    metadata: JSON.stringify({
      displayName: "BoDoggos",
      description: `Brought to you by EasyEatsBodega and The Nifty. BoDoggos is a community brand capturing the spirit of perseverance and ambition, in style.`,
      colors: { glow: "#3ba9fe" },
      previewUrl:
        "https://ipfs.io/ipfs/QmcQYWF1Kmpz5GuKqPHCMRbUCRAVC4gCq8nkA5RPDsB7pK",
      marketplaceUrl: "https://magiceden.io/marketplace/bodoggos",
      supply: 8884,
      socials: [
        {
          icon: "web",
          link: "https://bodoggos.com",
        },
        {
          icon: "twitter",
          link: "https://twitter.com/BoDoggosNFT",
        },
      ],
    }),
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
    .methods.setMintConfigMetadata(args.mintConfigData)
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
