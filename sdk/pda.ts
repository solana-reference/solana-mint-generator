import { METADATA_PROGRAM_ID } from "@cardinal/common";
import { BN, utils } from "@coral-xyz/anchor";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { PublicKey } from "@solana/web3.js";

import { MINT_GENERATOR_PROGRAM_ID } from "./constants";

export const MINT_CONFIG_PREFIX = "mint-config";
export const findMintConfigId = (
  mintConfigName: string,
  programId = MINT_GENERATOR_PROGRAM_ID
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(MINT_CONFIG_PREFIX),
      utils.bytes.utf8.encode(mintConfigName),
    ],
    programId
  )[0];
};

export const MINT_PHASE_AUTHORIZATION_PREFIX = "authorization";
export const findMintPhaseAuthorizationId = (
  mintConfigId: PublicKey,
  mintPhaseIx: number,
  user: PublicKey,
  programId = MINT_GENERATOR_PROGRAM_ID
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(MINT_PHASE_AUTHORIZATION_PREFIX),
      mintConfigId.toBuffer(),
      new BN(mintPhaseIx).toArrayLike(Buffer, "le", 1),
      user.toBuffer(),
    ],
    programId
  )[0];
};

export const OUTPUT_MINT_PENDING_RELEEASE_PREFIX = "output-mint-release";
export const findOutputMintPendingReleaseId = (
  mintConfigId: PublicKey,
  mintId: PublicKey,
  programId = MINT_GENERATOR_PROGRAM_ID
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(OUTPUT_MINT_PENDING_RELEEASE_PREFIX),
      mintConfigId.toBuffer(),
      mintId.toBuffer(),
    ],
    programId
  )[0];
};

export const findCollectionDelegateId = (
  collectionMintId: PublicKey,
  updateAuthority: PublicKey,
  collectionAuthorityId: PublicKey
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      collectionMintId.toBuffer(),
      Buffer.from("collection_delegate"),
      updateAuthority.toBuffer(),
      collectionAuthorityId.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
};

export const findMerkleTreeAuthorityId = (merkleTreeId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [merkleTreeId.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  )[0];
};
