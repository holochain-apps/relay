use hdk::prelude::*;
use relay_integrity::*;
// use chrono::{DateTime, Utc, Datelike};
// use crate::utils::*;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageInput {
    pub message: Message,
    pub agents: Vec<AgentPubKey>,
}

#[hdk_extern]
pub fn create_message(input: SendMessageInput) -> ExternResult<Record> {
    let message_hash = create_entry(&EntryTypes::Message(input.message.clone()))?;
    let record = get(message_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly created Message"
                .to_string())
            ),
        )?;
    // let now: DateTime<Utc> = Utc::now();
    // let year = now.year();
    // let month = now.month();
    // let week = now.iso_week().week();
    // let formatted_date = format!("{}/{}/{}", year, month, week);
    // let path = Path::from(formatted_date);
    // create_link_relaxed(
    //     path.path_entry_hash()?,
    //     AnyLinkableHash::try_from(record.action_address().clone())?,
    //     LinkTypes::MessageBlock,
    //     (),
    // )?;
    let path = Path::from("all_messages");
    let link = create_link(
        path.path_entry_hash()?,
        message_hash.clone(),
        LinkTypes::AllMessages,
        (),
    )?;

    // TODO: handle errors. look for ack, try again on fail
    let _ = send_remote_signal(
        MessageRecord {
            message: Some(Message {
                content: input.message.content,
                images: input.message.images,
            }),
            original_action: message_hash.clone(),
            signed_action: record.signed_action().clone()
        },
        input.agents,
    );

    debug!("create message all messages link: {:?}", link);
    Ok(record)
}

// pub struct MessageBlock {
//     week: String,
//     count: u32,
//     hashes: SignedActionHashed,
// }

// pub struct GetMessageHashesForWeekInput {
//     pub week: String,
//     pub message_count_already_loaded: u8,
// }
// #[hdk_extern]
// pub fn get_messages_hashes_for_week(
//     input: GetMessageHashesForWeekInput,
// ) -> ExternResult<MessageBlock> {
//     let weekString = input.week;
//     if (weekString.is_empty()) {
//         let now: DateTime<Utc> = Utc::now();
//         let year = now.year();
//         let month = now.month();
//         let week = now.iso_week().week();
//         weekString = format!("{}/{}/{}", year, month, week);
//     }
//     let path = Path::from(weekString);
//     //let links = get_links(path.path_entry_hash()?, LinkTypes::MessageBlock, None)?;
//     let links = get_links(
//         GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::MessageBlock)?
//             .build(),
//     );
//     let mut results = Vec::new();
//     for l in links {
//         let hash = ActionHash::try_from(l.target).map_err(|e| wasm_error!(e))?;
//         if let Some(r) = get_latest_message(hash)? {
//             results.push(r);
//         }
//     }
//     Ok(results)
// }

#[hdk_extern]
pub fn get_all_messages(_: ()) -> ExternResult<Vec<Link>> {
    let path = Path::from("all_messages");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllMessages)?
            .build(),
    )?;
    Ok(links)
}

#[derive(Serialize, Deserialize, Debug)]
struct GetAgenProfileInput {
    agent_key: AgentPubKey,
}

#[hdk_extern]
pub fn get_all_message_entries(_: ()) -> ExternResult<Vec<MessageRecord>> {
    let links = get_all_messages(())?;
    let mut results: Vec<MessageRecord> = Vec::new();
    for l in links {
        let hash  = ActionHash::try_from(l.target).map_err(|e|wasm_error!(e))?;
        if let Some(r) = get_latest_message(hash)? {
            // TODO: make a call to the profiles zome to get the agent profile
            // TODO: why did i think this was necessary ??
            // let call_input = GetAgenProfileInput {
            //     agent_key: r.signed_action.hashed.author().clone(),
            // };
            // let agent = call(
            //     CallTargetCell::Local,
            //     "profiles",
            //     "get_agent_profile".into(),
            //     None,
            //     call_input,
            // );
            // if let ZomeCallResponse::Ok(response) = call(CallTargetCell::Local,"profiles",FunctionName::new("get_agent_profile"), None, call_input)? {
            //     let agent : Record<Profile> = response.decode().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not decode agent profile"))))?;
            //     // let me = agent_info()?.agent_latest_pubkey;
            //     //let agents = agents.into_iter().filter(|a| a != &me).collect();
            //     debug!("agent {:?}", agent);
            //     r.message.unwrap().author_name = agent;
            // }

            results.push (r);
        }
    }

    Ok(results)
}

