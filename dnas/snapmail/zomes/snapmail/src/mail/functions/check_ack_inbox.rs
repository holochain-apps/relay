use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;


use crate::{
    mail,
};


/// Check for PendingAcks and convert to InAcks
/// Return list of OutMail EntryHashes for which we succesfully linked a new InAck out of PendingAcks
#[hdk_extern]
//#[snapmail_api]
pub fn check_ack_inbox(_:()) -> ExternResult<Vec<EntryHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Lookup `ack_inbox` links on my agentId
    let me = agent_info()?.agent_latest_pubkey;
    let links_result = get_links(link_input(me.clone(), SnapmailLink::AckInbox, None))?;
    debug!("incoming_ack links_result: {:?} (for {})", links_result, &me);
    /// Check each link
    let mut updated_outmails = Vec::new();
    for link in &links_result {
        /// Get entry on the DHT
        let pending_ack_eh = link.target.clone().into_entry_hash().expect("Link target not an EntryHash");
        let maybe_record = get(pending_ack_eh.clone(), GetOptions::network())?;
        let Some(record) = maybe_record
            else {
                warn!("Action not found for pending ack entry");
                continue;
        };
        let pending_ack_ah = record.action_address().clone();
        debug!("pending_ack_ah: {}", pending_ack_ah);
        let maybe_pending_ack = get_typed_and_author::<PendingAck>(&pending_ack_eh.into());
        if let Err(err) = maybe_pending_ack {
            warn!("Getting PendingAck from DHT failed: {}", err);
            continue;
        }
        let (author, pending_ack) = maybe_pending_ack.unwrap();
        /// Check signature
        let maybe_verified = verify_signature(author.clone(), pending_ack.from_signature.clone(), pending_ack.outmail_eh.clone());
        match maybe_verified {
            Err(err) => {
                let response_str = "Verifying PendingAck failed";
                error!("{}: {}", response_str, err);
                continue;
            }
            Ok(false) => {
                error!("Failed verifying PendingAck signature");
                continue;
            }
            Ok(true) => debug!("Valid PendingAck signature"),
        }
        /// Create InAck
        let maybe_inack_ah = mail::create_inack(pending_ack.outmail_eh.clone(), &author, pending_ack.from_signature);
        if let Err(err) = maybe_inack_ah {
            error!("Creating InAck from PendignAck failed: {}", err);
            continue;
        }
        /// Delete link from this agent address
        let res = delete_link(link.create_link_hash.clone());
        if let Err(err) = res {
            error!("Remove ``ack_inbox`` link failed:");
            error!(?err);
            continue;
        }
        // /// Delete PendingAck
        // let res = delete_entry(pending_ack_ah.clone());
        // if let Err(err) = res {
        //     error!("Delete PendignAck failed: {}", err);
        // }
        /// Add to return list
        updated_outmails.push(pending_ack.outmail_eh.clone());
    }
    debug!("incoming_ack updated_outmails.len() = {} (for {})", updated_outmails.len(), &me);
    Ok(updated_outmails)
}
