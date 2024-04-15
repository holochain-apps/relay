use hdk::prelude::*;
use zome_utils::*;
use snapmail_model::*;


///
pub fn sign_mail(mail: &Mail) -> ExternResult<Signature> {
    let me = agent_info()?.agent_latest_pubkey;
    let signature = sign(me, mail)?;
    Ok(signature)
}


/// Get State of InMail
pub(crate) fn get_inmail_state(inmail_ah: ActionHash) -> ExternResult<InMailState> {
    /// Get inMail Details
    let maybe_details = get_details(inmail_ah.clone(), GetOptions::network())?;
    let Some(details) = maybe_details
      else { return error("No InMail at given address"); };
    let el_details = match details {
        Details::Record(det) => det,
        Details::Entry(_) => unreachable!("in get_outmail_state()"),
    };
    /// Check if deleted
    if el_details.deletes.len() > 0 {
        return Ok(InMailState::Deleted);
    }
    let inmail: InMail = get_typed_from_record(el_details.record.clone())?;
    /// Get OutAck
    let outacks = get_outacks(Some(inmail_ah.to_owned()))?;
    if outacks.len() < 1 {
        return Ok(InMailState::Unacknowledged);
    }
    /// Determine OutAck delivery state
    let outack = outacks[0].to_owned();
    let outack_eh = hash_entry(outack)?;
    let confirmation_created = try_confirming_pending_ack_has_been_received(outack_eh.clone(), &inmail.from)?;
    let outack_state = if confirmation_created {
        DeliveryState::Delivered
    } else {
         get_delivery_state(outack_eh, &inmail.from)?
    };
    /// Map to inmail state
    let inmail_state = match outack_state {
        DeliveryState::Unsent => InMailState::AckUnsent,
        DeliveryState::Pending => InMailState::AckPending,
        DeliveryState::Delivered => InMailState::AckDelivered,
    };
    Ok(inmail_state)
}


/// Return address of created InAck
pub(crate) fn create_inack(outmail_eh: EntryHash, from: &AgentPubKey, ack_signature: Signature) -> ExternResult<ActionHash> {
    debug!("Create inAck for: {} ({})", outmail_eh, from);
    let inack = InAck::new(outmail_eh.clone(), from.clone(), ack_signature);
    let inack_ah = create_entry(SnapmailEntry::InAck(inack))?;
    //let inack_eh = hash_entry(&inack)?;
    /// Done
    Ok(inack_ah)
}


///
pub(crate) fn get_outacks(maybe_inmail_filter: Option<ActionHash>) -> ExternResult<Vec<OutAck>> {
     /// Get all OutAck entries
    let outacks_query_args = ChainQueryFilter::default()
       .include_entries(true)
       .action_type(ActionType::Create)
       .entry_type(SnapmailEntryTypes::OutAck.try_into().unwrap());
    let maybe_outacks = query(outacks_query_args);
    if let Err(err) = maybe_outacks {
        error!("get_outacks() query failed: {:?}", err);
        return Err(err);
    }
    //debug!("get_outacks() maybe_outacks: {:?}", maybe_outacks.as_ref().unwrap());
    let mut res = Vec::new();
    for outack_record in maybe_outacks.unwrap() {
        let outack = get_typed_from_record::<OutAck>(outack_record)?;
        res.push(outack)
    }
    //debug!("get_outacks() res.len(): {}", res.len());
    if res.len() == 0 {
        return Ok(Vec::new());
    }
    /// Filter for this InMail
    if let Some(inmail_ah) = maybe_inmail_filter {
        /// Make sure its an InMail
        let (inmail_eh, _inmail) = get_typed_from_ah::<InMail>(inmail_ah)?;
        res.retain(|outack| outack.inmail_eh == inmail_eh)
    }
    /// Done
    Ok(res)
}


///
pub(crate) fn get_inacks(maybe_outmail_filter: Option<ActionHash>) -> ExternResult<Vec<InAck>> {
    /// Get all InAck entries
    let outacks_query_args = ChainQueryFilter::default()
       .include_entries(true)
       .action_type(ActionType::Create)
       .entry_type(SnapmailEntryTypes::InAck.try_into().unwrap());
    let maybe_inacks = query(outacks_query_args);
    if let Err(err) = maybe_inacks {
        error!("get_inacks() query failed: {:?}", err);
        return Err(err);
    }
    //debug!("get_inacks() maybe_inacks: {}", maybe_inacks.as_ref().unwrap().len());
    let mut res = Vec::new();
    for inack_record in maybe_inacks.unwrap() {
        let inack = get_typed_from_record::<InAck>(inack_record)?;
        res.push(inack)
    }
    //debug!("get_inacks() res.len(): {}", res.len());
    if res.len() == 0 {
        return Ok(Vec::new());
    }
    /// Filter for this OutMail
    if let Some(outmail_ah) = maybe_outmail_filter {
        /// Make sure its an OutMail
        let (outmail_eh, _) = get_typed_from_ah::<OutMail>(outmail_ah)?;
        res.retain(|outack| outack.outmail_eh == outmail_eh)
    }
    /// Done
    Ok(res)
}


