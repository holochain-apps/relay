use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use std::collections::BTreeMap;

use crate::{
    mail::get_outmail_state,
    mail::utils::get_inmail_state,
};


/// Return list of all InMails and OutMails in the local source chain
#[hdk_extern]
//#[snapmail_api]
pub fn get_all_mails(_: ()) -> ExternResult<Vec<MailItem>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get all Create InMail actions with query
    let inmail_query_args = ChainQueryFilter::default()
       .include_entries(true)
       .action_type(ActionType::Create)
       .entry_type(SnapmailEntryTypes::InMail.try_into().unwrap());
    let maybe_inmails = query(inmail_query_args);
    if let Err(err) = maybe_inmails {
        error!("get_all_mails() query failed: {:?}", err);
        return Err(err);
    }
    let created_inmails: Vec<Record> = maybe_inmails.unwrap();
    debug!(" get_all_mails() create inmails count = {}", created_inmails.len());
    //debug!(" get_all_mails() inmails: {:?}", inmails);
    /// Get all Create OutMail actions with query
    let outmail_query_args = ChainQueryFilter::default()
       .include_entries(true)
       .action_type(ActionType::Create)
       .entry_type(SnapmailEntryTypes::OutMail.try_into().unwrap());
    let maybe_outmails = query(outmail_query_args);
    if let Err(err) = maybe_outmails {
        error!("get_all_mails() outmail_result failed: {:?}", err);
        return Err(err);
    }
    let created_outmails: Vec<Record> = maybe_outmails.unwrap();
    debug!(" get_all_mails() outmails count = {}", created_outmails.len());
    /// Change all mails into MailItems
    let mut item_list = Vec::new();
    let my_agent_address = agent_info()?.agent_latest_pubkey;
    /// Change all OutMail into a MailItem
    let mut reply_map = BTreeMap::new();
    for outmail_record in created_outmails {
        let outmail_ah = outmail_record.action_hashed().as_hash().to_owned();
        let date: i64 = outmail_record.action().timestamp().as_seconds_and_nanos().0;
        let Ok(outmail_state) = get_outmail_state(outmail_ah.clone())
          else { continue };
        debug!(" outmail_record = {:?}", outmail_record);
        let outmail: OutMail = get_typed_from_record(outmail_record)?;
        // Fill reply map
        if let Some(reply_of) = outmail.reply_of.clone() {
            reply_map.insert(reply_of, outmail_ah.clone());
        }
        let state = MailState::Out(outmail_state);
        let item = MailItem {
            ah: outmail_ah.clone(),
            author: my_agent_address.clone(),
            mail: outmail.mail,
            state,
            bcc: outmail.bcc.clone(),
            date,
            reply: None,
            reply_of: outmail.reply_of,
            status: None,

        };
        item_list.push(item.clone());
    }
    debug!(" get_all_mails() final outmail count = {}", item_list.len());
    /* Change all InMail into a MailItem */
    for inmail_record in created_inmails {
        let inmail_ah = inmail_record.action_hashed().as_hash().to_owned();
        let date: i64 = inmail_record.action().timestamp().as_seconds_and_nanos().0;
        let Ok(inmail_state) = get_inmail_state(inmail_ah.clone())
        else { continue };
        let state = MailState::In(inmail_state);
        let inmail: InMail = get_typed_from_record(inmail_record)?;
        let item = MailItem {
            ah: inmail_ah.clone(),
            author: inmail.from,
            mail: inmail.mail,
            state,
            bcc: Vec::new(),
            date,
            reply: reply_map.get(&inmail_ah).cloned(),
            reply_of: None,
            status: None,
        };
        item_list.push(item.clone());
    }
    /// Done
    debug!(" get_all_mails() total count = {}", item_list.len());
    Ok(item_list)
}