#[hdk_extern]
pub fn get_latest_message(
    original_message_hash: ActionHash,
) -> ExternResult<Option<MessageRecord>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_message_hash.clone(),
                LinkTypes::MessageUpdates,
            )?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_message_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(
                    wasm_error!(
                        WasmErrorInner::Guest("No action hash associated with link"
                        .to_string())
                    ),
                )?
        }
        None => original_message_hash.clone(),
    };
    // get(latest_message_hash, GetOptions::default())
    match get(latest_message_hash, GetOptions::default())? {
        Some(record) => {
            Ok(Some(MessageRecord {
                original_action: original_message_hash,
                signed_action: record.signed_action().clone(),
                message: record.entry().to_app_option().map_err(|e| wasm_error!(e))?,
            }))
        },
        None => Ok(None)
    }
}

#[hdk_extern]
pub fn get_original_message(
    original_message_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_message_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest("Malformed get details response".to_string())
                ),
            )
        }
    }
}
#[hdk_extern]
pub fn get_all_revisions_for_message(
    original_message_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_message(original_message_hash.clone())?
    else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_message_hash.clone(),
                LinkTypes::MessageUpdates,
            )?
            .build(),
    )?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| Ok(
            GetInput::new(
                link
                    .target
                    .into_action_hash()
                    .ok_or(
                        wasm_error!(
                            WasmErrorInner::Guest("No action hash associated with link"
                            .to_string())
                        ),
                    )?
                    .into(),
                GetOptions::default(),
            ),
        ))
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().flatten().collect();
    records.insert(0, original_record);
    Ok(records)
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateMessageInput {
    pub original_message_hash: ActionHash,
    pub previous_message_hash: ActionHash,
    pub updated_message: Message,
}
#[hdk_extern]
pub fn update_message(input: UpdateMessageInput) -> ExternResult<Record> {
    let updated_message_hash = update_entry(
        input.previous_message_hash.clone(),
        &input.updated_message,
    )?;
    create_link(
        input.original_message_hash.clone(),
        updated_message_hash.clone(),
        LinkTypes::MessageUpdates,
        (),
    )?;
    let record = get(updated_message_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly updated Message"
                .to_string())
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_message(original_message_hash: ActionHash) -> ExternResult<ActionHash> {
    let details = get_details(original_message_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("{pascal_entry_def_name} not found".to_string())
            ),
        )?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest("Malformed get details response".to_string())
                ),
            )
        }
    }?;
    let path = Path::from("all_messages");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllMessages)?
            .build(),
    )?;
    for link in links {
        if let Some(hash) = link.target.into_action_hash() {
            if hash.eq(&original_message_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    delete_entry(original_message_hash)
}
#[hdk_extern]
pub fn get_all_deletes_for_message(
    original_message_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_message_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Entry(_) => {
            Err(wasm_error!(WasmErrorInner::Guest("Malformed details".into())))
        }
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}
#[hdk_extern]
pub fn get_oldest_delete_for_message(
    original_message_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_message(original_message_hash)? else {
        return Ok(None);
    };
    deletes
        .sort_by(|delete_a, delete_b| {
            delete_a.action().timestamp().cmp(&delete_b.action().timestamp())
        });
    Ok(deletes.first().cloned())
}
