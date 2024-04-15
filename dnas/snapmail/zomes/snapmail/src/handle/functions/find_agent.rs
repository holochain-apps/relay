use hdk::prelude::*;
use zome_utils::*;
use snapmail_model::*;

use crate::handle::utils::get_members;

/// Get all agentIds that have a certain handle
#[hdk_extern]
//#[snapmail_api]
pub fn find_agent(handle: String) -> ExternResult<Vec<AgentPubKey>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let member_links = get_members()?;
   let mut agent_list = Vec::new();
   /* Find handle entry whose author is agentId */
   for member_link in member_links {
      let res = get_typed_and_author::<Handle>(&member_link.target);
      if let Err(err) = res {
         warn!("Retrieving Handle from DHT failed: {}", err);
         continue;
      }
      let (author, handle_entry) = res.unwrap();
      if handle_entry.username == handle {
          agent_list.push(author);
      }
   }
   /// Done
   debug!("agent_list size: {}", agent_list.len());
   return Ok(agent_list)
}
