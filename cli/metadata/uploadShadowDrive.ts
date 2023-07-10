import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { ShadowFile } from "@shadow-drive/sdk";
import { ShdwDrive } from "@shadow-drive/sdk";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { readdirSync, readFileSync, writeFileSync } from "fs";

import { findMintConfigId } from "../../sdk";

export const commandName = "uploadShadowDrive";
export const description = "Upload to shadow drive";

export const getArgs = (_connection: Connection, _wallet: Wallet) => ({
  configName: "bodoggos-test",
  symbol: "DOG",
  collectionName: "Bodoggos Collection",
});

const METADATA_PREFIX = `cli/metadata/data`;
const UNITS = "MB";
const MB_THRESHOLD = 10; // MB
const ADDING_MB = 10; // MB
const INITIAL_STORAGE_MB = 150; // MB

type ExternalMetadata = {
  name: string;
  image: string;
  symbol: string;
  description: string;
  animation_url?: string;
  attributes: { trait_type: string; value: string }[];
  collection: { name: string; family: string };
  properties: { files: { uri: string; type: string }[] }[];
};

const shadowDriveURIFormatter = (
  storageAccount: string,
  filename: string
): string => {
  return `https://shdw-drive.genesysgo.net/${storageAccount}/${filename}`;
};

export const calculateStorage = (
  storageAmount: number,
  units = "MB"
): number => {
  // by default convert to MB
  switch (units) {
    case "KB":
      return storageAmount / 1000;
    case "MB":
      return storageAmount / 1000 / 1000;
    case "GB":
      return storageAmount / 1000 / 1000 / 1000;
    default:
      throw "Invalid units";
  }
};

