import { findMintMetadataId } from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { type Connection, PublicKey } from "@solana/web3.js";

export const commandName = "getMetadata";
export const description = "Get a ruleset";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  mintId: new PublicKey("5EVUR7Q97EgEL5nRkW17zti5EEXSuVkAqzbmemv67Ed"),
});

export const handler = async (
  connection: Connection,
  _wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const { mintId } = args;
  const metadata = await Metadata.fromAccountAddress(
    connection,
    findMintMetadataId(mintId)
  );
  console.log(JSON.stringify(metadata, null, 2));
  await new Promise((r) => setTimeout(r, 10));
};
