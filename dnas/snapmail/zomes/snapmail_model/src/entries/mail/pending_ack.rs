use hdi::prelude::*;

/// Entry representing an AcknowledgmentReceipt on the DHT waiting to be received
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PendingAck {
    pub outmail_eh: EntryHash,
    /// Signed outmail_eh
    pub from_signature: Signature,
}

impl PendingAck {
    pub fn new(outmail_eh: EntryHash, from_signature: Signature) -> Self {
        Self {
            outmail_eh,
            from_signature,
        }
    }
}
