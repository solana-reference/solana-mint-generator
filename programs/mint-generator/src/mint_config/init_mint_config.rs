use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitMintConfigIx {
    authority: Pubkey,
    name: String,
    output_mint_config: OutputMintConfig,
    mint_phases: Vec<MintPhase>,
    metadata: String,
}

#[derive(Accounts)]
#[instruction(ix: InitMintConfigIx)]
pub struct InitMintConfigCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = MINT_CONFIG_SIZE,
        seeds = [MINT_CONFIG_PREFIX.as_bytes(), ix.name.as_bytes()],
        bump
    )]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitMintConfigCtx>, ix: InitMintConfigIx) -> Result<()> {
    let new_mint_config = MintConfig {
        bump: *ctx.bumps.get("mint_config").unwrap(),
        authority: ctx.accounts.authority.key(),
        name: ix.name,
        supply: 0,
        count: 0,
        output_mint_config: ix.output_mint_config,
        mint_phases: ix.mint_phases,
        metadata: ix.metadata,
    };
    new_mint_config.check_valid()?;
    resize_account(
        &ctx.accounts.mint_config.to_account_info(),
        new_mint_config.account_size(),
        &ctx.accounts.payer.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;
    ctx.accounts.mint_config.set_inner(new_mint_config);

    Ok(())
}
