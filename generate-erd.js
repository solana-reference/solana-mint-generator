const { writeFile, writeFileSync } = require("fs");
const IDL = require("./sdk/idl/mint_generator_idl");

const snakeCase = (str) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const prefixes = {
  mint_entry: "mint_config.",
  output_mint_config: "mint_config.",
  mint_phase: "mint_config.",
  creator: "mint_config.",
  mint_phase_token_check: "mint_config.",
  mint_phase_start_end_condition: "mint_config.",
  mint_phase_authorization_check: "mint_config.",
};

const refs = {
  ["accounts.mint_phase_authorization.mint_config"]: "accounts.mint_config.ref",
  ["accounts.mint_config.ref"]: "mint_entry.ref",
  ["accounts.mint_config.output_mint_config"]: "output_mint_config.ref",
  ["accounts.mint_config.mint_phases"]: "mint_phase.ref",
  ["output_mint_config.creators"]: "creator.ref",
  ["mint_phase.start_condition"]: "mint_phase_start_end_condition.ref",
  ["mint_phase.end_condition"]: "mint_phase_start_end_condition.ref",
  ["mint_phase.token_checks"]: "mint_phase_token_check.ref",
  ["mint_phase.authorization"]: "mint_phase_authorization_check.ref",
};

const renderValue = (v) => {
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "object" && "option" in v) {
    return `Opt(${v.option})`;
  }
  if (typeof v === "object" && "vec" in v) {
    return `${v.vec.defined ?? v.vec}[]`;
  }
  if (typeof v === "object") {
    return `Object`;
  }
  return v.toString();
};

const main = () => {
  const outPath = `./DIAGRAM.txt`;
  writeFile(outPath, "", function () {
    console.log(`[reset] ${outPath}`);
  });

  for (let i = 0; i < IDL.accounts.length; i++) {
    const { name: accountName, type } = IDL.accounts[i];
    const t = `
Table accounts.${snakeCase(accountName).slice(1)} {
  ref publicKey [pk]
  ${type.fields
    .map(({ name: field, type }) => {
      return `${snakeCase(field)} ${renderValue(type)}`;
    })
    .join("\n  ")}
}
`;
    writeFileSync(outPath, t, {
      flag: "a+",
    });
  }

  for (let i = 0; i < IDL.types.length; i++) {
    const { name: accountName, type } = IDL.types[i];
    if (
      type.kind === "struct" &&
      !accountName.endsWith("Ix") &&
      !accountName.endsWith("Ctx")
    ) {
      const snakeName = snakeCase(accountName).slice(1);
      const prefix = prefixes[snakeName] ?? "";
      const t = `
Table ${prefix}${snakeName} {
  ref string
  ${type.fields
    .map(({ name: field, type }) => {
      return `${snakeCase(field)} ${renderValue(type)}`;
    })
    .join("\n  ")}
}
`;
      writeFileSync(outPath, t, {
        flag: "a+",
      });
    }
  }

  writeFileSync(outPath, "\n", {
    flag: "a+",
  });
  for ([src, dst] of Object.entries(refs)) {
    const srcPrefix = prefixes[src.split(".")[0]] ?? "";
    const dstPrefix = prefixes[dst.split(".")[0]] ?? "";
    const ref = `Ref: ${srcPrefix}${src} < ${dstPrefix}${dst}\n`;
    writeFileSync(outPath, ref, {
      flag: "a+",
    });
  }
};

main();