export const handler = async (
  connection: Connection,
  wallet: Wallet,
  args: ReturnType<typeof getArgs>
) => {
  const configName = args.configName;
  const symbol = args.symbol;
  const mintConfigId = findMintConfigId(configName);
  const mintEntriesOutFile = `${METADATA_PREFIX}/${configName}.csv`;

  console.log(`[reset] ${mintEntriesOutFile}`);
  writeFileSync(mintEntriesOutFile, "name,symbol,uri");

  // SETTING UP STORAGE ACCOUNT
  const drive = await new ShdwDrive(connection, wallet).init();
  const storageAccounts = await drive.getStorageAccounts("v2");
  const mintConfigStorageAccount = storageAccounts.find(
    (acc) => acc.account.identifier.toString() === mintConfigId.toString()
  );
  let mintConfigStorageAccountId: PublicKey;
  if (!mintConfigStorageAccount) {
    const storageAccountResult = await drive.createStorageAccount(
      mintConfigId.toString(),
      `${INITIAL_STORAGE_MB}${UNITS}`,
      "v2"
    );
    mintConfigStorageAccountId = new PublicKey(
      storageAccountResult.shdw_bucket
    );
    console.log(`[storage][create] ${mintConfigId.toString()}`);
  } else {
    const currentUsage = (
      await drive.getStorageAccount(mintConfigStorageAccount.publicKey)
    ).current_usage;
    const availableStorage = calculateStorage(
      Math.max(mintConfigStorageAccount.account.storage - currentUsage, 0)
    );
    if (availableStorage < MB_THRESHOLD) {
      console.log(`[storage][increment] +${ADDING_MB} ${UNITS} space`);
      const addStorageResult = await drive.addStorage(
        mintConfigStorageAccount.publicKey,
        `${ADDING_MB}${UNITS}`, // TODO use filesize of next upload
        "v2"
      );
      console.log("[storage][add]", addStorageResult);
    } else {
      console.log(`[storage][found] ${availableStorage} ${UNITS} remanining`);
    }
    mintConfigStorageAccountId = mintConfigStorageAccount.publicKey;
  }

  // GENERATING CONFIG LINES
  const directoryCount = readdirSync(`${METADATA_PREFIX}/${configName}`).length;
  let totalCount = 1;
  for (let index = 0; index < directoryCount; index++) {
    console.log(`\n>>>>> Token ${index + 1}/${directoryCount}`);
    // get paths
    const imageLocalPath = `${METADATA_PREFIX}/${configName}/${index}/image.png`;
    const gifLocalPath = `${METADATA_PREFIX}/${configName}/${index}/gif.gif`;
    const mp4LocalPath = `${METADATA_PREFIX}/${configName}/${index}/mp4.mp4`;
    const metadataLocalPath = `${METADATA_PREFIX}/${configName}/${index}/metadata.json`;
    const countLocalPath = `${METADATA_PREFIX}/${configName}/${index}/count.txt`;

    const filesToUpload: ShadowFile[] = [];
    // image
    const imageName = `image-${index}.png`;
    const imageBuffer = readFileSync(imageLocalPath);
    filesToUpload.push({
      name: imageName,
      file: imageBuffer,
    });
    const imageUrl = shadowDriveURIFormatter(
      mintConfigStorageAccountId.toString(),
      imageName
    );

    // gif
    let gifUrl: string | null = null;
    try {
      const gifBuffer = readFileSync(gifLocalPath);
      const gifName = `gif-${index}.gif`;
      filesToUpload.push({
        name: gifName,
        file: gifBuffer,
      });
      gifUrl = shadowDriveURIFormatter(
        mintConfigStorageAccountId.toString(),
        gifName
      );
    } catch (e) {
      //
    }

    // mp4
    let mp4Url: string | null = null;
    try {
      const mp4Buffer = readFileSync(mp4LocalPath);
      const mp4Name = `mp4-${index}.mp4`;
      filesToUpload.push({
        name: mp4Name,
        file: mp4Buffer,
      });
      mp4Url = shadowDriveURIFormatter(
        mintConfigStorageAccountId.toString(),
        mp4Name
      );
    } catch (e) {
      //
    }

    // metadata
    const metadataName = `metadata-${index}.json`;
    const metadataData = JSON.parse(
      readFileSync(metadataLocalPath, "utf-8")
    ) as ExternalMetadata;
    metadataData.image = imageUrl;
    metadataData.symbol = symbol;
    metadataData.properties = [
      {
        files: [
          {
            type: "image/png",
            uri: imageUrl,
          },
          ...(mp4Url
            ? [
                {
                  type: "video/mp4",
                  uri: mp4Url,
                },
              ]
            : []),
          ...(gifUrl
            ? [
                {
                  type: "image/gif",
                  uri: gifUrl,
                },
              ]
            : []),
        ],
      },
    ];
    if (mp4Url) {
      metadataData.animation_url = mp4Url;
    }
    metadataData.collection = {
      name: args.collectionName,
      family: args.collectionName,
    };
    filesToUpload.push({
      name: metadataName,
      file: Buffer.from(
        JSON.stringify({
          name: metadataData.name,
          symbol: metadataData.symbol,
          description: metadataData.description,
          attributes: metadataData.attributes,
          image: metadataData.image,
          properties: metadataData.properties,
          animation_url: metadataData.animation_url,
          collection: metadataData.collection,
        })
      ),
    });

    for (const fileToUpload of filesToUpload) {
      const accountItems = await drive.listObjects(mintConfigStorageAccountId);
      const editFile = accountItems.keys.find(
        (name) => name === fileToUpload.name
      );
      if (editFile) {
        console.log(`[edit] ${fileToUpload.name!}`);
        const url = shadowDriveURIFormatter(
          mintConfigStorageAccountId.toString(),
          editFile
        );
        await drive.editFile(
          mintConfigStorageAccountId,
          url,
          fileToUpload,
          "v2"
        );
      } else {
        console.log(`[upload] ${fileToUpload.name!}`);
        const uploadResult = await drive.uploadFile(
          mintConfigStorageAccountId,
          fileToUpload
        );
        if (
          uploadResult.upload_errors &&
          uploadResult.upload_errors.length > 0
        ) {
          throw uploadResult.upload_errors;
        }
      }

      if (fileToUpload.name!.includes("metadata")) {
        const shadowDriveUrl = shadowDriveURIFormatter(
          mintConfigStorageAccountId.toString(),
          fileToUpload.name!
        );
        let count = 1;
        try {
          count = parseInt(readFileSync(countLocalPath, "utf8")) || count;
        } catch (e) {
          // pass
        }
        for (let l = 0; l < count; l++) {
          const mintEntry = `\n${metadataData.name} #${totalCount},${symbol},${shadowDriveUrl}`;
          writeFileSync(mintEntriesOutFile, mintEntry, {
            flag: "a+",
          });
          totalCount += 1;
        }
        console.log(
          `[success][${totalCount}](${count}) ${metadataData.name},${shadowDriveUrl},${count}`
        );
      }
    }
  }
  console.log(`[success] ${mintEntriesOutFile}`);
};
