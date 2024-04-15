use hdi::prelude::*;


/// Entry representing the Public Encryption Key of an Agent
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PubEncKey {
   pub value: X25519PubKey,
}

impl PubEncKey {
   pub fn new(value: X25519PubKey) -> Self {
      Self {
         value,
      }
   }
}
