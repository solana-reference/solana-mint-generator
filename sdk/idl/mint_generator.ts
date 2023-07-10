export type MintGenerator = {
  version: "0.1.0";
  name: "mint_generator";
  instructions: [
    {
      name: "initMintConfig";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "InitMintConfigIx";
          };
        }
      ];
    },
    {
      name: "updateMintConfig";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "UpdateMintConfigIx";
          };
        }
      ];
    },
    {
      name: "setMintConfigMetadata";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "SetMintConfigMetadataIx";
          };
        }
      ];
    },
    {
      name: "closeMintConfig";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        }
      ];
      args: [];
    },
    {
      name: "setMintPhaseAuthorization";
      accounts: [
        {
          name: "mintPhaseAuthorization";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintConfig";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "SetMintPhaseAuthorizationIx";
          };
        }
      ];
    },
    {
      name: "closeMintPhaseAuthorization";
      accounts: [
        {
          name: "mintPhaseAuthorization";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintConfig";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        }
      ];
      args: [];
    },
    {
      name: "setMintEntry";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "SetMintEntryIx";
          };
        }
      ];
    },
    {
      name: "mint";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "user";
          isMut: false;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "collector";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recentSlothashes";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "MintIx";
          };
        }
      ];
    },
    {
      name: "releaseOutputMint";
      accounts: [
        {
          name: "mintConfig";
          isMut: true;
          isSigner: false;
        },
        {
          name: "outputMintPendingRelease";
          isMut: true;
          isSigner: false;
        },
        {
          name: "user";
          isMut: true;
          isSigner: false;
        },
        {
          name: "outputMintUserTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "outputMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "outputMintMetadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "outputMintEdition";
          isMut: false;
          isSigner: false;
        },
        {
          name: "outputMintUserTokenRecord";
          isMut: true;
          isSigner: false;
        },
        {
          name: "outputMintAuthorizationRules";
          isMut: false;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "releaseAuthority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "collector";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructions";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorizationRulesProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "mintConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "supply";
            type: "u64";
          },
          {
            name: "count";
            type: "u64";
          },
          {
            name: "outputMintConfig";
            type: {
              defined: "OutputMintConfig";
            };
          },
          {
            name: "mintPhases";
            type: {
              vec: {
                defined: "MintPhase";
              };
            };
          },
          {
            name: "metadata";
            type: "string";
          }
        ];
      };
    },
    {
      name: "mintPhaseAuthorization";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "mintConfig";
            type: "publicKey";
          },
          {
            name: "mintPhaseIndex";
            type: "u8";
          },
          {
            name: "user";
            type: "publicKey";
          },
          {
            name: "count";
            type: "u64";
          },
          {
            name: "remaining";
            type: {
              option: "u64";
            };
          }
        ];
      };
    },
    {
      name: "outputMintPendingRelease";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "mintConfig";
            type: "publicKey";
          },
          {
            name: "mint";
            type: "publicKey";
          },
          {
            name: "holder";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "SetMintPhaseAuthorizationIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "remaining";
            type: {
              option: "u64";
            };
          },
          {
            name: "user";
            type: "publicKey";
          },
          {
            name: "mintPhaseIx";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "MintIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mintPhaseIx";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "SetMintEntryIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "index";
            type: "u64";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "symbol";
            type: "string";
          },
          {
            name: "uri";
            type: "string";
          }
        ];
      };
    },
    {
      name: "InitMintConfigIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "outputMintConfig";
            type: {
              defined: "OutputMintConfig";
            };
          },
          {
            name: "mintPhases";
            type: {
              vec: {
                defined: "MintPhase";
              };
            };
          },
          {
            name: "metadata";
            type: "string";
          }
        ];
      };
    },
    {
      name: "SetMintConfigMetadataIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "metadata";
            type: "string";
          }
        ];
      };
    },
    {
      name: "UpdateMintConfigIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "outputMintConfig";
            type: {
              defined: "OutputMintConfig";
            };
          },
          {
            name: "mintPhases";
            type: {
              vec: {
                defined: "MintPhase";
              };
            };
          },
          {
            name: "metadata";
            type: "string";
          }
        ];
      };
    },
    {
      name: "OutputMintConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "sellerFeeBasisPoints";
            type: "u16";
          },
          {
            name: "tokenStandard";
            type: {
              defined: "TokenStandard";
            };
          },
          {
            name: "collection";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "ruleset";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "creators";
            type: {
              vec: {
                defined: "Creator";
              };
            };
          },
          {
            name: "merkleTree";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "releaseAuthority";
            type: {
              option: "publicKey";
            };
          }
        ];
      };
    },
    {
      name: "Creator";
      type: {
        kind: "struct";
        fields: [
          {
            name: "address";
            type: "publicKey";
          },
          {
            name: "share";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "MintPhase";
      type: {
        kind: "struct";
        fields: [
          {
            name: "startCondition";
            type: {
              option: {
                defined: "MintPhaseStartEndCondition";
              };
            };
          },
          {
            name: "endCondition";
            type: {
              option: {
                defined: "MintPhaseStartEndCondition";
              };
            };
          },
          {
            name: "tokenChecks";
            type: {
              vec: {
                defined: "MintPhaseTokenCheck";
              };
            };
          },
          {
            name: "authorization";
            type: {
              option: {
                defined: "MintPhaseAuthorizationCheck";
              };
            };
          },
          {
            name: "metadata";
            type: "string";
          }
        ];
      };
    },
    {
      name: "MintPhaseStartEndCondition";
      type: {
        kind: "struct";
        fields: [
          {
            name: "timeSeconds";
            type: {
              option: "i64";
            };
          },
          {
            name: "count";
            type: {
              option: "u64";
            };
          }
        ];
      };
    },
    {
      name: "MintPhaseTokenCheck";
      type: {
        kind: "struct";
        fields: [
          {
            name: "addressKind";
            type: {
              defined: "MintPhaseTokenCheckAddressKind";
            };
          },
          {
            name: "address";
            type: "publicKey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "transferTarget";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "mode";
            type: {
              defined: "MintPhaseTokenCheckMode";
            };
          }
        ];
      };
    },
    {
      name: "MintPhaseAuthorizationCheck";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mode";
            type: {
              defined: "MintPhaseAuthorizationMode";
            };
          }
        ];
      };
    },
    {
      name: "MintEntry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "symbol";
            type: "string";
          },
          {
            name: "uri";
            type: "string";
          }
        ];
      };
    },
    {
      name: "TokenStandard";
      type: {
        kind: "enum";
        variants: [
          {
            name: "NonFungible";
          },
          {
            name: "FungibleAsset";
          },
          {
            name: "Fungible";
          },
          {
            name: "NonFungibleEdition";
          },
          {
            name: "ProgrammableNonFungible";
          }
        ];
      };
    },
    {
      name: "MintPhaseTokenCheckAddressKind";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Mint";
          },
          {
            name: "Collection";
          },
          {
            name: "Creator";
          }
        ];
      };
    },
    {
      name: "MintPhaseTokenCheckMode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Check";
          },
          {
            name: "Transfer";
          },
          {
            name: "Burn";
          }
        ];
      };
    },
    {
      name: "MintPhaseAuthorizationMode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "DefaultDisallowed";
          },
          {
            name: "DefaultAllowed";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidAuthority";
      msg: "Invalid authority";
    },
    {
      code: 6001;
      name: "InvalidMintPhaseAuthorization";
      msg: "Invalid mint phase authorization";
    },
    {
      code: 6002;
      name: "InvalidIndex";
      msg: "Invalid mint entry index";
    },
    {
      code: 6003;
      name: "InvalidProgramId";
      msg: "Invalid program id";
    },
    {
      code: 6010;
      name: "TooManyCreators";
      msg: "Too many creators";
    },
    {
      code: 6011;
      name: "InvalidMintConfigId";
      msg: "Invalid mint config id";
    },
    {
      code: 6012;
      name: "InvalidTokenStandard";
      msg: "Invalid token standard";
    },
    {
      code: 6013;
      name: "ProgrammableAndMerkleTree";
      msg: "Cannot mint with programmably nft and merkle tree";
    },
    {
      code: 6020;
      name: "MintingAlreadyStarted";
      msg: "Minting already started";
    },
    {
      code: 6021;
      name: "InvalidPhase";
      msg: "Invalid phase";
    },
    {
      code: 6022;
      name: "PhaseNotActive";
      msg: "Phase not active";
    },
    {
      code: 6023;
      name: "NotTokensRemaining";
      msg: "No tokens remaining";
    },
    {
      code: 6030;
      name: "HolderNotSigner";
      msg: "Holder must be signer";
    },
    {
      code: 6031;
      name: "InvalidTokenCheckHolderTokenAccount";
      msg: "Invalid token check holder token account";
    },
    {
      code: 6032;
      name: "InvalidTokenCheckTransferTarget";
      msg: "Invalid token check transfer target";
    },
    {
      code: 6033;
      name: "InvalidTokenCheck";
      msg: "Invalid token check";
    },
    {
      code: 6034;
      name: "InvalidMintMetadata";
      msg: "Invalid mint metadata";
    },
    {
      code: 6035;
      name: "InvalidMintMetadataOwner";
      msg: "Invalid mint metadata owner";
    },
    {
      code: 6040;
      name: "MintPhaseAuthorizationsUsed";
      msg: "Mint phase authorizations used";
    },
    {
      code: 6041;
      name: "IncorrectAuthorizationHolder";
      msg: "IncorrectAuthorizationHolder";
    },
    {
      code: 6050;
      name: "ReleaseTimeInvalid";
      msg: "Release time invalid";
    },
    {
      code: 6051;
      name: "InvalidOutputMintsPendingRelease";
      msg: "Invalid output mints pending release";
    }
  ];
};

