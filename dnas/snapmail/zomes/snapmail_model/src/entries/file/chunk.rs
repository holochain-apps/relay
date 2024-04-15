use hdi::prelude::*;
use crate::properties::*;

/// Entry representing a file chunk.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FileChunk {
    pub data_hash: String,
    pub chunk_index: usize,
    pub chunk: String,
}

impl FileChunk {
    pub fn new(data_hash: String, chunk_index: usize, chunk: String) -> Self {
        Self {
            data_hash,
            chunk_index,
            chunk,
        }
    }

    /// Check data integrity
    pub fn validate(&self) -> ExternResult<ValidateCallbackResult> {
        let properties = get_properties()?;
        /// Check size
        if self.chunk.len() > properties.max_chunk_size {
            return Ok(ValidateCallbackResult::Invalid(
                format!("A file chunk can't be bigger than {} KiB", properties.max_chunk_size / 1024)));
        }
        Ok(ValidateCallbackResult::Valid)
    }
}