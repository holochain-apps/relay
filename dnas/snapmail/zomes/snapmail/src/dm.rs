use hdk::prelude::*;
#[allow(unused_imports)]
use snapmail_model::*;
use zome_utils::*;

use crate::{
   mail,
   dm_protocol::*,
};

pub const REMOTE_ENDPOINT: &'static str = "receive_dm";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DmPacket {
   pub from: AgentPubKey,
   pub dm: DirectMessageProtocol,
}

/// Start point for any remote call
/// WARN: Name of function must match REMOTE_ENDPOINT const value
#[hdk_extern]
#[ignore(zits)]
pub fn receive_dm(dm_packet: DmPacket) -> ExternResult<DirectMessageProtocol> {
   // let (from, dm): (AgentPubKey, DirectMessageProtocol) = dm_packet.into();
   debug!("*** receive_dm() called from {:?}", dm_packet.from);
   let response = mail::receive_dm(dm_packet.from, dm_packet.dm);
   debug!("*** receive_dm() response to send back: {:?}", response);
   Ok(response)
}

///
pub(crate) fn send_dm(destination: AgentPubKey, dm: DirectMessageProtocol) -> ExternResult<DirectMessageProtocol> {
   /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
   let me = agent_info()?.agent_latest_pubkey;
   if destination == me {
      /// TODO: FOR DEBUGGING ONLY?
      return error("send_dm() aborted. Can't send to self.");
   }
   /// Prepare payload
   let dm_packet = DmPacket { from: me, dm: dm.clone() };
   /// Call peer
   debug!("send_dm() calling remote receive_dm() ; dm = {:?}", dm);
   let response = call_remote(
      destination,
      zome_info()?.name,
      REMOTE_ENDPOINT.to_string().into(),
      None,
      &dm_packet,
   )?;
   debug!("calling remote receive_dm() DONE ; dm = {:?}", dm);
   return match response {
       ZomeCallResponse::Ok(output) => Ok(output.decode().expect("Deserialization of response should never fail")),
       ZomeCallResponse::Unauthorized(_, _, _, _,_) => Ok(DirectMessageProtocol::Failure("Unauthorized".to_string())),
       ZomeCallResponse::NetworkError(e) => Ok(DirectMessageProtocol::Failure(format!("NetworkError: {:?}", e))),
       ZomeCallResponse::CountersigningSession(e) => Ok(DirectMessageProtocol::Failure(format!("CountersigningSession: {:?}", e))),
   };
}
