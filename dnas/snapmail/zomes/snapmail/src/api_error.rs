use thiserror::Error;
use holochain_serialized_bytes::SerializedBytesError;
use holochain::core::ribosome::error::RibosomeError;
use holochain::conductor::error::*;
use holochain::conductor::api::error::ConductorApiError;

pub type SnapmailApiResult<T> = Result<T, SnapmailApiError>;

#[derive(Error, Debug)]
pub enum SnapmailApiError {
   #[error("Internal serialization error: {0}")]
   SerializedBytesError(#[from] SerializedBytesError),
   #[error(transparent)]
   RibosomeError(#[from] RibosomeError),
   #[error(transparent)]
   ConductorError(#[from] ConductorError),
   #[error(transparent)]
   ConductorApiError(#[from] ConductorApiError),
   #[error("Holochain call timed out")]
   Timeout,
   #[error("Unauthorized zome call")]
   Unauthorized,
   #[error("Network error: {0}")]
   NetworkError(String),
   #[error(transparent)]
   IoError(#[from] std::io::Error),
   #[error("{0}")]
   Unique(String),
   #[error("unknown data store error")]
   Unknown,
}