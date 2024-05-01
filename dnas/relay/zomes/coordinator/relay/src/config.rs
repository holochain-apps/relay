use hdk::prelude::*;
use relay_integrity::*;
#[hdk_extern]
pub fn create_config(config: Config) -> ExternResult<Record> {
    let config_hash = create_entry(&EntryTypes::Config(config.clone()))?;
    let record = get(config_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly created Config"
                .to_string())
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_latest_config(
    original_config_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_config_hash.clone(),
                LinkTypes::ConfigUpdates,
            )?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_config_hash = match latest_link {
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
        None => original_config_hash.clone(),
    };
    get(latest_config_hash, GetOptions::default())
}
#[hdk_extern]
pub fn get_original_config(
    original_config_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_config_hash, GetOptions::default())? else {
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
pub fn get_all_revisions_for_config(
    original_config_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_config(original_config_hash.clone())? else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_config_hash.clone(),
                LinkTypes::ConfigUpdates,
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
pub struct UpdateConfigInput {
    pub original_config_hash: ActionHash,
    pub previous_config_hash: ActionHash,
    pub updated_config: Config,
}
#[hdk_extern]
pub fn update_config(input: UpdateConfigInput) -> ExternResult<Record> {
    let updated_config_hash = update_entry(
        input.previous_config_hash.clone(),
        &input.updated_config,
    )?;
    create_link(
        input.original_config_hash.clone(),
        updated_config_hash.clone(),
        LinkTypes::ConfigUpdates,
        (),
    )?;
    let record = get(updated_config_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly updated Config"
                .to_string())
            ),
        )?;
    Ok(record)
}
