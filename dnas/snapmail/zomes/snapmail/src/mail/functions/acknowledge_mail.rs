use hdk::prelude::*;
use zome_utils::*;
use snapmail_model::*;

use crate::{
    dm_protocol::{DirectMessageProtocol, AckMessage},
    mail::{
        utils::*,
        receive::receive_dm_ack,
    },
    send_dm,
};


/// Return EntryHash of newly created OutAck
#[hdk_extern]
//#[snapmail_api]
pub fn acknowledge_mail(inmail_ah: ActionHash) -> ExternResult<EntryHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sure it's an InMail ...
    let (inmail_eh, inmail) = get_typed_from_ah::<InMail>(inmail_ah.clone())?;
    /// ... has not already been acknowledged
    let acks = get_outacks(Some(inmail_ah))?;
    if acks.len() > 0 {
        let outack_eh = hash_entry(acks[0].clone())?;
        return Ok(outack_eh)
        //return error("Mail has already been acknowledged");
    }
    debug!("Not acknowledged yet");
    /// Write OutAck
    let outack = OutAck::new(inmail_eh.clone());
    let _ah = create_entry(SnapmailEntry::OutAck(outack.clone()))?;
    let outack_eh = hash_entry(outack.clone())?;
    /// Shortcut to self
    let me = agent_info()?.agent_latest_pubkey;
    if inmail.from.clone() == me {
        debug!("send ack to Self");
        let ack_signature = sign(me.clone(), inmail.outmail_eh.clone())?;
        let msg = AckMessage {
            outmail_eh: inmail.outmail_eh.clone(),
            ack_signature,
        };
        let res = receive_dm_ack(me.clone(), msg);
        assert!(res == DirectMessageProtocol::Success("Ack received".to_string()));
    }
    /// Done
    Ok(outack_eh)
}


/// Called by post_commit()
pub fn send_committed_ack(outack_eh: &EntryHash, outack: OutAck) -> ExternResult<()> {
    /// Get InMail
    let inmail = get_typed_from_eh::<InMail>(outack.inmail_eh.clone())?;
    /// Try Direct sharing of Acknowledgment
    debug!("Sending ack via DM ...");
    let res = send_dm_ack(&inmail.outmail_eh, &inmail.from);
    if res.is_ok() {
        /// Create & commit DeliveryConfirmation via remote call
        let confirmation = DeliveryConfirmation::new(outack_eh.clone(),inmail.from.clone());
        let _res = call_remote(
            agent_info()?.agent_latest_pubkey,
            zome_info()?.name,
            "commit_confirmation".to_string().into(),
            None,
            confirmation,
        )?; // Can't fallback if this fails. Must notify the error.
        debug!("Acknowledgment shared !");
        return Ok(());
    }
    let err = res.err().unwrap();
    debug!("Direct sharing of Acknowledgment failed: {}", err);
    /// Otherwise share Acknowledgement via DHT
    let payload = CommitPendingAckInput {
        outack_eh: outack_eh.clone(),
        outmail_eh: inmail.outmail_eh,
        original_sender: inmail.from,
    };
    let _pending_mail_ah = call_remote(
        agent_info()?.agent_latest_pubkey,
        zome_info()?.name,
        "commit_pending_ack".to_string().into(),
        None,
        payload,
    )?;
    /// Done
    Ok(())
}


/// Try sending directly to other Agent if Online
fn send_dm_ack(outmail_eh: &EntryHash, from: &AgentPubKey) -> ExternResult<()> {
    debug!("acknowledge_mail_direct() START");
    let ack_signature = sign(agent_info()?.agent_latest_pubkey, outmail_eh.clone())?;
    /// Shortcut to self
    if from.clone() == agent_info()?.agent_latest_pubkey {
        return Ok(());
    }
    /// Create DM
    let msg = AckMessage { outmail_eh: outmail_eh.clone(), ack_signature };
    /// Send DM
    let response = send_dm(from.clone(), DirectMessageProtocol::Ack(msg))?;
    /// Check Response
    debug!("Received response for Ack: {:?}", response);
    match response {
        DirectMessageProtocol::Success(_) => Ok(()),
        _ => error("ACK by DM Failed"),
    }
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct CommitPendingAckInput {
    outack_eh: EntryHash,
    outmail_eh: EntryHash,
    original_sender: AgentPubKey,
}

/// Create & Commit PendingAck
/// Return ActionHash of newly created PendingAck
#[hdk_extern]
fn commit_pending_ack(input: CommitPendingAckInput) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("commit_pending_ack() - START");
    /// Commit PendingAck
    let signature = sign(agent_info()?.agent_latest_pubkey, input.outmail_eh.clone())?;
    let pending_ack = PendingAck::new(input.outmail_eh.clone(), signature);
    let pending_ack_ah = create_entry(SnapmailEntry::PendingAck(pending_ack.clone()))?;
    /// Create links between PendingAck and OutAck & recipient inbox
    let pending_ack_eh = hash_entry(&pending_ack)?;
    // let tag = SnapmailLink::AckInbox.concat_hash(&input.original_sender);
    let _ = create_link(
        input.outack_eh.clone(),
        pending_ack_eh.clone(),
        SnapmailLink::Pending,
        LinkTag::from(()),
    )?;
    let _ = create_link(
        EntryHash::from(input.original_sender.clone()),
        pending_ack_eh,
        SnapmailLink::AckInbox,
        SnapmailLink::from_agent(&input.original_sender),
    )?;
    debug!("pending_ack_ah: {:?} (for {})", pending_ack_ah, input.original_sender);
    /// Done
    Ok(pending_ack_ah)
}


/// Called during a post_commit()
#[hdk_extern]
#[ignore(zits)]
fn commit_confirmation(input: DeliveryConfirmation) -> ExternResult<ActionHash> {
    debug!("commit_confirmation(): {:?} ", input.package_eh);
    return create_entry(SnapmailEntry::DeliveryConfirmation(input));
}
