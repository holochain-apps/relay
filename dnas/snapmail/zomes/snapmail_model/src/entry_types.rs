
use hdi::prelude::*;

use crate::*;

#[hdk_entry_types]
#[unit_enum(SnapmailEntryTypes)]
pub enum SnapmailEntry {
    #[entry_type(required_validations = 2, visibility = "public")]
    PubEncKey(PubEncKey),
    #[entry_type(required_validations = 2, visibility = "public")]
    Handle(Handle),
    #[entry_type(required_validations = 2, visibility = "private")]
    InMail(InMail),
    #[entry_type(required_validations = 2, visibility = "private")]
    OutMail(OutMail),
    #[entry_type(required_validations = 2, visibility = "private")]
    OutAck(OutAck),
    #[entry_type(required_validations = 2, visibility = "private")]
    InAck(InAck),
    #[entry_type(required_validations = 2, visibility = "public")]
    PendingMail(PendingMail),
    #[entry_type(required_validations = 2, visibility = "public")]
    PendingAck(PendingAck),
    #[entry_type(required_validations = 2, visibility = "private")]
    DeliveryConfirmation(DeliveryConfirmation),
    #[entry_type(required_validations = 2, visibility = "private")]
    FileChunk(FileChunk),
    #[entry_type(required_validations = 2, visibility = "private")]
    FileManifest(FileManifest),
}


///
pub fn entry_index_to_variant(entry_index: EntryDefIndex) -> ExternResult<SnapmailEntryTypes> {
    let mut i = 0;
    for variant in SnapmailEntryTypes::iter() {
        if i == entry_index.0 {
            return Ok(variant);
        }
        i += 1;
    }
    return Err(wasm_error!(format!("Unknown EntryDefIndex: {}", entry_index.0)));
}


/// Dispatch validate function call
pub(crate) fn validate_app_entry(
    _creation_action: EntryCreationAction,
    entry_index: EntryDefIndex,
    entry: Entry,
) -> ExternResult<ValidateCallbackResult>
{
    let variant = entry_index_to_variant(entry_index)?;
    return match variant {
        SnapmailEntryTypes::PubEncKey => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::Handle => Handle::try_from(entry)?.validate(),
        SnapmailEntryTypes::InMail => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::OutMail => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::OutAck => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::InAck => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::PendingMail => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::PendingAck => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::DeliveryConfirmation => Ok(ValidateCallbackResult::Valid),
        SnapmailEntryTypes::FileChunk => FileChunk::try_from(entry)?.validate(),
        SnapmailEntryTypes::FileManifest => FileManifest::try_from(entry)?.validate(),
        //_ => Ok(ValidateCallbackResult::Valid),
    }
}