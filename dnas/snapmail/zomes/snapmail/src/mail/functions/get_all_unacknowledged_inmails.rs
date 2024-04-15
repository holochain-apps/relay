use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
    mail::utils::*,
};


/// Return list of all InMails that this agent did not acknowledge.
#[hdk_extern]
//#[snapmail_api]
pub fn get_all_unacknowledged_inmails(_: ()) -> ExternResult<Vec<ActionHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get all InMails
    let inmail_query_args = ChainQueryFilter::default()
       .include_entries(true)
       .entry_type(SnapmailEntryTypes::InMail.try_into().unwrap());
    let maybe_inmail_result = query(inmail_query_args);
    if let Err(err) = maybe_inmail_result {
        error!("get_all_unacknowledged_inmails() inmail_result failed: {:?}", err);
        //return Err(hdk::error::HdkError::SerializedBytes(err));
        return Err(err);
    }
    let inmails: Vec<Record> = maybe_inmail_result.unwrap();
    debug!("get_all_unacknowledged_inmails() inmails[{}]: {:?}", inmails.len(), inmails);
    /// Get all OutAcks
    let outacks = get_outacks(None)?;
    let acked_inmails: Vec<&EntryHash> = outacks.iter().map(|outack| &outack.inmail_eh).collect();
    //debug!("acked_inmails: {:?}", acked_inmails);
    /// For each InMail
    let mut unacknowledgeds = Vec::new();
    for inmail_record in inmails {
        let inmail_eh = inmail_record.action().entry_hash().expect("Missing Entry in InMail record");
        if !acked_inmails.contains(&inmail_eh) {
            unacknowledgeds.push(inmail_record.action_address().to_owned())
        }
    }
    /// Done
    //debug!("get_all_unacknowledged_inmails() DONE ({})", unacknowledgeds.len());
    Ok(unacknowledgeds)
}
