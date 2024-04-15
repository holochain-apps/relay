use hdi::prelude::*;

/// Entry representing a mail on the DHT waiting to be received by recipient.
/// The recipient is the agentId where the entry is linked from.
/// The mail is encrypted with the recipient's public encryption key.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PendingMail {
    pub encrypted_mail: XSalsa20Poly1305EncryptedData,
    pub outmail_eh: EntryHash,
    pub from_signature: Signature,
}


impl PendingMail {
   pub fn new(
      encrypted_mail: XSalsa20Poly1305EncryptedData,
      outmail_eh: EntryHash,
      from_signature: Signature,
   ) -> Self {
      Self {
         encrypted_mail,
         outmail_eh,
         from_signature,
      }
   }
}
