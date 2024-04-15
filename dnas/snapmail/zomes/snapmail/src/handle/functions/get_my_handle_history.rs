use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

#[hdk_extern]
//#[snapmail_api]
pub fn get_my_handle_history(initial_handle_address: ActionHash) -> ExternResult<Vec<String>> {
    std::panic::set_hook(Box::new(zome_panic_hook));

    let history_result = get_details(&initial_handle_address, GetOptions::network());
    if let Err(_e) = history_result {
        error!("get_entry_history() failed");
        return Ok(Vec::new());
    }
    let maybe_history = history_result.unwrap();
    if maybe_history.is_none() {
        error!("No history found");
        return Ok(Vec::new());
    }
    let history = maybe_history.unwrap();
    debug!("History length: {}", history.items.len());
    debug!("History crud_links length: {}", history.crud_links.len());

    let mut handle_list = Vec::new();

    for item in history.items {
        let handle_entry = item.entry.expect("should have entry");
        trace!("History actions length: {}", item.actions.len());
        trace!("item crud status: {:?}", item.meta.unwrap().crud_status);
        let handle = crate::into_typed::<Handle>(handle_entry).expect("Should be Handle");
        handle_list.push(handle.name);
    }
    debug!("handle_list = {}", handle_list.len());
    Ok(handle_list)
}
