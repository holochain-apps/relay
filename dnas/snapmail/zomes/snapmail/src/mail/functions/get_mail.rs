use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;


#[derive(Shrinkwrap, Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GetMailOutput(pub Option<Result<InMail, OutMail>>);


/// Get InMail or OutMail struct in local source chain at address
#[hdk_extern]
//#[snapmail_api]
pub fn get_mail(ah: ActionHash) -> ExternResult<GetMailOutput>{
    std::panic::set_hook(Box::new(zome_panic_hook));
    //debug!("get_mail() START");
    return try_into_mail(ah);
}

/// Get InMail or OutMail at address
pub(crate) fn try_into_mail(ah: ActionHash) -> ExternResult<GetMailOutput> {
    /// Get Record at address
    // let record = match get_local(address) {
    //     Ok(record) => record,
    //     Err(_) => return Ok(GetMailOutput(None)),
    // };
    let record = match get(ah, GetOptions::network())? {
        Some(record) => record,
        None => return Ok(GetMailOutput(None)),
    };
    /// Check if it is an InMail
    let maybe_InMail: ExternResult<InMail> = get_typed_from_record(record.clone());
    if let Ok(inmail) = maybe_InMail {
        return Ok(GetMailOutput(Some(Ok(inmail))));
    }
    /// Check if it is an OutMail
    let maybe_OutMail: ExternResult<OutMail> = get_typed_from_record(record);
    if let Ok(outmail) = maybe_OutMail {
        return Ok(GetMailOutput(Some(Err(outmail))));
    }
    /// Something is wrong...
    debug!("try_into_mail(): Error. Item found but it is not a Mail!");
    Ok(GetMailOutput(None))
}
