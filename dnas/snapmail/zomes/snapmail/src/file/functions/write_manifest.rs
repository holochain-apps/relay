use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct WriteManifestInput {
    pub data_hash: String,
    pub filename: String,
    pub filetype: String,
    pub orig_filesize: usize,
    pub chunks: Vec<EntryHash>,
}
/// Write file manifest to source chain
#[hdk_extern]
//#[snapmail_api]
pub fn write_manifest(input: WriteManifestInput) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let manifest = FileManifest {
        data_hash: input.data_hash,
        filename: input.filename,
        filetype: input.filetype,
        orig_filesize: input.orig_filesize,
        chunks: input.chunks,
        content: None,
    };
    return create_entry(SnapmailEntry::FileManifest(manifest));
}
