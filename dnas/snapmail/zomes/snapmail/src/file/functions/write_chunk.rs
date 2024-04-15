use hdk::prelude::*;
use snapmail_model::*;


/// Write base64 file as string to source chain
#[hdk_extern]
//#[snapmail_api]
pub fn write_chunk(input_chunk: FileChunk) -> ExternResult<EntryHash> {
    trace!(" write_chunk() {:?}", input_chunk);
    let eh = hash_entry(input_chunk.clone());
    let _ah = create_entry(SnapmailEntry::FileChunk(input_chunk.clone()))?;
    return eh;
}
