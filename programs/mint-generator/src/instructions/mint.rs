use crate::errors::ErrorCode;
use crate::state::get_phase;
use crate::state::get_random_output_mint;
use crate::state::output_mint_bg_creators;
use crate::state::output_mint_mpl_creators;
use crate::state::MintConfig;
use crate::state::MintEntry;
use crate::state::MintPhase;
use crate::state::MintPhaseAuthorization;
use crate::state::MintPhaseAuthorizationMode;
use crate::state::MintPhaseTokenCheckAddressKind;
use crate::state::MintPhaseTokenCheckMode;
use crate::state::OutputMintPendingRelease;
use crate::utils::resize_account;
use anchor_lang::prelude::*;
use anchor_spl::associated_token;
use anchor_spl::token;
use anchor_spl::token::Burn;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use mpl_bubblegum::state::metaplex_adapter::MetadataArgs;
use mpl_bubblegum::state::metaplex_adapter::TokenProgramVersion;
use mpl_token_metadata::instruction::CollectionDetailsToggle;
use mpl_token_metadata::instruction::CollectionToggle;
use mpl_token_metadata::instruction::CreateArgs;
use mpl_token_metadata::instruction::DelegateArgs;
use mpl_token_metadata::instruction::LockArgs;
use mpl_token_metadata::instruction::MetadataInstruction;
use mpl_token_metadata::instruction::MintArgs;
use mpl_token_metadata::instruction::RuleSetToggle;
use mpl_token_metadata::instruction::UpdateArgs;
use mpl_token_metadata::instruction::UsesToggle;
use mpl_token_metadata::instruction::VerificationArgs;
use mpl_token_metadata::state::AssetData;
use mpl_token_metadata::state::Collection;
use mpl_token_metadata::state::Data;
use mpl_token_metadata::state::Metadata;
use mpl_token_metadata::state::PrintSupply;
use solana_program::instruction::Instruction;
use solana_program::program::invoke;
use solana_program::program::invoke_signed;
use solana_program::system_instruction;
use solana_program::system_instruction::transfer;
use solana_program::sysvar;
use std::slice::Iter;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MintIx {
    mint_phase_ix: u8,
}

#[derive(Accounts)]
pub struct MintCtx<'info> {
    #[account(mut)]
    mint_config: Box<Account<'info, MintConfig>>,
    /// CHECK: Target account is unchecked
    user: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK: Address is checked
    #[account(mut, address = mint_config.authority @ ErrorCode::InvalidAuthority)]
    collector: UncheckedAccount<'info>,
    /// CHECK: Address is checked
    #[account(address = sysvar::slot_hashes::id())]
    recent_slothashes: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, MintCtx<'info>>, ix: MintIx) -> Result<()> {
    let remaining_accounts = &mut ctx.remaining_accounts.iter();
    let mint_phase = get_phase(&ctx.accounts.mint_config, ix.mint_phase_ix, ctx.accounts.payer.key() == ctx.accounts.mint_config.authority)?;

    // token checks
    handle_token_checks(mint_phase, remaining_accounts, ctx.accounts.payer.to_account_info(), ctx.accounts.system_program.to_account_info())?;

    // check authorization record
    handle_authorization_checks(ctx.program_id, &ctx.accounts.mint_config, ix.mint_phase_ix, mint_phase, remaining_accounts)?;

    // get mint entry
    let output_mint_entry = get_random_output_mint(&mut ctx.accounts.mint_config, &ctx.accounts.recent_slothashes)?;

    // mint
    if ctx.accounts.mint_config.output_mint_config.merkle_tree.is_some() {
        handle_mint_cnft(
            output_mint_entry,
            &ctx.accounts.mint_config,
            ctx.accounts.user.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            remaining_accounts,
        )?;
    } else {
        handle_mint_nft(
            output_mint_entry,
            &ctx.accounts.mint_config,
            ctx.accounts.user.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            remaining_accounts,
        )?;
    }

    // resize mint config last
    resize_account(
        &mut ctx.accounts.mint_config.to_account_info(),
        ctx.accounts.mint_config.account_size(),
        &ctx.accounts.collector,
        &ctx.accounts.system_program,
    )?;

    Ok(())
}

