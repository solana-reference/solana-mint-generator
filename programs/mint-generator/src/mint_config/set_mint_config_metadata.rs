use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetMintConfigMetadataIx {
    metadata: String,
}

#[derive(Accounts)]
#[instruction(ix: SetMintConfigMetadataIx)]
pub struct SetMintConfigMetadataCtx<'info> {
    #[account(mut, constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SetMintConfigMetadataCtx>, ix: SetMintConfigMetadataIx) -> Result<()> {
    let new_mint_config = MintConfig {
        bump: ctx.accounts.mint_config.bump,
        authority: ctx.accounts.mint_config.authority,
        name: ctx.accounts.mint_config.name.clone(),
        supply: ctx.accounts.mint_config.supply,
        count: ctx.accounts.mint_config.count,
        output_mint_config: ctx.accounts.mint_config.output_mint_config.clone(),
        mint_phases: ctx.accounts.mint_config.mint_phases.clone(),
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
