mod inmail;
mod outmail;
mod pending_mail;
mod pending_ack;
mod outack;
mod inack;
mod delivery_confirmation;

use hdi::prelude::*;

pub use self::{
    inmail::*, pending_mail::*, outmail::*,
    pending_ack::*, inack::*, outack::*, delivery_confirmation::*,
};
use crate::{
    entries::file::FileManifest,
};

/// Possible states of an InMail entry
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum InMailState {
    /// InMail committed, no OutAck
    Unacknowledged,
    /// OutAck committed, no confirmation, no pending
    AckUnsent,
    /// OutAck committed, PendingAck available
    AckPending,
    /// OutAck committed, confirmation committed
    AckDelivered,
    /// Delete entry committed
    Deleted,
}

/// State of a single delivery of a mail or ack to a unique recipient
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum DeliveryState {
    /// Initial state ; entry committed
    Unsent,
    /// Link to Pending entry is alive
    Pending,
    /// DeliveryConfirmation committed, We have proof object has been received:
    /// DM has been sent successfully or link to pending has been deleted
    Delivered,
}


/// Possible states of an OutMail entry
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
//#[serde(untagged)]
pub enum OutMailState {
    /// (orange) Initial state ; OutMail committed
    Unsent,
    /// (yellow) All deliveries have been sent (no Unsent state)
    AllSent,
    /// (black) All deliveries have been received (no Unsent or pending state)
    AllReceived,
    /// (green) Has a InAck for each recipient
    AllAcknowledged,
    /// (red) Delete entry committed
    Deleted,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum MailState {
    In(InMailState),
    Out(OutMailState),
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct MailItem {
    pub ah: ActionHash,
    pub author: AgentPubKey,
    pub mail: Mail,
    pub state: MailState,
    pub bcc: Vec<AgentPubKey>,
    pub date: i64,
    /// UI Things
    pub reply: Option<ActionHash>, // OutMail = reply_of ; InMail = reply
    pub reply_of: Option<ActionHash>,
    pub status: Option<String>,
}


#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum RecipientKind {
    TO,
    CC,
    BCC,
}

/// Core content of all *Mail Entries
/// Mail can have Zero public recipient (but must have at least one public or private recipient)
#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct Mail {
    pub date_sent: u64,
    pub subject: String,
    pub payload: String,
    pub to: Vec<AgentPubKey>,
    pub cc: Vec<AgentPubKey>,
    pub attachments: Vec<AttachmentInfo>,
}

impl Mail {
    pub fn new(subject: String,
               payload: String,
               to: Vec<AgentPubKey>,
               in_cc: Vec<AgentPubKey>,
               attachments: Vec<AttachmentInfo>,
    ) -> Self {
        //assert_ne!(0, attachments.len() + payload.len() + subject.len());
        /// Remove duplicate recipients
        let cc = filter_up(&to, &in_cc);
        /// Create Mail
        let date_sent = 42; //FIXME: zome_utils::now();
        /// Done
        Self {
            date_sent,
            subject,
            payload,
            to,
            cc,
            attachments,
        }
    }
}


/// Metadata for a mail attachment
#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct AttachmentInfo {
    pub manifest_eh: EntryHash,
    pub data_hash: String,
    pub filename: String,
    pub filetype: String,
    pub orig_filesize: usize,
}

impl AttachmentInfo {
    pub fn from_manifest(manifest: FileManifest, manifest_eh: EntryHash) -> Self {
        Self {
            manifest_eh: manifest_eh.clone(),
            data_hash: manifest.data_hash.clone(),
            filename: manifest.filename.clone(),
            filetype: manifest.filetype.clone(),
            orig_filesize: manifest.orig_filesize,
        }
    }
}


/// Remove records of first list present in second list
pub fn filter_up(upper_list: &Vec<AgentPubKey>, lower_list: &Vec<AgentPubKey>) -> Vec<AgentPubKey> {
    let mut new_lower_list = lower_list.clone();
    new_lower_list.retain(|x| !upper_list.contains(x));
    new_lower_list
}
