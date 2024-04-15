use hdi::prelude::*;
use crate::properties::*;

/// Entry representing the username of an Agent
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Handle {
    pub username: String,
}

impl Handle {
    pub fn new(name: String) -> Self {
        Self {
            username: name,
        }
    }

    pub fn empty() -> Self {
        Self {
            username: String::new(),
        }
    }

    /// DEBUG
    pub fn dummy() -> Self {
        Self {
            username: "dummy".to_string(),
        }
    }



    /// Check the Handle's data integrity
    pub fn validate(&self) -> ExternResult<ValidateCallbackResult> {
        let properties = get_properties()?;
        // Check chars with a regex
        // TODO

        // Check: min & max string length
        debug!("validate handle username: {} ({})", self.username, self.username.len());
        if self.username.len() < properties.min_handle_length as usize {
            return Ok(ValidateCallbackResult::Invalid("Username too short".into()));
        }
        if self.username.len() > properties.max_handle_length as usize {
            return Ok(ValidateCallbackResult::Invalid("Username too long".into()));
        }
        Ok(ValidateCallbackResult::Valid)
    }

}
