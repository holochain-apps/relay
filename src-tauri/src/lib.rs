use holochain_types::prelude::AppBundle;
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use std::{collections::HashMap, time::SystemTime};
use tauri::{AppHandle, Listener, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig, WANNetworkConfig};

const APP_ID: &'static str = "relay";
const SIGNAL_URL: &'static str = "wss://signal.holo.host";
const BOOTSTRAP_URL: &'static str = "https://bootstrap.holo.host";

pub fn happ_bundle() -> anyhow::Result<AppBundle> {
    let bytes = include_bytes!("../../workdir/relay.happ");
    let bundle = AppBundle::decode(bytes)?;
    Ok(bundle)
}

use tauri::{Manager, Window};
// Create the command:
// This command must be async so that it doesn't run on the main thread.
#[tauri::command]
async fn close_splashscreen(window: Window) {
    #[cfg(desktop)]
    {
        // Close splashscreen
        window
            .get_webview_window("splashscreen")
            .expect("no window labeled 'splashscreen' found")
            .close()
            .unwrap();
        // Show main window
        window
            .get_webview_window("main")
            .expect("no window labeled 'main' found")
            .show()
            .unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        );
    
    #[cfg(mobile)]
    {
        use tauri_plugin_holochain_foreground_service_consumer::InstallAppRequestArgs;
        use tauri_plugin_holochain_foreground_service_consumer::HolochainForegroundServiceConsumerExt;

        builder = builder
            .plugin(tauri_plugin_sharesheet::init())
            .plugin(tauri_plugin_holochain_foreground_service_consumer::init())
    }

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_holochain::async_init(
                vec_to_locked(vec![]).expect("Can't build passphrase"),
                HolochainPluginConfig {
                    wan_network_config: wan_network_config(),
                    holochain_dir: holochain_dir(),
                },
            ))
            .setup(|app| {
                let handle = app.handle().clone();
                let handle_fail: AppHandle = app.handle().clone();
                app.handle()
                    .listen("holochain://setup-failed", move |_event| {
                        handle_fail.exit(1);
                    });
                app.handle()
                    .listen("holochain://setup-completed", move |_event| {
                        let handle = handle.clone();
                        tauri::async_runtime::spawn(async move {
                            setup(handle.clone()).await.expect("Failed to setup");
    
                            let mut window = handle
                                .holochain()
                                .expect("Failed to get holochain")
                                .main_window_builder(
                                    String::from("main"),
                                    false,
                                    Some(APP_ID.into()),
                                    None,
                                )
                                .await
                                .expect("Failed to build window");
    
                            window = window.title(String::from("Relay"));
                            window.build().expect("Failed to open main window");
    
                            // After it's done, close the splashscreen and display the main window
                            let splashscreen_window =
                                handle.get_webview_window("splashscreen").unwrap();
                            splashscreen_window.close().unwrap();
                        });
                    });
    
                Ok(())
            });
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Very simple setup for now:
// - On app start, list installed apps:
//   - If there are no apps installed, this is the first time the app is opened: install our hApp
//   - If there **are** apps:
//     - Check if it's necessary to update the coordinators for our hApp
//       - And do so if it is
//
// You can modify this function to suit your needs if they become more complex
async fn setup(handle: AppHandle) -> anyhow::Result<()> {
    let admin_ws = handle.holochain()?.admin_websocket().await?;

    let installed_apps = admin_ws
        .list_apps(None)
        .await
        .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

    if installed_apps.len() == 0 {
        // we do this because we don't want to join everybody into the same dht!
        let random_seed = format!(
            "{}",
            SystemTime::now().duration_since(UNIX_EPOCH)?.as_micros()
        );
        handle
            .holochain()?
            .install_app(
                String::from(APP_ID),
                happ_bundle()?,
                HashMap::new(),
                None,
                Some(random_seed),
            )
            .await?;
    } else {
        handle
            .holochain()?
            .update_app_if_necessary(String::from(APP_ID), happ_bundle()?)
            .await?;
    }
    // After set up we can be sure our app is installed and up to date, so we can just open it
    // handle
    //     .holochain()?
    //     .main_window_builder(
    //         String::from("main"),
    //         false,
    //         Some(String::from("relay")),
    //         None,
    //     )
    //     .await?
    //     .build()?;

    // Alternatively, you could just send an event that the splashscreen window listens to,
    // and then show a button that invokes the "close_splashcreen"
    // If so then move the code above "main_window_builder" to the "close_splashscreen" command
    // The event could be sent like this:
    // handle.emit("setup-completed", ())?;
    Ok(())
}

fn wan_network_config() -> Option<WANNetworkConfig> {
    // Resolved at compile time to be able to point to local services
    if tauri::is_dev() {
        None
    } else {
        Some(WANNetworkConfig {
            signal_url: url2::url2!("{}", SIGNAL_URL),
            bootstrap_url: url2::url2!("{}", BOOTSTRAP_URL),
        })
    }
}

fn holochain_dir() -> PathBuf {
    if tauri::is_dev() {
        #[cfg(target_os = "android")]
        {
            app_dirs2::app_root(
                app_dirs2::AppDataType::UserCache,
                &app_dirs2::AppInfo {
                    name: "{{app_name}}",
                    author: std::env!("CARGO_PKG_AUTHORS"),
                },
            )
            .expect("Could not get the UserCache directory")
        }
        #[cfg(not(target_os = "android"))]
        {
            let tmp_dir =
                tempdir::TempDir::new("relay").expect("Could not create temporary directory");

            // Convert `tmp_dir` into a `Path`, destroying the `TempDir`
            // without deleting the directory.
            let tmp_path = tmp_dir.into_path();
            tmp_path
        }
    } else {
        app_dirs2::app_root(
            app_dirs2::AppDataType::UserData,
            &app_dirs2::AppInfo {
                name: "relay",
                author: std::env!("CARGO_PKG_AUTHORS"),
            },
        )
        .expect("Could not get app root")
        .join("holochain")
    }
}

fn vec_to_locked(mut pass_tmp: Vec<u8>) -> std::io::Result<BufRead> {
    match BufWrite::new_mem_locked(pass_tmp.len()) {
        Err(e) => {
            pass_tmp.fill(0);
            Err(e.into())
        }
        Ok(p) => {
            {
                let mut lock = p.write_lock();
                lock.copy_from_slice(&pass_tmp);
                pass_tmp.fill(0);
            }
            Ok(p.to_read())
        }
    }
}
