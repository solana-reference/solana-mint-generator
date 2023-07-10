use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateMintConfigIx {
    authority: Pubkey,
    output_mint_config: OutputMintConfig,
    mint_phases: Vec<MintPhase>,
    metadata: String,
}

#[derive(Accounts)]
#[instruction(ix: UpdateMintConfigIx)]
pub struct UpdateMintConfigCtx<'info> {
    #[account(mut, constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateMintConfigCtx>, ix: UpdateMintConfigIx) -> Result<()> {
    let new_mint_config = MintConfig {
        bump: ctx.accounts.mint_config.bump,
        authority: ix.authority,
        name: ctx.accounts.mint_config.name.clone(),
        supply: ctx.accounts.mint_config.supply,
        count: ctx.accounts.mint_config.count,
        output_mint_config: ix.output_mint_config,
        mint_phases: ix.mint_phases,
        metadata: ix.metadata,
    };
    new_mint_config.check_valid()?;

    let original_data_length = ctx.accounts.mint_config.to_account_info().data_len();
    let new_data_length = new_mint_config.account_size();

    if original_data_length > new_data_length {
        reposition_mint_entries(&ctx.accounts.mint_config, original_data_length, new_data_length)?;
    }

    // resize
    resize_account(
        &ctx.accounts.mint_config.to_account_info(),
        new_mint_config.account_size(),
        &ctx.accounts.payer.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    if original_data_length < new_data_length {
        reposition_mint_entries(&ctx.accounts.mint_config, original_data_length, new_data_length)?;
    }

    // save config
    ctx.accounts.mint_config.set_inner(new_mint_config);

    Ok(())
}
