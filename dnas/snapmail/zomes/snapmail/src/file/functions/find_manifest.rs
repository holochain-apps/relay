use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::file::get_all_manifests;


/// Get manifest from file content hash
#[hdk_extern]
//#[snapmail_api]
pub fn find_manifest(data_hash: String) -> ExternResult<Option<FileManifest>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("find_manifest(): {}", data_hash);
    /// Get all FileManifest on local chain with query
    let manifest_list = get_all_manifests(())?;
    /* Check each Manifest */
    for manifest in manifest_list.iter() {
        if manifest.data_hash == data_hash {
            return Ok(Some(manifest.clone()));
        }
    }
    /// Done
    Ok(None)
}
