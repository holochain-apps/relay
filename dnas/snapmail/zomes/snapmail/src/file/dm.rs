use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
    DirectMessageProtocol,
    dm::*,
};

///
pub(crate) fn request_chunk_by_dm(destination: AgentPubKey, chunk_eh: EntryHash)
    -> ExternResult<Option<FileChunk>>
{
    debug!("request_manifest_by_dm(): {}", chunk_eh);
    /// Send DM
    let maybe_response = send_dm(
        destination,
        DirectMessageProtocol::RequestChunk(chunk_eh),
    );
    debug!("RequestChunk result = {:?}", maybe_response);
    /// Check response
    if let Err(e) = maybe_response {
        return error(&format!("send_dm() of RequestChunk failed: {}", e));
    }
    match maybe_response.unwrap() {
        DirectMessageProtocol::Chunk(chunk) => {
            /// Commit FileChunk
            let maybe_address = create_entry(SnapmailEntry::FileChunk(chunk.clone()));
            if let Err(err) = maybe_address {
                let response_str = "Failed committing RequestChunk";
                debug!("{}: {}", response_str, err);
                return Err(err);
            }
            let chunk_address = maybe_address.unwrap();
            debug!("received chunk_address: {}", chunk_address);
            Ok(Some(chunk))
        },
        DirectMessageProtocol::UnknownEntry => Ok(None),
        _ => error("send_dm() of RequestChunk failed 3".into()),
    }
}


///
pub(crate) fn request_manifest_by_dm(destination: AgentPubKey, manifest_eh: EntryHash)
    -> ExternResult<Option<FileManifest>>
{
    debug!("request_manifest_by_dm(): {}", manifest_eh);
    /// Send DM
    let maybe_response = send_dm(
        destination,
        DirectMessageProtocol::RequestManifest(manifest_eh),
    );
    debug!("RequestManifest result = {:?}", maybe_response);
    /// Check Response
    if let Err(e) = maybe_response {
        return error(&format!("send_dm() of RequestManifest failed: {}", e));
    }
    match maybe_response.unwrap() {
        DirectMessageProtocol::FileManifest(manifest) => {
            /// Commit FileManifest
            let maybe_address = create_entry(SnapmailEntry::FileManifest(manifest.clone()));
            if let Err(err) = maybe_address {
                let response_str = "Failed committing FileManifest";
                debug!("{}: {}", response_str, err);
                return Err(err);
            }
            let manifest_address = maybe_address.unwrap();
            debug!("received manifest_address: {}",  manifest_address);
            Ok(Some(manifest))
        },
        DirectMessageProtocol::UnknownEntry => Ok(None),
        _ => error("send_dm() of FileManifest failed 3".into()),
    }
}
