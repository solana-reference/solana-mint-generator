use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // config errors
    #[msg("Invalid authority")]
    InvalidAuthority = 0,
    #[msg("Invalid mint phase authorization")]
    InvalidMintPhaseAuthorization,
    #[msg("Invalid mint entry index")]
    InvalidIndex,
    #[msg("Invalid program id")]
    InvalidProgramId,

    // mint config errors
    #[msg("Too many creators")]
    TooManyCreators = 10,
    #[msg("Invalid mint config id")]
    InvalidMintConfigId,
    #[msg("Invalid token standard")]
    InvalidTokenStandard,
    #[msg("Cannot mint with programmably nft and merkle tree")]
    ProgrammableAndMerkleTree,

    // mint errors
    #[msg("Minting already started")]
    MintingAlreadyStarted = 20,
    #[msg("Invalid phase")]
    InvalidPhase,
    #[msg("Phase not active")]
    PhaseNotActive,
    #[msg("No tokens remaining")]
    NotTokensRemaining,

    // token check
    #[msg("Holder must be signer")]
    HolderNotSigner = 30,
    #[msg("Invalid token check holder token account")]
    InvalidTokenCheckHolderTokenAccount,
    #[msg("Invalid token check transfer target")]
    InvalidTokenCheckTransferTarget,
    #[msg("Invalid token check")]
    InvalidTokenCheck,
    #[msg("Invalid mint metadata")]
    InvalidMintMetadata,
    #[msg("Invalid mint metadata owner")]
    InvalidMintMetadataOwner,

    // authorization
    #[msg("Mint phase authorizations used")]
    MintPhaseAuthorizationsUsed = 40,
    #[msg("IncorrectAuthorizationHolder")]
    IncorrectAuthorizationHolder,

    // release time
    #[msg("Release time invalid")]
    ReleaseTimeInvalid = 50,
    #[msg("Invalid output mints pending release")]
    InvalidOutputMintsPendingRelease,
}
