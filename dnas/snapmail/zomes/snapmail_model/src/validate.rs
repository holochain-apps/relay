use hdi::prelude::*;
use crate::entry_types::validate_app_entry;

///
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
   //debug!("*** validate() op = {:?}", op);
   match op {
      Op::StoreRecord ( _ ) => Ok(ValidateCallbackResult::Valid),
      Op::StoreEntry(storeEntry) => {
         let creation_action = storeEntry.action.hashed.into_inner().0;
         return validate_create_entry(creation_action.clone(), storeEntry.entry);
      },
      Op::RegisterCreateLink(registered_create_link) => {
         let (create, signature) = registered_create_link.create_link.into_inner();
         return validate_create_link(create, signature);
      },
      Op::RegisterDeleteLink (_)=> Ok(ValidateCallbackResult::Valid),
      Op::RegisterUpdate { .. } => Ok(ValidateCallbackResult::Valid),
      Op::RegisterDelete { .. } => Ok(ValidateCallbackResult::Valid),
      Op::RegisterAgentActivity { .. } => Ok(ValidateCallbackResult::Valid),
   }
}


/// Dispatch according to base type
pub fn validate_create_entry(creation_action: EntryCreationAction, entry: Entry) -> ExternResult<ValidateCallbackResult> {
   let result = match entry.clone() {
      Entry::CounterSign(_data, _bytes) => Ok(ValidateCallbackResult::Invalid("CounterSign not allowed".into())),
      Entry::Agent(_agent_key) => Ok(ValidateCallbackResult::Valid),
      Entry::CapClaim(_claim) => Ok(ValidateCallbackResult::Valid),
      Entry::CapGrant(_grant) => Ok(ValidateCallbackResult::Valid),
      Entry::App(_entry_bytes) => {
         let EntryType::App(app_entry_def) = creation_action.entry_type().clone()
            else { unreachable!() };
         let res = validate_app_entry(creation_action, app_entry_def.entry_index(), entry);
         res
      },
   };
   /// Done
   //debug!("*** validate_create_entry() result = {:?}", result);
   result
}


/// TODO: Checks Agent Link is created by self
pub fn validate_create_link(create_link: HoloHashed<CreateLink>, signature: Signature) -> ExternResult<ValidateCallbackResult>  {
   // debug!("validate_create_link(): {:?}", create_link);
   // /// Retrieve Path::Component from LinkTag
   // let tag_bytes = create_link.tag.clone().into_inner();
   // let unsafe_bytes = UnsafeBytes::from(tag_bytes.clone());
   // let ser_bytes = SerializedBytes::from(unsafe_bytes);
   // let maybe_component = Component::try_from(ser_bytes);
   // let Ok(component) = maybe_component else {
   //    return Ok(ValidateCallbackResult::Invalid("Failed to convert LinkTag to Component".to_string()))
   // };
   // /// Retrieve AgentPubKey from Component
   // let maybe_agent_key = AgentPubKey::from_raw_39(component.as_ref().to_vec());
   // //debug!("validate_agent_link(): agent_key = {:?}", maybe_agent_key);
   // /// Check key in LinkTag matches author and action signature
   // let Ok(agent_key) = maybe_agent_key else {
   //    /// TODO: Path root is also of type Agent but does not have the LinkTag, so skip for now.
   //    // return Ok(ValidateCallbackResult::Invalid("Failed to convert Component to AgentPubKey".to_string()))
   //    return Ok(ValidateCallbackResult::Valid);
   // };
   // if agent_key != create_link.author {
   //    return Ok(ValidateCallbackResult::Invalid("Link Author and Tag don't match".to_string()))
   // }
   // let success = verify_signature(agent_key, signature, Action::CreateLink(create_link.content))?;
   // Ok(if !success {
   //    ValidateCallbackResult::Invalid("Failed to verify signature".to_string())
   // } else {
   //    ValidateCallbackResult::Valid
   // })
   Ok(ValidateCallbackResult::Valid)
}