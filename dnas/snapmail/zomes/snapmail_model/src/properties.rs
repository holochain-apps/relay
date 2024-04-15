use hdi::prelude::*;

/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct SnapmailProperties {
   pub min_handle_length: u8,
   pub max_handle_length: u16,
   pub max_chunk_size: usize,
   pub max_file_size: usize,
}


/// Return the DNA properties
pub fn get_properties() -> ExternResult<SnapmailProperties> {
   //debug!("*** get_properties() called");
   let dna_info = dna_info()?;
   let props = dna_info.modifiers.properties;
   //debug!("props = {:?}", props);
   let maybe_properties: Result<SnapmailProperties, <SnapmailProperties as TryFrom<SerializedBytes>>::Error> = props.try_into();
   if let Err(e) = maybe_properties {
      debug!("Deserializing dna properties failed: {:?}", e);
      return Err(wasm_error!("Deserializing dna properties failed: {:?}", e));
   }
   Ok(maybe_properties.unwrap())
}
