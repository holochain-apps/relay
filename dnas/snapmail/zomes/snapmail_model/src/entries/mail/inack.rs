use hdi::prelude::*;

/// Entry for a received Acknowledgement Receipt
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct InAck {
    pub outmail_eh: EntryHash,
    pub from: AgentPubKey,
    /// Signed outmail_eh
    pub from_signature: Signature,
}

impl InAck {
    pub fn new(outmail_eh: EntryHash, from: AgentPubKey, from_signature: Signature) -> Self {
        Self {
            outmail_eh,
            from,
            from_signature,
        }
    }
}
