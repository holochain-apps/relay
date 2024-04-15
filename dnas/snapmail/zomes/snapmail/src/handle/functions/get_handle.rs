use hdk::prelude::*;
#[allow(unused_imports)]
use snapmail_model::*;
use zome_utils::*;

use crate::handle::utils::*;


/// get an agent's latest handle
#[hdk_extern]
//#[snapmail_api]
pub fn get_handle(agent_id: AgentPubKey) -> ExternResult<String> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let maybe_current_handle = get_handle_record(agent_id);
    let str = match maybe_current_handle {
        None => "<noname>".to_string(),
        Some((handle, _ah)) => handle.username,
    };
    Ok(str)
}

