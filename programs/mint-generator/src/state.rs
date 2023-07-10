use crate::errors::ErrorCode;
use crate::utils::pseudo_random_number;
use anchor_lang::prelude::*;
use mpl_bubblegum::state::metaplex_adapter::Creator as BGCreator;
use mpl_bubblegum::state::metaplex_adapter::TokenStandard as BGTokenStandard;
use mpl_token_metadata::state::Creator as MPLCreator;
use mpl_token_metadata::state::TokenStandard as MPLTokenStandard;
use mpl_token_metadata::state::MAX_CREATOR_LIMIT;
use std::cell::RefMut;
use std::convert::TryFrom;

pub const MINT_CONFIG_PREFIX: &str = "mint-config";
pub const MINT_CONFIG_SIZE: usize = 8 + std::mem::size_of::<MintConfig>();
#[account]
#[derive(Debug)]
pub struct MintConfig {
    // bump seed for the `mint_config` PDA instance
    pub bump: u8,
    // public key that owns the `mint_config` instance - only authority can make changes to the mint_config
    pub authority: Pubkey,
    // name of the mint_config also used as a PDA derivation seed
    pub name: String,
    // total initial supply of the mint - increments as new mint_entries are added
    pub supply: u64,
    // count of tokens that have been minted from this mint config
    pub count: u64,
    // configuration about the output tokens being minted
    pub output_mint_config: OutputMintConfig,
    // different phases that can be minted from for this mint config
    pub mint_phases: Vec<MintPhase>,
    // JSON formatted metadata string
    pub metadata: String,
}

impl MintConfig {
    pub fn seeds(name: &String, expected_key: &Pubkey) -> Result<Vec<Vec<u8>>> {
        let mut seeds = vec![MINT_CONFIG_PREFIX.as_bytes().as_ref().to_vec(), name.as_bytes().as_ref().to_vec()];
        let (key, bump) = Pubkey::find_program_address(&seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>(), &crate::id());
        if &key != expected_key {
            return Err(error!(ErrorCode::InvalidMintConfigId));
        }
        seeds.push(vec![bump]);
        Ok(seeds)
    }

    pub fn check_valid(&self) -> Result<()> {
        if self.output_mint_config.creators.len() > MAX_CREATOR_LIMIT - 1 {
            return err!(ErrorCode::TooManyCreators);
        }
        if self.output_mint_config.merkle_tree.is_some() && (self.output_mint_config.ruleset.is_some() || self.output_mint_config.token_standard == TokenStandard::ProgrammableNonFungible) {
            return err!(ErrorCode::ProgrammableAndMerkleTree);
        }
        Ok(())
    }

    pub fn remaining_tokens(&self) -> u64 {
        self.supply.checked_sub(self.count).expect("Sub error")
    }

    pub fn account_size(&self) -> usize {
        self.try_to_vec()
            .expect("Error getting account size")
            .len()
            .checked_add(usize::try_from(self.remaining_tokens()).expect("Conversion error").checked_mul(MINT_ENTRY_SIZE).expect("Mul error"))
            .expect("Add error")
            .checked_add(8)
            .expect("Add error")
    }
}

pub fn output_mint_mpl_creators(mint_config: &Account<MintConfig>) -> Vec<MPLCreator> {
    let mut creators = vec![MPLCreator {
        address: mint_config.key(),
        verified: true,
        share: 0,
    }];
    for creator in &mint_config.output_mint_config.creators {
        creators.push(MPLCreator {
            address: creator.address,
            share: creator.share,
            verified: false,
        })
    }
    creators
}

pub fn output_mint_bg_creators(mint_config: &Account<MintConfig>) -> Vec<BGCreator> {
    let mut creators = vec![BGCreator {
        address: mint_config.key(),
        verified: true,
        share: 0,
    }];
    for creator in &mint_config.output_mint_config.creators {
        creators.push(BGCreator {
            address: creator.address,
            share: creator.share,
            verified: false,
        })
    }
    creators
}

