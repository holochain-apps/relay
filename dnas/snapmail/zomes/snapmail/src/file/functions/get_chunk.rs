use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;


/// Get chunk index and chunk as base64 string in local source chain at given address
/// Must be a valid address
/// TODO try using a AnyDht hash
#[hdk_extern]
//#[snapmail_api]
pub fn get_chunk(chunk_eh: EntryHash) -> ExternResult<String> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("get_chunk(): {}", chunk_eh);
    /// Look for record
    let record = match get(chunk_eh, GetOptions::network())? {
        Some(record) => record,
        None => return error("No record found at given address"),
    };
    /// Check if record is a Manifest
    let maybe_FileChunk: ExternResult<FileChunk> = get_typed_from_record(record.clone());
    if let Ok(chunk) = maybe_FileChunk {
        return Ok(chunk.chunk);
    }
    /// Done
    return error("Record at given address is not a FileChunk");
}
