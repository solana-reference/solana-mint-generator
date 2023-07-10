use anchor_lang::prelude::*;
use authorization::*;
use instructions::*;
use mint_config::*;

pub mod authorization;
pub mod errors;
pub mod instructions;
pub mod mint_config;
pub mod state;
pub mod utils;

declare_id!("mintjBhypUqvbKvCePPsQN55AYBY3DwFWpuR5PDURdH");

#[program]
pub mod mint_generator {
    use super::*;

    pub fn init_mint_config(ctx: Context<InitMintConfigCtx>, ix: InitMintConfigIx) -> Result<()> {
        init_mint_config::handler(ctx, ix)
    }

    pub fn update_mint_config(ctx: Context<UpdateMintConfigCtx>, ix: UpdateMintConfigIx) -> Result<()> {
        update_mint_config::handler(ctx, ix)
    }

    pub fn set_mint_config_metadata(ctx: Context<SetMintConfigMetadataCtx>, ix: SetMintConfigMetadataIx) -> Result<()> {
        set_mint_config_metadata::handler(ctx, ix)
    }

    pub fn close_mint_config(ctx: Context<CloseMintConfigCtx>) -> Result<()> {
        close_mint_config::handler(ctx)
    }

    pub fn set_mint_phase_authorization(ctx: Context<SetMintPhaseAuthorizationCtx>, ix: SetMintPhaseAuthorizationIx) -> Result<()> {
        set_mint_phase_authorization::handler(ctx, ix)
    }

    pub fn close_mint_phase_authorization(ctx: Context<CloseMintPhaseAuthorizationCtx>) -> Result<()> {
        close_mint_phase_authorization::handler(ctx)
    }

    pub fn set_mint_entry(ctx: Context<SetMintEntryCtx>, ix: SetMintEntryIx) -> Result<()> {
        set_mint_entry::handler(ctx, ix)
    }

    pub fn mint<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, MintCtx<'info>>, ix: MintIx) -> Result<()> {
        mint::handler(ctx, ix)
    }

    pub fn release_output_mint<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ReleaseOutputMintCtx<'info>>) -> Result<()> {
        release_output_mint::handler(ctx)
    }
}
