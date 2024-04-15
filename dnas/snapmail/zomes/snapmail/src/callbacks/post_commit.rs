use hdk::prelude::*;
use crate::{
   mail::functions::*,
   signal_protocol::*,
};
use snapmail_model::*;


///
#[hdk_extern(infallible)]
fn post_commit(signed_action_list: Vec<SignedActionHashed>) {
   //debug!("post_commit() called: {:?}", ahList);
   debug!("post_commit() len = {}", signed_action_list.len());
   for sah in signed_action_list {
      //debug!(" - {:?}", signedAction.action().entry_type());
      let action = sah.action().clone();
      if action.entry_type().is_none() {
         continue;
      }
      let (eh, entry_type) = action.entry_data().expect("Missing Entry for a post-committed action");
      match entry_type {
         EntryType::AgentPubKey => {},
         EntryType::CapClaim => {},
         EntryType::CapGrant => {},
         EntryType::App(app_type) => {
            let res = post_commit_app(sah, eh.clone(), app_type.clone());
            if let Err(e) = res {
               error!("post_commit() error: {:?}", e);
            }
         },
      }
   }
}


///
fn post_commit_app(sah: SignedActionHashed, eh: EntryHash, _app_type: AppEntryDef) -> ExternResult<()> {
   debug!("post_commit_app() eh = {}", eh);
   if let Ok(outmail) = zome_utils::get_typed_from_eh::<OutMail>(eh.clone()) {
      send_committed_mail(&eh, outmail, None)?;
   }
   if let Ok(outack) = zome_utils::get_typed_from_eh::<OutAck>(eh.clone()) {
      send_committed_ack(&eh, outack)?;
   }
   /// Emit signal when InMail committed
   if let Ok(inmail) = zome_utils::get_typed_from_eh::<InMail>(eh.clone()) {
      let item = MailItem {
         ah: sah.hashed.as_hash().to_owned(),
         author: sah.hashed.content.author().to_owned(),
         mail: inmail.mail.clone(),
         state: MailState::In(InMailState::Unacknowledged),
         bcc: Vec::new(),
         date: zome_utils::now() as i64, // FIXME
         reply: None,
         reply_of: None,
         status: None,
      };
      //debug!("post_commit_app().ReceivedMail: '{}'", item.mail.subject);
      let payload = SignalProtocol::ReceivedMail(item.clone());
      let signal = SnapmailSignal::new(item.author, payload);
      let res = emit_signal(&signal);
      if let Err(err) = res {
          error!("Emit 'ReceivedMail' signal failed: {}", err);
      }
   }
   // Done
   Ok(())
}

