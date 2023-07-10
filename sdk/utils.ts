import {
  fetchAccountDataById,
  findMintEditionId,
  findMintMetadataId,
  findTokenRecordId,
  METADATA_PROGRAM_ID,
  TOKEN_AUTH_RULES_ID,
} from "@cardinal/common";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import type { AccountMeta, Connection } from "@solana/web3.js";
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

import type { IdlTypes } from "./constants";
import {
  findCollectionDelegateId,
  findMerkleTreeAuthorityId,
  findMintPhaseAuthorizationId,
  findOutputMintPendingReleaseId,
} from "./pda";

export const getRemainingAccountsForTokenChecks = async (
  connection: Connection,
  tokenChecks: IdlTypes["MintPhaseTokenCheck"][],
  holder: PublicKey
): Promise<AccountMeta[]> => {
  if (tokenChecks.length === 0) {
    return [];
  }
  const remainingAccounts = [
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ];

  // get token accounts
  const tokenAccountInfos = (
    await connection.getTokenAccountsByOwner(holder, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;
  const tokenAccounts = tokenAccountInfos
    .map((acc) => ({
      pubkey: acc.pubkey,
      parsed: unpackAccount(acc.pubkey, acc.account, TOKEN_PROGRAM_ID),
    }))
    .filter((acc) => Number(acc.parsed.amount) > 0);

  const fetchMetadata = tokenChecks.some((check) => !check.addressKind.mint);
  const metadataAccountDataById = fetchMetadata
    ? await fetchAccountDataById(
        connection,
        tokenAccounts.map((a) => findMintMetadataId(a.parsed.mint))
      )
    : [];
  const metadatas = Object.entries(metadataAccountDataById).map(
    ([_, m]) => Metadata.fromAccountInfo(m)[0]
  );

  // for all token checks
  for (const tokenCheck of tokenChecks) {
    remainingAccounts.push({
      pubkey: holder,
      isWritable: false,
      isSigner: true,
    });

    // get remaining accounts for kind
    let tokenAccountMint: PublicKey | null = null;
    if (tokenCheck.addressKind.mint) {
      // ========= mint =========
      if (!tokenCheck.address.equals(PublicKey.default)) {
        const tokenAccount = tokenAccounts.find((acc) =>
          acc.parsed.mint.equals(tokenCheck.address)
        );
        if (!tokenAccount) throw "No token account found with balance of mint";
        remainingAccounts.push({
          pubkey: tokenAccount.pubkey,
          isWritable: true,
          isSigner: false,
        });
        tokenAccountMint = tokenAccount.parsed.mint;
      }
    } else if (tokenCheck.addressKind.collection) {
      // ========= collection =========
      const metadata = metadatas.find(
        (m) =>
          m.collection?.key.equals(tokenCheck.address) && m.collection.verified
      );
      if (!metadata) throw "No token account found for collection";
      const tokenAccount = tokenAccounts.find((acc) =>
        acc.parsed.mint.equals(metadata.mint)
      );
      if (!tokenAccount) throw "No token account found with balance of mint";
      remainingAccounts.push(
        {
          pubkey: tokenAccount.pubkey,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: findMintMetadataId(metadata.mint),
          isWritable: true,
          isSigner: false,
        }
      );
      tokenAccountMint = tokenAccount.parsed.mint;
    } else if (tokenCheck.addressKind.creator) {
      // ========= creator =========
      const metadata = metadatas.find((m) =>
        m.data.creators?.some(
          (c) => c.verified && c.address.equals(tokenCheck.address)
        )
      );
      if (!metadata) throw "No token account found for collection";
      const tokenAccount = tokenAccounts.find((acc) =>
        acc.parsed.mint.equals(metadata.mint)
      );
      if (!tokenAccount) throw "No token account found with balance of mint";
      remainingAccounts.push(
        {
          pubkey: tokenAccount.pubkey,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: findMintMetadataId(tokenCheck.address),
          isWritable: true,
          isSigner: false,
        }
      );
      tokenAccountMint = tokenAccount.parsed.mint;
    }

    // get remaining accounts for mode
    if (tokenCheck.mode.transfer) {
      // ========= transfer =========
      if (!tokenCheck.transferTarget) throw "No transfer target set";
      if (tokenCheck.address.equals(PublicKey.default)) {
        remainingAccounts.push({
          pubkey: tokenCheck.transferTarget,
          isWritable: true,
          isSigner: false,
        });
      } else {
        if (!tokenAccountMint) {
          throw "No token account found with balance of mint";
        }
        remainingAccounts.push(
          {
            pubkey: tokenCheck.transferTarget,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: getAssociatedTokenAddressSync(
              tokenAccountMint,
              tokenCheck.transferTarget,
              true
            ),
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: tokenAccountMint,
            isWritable: true,
            isSigner: false,
          }
        );
      }
    } else if (tokenCheck.mode.burn) {
      // ========= burn =========
      if (!tokenAccountMint) {
        throw "No token account found with balance of mint";
      }
      remainingAccounts.push({
        pubkey: tokenAccountMint,
        isWritable: true,
        isSigner: false,
      });
    }
  }
  return remainingAccounts;
};

export const remainingAccountsForAuthorization = (
  mintConfigId: PublicKey,
  mintPhaseIx: number,
  user: PublicKey,
  holder: PublicKey,
  authorization: IdlTypes["MintPhaseAuthorizationCheck"] | null
): AccountMeta[] => {
  if (!authorization) return [];
  return [
    {
      pubkey: user,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: holder,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: findMintPhaseAuthorizationId(mintConfigId, mintPhaseIx, user),
      isWritable: true,
      isSigner: false,
    },
  ];
};

export const remainingAccountsForCollection = (
  mintConfigId: PublicKey,
  collectionAuthorityId: PublicKey,
  collectionId: PublicKey | null
): AccountMeta[] => {
  if (!collectionId) return [];
  return [
    {
      pubkey: collectionId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: findMintMetadataId(collectionId),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: findMintEditionId(collectionId),
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: findCollectionDelegateId(
        collectionId,
        collectionAuthorityId,
        mintConfigId
      ),
      isWritable: false,
      isSigner: false,
    },
  ];
};

export const remainingAccountsForRelease = (
  mintConfigId: PublicKey,
  mintId: PublicKey,
  releaseAuthority: PublicKey | null
): AccountMeta[] => {
  if (!releaseAuthority) return [];
  return [
    {
      pubkey: findOutputMintPendingReleaseId(mintConfigId, mintId),
      isWritable: true,
      isSigner: false,
    },
  ];
};

export const remainingAccountsForMintNft = (
  outputMintId: PublicKey,
  user: PublicKey,
  rulesetId: PublicKey | null
): AccountMeta[] => {
  const outputMintUserTokenAccountId = getAssociatedTokenAddressSync(
    outputMintId,
    user,
    true
  );
  return [
    {
      pubkey: outputMintId,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: findMintMetadataId(outputMintId),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: findMintEditionId(outputMintId),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: outputMintUserTokenAccountId,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: findTokenRecordId(outputMintId, outputMintUserTokenAccountId),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: rulesetId ?? METADATA_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: METADATA_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: TOKEN_AUTH_RULES_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ];
};

export const remainingAccountsForMintCnft = (
  merkleTreeId: PublicKey
): AccountMeta[] => {
  return [
    {
      pubkey: merkleTreeId,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: findMerkleTreeAuthorityId(merkleTreeId),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: BUBBLEGUM_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SPL_NOOP_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ];
};
