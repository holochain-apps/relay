use hdi::prelude::*;
use holo_hash::hash_type::{self, HashType};

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum SnapmailLink {
   Members,   // From DIRECTORY_ANCHOR to AgentPubKey
   AckInbox,  // From AgentPubKey to PendingAck (with sender's AgentPubKey as Tag)
   MailInbox, // From AgentPubKey to PendingMail (with sender's AgentPubKey as Tag)
   Handle,    // From AgentPubKey to Handle
   Pending,   // From OutAck to PendingAck
   Pendings,  // From OutMail to PendingMail (with recipient's AgentPubKey as Tag)
   EncKey,    // From AgentPubKey to EncKey

   // /// Private links
   // Acknowledgment, /// From InMail to OutAck
   // Receipt, /// From OutMail to InAck
   // Sent, /// From OutAck to itself (with recipient's AgentPubKey as Tag)
   // Sents, /// From OutMail to itself (with recipient's AgentPubKey as Tag)
}


///
impl SnapmailLink {

   /// Create LinkTag with concatenated hash
   pub fn from_hash<T: HashType>(hash: &HoloHash<T>) -> LinkTag {
      let raw = hash.get_raw_39();
      return raw.to_vec().into();
   }

   /// Retrieve hash from LinkTag
   pub fn into_hash<T: HashType>(tag: &LinkTag) -> ExternResult<HoloHash<T>> {
      let maybe_hash = HoloHash::from_raw_39(tag.clone().into_inner());
      //debug!("unconcat maybe_hash = {:?}", maybe_hash);
      if let Err(err) = maybe_hash {
         return Err(wasm_error!(WasmErrorInner::Guest(format!("into_hash() failed: {:?}", err))));
      }
      Ok(maybe_hash.unwrap())
   }


   /// Create LinkTag with concatenated hash
   pub fn from_agent(key: &AgentPubKey) -> LinkTag {
      return Self::from_hash::<hash_type::Agent>(key);
   }


   /// Retrieve hash from LinkTag
   pub fn into_agent(tag: &LinkTag) -> ExternResult<AgentPubKey> {
      return Self::into_hash::<hash_type::Agent>(tag);
   }
}
