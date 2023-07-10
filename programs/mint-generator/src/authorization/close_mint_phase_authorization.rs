use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseMintPhaseAuthorizationCtx<'info> {
    #[account(mut, close = authority, constraint = mint_phase_authorization.mint_config == mint_config.key() @ ErrorCode::InvalidMintPhaseAuthorization)]
    mint_phase_authorization: Box<Account<'info, MintPhaseAuthorization>>,
    #[account(constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
}

pub fn handler(_ctx: Context<CloseMintPhaseAuthorizationCtx>) -> Result<()> {
    Ok(())
}
