use hdk::prelude::*;
use zome_utils::*;
use snapmail_model::*;

use crate::{
    file::dm::request_manifest_by_dm,
    signal_protocol::*,
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GetMissingAttachmentsInput {
    pub from: AgentPubKey,
    pub inmail_ah: ActionHash,
}


/// Get InMail or OutMail struct in local source chain at address
#[hdk_extern]
//#[snapmail_api]
pub fn get_missing_attachments(input: GetMissingAttachmentsInput) -> ExternResult<u32> {
    let (_eh, inmail) = get_typed_from_ah::<InMail>(input.inmail_ah.clone())?;
    let mut missing = 0;
    for attachment_info in inmail.mail.attachments {
        let manifest_eh = attachment_info.manifest_eh;
        let manifest_str = format!("Manifest {}", manifest_eh);
        let maybe_entry = get(manifest_eh.clone(), GetOptions::network())?;
        let mut manifest = None;
        /// Request manifest if missing
        if let None = maybe_entry {
            /// Request manifest
            let maybe_maybe_manifest = request_manifest_by_dm(input.from.clone(), manifest_eh.clone());
            /// Notify failure
            if let Err(err) = maybe_maybe_manifest {
                let response_str = format!("{} request failed", manifest_str);
                warn!("{}: {}", response_str, err);
                missing += 1;
                continue;
            }
            let maybe_manifest = maybe_maybe_manifest.unwrap();
            if let None = maybe_manifest {
                warn!("{} unknown from source agent", manifest_str);
                missing += 1;
                continue;
            }
            manifest = Some(maybe_manifest.unwrap());
        }

        /// Request chunks
        let args = crate::file::GetMissingChunksInput {
            from: input.from.clone(),
            manifest_eh,
        };
        let maybe_missings = crate::file::get_missing_chunks(args);
        if let Err(err) = maybe_missings {
            let response_str = format!("{} requesting chunks failed", manifest_str);
            warn!("{}: {}", response_str, err);
            missing += 1;
            continue;
        }
        let missing_chunks_count = maybe_missings.unwrap();
        if missing_chunks_count > 0 {
            missing += 1;
            continue;
        }
        /// Emit Signal
        let res = emit_signal(&SignalProtocol::ReceivedFile(manifest.unwrap()));
        if let Err(err) = res {
            error!("Emit signal failed: {}", err);
        }
    }
    /// Done
    Ok(missing)
}
