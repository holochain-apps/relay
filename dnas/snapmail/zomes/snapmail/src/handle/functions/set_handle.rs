use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
    handle::utils::*,
};


/// DEBUG / TESTING ONLY
#[hdk_extern]
pub fn create_empty_handle(_: ()) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let new_handle = Handle::empty();
    let ah = create_entry(SnapmailEntry::Handle(new_handle))?;
    Ok(ah)
}


/// Set handle for this agent
#[hdk_extern]
//#[snapmail_api]
pub fn set_handle(new_username: String) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// -- Create Handle Entry
    let new_handle = Handle::new(new_username.to_string());
    /// -- Check if already have Handle
    let my_agent_address = agent_info()?.agent_latest_pubkey;
    let maybe_current_handle = get_handle_record(my_agent_address.clone());
    if let Some((current_handle, ah)) = maybe_current_handle {
        if current_handle.username == new_username.to_string() {
            return Ok(ah);
        }
        /// Really new name so just update entry
        let res = update_entry(ah, &new_handle)?;
        debug!("updated_handle_ah = {:?}", res);
        return Ok(res);
    }
    /// -- First Handle for this agent
    /// Commit entry and link to AgentHash
    let new_handle_eh = hash_entry(&new_handle)?;
    trace!("First Handle for this agent!!!");
    let new_handle_ah = create_entry(SnapmailEntry::Handle(new_handle))?;
    debug!("new_handle_ah = {:?}", new_handle_ah);
    let _ = create_link(
        EntryHash::from(my_agent_address),
        new_handle_eh.clone(),
        SnapmailLink::Handle,
        LinkTag::from(()),
    )?;
    debug!("**** Handle linked to agent!");
    /// Link Handle to DNA entry for a global directory
    let directory_address = Path::from(DIRECTORY_ANCHOR).path_entry_hash()?;
    let _ = create_link(
        directory_address,
        new_handle_eh,
        SnapmailLink::Members,
        LinkTag::from(()),
    )?;
    /// Done
    return Ok(new_handle_ah);
}