pub fn get_phase(mint_config: &MintConfig, phase_ix: u8, is_authority: bool) -> Result<&MintPhase> {
    let timestamp = Clock::get()?.unix_timestamp;
    let mint_phase = match mint_config.mint_phases.get(usize::try_from(phase_ix).expect("Conversion error")) {
        Some(mint_phase) => mint_phase,
        _ => return Err(error!(ErrorCode::InvalidPhase)),
    };

    // check start condition
    if let Some(start_condition) = &mint_phase.start_condition {
        let mut started = false;
        if let Some(time_seconds) = start_condition.time_seconds {
            if timestamp >= time_seconds {
                started = true;
            }
        }
        if let Some(count) = start_condition.count {
            if mint_config.count >= count {
                started = true
            }
        }
        if !started && !is_authority {
            return Err(error!(ErrorCode::PhaseNotActive));
        }
    }

    // check end condition
    if let Some(end_condition) = &mint_phase.end_condition {
        let mut ended = false;
        if let Some(time_seconds) = end_condition.time_seconds {
            if timestamp >= time_seconds {
                ended = true;
            }
        }
        if let Some(count) = end_condition.count {
            if mint_config.count >= count {
                ended = true
            }
        }
        if ended {
            return Err(error!(ErrorCode::PhaseNotActive));
        }
    }

    Ok(mint_phase)
}

pub fn get_random_output_mint<'info>(mint_config: &mut Account<'info, MintConfig>, recent_slothashes: &AccountInfo<'info>) -> Result<MintEntry> {
    let remaining_tokens = mint_config.remaining_tokens();
    if remaining_tokens == 0 {
        return Err(error!(ErrorCode::NotTokensRemaining));
    }
    let pseudo_random_index = pseudo_random_number(recent_slothashes)?.checked_rem(remaining_tokens).ok_or(ErrorCode::InvalidIndex)? as usize;

    get_output_mint(mint_config, pseudo_random_index)
}

pub fn get_output_mint(mint_config: &mut Account<MintConfig>, index: usize) -> Result<MintEntry> {
    // unpack mint config
    let mint_config_account_info = mint_config.to_account_info();
    let mint_config_data_pointer = &mint_config_account_info.data;
    let mint_entries_start = mint_config_account_info
        .data_len()
        .checked_sub(
            (usize::try_from(mint_config.remaining_tokens()).expect("Conversion error"))
                .checked_mul(MINT_ENTRY_SIZE)
                .expect("Mul error"),
        )
        .expect("Sub error");

    // get entry
    let start_position = mint_entries_start.checked_add(index.checked_mul(MINT_ENTRY_SIZE).expect("Mul error")).expect("Add error");
    let end_position = start_position.checked_add(MINT_ENTRY_SIZE).expect("Add error");
    let entry_slice = get_slice_of_data(&mint_config_data_pointer.borrow_mut(), start_position, end_position);

    // deserialize entry
    let name = std::str::from_utf8(&entry_slice[0..MAX_NAME_LENGTH][4..]).unwrap().to_string().replace("\\0", "");
    let symbol = std::str::from_utf8(&entry_slice[MAX_NAME_LENGTH..MAX_NAME_LENGTH + MAX_SYMBOL_LENGTH][4..])
        .unwrap()
        .to_string()
        .replace("\\0", "");
    let uri = std::str::from_utf8(&entry_slice[MAX_NAME_LENGTH + MAX_SYMBOL_LENGTH..MAX_NAME_LENGTH + MAX_SYMBOL_LENGTH + MAX_URI_LENGTH][4..])
        .unwrap()
        .to_string()
        .replace("\\0", "");

    // get last entry
    let last_entry_index = mint_config.supply.saturating_sub(mint_config.count).saturating_sub(1);
    let last_entry_start_position = mint_entries_start + (usize::try_from(last_entry_index).expect("Could not cast into usize")) * MINT_ENTRY_SIZE;
    let last_entry_end_position = last_entry_start_position + MINT_ENTRY_SIZE;
    let last_entry_slice = get_slice_of_data(&mint_config_data_pointer.borrow_mut(), last_entry_start_position, last_entry_end_position);

    // move last entry up
    let mut mint_config_data = mint_config_data_pointer.borrow_mut();
    let used_entry = &mut mint_config_data[start_position..end_position];
    used_entry.copy_from_slice(&last_entry_slice);
    mint_config.count = mint_config.count.saturating_add(1);

    Ok(MintEntry { name, symbol, uri })
}