pub fn handle_token_checks<'info>(mint_phase: &MintPhase, remaining_accounts: &mut Iter<AccountInfo<'info>>, payer: AccountInfo<'info>, system_program: AccountInfo<'info>) -> Result<()> {
    if mint_phase.token_checks.is_empty() {
        return Ok(());
    }
    // get token program
    let token_program = next_account_info(remaining_accounts)?;
    if spl_token::ID != token_program.key() {
        return Err(error!(ErrorCode::InvalidProgramId));
    }
    // get associated token program
    let associated_token_program = next_account_info(remaining_accounts)?;
    if associated_token::ID != associated_token_program.key() {
        return Err(error!(ErrorCode::InvalidProgramId));
    }

    for token_check in &mint_phase.token_checks {
        let holder = next_account_info(remaining_accounts)?;
        if !holder.is_signer {
            return Err(error!(ErrorCode::HolderNotSigner));
        }

        let holder_token_account = match token_check.address_kind {
            MintPhaseTokenCheckAddressKind::Mint => {
                if token_check.address.key() == Pubkey::default() {
                    holder
                } else {
                    let token_account_info = next_account_info(remaining_accounts)?;
                    let token_account = Account::<TokenAccount>::try_from(token_account_info)?;
                    if token_account.owner != holder.key() || token_account.mint != token_check.address.key() {
                        return Err(error!(ErrorCode::InvalidTokenCheckHolderTokenAccount));
                    }
                    token_account_info
                }
            }
            MintPhaseTokenCheckAddressKind::Collection => {
                let token_account_info = next_account_info(remaining_accounts)?;
                let token_account: Account<TokenAccount> = Account::<TokenAccount>::try_from(token_account_info)?;
                if token_account.owner != holder.key() {
                    return Err(error!(ErrorCode::InvalidTokenCheckHolderTokenAccount));
                }

                let metadata_account_info = next_account_info(remaining_accounts)?;
                if metadata_account_info.to_account_info().owner.key() != mpl_token_metadata::id() {
                    return Err(error!(ErrorCode::InvalidMintMetadataOwner));
                }
                let metadata: Metadata = Metadata::deserialize(&mut metadata_account_info.try_borrow_mut_data().expect("Failed to borrow data").as_ref()).expect("Failed to deserialize metadata");
                if metadata.mint != token_account.mint.key() || metadata.collection.is_none() {
                    return Err(error!(ErrorCode::InvalidMintMetadata));
                }
                let collection = metadata.collection.unwrap();
                if !collection.verified || collection.key != token_check.address {
                    return Err(error!(ErrorCode::InvalidMintMetadata));
                }
                token_account_info
            }
            MintPhaseTokenCheckAddressKind::Creator => {
                let token_account_info = next_account_info(remaining_accounts)?;
                let token_account: Account<TokenAccount> = Account::<TokenAccount>::try_from(token_account_info)?;
                if token_account.owner != holder.key() {
                    return Err(error!(ErrorCode::InvalidTokenCheckHolderTokenAccount));
                }

                let metadata_account_info = next_account_info(remaining_accounts)?;
                if metadata_account_info.to_account_info().owner.key() != mpl_token_metadata::id() {
                    return Err(error!(ErrorCode::InvalidMintMetadataOwner));
                }
                let metadata: Metadata = Metadata::deserialize(&mut metadata_account_info.try_borrow_mut_data().expect("Failed to borrow data").as_ref()).expect("Failed to deserialize metadata");
                if metadata.mint != token_account.mint.key() {
                    return Err(error!(ErrorCode::InvalidMintMetadata));
                }
                if metadata.data.creators.is_none() || metadata.data.creators.unwrap().iter().find(|c| c.verified && c.address == token_check.address).is_none() {
                    return Err(error!(ErrorCode::InvalidMintMetadata));
                }
                token_account_info
            }
        };

        match token_check.mode {
            MintPhaseTokenCheckMode::Check => {
                // holder token account already checked above
                let holder_token_account = Account::<TokenAccount>::try_from(holder_token_account)?;
                if holder_token_account.amount < token_check.amount {
                    return Err(error!(ErrorCode::InvalidTokenCheck));
                }
            }
            MintPhaseTokenCheckMode::Transfer => {
                if token_check.address == Pubkey::default() {
                    let transfer_target_account_info = next_account_info(remaining_accounts)?;
                    if token_check.transfer_target.is_none() || transfer_target_account_info.key() != token_check.transfer_target.unwrap() {
                        return Err(error!(ErrorCode::InvalidTokenCheckTransferTarget));
                    }
                    invoke(
                        &transfer(&holder.key(), &transfer_target_account_info.key(), token_check.amount),
                        &[holder.to_account_info(), transfer_target_account_info.to_account_info(), system_program.to_account_info()],
                    )?;
                } else {
                    let transfer_target_account_info = next_account_info(remaining_accounts)?;
                    if token_check.transfer_target.is_none() || transfer_target_account_info.key() != token_check.transfer_target.unwrap() {
                        return Err(error!(ErrorCode::InvalidTokenCheckTransferTarget));
                    }
                    let target_token_account_info = next_account_info(remaining_accounts)?;
                    let target_mint_account_info = next_account_info(remaining_accounts)?;
                    let cpi_accounts = associated_token::Create {
                        mint: target_mint_account_info.to_account_info(),
                        payer: payer.to_account_info(),
                        authority: transfer_target_account_info.to_account_info(),
                        associated_token: target_token_account_info.to_account_info(),
                        system_program: system_program.to_account_info(),
                        token_program: token_program.to_account_info(),
                    };
                    let cpi_context = CpiContext::new(token_program.to_account_info(), cpi_accounts);
                    associated_token::create_idempotent(cpi_context)?;

                    // mint is checked here against the holder token account mint
                    let cpi_accounts = Transfer {
                        from: holder_token_account.to_account_info(),
                        to: target_token_account_info.to_account_info(),
                        authority: holder.to_account_info(),
                    };
                    let cpi_context = CpiContext::new(token_program.to_account_info(), cpi_accounts);
                    token::transfer(cpi_context, token_check.amount)?;
                }
            }
            MintPhaseTokenCheckMode::Burn => {
                let mint_acocunt_info = next_account_info(remaining_accounts)?;
                let cpi_accounts = Burn {
                    mint: mint_acocunt_info.to_account_info(),
                    from: holder_token_account.to_account_info(),
                    authority: holder.to_account_info(),
                };
                let cpi_context = CpiContext::new(token_program.to_account_info(), cpi_accounts);
                token::burn(cpi_context, token_check.amount)?;
            }
        }
    }

    Ok(())
}

