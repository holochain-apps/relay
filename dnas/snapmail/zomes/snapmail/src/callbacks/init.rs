use hdk::prelude::*;
#[allow(unused_imports)]
use snapmail_model::*;

use crate::{
   dm::*,
};


///
#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
   debug!("*** init() callback START");
   /// Set Global Anchors
   //let typed_path = path.clone().into_typed(ScopedLinkType::try_from(LinkTypes::Tree)?);
   let path = Path::from(DIRECTORY_ANCHOR).typed(SnapmailLink::Members)?;
   path.ensure()?;
   /// Setup initial capabilities
   init_caps(())?;
   //PubEncKey::create_and_share()?;
   /// Done
   debug!("*** init() callback DONE");
   Ok(InitCallbackResult::Pass)
}


///
fn init_caps(_: ()) -> ExternResult<()> {
   let mut fns = BTreeSet::new();
   fns.insert((zome_info()?.name, REMOTE_ENDPOINT.into()));
   create_cap_grant(
      CapGrantEntry {
         tag: "".into(),
         access: ().into(), // empty access converts to unrestricted
         functions: GrantedFunctions::Listed(fns),
      }
   )?;
   Ok(())
}
