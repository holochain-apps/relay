use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::mail::get_confirmations;


/// Get State of an OutAck
#[hdk_extern]
//#[snapmail_api]
pub fn is_outack_sent(outack_ah: ActionHash) -> ExternResult<bool> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!(" *** get_outack_state(): ");
   /// Make sure of type
   let (outack_eh, _outack) = get_typed_from_ah::<OutAck>(outack_ah)?;
   /// Look for a confirmation
   let confirmations = get_confirmations(outack_eh)?;
   /// Return true if there is a delivery confirmation
   return Ok(confirmations.len() > 0)

}