pub fn handle_authorization_checks<'info>(
    program_id: &Pubkey,
    mint_config: &Account<'info, MintConfig>,
    mint_phase_ix: u8,
    mint_phase: &MintPhase,
    remaining_accounts: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    if let Some(authorization) = &mint_phase.authorization {
        let user = next_account_info(remaining_accounts)?;
        let holder = next_account_info(remaining_accounts)?;
        if !holder.is_signer {
            return Err(error!(ErrorCode::HolderNotSigner));
        }
        if holder.key() != user.key() && holder.key() != mint_config.authority {
            return Err(error!(ErrorCode::IncorrectAuthorizationHolder));
        }
        let mint_phase_authorization_account_info = next_account_info(remaining_accounts)?;
        MintPhaseAuthorization::seeds(&mint_config.key(), mint_phase_ix, &user.key(), &mint_phase_authorization_account_info.key())?;

        if mint_phase_authorization_account_info.data_is_empty() {
            if authorization.mode == MintPhaseAuthorizationMode::DefaultDisallowed {
                return Err(error!(ErrorCode::InvalidMintPhaseAuthorization));
            }
        } else {
            let mut mint_phase_authorization = Account::<MintPhaseAuthorization>::try_from(mint_phase_authorization_account_info)?;
            if &mint_phase_authorization.mint_config != &mint_config.key() || mint_phase_authorization.mint_phase_index != mint_phase_ix || mint_phase_authorization.user != user.key() {
                return Err(error!(ErrorCode::InvalidMintPhaseAuthorization));
            }

            if let Some(remaining) = mint_phase_authorization.remaining {
                if remaining == 0 {
                    return Err(error!(ErrorCode::MintPhaseAuthorizationsUsed));
                }
                mint_phase_authorization.remaining = Some(remaining.saturating_sub(1));
            }
            mint_phase_authorization.count = mint_phase_authorization.count.saturating_add(1);
            mint_phase_authorization.exit(program_id)?;
        }
    }

    Ok(())
}