export const IDL: MintGenerator = {
  version: "0.1.0",
  name: "mint_generator",
  instructions: [
    {
      name: "initMintConfig",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "InitMintConfigIx",
          },
        },
      ],
    },
    {
      name: "updateMintConfig",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "UpdateMintConfigIx",
          },
        },
      ],
    },
    {
      name: "setMintConfigMetadata",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "SetMintConfigMetadataIx",
          },
        },
      ],
    },
    {
      name: "closeMintConfig",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: "setMintPhaseAuthorization",
      accounts: [
        {
          name: "mintPhaseAuthorization",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "SetMintPhaseAuthorizationIx",
          },
        },
      ],
    },
    {
      name: "closeMintPhaseAuthorization",
      accounts: [
        {
          name: "mintPhaseAuthorization",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: "setMintEntry",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "SetMintEntryIx",
          },
        },
      ],
    },
    {
      name: "mint",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "collector",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recentSlothashes",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "MintIx",
          },
        },
      ],
    },
    {
      name: "releaseOutputMint",
      accounts: [
        {
          name: "mintConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "outputMintPendingRelease",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: false,
        },
        {
          name: "outputMintUserTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "outputMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "outputMintMetadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "outputMintEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "outputMintUserTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "outputMintAuthorizationRules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "releaseAuthority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "collector",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "mintConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "supply",
            type: "u64",
          },
          {
            name: "count",
            type: "u64",
          },
          {
            name: "outputMintConfig",
            type: {
              defined: "OutputMintConfig",
            },
          },
          {
            name: "mintPhases",
            type: {
              vec: {
                defined: "MintPhase",
              },
            },
          },
          {
            name: "metadata",
            type: "string",
          },
        ],
      },
    },
    {
      name: "mintPhaseAuthorization",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "mintConfig",
            type: "publicKey",
          },
          {
            name: "mintPhaseIndex",
            type: "u8",
          },
          {
            name: "user",
            type: "publicKey",
          },
          {
            name: "count",
            type: "u64",
          },
          {
            name: "remaining",
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "outputMintPendingRelease",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "mintConfig",
            type: "publicKey",
          },
          {
            name: "mint",
            type: "publicKey",
          },
          {
            name: "holder",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "SetMintPhaseAuthorizationIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "remaining",
            type: {
              option: "u64",
            },
          },
          {
            name: "user",
            type: "publicKey",
          },
          {
            name: "mintPhaseIx",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "MintIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "mintPhaseIx",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "SetMintEntryIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            type: "u64",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "symbol",
            type: "string",
          },
          {
            name: "uri",
            type: "string",
          },
        ],
      },
    },
    {
      name: "InitMintConfigIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "outputMintConfig",
            type: {
              defined: "OutputMintConfig",
            },
          },
          {
            name: "mintPhases",
            type: {
              vec: {
                defined: "MintPhase",
              },
            },
          },
          {
            name: "metadata",
            type: "string",
          },
        ],
      },
    },
    {
      name: "SetMintConfigMetadataIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "metadata",
            type: "string",
          },
        ],
      },
    },
    {
      name: "UpdateMintConfigIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "outputMintConfig",
            type: {
              defined: "OutputMintConfig",
            },
          },
          {
            name: "mintPhases",
            type: {
              vec: {
                defined: "MintPhase",
              },
            },
          },
          {
            name: "metadata",
            type: "string",
          },
        ],
      },
    },
    {
      name: "OutputMintConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "sellerFeeBasisPoints",
            type: "u16",
          },
          {
            name: "tokenStandard",
            type: {
              defined: "TokenStandard",
            },
          },
          {
            name: "collection",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "ruleset",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "creators",
            type: {
              vec: {
                defined: "Creator",
              },
            },
          },
          {
            name: "merkleTree",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "releaseAuthority",
            type: {
              option: "publicKey",
            },
          },
        ],
      },
    },
    {
      name: "Creator",
      type: {
        kind: "struct",
        fields: [
          {
            name: "address",
            type: "publicKey",
          },
          {
            name: "share",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "MintPhase",
      type: {
        kind: "struct",
        fields: [
          {
            name: "startCondition",
            type: {
              option: {
                defined: "MintPhaseStartEndCondition",
              },
            },
          },
          {
            name: "endCondition",
            type: {
              option: {
                defined: "MintPhaseStartEndCondition",
              },
            },
          },
          {
            name: "tokenChecks",
            type: {
              vec: {
                defined: "MintPhaseTokenCheck",
              },
            },
          },
          {
            name: "authorization",
            type: {
              option: {
                defined: "MintPhaseAuthorizationCheck",
              },
            },
          },
          {
            name: "metadata",
            type: "string",
          },
        ],
      },
    },
    {
      name: "MintPhaseStartEndCondition",
      type: {
        kind: "struct",
        fields: [
          {
            name: "timeSeconds",
            type: {
              option: "i64",
            },
          },
          {
            name: "count",
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "MintPhaseTokenCheck",
      type: {
        kind: "struct",
        fields: [
          {
            name: "addressKind",
            type: {
              defined: "MintPhaseTokenCheckAddressKind",
            },
          },
          {
            name: "address",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "transferTarget",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "mode",
            type: {
              defined: "MintPhaseTokenCheckMode",
            },
          },
        ],
      },
    },
    {
      name: "MintPhaseAuthorizationCheck",
      type: {
        kind: "struct",
        fields: [
          {
            name: "mode",
            type: {
              defined: "MintPhaseAuthorizationMode",
            },
          },
        ],
      },
    },
    {
      name: "MintEntry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "symbol",
            type: "string",
          },
          {
            name: "uri",
            type: "string",
          },
        ],
      },
    },
    {
      name: "TokenStandard",
      type: {
        kind: "enum",
        variants: [
          {
            name: "NonFungible",
          },
          {
            name: "FungibleAsset",
          },
          {
            name: "Fungible",
          },
          {
            name: "NonFungibleEdition",
          },
          {
            name: "ProgrammableNonFungible",
          },
        ],
      },
    },
    {
      name: "MintPhaseTokenCheckAddressKind",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Mint",
          },
          {
            name: "Collection",
          },
          {
            name: "Creator",
          },
        ],
      },
    },
    {
      name: "MintPhaseTokenCheckMode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Check",
          },
          {
            name: "Transfer",
          },
          {
            name: "Burn",
          },
        ],
      },
    },
    {
      name: "MintPhaseAuthorizationMode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "DefaultDisallowed",
          },
          {
            name: "DefaultAllowed",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidAuthority",
      msg: "Invalid authority",
    },
    {
      code: 6001,
      name: "InvalidMintPhaseAuthorization",
      msg: "Invalid mint phase authorization",
    },
    {
      code: 6002,
      name: "InvalidIndex",
      msg: "Invalid mint entry index",
    },
    {
      code: 6003,
      name: "InvalidProgramId",
      msg: "Invalid program id",
    },
    {
      code: 6010,
      name: "TooManyCreators",
      msg: "Too many creators",
    },
    {
      code: 6011,
      name: "InvalidMintConfigId",
      msg: "Invalid mint config id",
    },
    {
      code: 6012,
      name: "InvalidTokenStandard",
      msg: "Invalid token standard",
    },
    {
      code: 6013,
      name: "ProgrammableAndMerkleTree",
      msg: "Cannot mint with programmably nft and merkle tree",
    },
    {
      code: 6020,
      name: "MintingAlreadyStarted",
      msg: "Minting already started",
    },
    {
      code: 6021,
      name: "InvalidPhase",
      msg: "Invalid phase",
    },
    {
      code: 6022,
      name: "PhaseNotActive",
      msg: "Phase not active",
    },
    {
      code: 6023,
      name: "NotTokensRemaining",
      msg: "No tokens remaining",
    },
    {
      code: 6030,
      name: "HolderNotSigner",
      msg: "Holder must be signer",
    },
    {
      code: 6031,
      name: "InvalidTokenCheckHolderTokenAccount",
      msg: "Invalid token check holder token account",
    },
    {
      code: 6032,
      name: "InvalidTokenCheckTransferTarget",
      msg: "Invalid token check transfer target",
    },
    {
      code: 6033,
      name: "InvalidTokenCheck",
      msg: "Invalid token check",
    },
    {
      code: 6034,
      name: "InvalidMintMetadata",
      msg: "Invalid mint metadata",
    },
    {
      code: 6035,
      name: "InvalidMintMetadataOwner",
      msg: "Invalid mint metadata owner",
    },
    {
      code: 6040,
      name: "MintPhaseAuthorizationsUsed",
      msg: "Mint phase authorizations used",
    },
    {
      code: 6041,
      name: "IncorrectAuthorizationHolder",
      msg: "IncorrectAuthorizationHolder",
    },
    {
      code: 6050,
      name: "ReleaseTimeInvalid",
      msg: "Release time invalid",
    },
    {
      code: 6051,
      name: "InvalidOutputMintsPendingRelease",
      msg: "Invalid output mints pending release",
    },
  ],
};