pub fn get_slice_of_data(data: &RefMut<&mut [u8]>, start: usize, end: usize) -> Vec<u8> {
    data[start..end].to_vec()
}

pub fn reposition_mint_entries(mint_config: &Account<MintConfig>, original_data_length: usize, new_data_length: usize) -> Result<()> {
    let mint_entries_length = (mint_config.remaining_tokens() as usize).checked_mul(MINT_ENTRY_SIZE).expect("Mul error");
    let mint_config_data = mint_config.to_account_info().data;
    let mut mint_config_data_mut = mint_config_data.borrow_mut();
    mint_config_data_mut.copy_within(
        original_data_length.checked_sub(mint_entries_length).expect("Sub error")..original_data_length,
        new_data_length.checked_sub(mint_entries_length).expect("Sub error"),
    );
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OutputMintConfig {
    // royalty amount of the output tokens
    pub seller_fee_basis_points: u16,
    // token standard for the output tokens (for pNFTs choose ProgrammableNonFungible)
    pub token_standard: TokenStandard,
    // address to set for the output tokens collection according to Metaplex Collection Standard
    pub collection: Option<Pubkey>,
    // ruleset address to set for the tokens (NOTE: only relevent when using TokenStandard::ProgrammableNonFungible)
    pub ruleset: Option<Pubkey>,
    // creators to set on the output token
    pub creators: Vec<Creator>,
    //  merkle tree address to mint output tokens into (must be a valid merkle tree) - (NOTE: output token will be compressed when `merkle_tree` address is set)
    pub merkle_tree: Option<Pubkey>,
    //  authority who must sign to release the tokens after mint
    pub release_authority: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Eq, PartialEq, Debug)]
pub struct Creator {
    pub address: Pubkey, // creator address
    pub share: u8,       // royalty share
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Eq, PartialEq, Debug)]
pub enum TokenStandard {
    NonFungible,             // MPLTokenStandard::NonFungible,
    FungibleAsset,           // MPLTokenStandard::FungibleAsset
    Fungible,                // MPLTokenStandard::Fungible
    NonFungibleEdition,      // MPLTokenStandard::NonFungibleEdition
    ProgrammableNonFungible, // MPLTokenStandard::ProgrammableNonFungible
}

impl TokenStandard {
    pub fn mpl_token_standard(&self) -> MPLTokenStandard {
        match self {
            TokenStandard::NonFungible => MPLTokenStandard::NonFungible,
            TokenStandard::FungibleAsset => MPLTokenStandard::FungibleAsset,
            TokenStandard::Fungible => MPLTokenStandard::Fungible,
            TokenStandard::NonFungibleEdition => MPLTokenStandard::NonFungibleEdition,
            TokenStandard::ProgrammableNonFungible => MPLTokenStandard::ProgrammableNonFungible,
        }
    }

