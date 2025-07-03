// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// The get_os function has been moved to lib.rs

fn main() {
    // Call the library function which sets up and runs the app
    habistat_lib::run()
}