///
pub(crate) fn get_confirmations(package_eh: EntryHash) -> ExternResult<Vec<DeliveryConfirmation>> {
    /// Get all InAck entries
    let query_args = ChainQueryFilter::default()
       .include_entries(true)
       .action_type(ActionType::Create)
       .entry_type(SnapmailEntryTypes::DeliveryConfirmation.try_into().unwrap());
    let records = query(query_args)?;
    let mut confirmations = Vec::new();
    //debug!("get_confirmations() records.len(): {}", records.len());
    if records.len() == 0 {
        return Ok(Vec::new());
    }
    /// Filter for this package
    for record in records {
        let confirmation = get_typed_from_record::<DeliveryConfirmation>(record)?;
        if confirmation.package_eh == package_eh {
            confirmations.push(confirmation)
        }
    }
    /// Done
    Ok(confirmations)
}


/// If no confirmation, and there is a pending/s link but no inbox link, create a DeliveryConfirmation
/// Return true if a DeliveryConfirmation has been created
pub(crate) fn try_confirming_pending_mail_has_been_received(package_eh: EntryHash, recipient: &AgentPubKey) -> ExternResult<bool> {
    debug!("try_confirming_pending_mail_has_been_received() - START");
    /// Check confirmations
    let confirmations = get_confirmations(package_eh.clone())?;
    if !confirmations.is_empty() {
        return Ok(false);
    }
    let mut pending_found = false;
    /// If a pending link and inbox link match, still waiting for confirmation
    let pendings_links = get_links(link_input(package_eh.clone(), SnapmailLink::Pendings, None))?;
    let inbox_links = get_links(link_input(recipient.to_owned(), SnapmailLink::MailInbox, None))?;
    let inbox_targets: Vec<EntryHash> = inbox_links.iter().map(|x| x.target.clone().into_entry_hash().unwrap()).collect();
    for pendings_link in pendings_links.iter() {
        let res = SnapmailLink::into_agent(&pendings_link.tag);
        if let Ok(agent) = res {
            // inbox link found ; check if tag is recipient
            if &agent == recipient {
                pending_found = true;
                let eh = pendings_link.target.clone().into_entry_hash().expect("Link target not an EntryHash");
                if inbox_targets.contains(&eh) {
                    return Ok(false);
                }
            }
        }
    }
    /// Create confirmation if conditions are met
    if pending_found {
        debug!("try_confirming_pending_mail_has_been_received() - CREATING CONFIRMATION");
        let confirmation = DeliveryConfirmation::new(package_eh.clone(), recipient.clone());
        let _ = create_entry(SnapmailEntry::DeliveryConfirmation(confirmation))?;
        return Ok(true);
    }
    /// Done
    Ok(false)
}



/// If no confirmation, and there is a pending/s link but no inbox link, create a DeliveryConfirmation
/// Return true if a DeliveryConfirmation has been created
pub(crate) fn try_confirming_pending_ack_has_been_received(package_eh: EntryHash, recipient: &AgentPubKey) -> ExternResult<bool> {
    debug!("try_confirming_pending_ack_has_been_received() - START");
    /// Check confirmations
    let confirmations = get_confirmations(package_eh.clone())?;
    if !confirmations.is_empty() {
        return Ok(false);
    }
    /// If a pending link and and inbox link match, still waiting for confirmation
    let pending_links = get_links(link_input(package_eh.clone(), SnapmailLink::Pending, None))?;
    for _pending_link in pending_links.iter() {
        /// Check for inbox link: If no link, it means it has been deleted by recipient
        let links = get_links(link_input(recipient.to_owned(), SnapmailLink::AckInbox, None))?;
        for link in links.iter() {
            let res = SnapmailLink::into_agent(&link.tag);
            if let Ok(agent) = res {
                // inbox link found ; check if tag is recipient
                if &agent == recipient {
                    return Ok(false);
                }
            }
        }
        /// Create confirmation since Pending found but not inbox link
        debug!("try_confirming_pending_ack_has_been_received() - CREATING CONFIRMATION");
        let confirmation = DeliveryConfirmation::new(package_eh.clone(), recipient.clone());
        let _ = create_entry(SnapmailEntry::DeliveryConfirmation(confirmation))?;
        return Ok(true);
    }
    Ok(false)
}


///
pub fn get_delivery_state(package_eh: EntryHash, recipient: &AgentPubKey) -> ExternResult<DeliveryState> {
    /// Look for a DeliveryConfirmation entry
    let confirmations = get_confirmations(package_eh.clone())?;
    let confirmed_recipients: Vec<AgentPubKey> = confirmations.iter().map(|x| x.recipient.clone()).collect();
    if confirmed_recipients.contains(recipient) {
        return Ok(DeliveryState::Delivered)
    }
    /// Look for a Pending/s link
    /// TODO: Do one query of multiple link types with HDK 145

    /// OutAck
    let pending_links = get_links(link_input(package_eh.clone(), SnapmailLink::Pending, None))?;
    if pending_links.len() > 0 {
        return Ok(DeliveryState::Pending)
    }

    /// OutMail
    let links = get_links(link_input(package_eh.clone(), SnapmailLink::Pendings, None))?;
    for link in links {
        let maybe_pendings = SnapmailLink::into_agent(&link.tag);
        if let Ok(agent) = maybe_pendings {
            if &agent == recipient {
                return Ok(DeliveryState::Pending)
            }
        }

    }
    /// None found
    Ok(DeliveryState::Unsent)
}
