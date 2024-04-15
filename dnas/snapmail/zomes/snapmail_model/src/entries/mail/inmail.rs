use hdi::prelude::*;

use crate::entries::mail::Mail;


/// Entry representing a received mail.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct InMail {
    pub mail: Mail,
    pub date_received: u64,
    pub outmail_eh: EntryHash,
    pub from: AgentPubKey,
    pub from_signature: Signature,
}

impl InMail {
    pub fn new(
        mail: Mail,
        from: AgentPubKey,
        date_received: u64,
        outmail_eh: EntryHash,
        from_signature: Signature,
    ) -> Self {
        Self {
            mail,
            from,
            date_received,
            outmail_eh,
            from_signature,
        }
    }
}
