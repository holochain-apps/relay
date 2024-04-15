use hdi::prelude::*;
use crate::properties::*;

/// Entry representing a file in chunks.
/// All chunks must be committed beforehand.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FileManifest {
    pub data_hash: String,
    pub filename: String,
    pub filetype: String,
    pub orig_filesize: usize,
    pub chunks: Vec<EntryHash>,
    pub content: Option<String>, // For ViewModel ; TODO: Remove this field from data model
}


/// Check data integrity
impl FileManifest {
    pub fn validate(&self) -> ExternResult<ValidateCallbackResult> {
        let properties = get_properties()?;
        // Check if data_hash not already stored in source chain
        // TODO
        /// Check size
        if self.orig_filesize > properties.max_file_size {
            return Ok(ValidateCallbackResult::Invalid(
                format!("A file can't be bigger than {} KiB", properties.max_file_size / 1024)));
        }
        if self.orig_filesize < 1 {
            return Ok(ValidateCallbackResult::Invalid("A file cannot be empty".into()));
        }
        if self.chunks.len() < 1 {
            return Ok(ValidateCallbackResult::Invalid("A file must have at least one chunk".into()));
        }
        Ok(ValidateCallbackResult::Valid)
    }
}



