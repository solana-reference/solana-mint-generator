use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseMintConfigCtx<'info> {
    #[account(mut, close = authority, constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
}

pub fn handler(_ctx: Context<CloseMintConfigCtx>) -> Result<()> {
    Ok(())
}
