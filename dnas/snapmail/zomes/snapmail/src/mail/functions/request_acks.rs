use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
   mail::get_outmail_state,
   mail::utils::*,
   mail::deliver_mail,
   file::get_manifest,
};
use crate::mail::get_inacks;


/// Re-send mail to each recipient of each OutMail for which we have missing acks
/// Return list of OutMails for which we requested acks
#[hdk_extern]
//#[snapmail_api]
pub fn request_acks(_: ()) -> ExternResult<Vec<ActionHash>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Get all Create OutMail actions with query
   let outmail_query_args = ChainQueryFilter::default()
      .include_entries(true)
      .action_type(ActionType::Create)
      .entry_type(SnapmailEntryTypes::OutMail.try_into().unwrap());
   let maybe_outmails = query(outmail_query_args);
   if let Err(err) = maybe_outmails {
      error!("request_acks() outmail_result failed: {:?}", err);
      return Err(err);
   }
   let created_outmails: Vec<Record> = maybe_outmails.unwrap();
   debug!(" request_acks() outmails count = {}", created_outmails.len());

   // Get all acks
   let acks = get_inacks(None)?;

   /// Check for each OutMail
   let mut ahs = Vec::new();
   for outmail_record in created_outmails {
      /// Get OutMail's recipients
      let outmail_ah = outmail_record.action_hashed().as_hash().to_owned();
      //let date: i64 = outmail_record.action().timestamp().as_seconds_and_nanos().0;
      let maybe_state = get_outmail_state(outmail_ah.clone());
      if let Err(_err) = maybe_state {
         continue;
      }
      let outmail: OutMail = get_typed_from_record(outmail_record)?;
      let outmail_eh = hash_entry(outmail.clone())?;
      let recipients = outmail.recipients();
      /// Get OutMail's inacks
      let outmail_acks: Vec<InAck> = acks.iter().filter(|x| x.outmail_eh == outmail_eh).cloned().collect();
      if recipients.len() == outmail_acks.len() {
         continue;
      }
      /// Some acks are missing ; send mail again
      ahs.push(outmail_ah);
      /// Get file manifest
      let mut file_manifest_list = Vec::new();
      for attachment in outmail.mail.attachments.clone() {
         let manifest = get_manifest(attachment.manifest_eh.into())?;
         file_manifest_list.push(manifest.clone());
      }
      /// Create signature
      let signature = sign_mail(&outmail.mail)?;
      /// Determine which acks are missing
      let receipt_agents: Vec<AgentPubKey> = outmail_acks.iter().map(|x| x.from.to_owned()).collect();
      let missing_recipients: Vec<&AgentPubKey> = recipients.iter()
         .filter(|x| !receipt_agents.contains(x))
         .collect();
      /* Send mail to each missing ack/pending */
      for recipient in missing_recipients {
         let _res = deliver_mail(&outmail_eh, &outmail.mail, recipient, &file_manifest_list, &signature);
      }
   }
   /// Done
   Ok(ahs)
}


