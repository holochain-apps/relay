use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
    file::{dm::request_chunk_by_dm},
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GetMissingChunksInput {
    pub from: AgentPubKey,
    pub manifest_eh: EntryHash,
}
/// Request missing chunks for an attachment
/// Returns number of remaining missing chunks
/// TODO: Return vec of missing chunk ActionHash
#[hdk_extern]
//#[snapmail_api]
pub fn get_missing_chunks(input: GetMissingChunksInput) -> ExternResult<u32> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let manifest = get_typed_from_eh::<FileManifest>(input.manifest_eh.clone())?;
    let chunk_count = manifest.chunks.len();
    let mut missing = 0;
    let mut i = -1;
    for chunk_eh in manifest.chunks {
        i += 1;
        let chunk_str = format!("Chunk {}/{}", i, chunk_count);
        /// Skip if chunk already held
        let maybe_record = get(chunk_eh.clone(), GetOptions::network())?;
        if let Some(_) = maybe_record {
            warn!("{} already held", chunk_str);
            continue;
        }
        /// Request missing chunk
        let maybe_maybe_chunk = request_chunk_by_dm(input.from.clone(), chunk_eh);
        /// Notify failure
        if let Err(err) = maybe_maybe_chunk {
            let response_str = format!("{} failed", chunk_str);
            warn!("{}: {}", response_str, err);
            missing += 1;
            continue;
        }
        if let None = maybe_maybe_chunk.unwrap() {
            warn!("{} unknown from source agent", chunk_str);
            missing += 1;
            continue;
        }
    }
    /// Done
    Ok(missing)
}
