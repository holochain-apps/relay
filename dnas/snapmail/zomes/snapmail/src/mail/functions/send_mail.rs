use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;
use crate::create_entry::*;

use crate::{
    send_dm,
    mail::{sign_mail, PendingMailExt},
    dm_protocol::{MailMessage, DirectMessageProtocol},
    SnapmailLink,
    file::{get_manifest},
};


#[allow(non_camel_case_types)]
pub enum SendSuccessKind {
    OK_SELF,
    OK_DIRECT,
    OK_PENDING,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SendMailInput {
    pub subject: String,
    pub payload: String,
    pub reply_of: Option<ActionHash>,
    pub to: Vec<AgentPubKey>,
    pub cc: Vec<AgentPubKey>,
    pub bcc: Vec<AgentPubKey>,
    pub manifest_address_list: Vec<ActionHash>,
}


///
fn send_manifest_by_dm(
    destination: &AgentPubKey,
    manifest: &FileManifest,
) -> ExternResult<()> {
    debug!("send_manifest_by_dm(): {:?}", destination);
    /// Send DM
    let response = send_dm(
        destination.clone(),
        DirectMessageProtocol::FileManifest(manifest.clone()),
    );
    debug!("send_manifest result = {:?}", response);
    /// Check Response
    if let Err(e) = response {
        return error(&format!("send_dm() of manifest failed: {}", e));
    }
    /// Return manifest's entry address on receiver's source chain
    match response.unwrap() {
        DirectMessageProtocol::Success(_manifest_address) => Ok(()),
        _ => error("hdk::send() of manifest failed".into())
    }
}


///
fn send_chunk_by_dm(destination: &AgentPubKey, chunk_eh: &EntryHash) -> ExternResult<()> {
    debug!("send_chunk_by_dm(): {}", chunk_eh);
    let maybe_record = get(chunk_eh.clone(), GetOptions::network())?;
        //.expect("No reason for get_entry() to crash");
    debug!("maybe_entry =  {:?}", maybe_record);
    let Some(record) = maybe_record
        else { return error("No chunk found at given address".into()); };
    let chunk = get_typed_from_record::<FileChunk>(record)?;
    /// Send DM
    let response = send_dm(
        destination.clone(),
        DirectMessageProtocol::Chunk(chunk),
    );
    debug!("send_chunk result = {:?}", response);
    /// Check Response
    if let Err(e) = response {
        return error(&format!("hdk::send() of chunk failed: {}", e));
    }
    match response.unwrap() {
        DirectMessageProtocol::Success(_) => Ok(()),
        _ => error("hdk::send() of chunk failed".into()),
    }
}

///
fn send_attachment_by_dm(destination: &AgentPubKey, manifest: &FileManifest) -> ExternResult<()> {
    /// Send each chunk first
    for chunk_eh in &manifest.chunks {
        send_chunk_by_dm(destination, chunk_eh)?;
    }
    /// Send FileManifest
    send_manifest_by_dm(destination, manifest)?;
    /// Done
    Ok(())
}


/// Attempt sending Mail and attachments via Direct Messaging
fn deliver_mail_by_dm(
    outmail_eh: &EntryHash,
    mail: &Mail,
    destination: &AgentPubKey,
    manifest_list: &Vec<FileManifest>,
    signature: &Signature,
) -> ExternResult<()> {
    /// -- Send Attachments
    debug!("deliver_mail_by_dm() Send Attachments");
    /// For each attachment, send all the chunks
    for manifest in manifest_list {
        let result = send_attachment_by_dm(destination, manifest);
        if let Err(e) = result {
            let err_msg = format!("Send attachment failed -> Err: {}", e);
            debug!(?err_msg);
            return error(&err_msg);
        }
    }
    /// --  Send Mail
    debug!("deliver_mail_by_dm() to {}", destination);
    /// Create DM
    let msg = MailMessage {
        outmail_eh: outmail_eh.clone(),
        mail: mail.clone(),
        mail_signature: signature.clone(),
    };
    /// Send DM
    let response_dm = send_dm(destination.clone(), DirectMessageProtocol::Mail(msg))?;
    debug!("deliver_mail_by_dm() response_dm = {:?}", response_dm);
    /// Check Response
    if let DirectMessageProtocol::Success(_) = response_dm {
        return Ok(());
    }
    return error(&format!("deliver_mail_by_dm() failed: {:?}", response_dm));
}


/// remote called
#[hdk_extern]
#[ignore(zits)]
fn commit_inmail(inmail: InMail) -> ExternResult<ActionHash> {
    debug!("commit_inmail() START **********");
    create_entry(SnapmailEntry::InMail(inmail))
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct CommitPendingMailInput {
    mail: PendingMail,
    outmail_eh: EntryHash,
    destination: AgentPubKey,
}

/// remote called
#[hdk_extern]
#[ignore(zits)]
fn commit_pending_mail(input: CommitPendingMailInput) -> ExternResult<ActionHash> {
    debug!("commit_pending_mail() START **********");
    let me = agent_info()?.agent_latest_pubkey;
    /// Commit Pending Mail
    let pending_mail_eh = hash_entry(&input.mail)?;
    let maybe_pending_mail_ah = create_entry(SnapmailEntry::PendingMail(input.mail));
    if let Err(err) = maybe_pending_mail_ah.clone() {
        debug!("PendingMail create_entry() failed = {:?}", err);
        return Err(maybe_pending_mail_ah.err().unwrap());
    };
    let pending_mail_ah = maybe_pending_mail_ah.unwrap();
    debug!("pending_mail_ah = {:?}", pending_mail_ah);
    /// Commit Pendings Link
    let maybe_link1_ah = create_link(
        input.outmail_eh.clone(),
        pending_mail_eh.clone(),
        SnapmailLink::Pendings,
        SnapmailLink::from_agent(&input.destination),
        );
    if let Err(err) = maybe_link1_ah.clone() {
        debug!("link1 failed = {:?}", err);
        return Err(maybe_link1_ah.err().unwrap());
    };
    let link1_ah = maybe_link1_ah.unwrap();
    debug!("link1_ah = {}", link1_ah);
    /// Commit MailInbox Link
    //let tag = SnapmailLink::MailInbox.concat_hash(&me);
    let maybe_link2_ah = create_link(
        EntryHash::from(input.destination.clone()),
        pending_mail_eh,
        SnapmailLink::MailInbox,
        SnapmailLink::from_agent(&me),
    );
    if let Err(err) = maybe_link2_ah.clone() {
        debug!("link2 failed = {:?}", err);
        return Err(maybe_link2_ah.err().unwrap());
    };
    let link2_ah = maybe_link2_ah.unwrap();
    debug!("link2_ah = {}", link2_ah);
    /// Done
    return Ok(pending_mail_ah)
}


///
pub(crate) fn deliver_mail(
    outmail_eh: &EntryHash,
    mail: &Mail,
    destination: &AgentPubKey,
    manifest_list: &Vec<FileManifest>,
    signature: &Signature,
) -> ExternResult<SendSuccessKind> {
    debug!("deliver_mail() START - {:?}", destination);
    /// Shortcut to self
    let me = agent_info()?.agent_latest_pubkey;
    if destination.clone() == me {
        debug!("deliver_mail() Self");
        let msg = MailMessage {
            outmail_eh: outmail_eh.clone(),
            mail: mail.clone(),
            mail_signature: signature.clone(),
        };
        let inmail = msg.into_inmail(me.clone());
        debug!("deliver_mail() REMOTE CALLING...");
        let res = call_remote(
            me,
            zome_info()?.name,
            "commit_inmail".to_string().into(),
            None,
            inmail,
        )?;
        debug!("commit_inmail() END : {:?}", res);
        assert!(matches!(res, ZomeCallResponse::Ok { .. }));
        return Ok(SendSuccessKind::OK_SELF);
    }
    /// Try sending directly to other Agent if Online
    let result = deliver_mail_by_dm(outmail_eh, mail, destination, manifest_list, signature);
    let Err(err) = result
        else { return Ok(SendSuccessKind::OK_DIRECT); };
    debug!("send_mail_by_dm() failed: {:?}", err);
    debug!("deliver_mail() - Creating pending_mail...");
    /// DM failed, send to DHT instead by creating a PendingMail
    /// Create and commit PendingMail with remote call to self
    let pending_mail = PendingMail::from_mail(
        mail.clone(),
        outmail_eh.clone(),
        destination.clone(),
    )?;
    let payload = CommitPendingMailInput {
        mail: pending_mail,
        outmail_eh: outmail_eh.clone(),
        destination: destination.clone(),
    };
    debug!("deliver_mail() - calling commit_pending_mail()");
    let response = call_remote(
        me,
        zome_info()?.name,
        "commit_pending_mail".to_string().into(),
        None,
        payload,
    )?;
    debug!("deliver_mail() - commit_pending_mail() response: {:?}", response);
    /// Done
    Ok(SendSuccessKind::OK_PENDING)
}


///
/// Send Mail: Creates and commits OutMail. Files must already be committed.
/// post_commit will try to send directly to each recipient.
#[hdk_extern]
//#[snapmail_api]
pub fn send_mail(input: SendMailInput) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("Sending mail: {:?}", input);
    /// Get file manifests from addresses
    let mut file_manifest_list = Vec::new();
    let mut file_manifest_pair_list = Vec::new();
    for manifest_ah in input.manifest_address_list.clone() {
        let manifest_eh = get_eh(manifest_ah.clone())?;
        let manifest = get_manifest(manifest_ah.clone().into())?;
        file_manifest_list.push(manifest.clone());
        file_manifest_pair_list.push((manifest_eh, manifest))
    }
    /// Create and commit OutMail
    let outmail = create_outmail(
        input.subject,
        input.payload,
        input.reply_of,
        input.to.clone(),
        input.cc.clone(),
        input.bcc.clone(),
        file_manifest_pair_list.clone(),
    );
    let outmail_ah = create_entry(SnapmailEntry::OutMail(outmail))?;
    debug!("OutMail created: {:?}", outmail_ah);
    Ok(outmail_ah)
}


/// Once OutMail committed, try to send directly to each recipient.
/// if recipient not online, creates a PendingMail on the DHT.
pub fn send_committed_mail(
    outmail_eh: &EntryHash,
    outmail: OutMail,
    whitelist: Option<Vec<AgentPubKey>>) -> ExternResult<()> {
    debug!("CALLED send_committed_mail() {:?}", outmail_eh);
    /// Get filtered recipients
    let recipients = match whitelist {
        None => outmail.recipients(),
        Some(list) => {
            outmail.recipients().iter()
               .filter(|x| list.contains(x))
               .cloned()
               .collect()
        }
    };
    /// Get all attachments manifests
    let mut file_manifest_list = Vec::new();
    for attachment in outmail.mail.attachments.clone() {
        let manifest = get_manifest(attachment.manifest_eh.into())?;
        file_manifest_list.push(manifest.clone());
    }
    /// Create signature
    let signature = sign_mail(&outmail.mail)?;
    /// Send to each recipient
    for agent in recipients {
        let res = deliver_mail(outmail_eh, &outmail.mail, &agent, &file_manifest_list, &signature);
        match res {
            // Create 'Sent' link when successfully sent via DM
            Ok(SendSuccessKind::OK_SELF | SendSuccessKind::OK_DIRECT) => {
                let confirmation = DeliveryConfirmation::new(outmail_eh.clone(), agent.clone());
                let response = call_remote(
                    agent_info()?.agent_latest_pubkey,
                    zome_info()?.name,
                    "commit_confirmation".to_string().into(),
                    None,
                    confirmation,
                )?; // Can't fallback if this fails. Must notify the error.
                debug!("commit_confirmation() response: {:?}", response);
            },
            Ok(_) => {},
            Err(e) => {
                debug!("send_mail_to() failed: {}", e);
            }
        }
    }
    /// Done
    Ok(())
}
