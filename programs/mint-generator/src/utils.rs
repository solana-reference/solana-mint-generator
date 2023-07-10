use anchor_lang::prelude::*;
use anchor_lang::Result;
use arrayref::array_ref;
use solana_program::program::invoke;
use solana_program::system_instruction::transfer;
use std::cmp::Ordering;
use std::convert::TryInto;

pub fn resize_account<'info>(account_info: &AccountInfo<'info>, new_space: usize, payer: &AccountInfo<'info>, system_program: &AccountInfo<'info>) -> Result<()> {
    let rent = Rent::get()?;
    msg!("resize {} => {}", account_info.data_len(), new_space);
    let new_minimum_balance = rent.minimum_balance(new_space);
    let current_balance = account_info.lamports();

    match new_minimum_balance.cmp(&current_balance) {
        Ordering::Greater => {
            let lamports_diff = new_minimum_balance.saturating_sub(current_balance);
            invoke(
                &transfer(&payer.key(), &account_info.key(), lamports_diff),
                &[payer.clone(), account_info.clone(), system_program.clone()],
            )?;
        }
        Ordering::Less => {
            let lamports_diff = current_balance.saturating_sub(new_minimum_balance);
            **account_info.try_borrow_mut_lamports()? = new_minimum_balance;
            **payer.try_borrow_mut_lamports()? = payer.lamports().checked_add(lamports_diff).expect("Add error");
        }
        Ordering::Equal => {}
    }
    account_info.realloc(new_space, false)?;
    Ok(())
}

pub fn pseudo_random_number<'info>(recent_slothashes: &AccountInfo<'info>) -> Result<u64> {
    let recent_slothashes_data = recent_slothashes.data.borrow();
    let recent_slothash = array_ref![recent_slothashes_data, 12, 8];
    let timestamp = Clock::get()?.unix_timestamp;
    Ok(u64::from_le_bytes(*recent_slothash).saturating_sub(timestamp.try_into().expect("Conversion error")))
}
