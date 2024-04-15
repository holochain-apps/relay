#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]
#![allow(ill_formed_attribute_input)]

extern crate strum;
extern crate strum_macros;
#[macro_use] extern crate shrinkwraprs;

// FIXME update to latest hdk
//#[macro_use]
//extern crate snapmail_proc_macro;

#[cfg(not(target_arch = "wasm32"))]
pub mod api_error;

mod dm;
mod dm_protocol;
pub mod signal_protocol;
mod callbacks;
pub mod handle;
pub mod mail;
pub mod file;
pub mod create_entry;

pub use snapmail_model::*;
pub use dm::*;
pub use dm_protocol::*;
pub use signal_protocol::*;
pub use create_entry::*;
