use hdk::prelude::*;
#[allow(unused_imports)]
use snapmail_model::*;
use zome_utils::*;

use crate::handle::functions::get_handle::*;


/// Return this agent's latest handle string
#[hdk_extern]
//#[snapmail_api]
pub fn get_my_handle(_: ()) -> ExternResult<String> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get my agent address
    let latest_pubkey = agent_info()?.agent_latest_pubkey;
    /// Get handle on that agent address
    get_handle(latest_pubkey)
}
