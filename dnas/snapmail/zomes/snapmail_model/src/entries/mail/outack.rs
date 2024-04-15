use hdi::prelude::*;

/// Entry for an Acknowledgement Receipt of a Mail authored by this agent
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct OutAck {
    pub inmail_eh: EntryHash,
}

impl OutAck {
    pub fn new(inmail_eh: EntryHash) -> Self {
        Self {
            inmail_eh,
        }
    }
}
