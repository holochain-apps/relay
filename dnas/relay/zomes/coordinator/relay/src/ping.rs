use hdk::prelude::*;

#[hdk_extern]
pub fn ping(_: ()) -> ExternResult<()> {
  Ok(())
}