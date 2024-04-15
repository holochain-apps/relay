use hdi::prelude::*;

use crate::entries::mail::Mail;


/// Entry representing an authored mail. It is private.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct OutMail {
    pub mail: Mail,
    pub reply_of: Option<ActionHash>,
    pub bcc: Vec<AgentPubKey>,
}

///
impl OutMail {
    ///
    pub fn new(mail: Mail, bcc: Vec<AgentPubKey>, reply_of: Option<ActionHash>) -> Self {
        Self {
            mail, reply_of, bcc,
        }
    }


    /// Merge recipient lists
    pub fn recipients(&self) -> Vec<AgentPubKey> {
        let mut recipients: Vec<AgentPubKey> = self.bcc.clone();
        recipients.append(&mut self.mail.cc.clone());
        recipients.append(&mut self.mail.to.clone());
        recipients.sort();
        recipients.dedup();
        recipients
    }

}
