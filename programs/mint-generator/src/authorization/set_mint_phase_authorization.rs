use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetMintPhaseAuthorizationIx {
    remaining: Option<u64>,
    user: Pubkey,
    mint_phase_ix: u8,
}

#[derive(Accounts)]
#[instruction(ix: SetMintPhaseAuthorizationIx)]
pub struct SetMintPhaseAuthorizationCtx<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = MINT_PHASE_AUTHORIZATION_SIZE,
        seeds = [MINT_PHASE_AUTHORIZATION_PREFIX.as_bytes(), mint_config.key().as_ref(), ix.mint_phase_ix.to_le_bytes().as_ref(), ix.user.as_ref()],
        bump
    )]
    mint_phase_authorization: Box<Account<'info, MintPhaseAuthorization>>,
    #[account(constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SetMintPhaseAuthorizationCtx>, ix: SetMintPhaseAuthorizationIx) -> Result<()> {
    ctx.accounts.mint_phase_authorization.bump = *ctx.bumps.get("mint_phase_authorization").unwrap();
    ctx.accounts.mint_phase_authorization.mint_config = ctx.accounts.mint_config.key();
    ctx.accounts.mint_phase_authorization.mint_phase_index = ix.mint_phase_ix;
    ctx.accounts.mint_phase_authorization.user = ix.user;
    ctx.accounts.mint_phase_authorization.remaining = ix.remaining;
    ctx.accounts.mint_phase_authorization.count = 0;

    Ok(())
}