pub fn handle_mint_nft<'info>(
    output_mint_entry: MintEntry,
    mint_config: &Account<'info, MintConfig>,
    user: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    remaining_accounts: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    let output_mint = next_account_info(remaining_accounts)?;
    let output_mint_metadata = next_account_info(remaining_accounts)?;
    let output_mint_edition = next_account_info(remaining_accounts)?;
    let output_mint_user_token_account = next_account_info(remaining_accounts)?;
    let output_mint_user_token_record = next_account_info(remaining_accounts)?;
    let output_mint_authorization_rules = next_account_info(remaining_accounts)?;
    let instructions = next_account_info(remaining_accounts)?;
    let token_metadata_program = next_account_info(remaining_accounts)?;
    let authorization_rules_program = next_account_info(remaining_accounts)?;
    let token_program = next_account_info(remaining_accounts)?;
    let associated_token_program = next_account_info(remaining_accounts)?;

    // mint
    let mint_config_seeds = MintConfig::seeds(&mint_config.name, &mint_config.key())?;
    invoke_signed(
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                AccountMeta::new(output_mint_metadata.key(), false),
                AccountMeta::new(output_mint_edition.key(), false),
                AccountMeta::new(output_mint.key(), true),
                AccountMeta::new(mint_config.key(), true),
                AccountMeta::new(payer.key(), true),
                AccountMeta::new(mint_config.key(), true),
                AccountMeta::new_readonly(system_program.key(), false),
                AccountMeta::new_readonly(instructions.key(), false),
                AccountMeta::new_readonly(token_program.key(), false),
            ],
            data: MetadataInstruction::Create(CreateArgs::V1 {
                asset_data: AssetData {
                    name: output_mint_entry.name.to_string(),
                    symbol: output_mint_entry.symbol.to_string(),
                    uri: output_mint_entry.uri.to_string(),
                    seller_fee_basis_points: mint_config.output_mint_config.seller_fee_basis_points,
                    creators: Some(output_mint_mpl_creators(&mint_config)),
                    primary_sale_happened: true,
                    is_mutable: true,
                    token_standard: mint_config.output_mint_config.token_standard.mpl_token_standard(),
                    collection: if mint_config.output_mint_config.collection.is_some() {
                        Some(Collection {
                            key: mint_config.output_mint_config.collection.unwrap(),
                            verified: false,
                        })
                    } else {
                        None
                    },
                    uses: None,
                    collection_details: None,
                    rule_set: if mint_config.output_mint_config.ruleset.is_some() {
                        Some(mint_config.output_mint_config.ruleset.expect("Ruleset not found"))
                    } else {
                        None
                    },
                },
                decimals: Some(0),
                print_supply: Some(PrintSupply::Zero),
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            output_mint_metadata.to_account_info(),
            output_mint_edition.to_account_info(),
            output_mint.to_account_info(),
            payer.to_account_info(),
            mint_config.to_account_info(),
            system_program.to_account_info(),
            instructions.to_account_info(),
            token_program.to_account_info(),
            associated_token_program.to_account_info(),
            authorization_rules_program.to_account_info(),
            token_metadata_program.to_account_info(),
        ],
        &[&mint_config_seeds.iter().map(|s: &Vec<u8>| s.as_slice()).collect::<Vec<&[u8]>>()],
    )?;

    // mint token to user
    invoke_signed(
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                AccountMeta::new(output_mint_user_token_account.key(), false),
                AccountMeta::new_readonly(user.key(), false),
                AccountMeta::new_readonly(output_mint_metadata.key(), false),
                AccountMeta::new(output_mint_edition.key(), false),
                AccountMeta::new(output_mint_user_token_record.key(), false),
                AccountMeta::new(output_mint.key(), false),
                AccountMeta::new(mint_config.key(), true),
                AccountMeta::new_readonly(token_metadata_program.key(), false),
                AccountMeta::new(payer.key(), true),
                AccountMeta::new_readonly(system_program.key(), false),
                AccountMeta::new_readonly(instructions.key(), false),
                AccountMeta::new_readonly(token_program.key(), false),
                AccountMeta::new_readonly(associated_token_program.key(), false),
                AccountMeta::new_readonly(authorization_rules_program.key(), false),
                AccountMeta::new_readonly(output_mint_authorization_rules.key(), false),
            ],
            data: MetadataInstruction::Mint(MintArgs::V1 { amount: 1, authorization_data: None }).try_to_vec().unwrap(),
        },
        &[
            output_mint_user_token_account.to_account_info(),
            user.to_account_info(),
            payer.to_account_info(),
            mint_config.to_account_info(),
            output_mint_metadata.to_account_info(),
            output_mint_edition.to_account_info(),
            output_mint_user_token_record.to_account_info(),
            output_mint.to_account_info(),
            system_program.to_account_info(),
            instructions.to_account_info(),
            token_program.to_account_info(),
            associated_token_program.to_account_info(),
            authorization_rules_program.to_account_info(),
            output_mint_authorization_rules.to_account_info(),
            token_metadata_program.to_account_info(),
        ],
        &[&mint_config_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
    )?;

    // verify collection
    if mint_config.output_mint_config.collection.is_some() {
        let collection_mint_info = next_account_info(remaining_accounts)?;
        let collection_mint_metadata_info = next_account_info(remaining_accounts)?;
        let collection_mint_edition_info = next_account_info(remaining_accounts)?;
        let collection_delegate_record_info = next_account_info(remaining_accounts)?;
        invoke_signed(
            &Instruction {
                program_id: mpl_token_metadata::id(),
                accounts: vec![
                    AccountMeta::new(mint_config.key(), true),
                    AccountMeta::new_readonly(collection_delegate_record_info.key(), false),
                    AccountMeta::new(output_mint_metadata.key(), false),
                    AccountMeta::new_readonly(collection_mint_info.key(), false),
                    AccountMeta::new(collection_mint_metadata_info.key(), false),
                    AccountMeta::new_readonly(collection_mint_edition_info.key(), false),
                    AccountMeta::new_readonly(system_program.key(), false),
                    AccountMeta::new_readonly(instructions.key(), false),
                ],
                data: MetadataInstruction::Verify(VerificationArgs::CollectionV1).try_to_vec().unwrap(),
            },
            &[
                mint_config.to_account_info(),
                collection_delegate_record_info.to_account_info(),
                output_mint_metadata.to_account_info(),
                collection_mint_info.to_account_info(),
                collection_mint_metadata_info.to_account_info(),
                collection_mint_edition_info.to_account_info(),
                system_program.to_account_info(),
                instructions.to_account_info(),
            ],
            &[&mint_config_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
        )?;
    }

    // update authority
    invoke_signed(
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                AccountMeta::new(mint_config.key(), true),
                AccountMeta::new_readonly(token_metadata_program.key(), false),
                AccountMeta::new_readonly(output_mint_user_token_account.key(), false),
                AccountMeta::new_readonly(output_mint.key(), false),
                AccountMeta::new(output_mint_metadata.key(), false),
                AccountMeta::new(output_mint_edition.key(), false),
                AccountMeta::new(payer.key(), true),
                AccountMeta::new_readonly(system_program.key(), false),
                AccountMeta::new_readonly(instructions.key(), false),
                AccountMeta::new_readonly(authorization_rules_program.key(), false),
                AccountMeta::new_readonly(output_mint_authorization_rules.key(), false),
            ],
            data: MetadataInstruction::Update(UpdateArgs::V1 {
                new_update_authority: Some(mint_config.authority),
                data: Some(Data {
                    name: output_mint_entry.name.to_string(),
                    symbol: output_mint_entry.symbol.to_string(),
                    uri: output_mint_entry.uri.to_string(),
                    seller_fee_basis_points: mint_config.output_mint_config.seller_fee_basis_points,
                    creators: Some(output_mint_mpl_creators(&mint_config)),
                }),
                primary_sale_happened: Some(true),
                is_mutable: Some(true),
                collection_details: CollectionDetailsToggle::None,
                collection: CollectionToggle::None,
                uses: UsesToggle::None,
                rule_set: if mint_config.output_mint_config.ruleset.is_some() {
                    RuleSetToggle::Set(mint_config.output_mint_config.ruleset.expect("Ruleset not found"))
                } else {
                    RuleSetToggle::None
                },
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            mint_config.to_account_info(),
            token_metadata_program.to_account_info(),
            output_mint_user_token_account.to_account_info(),
            output_mint.to_account_info(),
            output_mint_metadata.to_account_info(),
            output_mint_edition.to_account_info(),
            payer.to_account_info(),
            system_program.to_account_info(),
            instructions.to_account_info(),
            authorization_rules_program.to_account_info(),
            output_mint_authorization_rules.to_account_info(),
        ],
        &[&mint_config_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
    )?;

    // lock token
    if mint_config.output_mint_config.release_authority.is_some() {
        let output_mint_pending_release_info = next_account_info(remaining_accounts)?;
        let (output_mint_pending_release_info_seeds, bump) = OutputMintPendingRelease::seeds(&mint_config.key(), &output_mint.key(), &output_mint_pending_release_info.key())?;
        invoke_signed(
            &system_instruction::create_account(
                &payer.key(),
                &output_mint_pending_release_info.key(),
                Rent::get()?.minimum_balance(OutputMintPendingRelease::default_size()),
                OutputMintPendingRelease::default_size() as u64,
                &crate::ID,
            ),
            &[payer.to_account_info(), output_mint_pending_release_info.to_account_info()],
            &[&output_mint_pending_release_info_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
        )?;
        let output_mint_pending_release = &mut Account::<OutputMintPendingRelease>::try_from_unchecked(output_mint_pending_release_info)?;
        output_mint_pending_release.bump = bump;
        output_mint_pending_release.mint_config = mint_config.key();
        output_mint_pending_release.mint = output_mint.key();
        output_mint_pending_release.holder = user.key();
        output_mint_pending_release.exit(output_mint_pending_release_info.owner)?;

        invoke_signed(
            &Instruction {
                program_id: mpl_token_metadata::id(),
                accounts: vec![
                    AccountMeta::new_readonly(token_metadata_program.key(), false),
                    AccountMeta::new_readonly(output_mint_pending_release_info.key(), true),
                    AccountMeta::new(output_mint_metadata.key(), false),
                    AccountMeta::new_readonly(output_mint_edition.key(), false),
                    AccountMeta::new(output_mint_user_token_record.key(), false),
                    AccountMeta::new_readonly(output_mint.key(), false),
                    AccountMeta::new(output_mint_user_token_account.key(), false),
                    AccountMeta::new_readonly(user.key(), true),
                    AccountMeta::new(payer.key(), true),
                    AccountMeta::new_readonly(system_program.key(), false),
                    AccountMeta::new_readonly(instructions.key(), false),
                    AccountMeta::new_readonly(token_program.key(), false),
                    AccountMeta::new_readonly(authorization_rules_program.key(), false),
                    AccountMeta::new_readonly(output_mint_authorization_rules.key(), false),
                ],
                data: MetadataInstruction::Delegate(DelegateArgs::LockedTransferV1 {
                    amount: 1,
                    locked_address: output_mint_pending_release_info.key(),
                    authorization_data: None,
                })
                .try_to_vec()
                .unwrap(),
            },
            &[
                token_metadata_program.to_account_info(),
                output_mint_pending_release_info.to_account_info(),
                output_mint_metadata.to_account_info(),
                output_mint_edition.to_account_info(),
                output_mint_user_token_record.to_account_info(),
                output_mint.to_account_info(),
                output_mint_user_token_account.to_account_info(),
                user.to_account_info(),
                payer.to_account_info(),
                system_program.to_account_info(),
                instructions.to_account_info(),
                token_program.to_account_info(),
                authorization_rules_program.to_account_info(),
                output_mint_authorization_rules.to_account_info(),
            ],
            &[&output_mint_pending_release_info_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
        )?;

        invoke_signed(
            &Instruction {
                program_id: mpl_token_metadata::id(),
                accounts: vec![
                    AccountMeta::new(output_mint_pending_release_info.key(), true),
                    AccountMeta::new_readonly(user.key(), false),
                    AccountMeta::new(output_mint_user_token_account.key(), false),
                    AccountMeta::new_readonly(output_mint.key(), false),
                    AccountMeta::new(output_mint_metadata.key(), false),
                    AccountMeta::new_readonly(output_mint_edition.key(), false),
                    AccountMeta::new(output_mint_user_token_record.key(), false),
                    AccountMeta::new(payer.key(), true),
                    AccountMeta::new_readonly(system_program.key(), false),
                    AccountMeta::new_readonly(instructions.key(), false),
                    AccountMeta::new_readonly(token_program.key(), false),
                    AccountMeta::new_readonly(authorization_rules_program.key(), false),
                    AccountMeta::new_readonly(output_mint_authorization_rules.key(), false),
                ],
                data: MetadataInstruction::Lock(LockArgs::V1 { authorization_data: None }).try_to_vec().unwrap(),
            },
            &[
                token_metadata_program.to_account_info(),
                output_mint_pending_release_info.to_account_info(),
                user.to_account_info(),
                output_mint_user_token_account.to_account_info(),
                output_mint.to_account_info(),
                output_mint_metadata.to_account_info(),
                output_mint_edition.to_account_info(),
                output_mint_user_token_record.to_account_info(),
                payer.to_account_info(),
                system_program.to_account_info(),
                instructions.to_account_info(),
                token_program.to_account_info(),
                authorization_rules_program.to_account_info(),
                output_mint_authorization_rules.to_account_info(),
            ],
            &[&output_mint_pending_release_info_seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>()],
        )?;
    }

    Ok(())
}

pub fn handle_mint_cnft<'info>(
    output_mint_entry: MintEntry,
    mint_config: &Account<'info, MintConfig>,
    user: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    remaining_accounts: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    let merkle_tree = next_account_info(remaining_accounts)?;
    let merkle_tree_authority = next_account_info(remaining_accounts)?;
    let bubblegum = next_account_info(remaining_accounts)?;
    if bubblegum.key() != mpl_bubblegum::id() {
        return Err(error!(ErrorCode::InvalidProgramId));
    }
    let account_compression = next_account_info(remaining_accounts)?;
    let log_wrapper = next_account_info(remaining_accounts)?;

    let mint_config_seeds = MintConfig::seeds(&mint_config.name, &mint_config.key())?;
    mpl_bubblegum::cpi::mint_v1(
        CpiContext::new(
            bubblegum.to_account_info(),
            mpl_bubblegum::cpi::accounts::MintV1 {
                tree_authority: merkle_tree_authority.to_account_info(),
                leaf_owner: user.to_account_info(),
                leaf_delegate: user.to_account_info(),
                merkle_tree: merkle_tree.to_account_info(),
                payer: payer.to_account_info(),
                tree_delegate: mint_config.to_account_info(),
                log_wrapper: log_wrapper.to_account_info(),
                compression_program: account_compression.to_account_info(),
                system_program: system_program.to_account_info(),
            },
        )
        .with_signer(&[&mint_config_seeds.iter().map(|s: &Vec<u8>| s.as_slice()).collect::<Vec<&[u8]>>()]),
        MetadataArgs {
            name: output_mint_entry.name.to_string(),
            symbol: output_mint_entry.symbol.to_string(),
            uri: output_mint_entry.uri.to_string(),
            seller_fee_basis_points: mint_config.output_mint_config.seller_fee_basis_points,
            creators: output_mint_bg_creators(&mint_config),
            primary_sale_happened: true,
            is_mutable: true,
            edition_nonce: None,
            token_standard: Some(mint_config.output_mint_config.token_standard.bg_token_standard()?),
            collection: if mint_config.output_mint_config.collection.is_some() {
                Some(mpl_bubblegum::state::metaplex_adapter::Collection {
                    key: mint_config.output_mint_config.collection.unwrap(),
                    verified: false,
                })
            } else {
                None
            },
            uses: None,
            token_program_version: TokenProgramVersion::Original,
        },
    )?;

    Ok(())
}
