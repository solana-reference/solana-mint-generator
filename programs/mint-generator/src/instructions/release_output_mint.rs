use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use mpl_token_metadata::instruction::MetadataInstruction;
use mpl_token_metadata::instruction::UnlockArgs;
use solana_program::instruction::Instruction;
use solana_program::program::invoke_signed;

#[derive(Accounts)]
pub struct ReleaseOutputMintCtx<'info> {
    #[account(mut)]
    mint_config: Box<Account<'info, MintConfig>>,
    #[account(mut, close = collector, constraint = output_mint_pending_release.mint_config == mint_config.key() && output_mint_pending_release.mint == output_mint.key() @ ErrorCode::InvalidOutputMintsPendingRelease)]
    output_mint_pending_release: Box<Account<'info, OutputMintPendingRelease>>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    user: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    output_mint_user_token_account: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    output_mint: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    output_mint_metadata: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    output_mint_edition: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    output_mint_user_token_record: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    output_mint_authorization_rules: UncheckedAccount<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint = mint_config.output_mint_config.release_authority.is_none() || mint_config.output_mint_config.release_authority.unwrap() == release_authority.key() @ ErrorCode::InvalidAuthority )]
    release_authority: Signer<'info>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    collector: UncheckedAccount<'info>,

    system_program: Program<'info, System>,
    /// CHECK: Checked in CPI
    instructions: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    token_program: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    authorization_rules_program: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    token_metadata_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<ReleaseOutputMintCtx>) -> Result<()> {
    let (output_mint_pending_release_seeds, _) = OutputMintPendingRelease::seeds(
        &ctx.accounts.output_mint_pending_release.mint_config,
        &ctx.accounts.output_mint_pending_release.mint,
        &ctx.accounts.output_mint_pending_release.key(),
    )?;
    invoke_signed(
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.output_mint_pending_release.key(), true),
                AccountMeta::new_readonly(ctx.accounts.user.key(), false),
                AccountMeta::new(ctx.accounts.output_mint_user_token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.output_mint.key(), false),
                AccountMeta::new(ctx.accounts.output_mint_metadata.key(), false),
                AccountMeta::new_readonly(ctx.accounts.output_mint_edition.key(), false),
                AccountMeta::new(ctx.accounts.output_mint_user_token_record.key(), false),
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.instructions.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.authorization_rules_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.output_mint_authorization_rules.key(), false),
            ],
            data: MetadataInstruction::Unlock(UnlockArgs::V1 { authorization_data: None }).try_to_vec().unwrap(),
        },
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.output_mint_pending_release.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.output_mint_user_token_account.to_account_info(),
            ctx.accounts.output_mint.to_account_info(),
            ctx.accounts.output_mint_metadata.to_account_info(),
            ctx.accounts.output_mint_edition.to_account_info(),
            ctx.accounts.output_mint_user_token_record.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.authorization_rules_program.to_account_info(),
            ctx.accounts.output_mint_authorization_rules.to_account_info(),
        ],
        &[&output_mint_pending_release_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
    )?;

    Ok(())
}
