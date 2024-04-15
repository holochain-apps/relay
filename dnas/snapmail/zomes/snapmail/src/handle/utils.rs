use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;


/// Get 'Members' links on the DNA entry
pub(crate) fn get_members() -> ExternResult<Vec<Link>> {
    let path_hash = Path::from(DIRECTORY_ANCHOR).path_entry_hash()?;
    let entry_results = get_links(link_input(path_hash, SnapmailLink::Members, None))?;
    Ok(entry_results)
}


/// Return agent's latest Handle.
pub(crate) fn get_handle_record(agent_id: AgentPubKey) -> Option<(Handle, ActionHash)> {
    /// Get All Handle links on agent ; should have only one
    let handle_links = get_links(link_input(agent_id, SnapmailLink::Handle, None))
       .expect("get_links() for Handle failed");
    assert!(handle_links.len() <= 1);
    if handle_links.len() == 0 {
        warn!("No handle found for this agent:");
        return None;
    }
    /// Get the Entry from the link
    let handle_eh: EntryHash = handle_links[0].target.clone().into_entry_hash().expect("Link target not an EntryHash");
    let handle_and_hash = get_latest_typed_from_eh::<Handle>(handle_eh.clone())
       .expect("get_entry() failed")
       .expect("No handle found for agent");
    /// Look for original record
    let maybe_record = match get(handle_eh.clone(), GetOptions::network()) {
        Ok(Some(record)) => record,
        _ => return None,
    };
    /// Done
    return Some((handle_and_hash.0, maybe_record.action_address().clone()));
}
