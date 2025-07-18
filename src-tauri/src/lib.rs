// Define the command within the library crate
#[tauri::command]
fn get_os() -> String {
    std::env::consts::OS.to_string()
}

// Import the Manager trait and OS plugin

// use tauri::Manager;
use tauri_plugin_os;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .setup(|_app| {
        //     #[cfg(debug_assertions)] // Only open devtools in debug builds
        //     {
        //         if let Some(window) = _app.get_webview_window("main") {
        //             window.open_devtools();
        //             println!("Devtools opened successfully");
        //         } else {
        //             println!("Warning: Could not find main window to open devtools");
        //         }
        //     }
        //     Ok(())
        // })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // Now use the function directly as it's in the same scope
            get_os
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
