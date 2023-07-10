use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;
use std::cmp;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetMintEntryIx {
    index: u64,
    name: String,
    symbol: String,
    uri: String,
}

#[derive(Accounts)]
pub struct SetMintEntryCtx<'info> {
    #[account(mut, constraint = mint_config.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    mint_config: Box<Account<'info, MintConfig>>,
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SetMintEntryCtx>, ix: SetMintEntryIx) -> Result<()> {
    let array_of_zeroes = vec![0u8; MAX_NAME_LENGTH - ix.name.len()];
    let name = ix.name.clone() + std::str::from_utf8(&array_of_zeroes[4..]).unwrap();
    let array_of_zeroes = vec![0u8; MAX_SYMBOL_LENGTH - ix.symbol.len()];
    let symbol = ix.symbol.clone() + std::str::from_utf8(&array_of_zeroes[4..]).unwrap();
    let array_of_zeroes = vec![0u8; MAX_URI_LENGTH - ix.uri.len()];
    let uri = ix.uri.clone() + std::str::from_utf8(&array_of_zeroes[4..]).unwrap();

    let new_mint_entry = MintEntry { name, symbol, uri };
    let mint_config = &ctx.accounts.mint_config;
    if mint_config.count > 0 {
        return Err(error!(ErrorCode::MintingAlreadyStarted));
    }

    let mint_config_account_info = mint_config.to_account_info();
    let mint_entries_start = mint_config_account_info
        .data_len()
        .checked_sub((mint_config.supply as usize).checked_mul(MINT_ENTRY_SIZE).expect("Mul error"))
        .expect("Sub error");
    let start_position = mint_entries_start.checked_add((ix.index as usize).checked_mul(MINT_ENTRY_SIZE).expect("Mul error")).expect("Add error");
    let end_position = start_position.checked_add(MINT_ENTRY_SIZE).expect("Add error");
    if mint_config_account_info.data_len() < end_position {
        resize_account(
            &mint_config.to_account_info(),
            end_position,
            &ctx.accounts.payer.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
        )?;
    }

    let new_mint_entry_data = new_mint_entry.try_to_vec()?;
    let new_mint_entry_slice: &[u8] = &new_mint_entry_data.as_slice();

    let mut data = mint_config_account_info.data.borrow_mut();
    let array_slice: &mut [u8] = &mut data[start_position..end_position];
    array_slice.copy_from_slice(new_mint_entry_slice);

    // update supply
    ctx.accounts.mint_config.supply = cmp::max(mint_config.supply, ix.index + 1);

    Ok(())
}
