use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
   mail::{
      get_delivery_state,
      send_committed_ack,
   },
};


/// Re-send outack which has an Unsent Delivery status
/// Return list of OutAcks which we tried to deliver again
#[hdk_extern]
//#[snapmail_api]
fn resend_outacks(_: ()) -> ExternResult<Vec<ActionHash>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let query_args = ChainQueryFilter::default()
      .include_entries(true)
      .action_type(ActionType::Create)
      .entry_type(SnapmailEntryTypes::OutAck.try_into().unwrap());
   let maybe_outacks = query(query_args);
   if let Err(err) = maybe_outacks {
      error!("resend_outacks() query failed: {:?}", err);
      return Err(err);
   }
   let created_outacks: Vec<Record> = maybe_outacks.unwrap();
   debug!(" resend_outacks() outacks len = {}", created_outacks.len());
   let mut ahs = Vec::new();
   for outack_record in created_outacks {
      let ah = outack_record.action_address().to_owned();
      let eh = outack_record.action().entry_hash().expect("Mssing Entry in Create OutAck record");
      let outack: OutAck = get_typed_from_record(outack_record.clone())?;
      let inmail: InMail = get_typed_from_eh(outack.inmail_eh.clone())?;
      let state = get_delivery_state(eh.to_owned(), &inmail.from)?;
      if state != DeliveryState::Unsent {
         continue;
      }
      /// Some acks are missing ; send mail again
      ahs.push(ah);
      /// Send mail to each missing ack/pending
      let _res = send_committed_ack(eh, outack);
   }
   Ok(ahs)
}
