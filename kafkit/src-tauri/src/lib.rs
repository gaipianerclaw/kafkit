use std::sync::Arc;
use tauri::{Manager, Emitter};
use tauri_plugin_log::{Target, TargetKind, RotationStrategy, TimezoneStrategy};

mod commands;
mod connection_pool;
mod models;
mod services;
mod store;

#[cfg(test)]
mod models_tests;
#[cfg(test)]
mod services_tests;
#[cfg(test)]
mod store_tests;

use commands::*;
use services::{ConnectionManager, ConsumerService};
use store::ConfigStore;
use tokio::sync::Mutex;

pub struct AppState {
    pub connection_manager: Arc<ConnectionManager>,
    pub consumer_service: Arc<ConsumerService>,
    pub config_store: Arc<Mutex<ConfigStore>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    // 文件日志：按日期轮转，保留最近 7 天
                    Target::new(TargetKind::LogDir {
                        file_name: Some("kafkit".to_string()),
                    }),
                    // 控制台日志：开发时可见
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Stderr),
                ])
                .rotation_strategy(RotationStrategy::KeepAll)
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .build(),
        )
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // 记录应用启动日志
            log::info!("Kafkit application starting - version 1.0.5");
            log::debug!("Log directory: {:?}", app_handle.path().app_log_dir());
            
            let config_store = Arc::new(Mutex::new(ConfigStore::new(app_handle.clone())));
            let connection_manager = Arc::new(ConnectionManager::new());
            let consumer_service = Arc::new(ConsumerService::new(connection_manager.clone()));
            
            app.manage(AppState {
                connection_manager,
                consumer_service,
                config_store,
            });
            
            // Setup file drop handler for the main window
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::DragDrop(event) = event {
                        match event {
                            tauri::DragDropEvent::Drop { paths, .. } => {
                                let paths_vec: Vec<String> = paths.iter()
                                    .map(|p: &std::path::PathBuf| p.to_string_lossy().to_string())
                                    .collect();
                                let _ = window_clone.emit("tauri://file-drop", paths_vec);
                            }
                            tauri::DragDropEvent::Leave => {
                                let _ = window_clone.emit("tauri://file-drop-cancelled", ());
                            }
                            _ => {}
                        }
                    }
                });
            }
            
            // 开发模式下可通过快捷键手动打开开发者工具 (Cmd+Option+I on macOS, Ctrl+Shift+I on Windows/Linux)
            // 如需自动打开，取消下面注释：
            // #[cfg(debug_assertions)]
            // {
            //     let window = app.get_webview_window("main").unwrap();
            //     window.open_devtools();
            // }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Connection
            get_connections,
            get_connection,
            test_connection,
            create_connection,
            update_connection,
            delete_connection,
            // Connection Import/Export
            export_connections,
            import_connections,
            // Topic
            list_topics,
            get_topic_detail,
            create_topic,
            delete_topic,
            get_topic_configs,
            update_topic_configs,
            // Consumer
            start_consuming,
            stop_consuming,
            fetch_messages,
            // Producer
            produce_message,
            produce_batch,
            // Consumer Group
            list_consumer_groups,
            get_consumer_lag,
            reset_consumer_offset,
            // File
            read_file,
            save_to_file,
            append_to_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
