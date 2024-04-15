use hdk::prelude::*;
use zome_utils::*;
use snapmail_model::*;

use crate:: handle::utils::*;

#[derive(Serialize, Deserialize, Debug)]
pub struct HandleItem {
   pub username: String,
   pub agent_pub_key: AgentPubKey,
   pub handle_eh: EntryHash,
}


/// Get all known agents.
/// Return List of all HandleItems found on DHT.
#[hdk_extern]
//#[snapmail_api]
pub fn get_all_handles(_: ()) -> ExternResult<Vec<HandleItem>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Get all Members links
   let member_links = get_members()?;
   trace!("get_all_handles() handle_links size: {:?}", member_links.len());
   /// Find each Handle from links
   let mut handle_list = Vec::new();
   for member_link in member_links {
      let handle_eh = member_link.target.clone().into_entry_hash().expect("Handle link target not an EntryHash");
      trace!("**** member_link target: {:?}", handle_eh);
      let maybe_handle_and_hash = get_latest_typed_from_eh::<Handle>(handle_eh)?;
      let handle_and_hash = match maybe_handle_and_hash {
         Some(eh) => eh,
         None => continue,
      };
      let maybe_maybe_record = get(handle_and_hash.1.clone(), GetOptions::network());
      let record = match maybe_maybe_record {
         Ok(Some(record)) => record,
         _ => continue,
      };
      let item = HandleItem {
         username: handle_and_hash.0.username.clone(),
         agent_pub_key: record.action().author().clone(),
         handle_eh: handle_and_hash.2.clone(),
      };
      handle_list.push(item);
    }
   debug!("get_all_handles() handle_list: {:?}", handle_list);
   /// Done
   Ok(handle_list)
}
