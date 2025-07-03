# Tauri & Rust Backend Rules

- **Tauri:** Use Tauri for building the desktop application. Configure the application in `tauri.conf.json`.
- **Rust:** Write the backend logic in Rust. Follow Rust best practices for performance, safety, and concurrency.
- **Commands:** Expose Rust functions to the frontend using Tauri commands.
- **State Management:** Manage application state in Rust and expose it to the frontend as needed.
- **Error Handling:** Use Rust's `Result` and `Option` types for robust error handling.
- **Crates:** Use external crates from `crates.io` for additional functionality. Ensure they are properly licensed and maintained.