    pub fn bg_token_standard(&self) -> Result<BGTokenStandard> {
        match self {
            TokenStandard::NonFungible => Ok(BGTokenStandard::NonFungible),
            TokenStandard::FungibleAsset => Ok(BGTokenStandard::FungibleAsset),
            TokenStandard::Fungible => Ok(BGTokenStandard::Fungible),
            TokenStandard::NonFungibleEdition => Ok(BGTokenStandard::NonFungibleEdition),
            TokenStandard::ProgrammableNonFungible => Err(error!(ErrorCode::InvalidTokenStandard)),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct MintPhase {
    // if set - condition must be valid to mint from this phase
    pub start_condition: Option<MintPhaseStartEndCondition>,
    // if set - condition must be invalid to mint from this phase
    pub end_condition: Option<MintPhaseStartEndCondition>,
    // token checks to validate when minting
    pub token_checks: Vec<MintPhaseTokenCheck>,
    // authorization check to valid via authorization record PDA when minting
    pub authorization: Option<MintPhaseAuthorizationCheck>,
    // JSON formatted metadata string
    pub metadata: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct MintPhaseStartEndCondition {
    // start or end timestamp in seconds
    pub time_seconds: Option<i64>,
    // start or end count
    pub count: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintPhaseTokenCheck {
    // address kind for this token check
    pub address_kind: MintPhaseTokenCheckAddressKind,
    // address for this token check (Pubkey::default() for native SOL)
    pub address: Pubkey,
    // amount of tokens to use for this token check
    pub amount: u64,
    // transfer target if mode is transfer
    pub transfer_target: Option<Pubkey>,
    // mode for this token check
    pub mode: MintPhaseTokenCheckMode,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum MintPhaseTokenCheckAddressKind {
    Mint = 0,       // the address is a mint address
    Collection = 1, // the address is a collection address
    Creator = 2,    // the address is a creator address
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum MintPhaseTokenCheckMode {
    Check = 0,    // check that the tokens are owned
    Transfer = 1, // transfer the specified tokens
    Burn = 2,     // burn the specified tokens
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintPhaseAuthorizationCheck {
    pub mode: MintPhaseAuthorizationMode,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, Debug)]
pub enum MintPhaseAuthorizationMode {
    DefaultDisallowed = 0,
    DefaultAllowed = 1,
}

pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_URI_LENGTH: usize = 200;
pub const MINT_ENTRY_SIZE: usize = MAX_NAME_LENGTH + MAX_SYMBOL_LENGTH + MAX_URI_LENGTH;
#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct MintEntry {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

pub const MINT_PHASE_AUTHORIZATION_PREFIX: &str = "authorization";
pub const MINT_PHASE_AUTHORIZATION_SIZE: usize = 8 + std::mem::size_of::<MintPhaseAuthorization>();
#[account]
#[derive(Default, Debug)]
pub struct MintPhaseAuthorization {
    pub bump: u8,
    pub mint_config: Pubkey,
    pub mint_phase_index: u8,
    pub user: Pubkey,
    pub count: u64,
    pub remaining: Option<u64>,
}

impl MintPhaseAuthorization {
    pub fn seeds(mint_config: &Pubkey, mint_phase_ix: u8, user: &Pubkey, expected_key: &Pubkey) -> Result<Vec<Vec<u8>>> {
        let mut seeds = vec![
            MINT_PHASE_AUTHORIZATION_PREFIX.as_bytes().as_ref().to_vec(),
            mint_config.key().as_ref().to_vec(),
            mint_phase_ix.to_le_bytes().to_vec(),
            user.as_ref().to_vec(),
        ];
        let (key, bump) = Pubkey::find_program_address(&seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>(), &crate::id());
        if &key != expected_key {
            return Err(error!(ErrorCode::InvalidMintPhaseAuthorization));
        }
        seeds.push(vec![bump]);
        Ok(seeds)
    }
}

#[account]
#[derive(Default, Debug)]
pub struct OutputMintPendingRelease {
    pub bump: u8,
    pub mint_config: Pubkey,
    pub mint: Pubkey,
    pub holder: Pubkey,
}

impl OutputMintPendingRelease {
    pub fn seed_prefix() -> String {
        "output-mint-release".to_string()
    }

    pub fn default_size() -> usize {
        return 8 + std::mem::size_of::<OutputMintPendingRelease>();
    }

    pub fn seeds(mint_config: &Pubkey, mint_id: &Pubkey, expected_key: &Pubkey) -> Result<(Vec<Vec<u8>>, u8)> {
        let mut seeds = vec![
            OutputMintPendingRelease::seed_prefix().as_bytes().as_ref().to_vec(),
            mint_config.key().as_ref().to_vec(),
            mint_id.as_ref().to_vec(),
        ];
        let (key, bump) = Pubkey::find_program_address(&seeds.iter().map(|s| s.as_slice()).collect::<Vec<&[u8]>>(), &crate::id());
        if &key != expected_key {
            return Err(error!(ErrorCode::InvalidOutputMintsPendingRelease));
        }
        seeds.push(vec![bump]);
        Ok((seeds, bump))
    }
}
