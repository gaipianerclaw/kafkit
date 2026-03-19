use crate::models::{AppError, Connection, ConnectionConfig};
use serde::{Deserialize, Serialize};

use tauri::{AppHandle, Manager};

const CONFIG_FILE: &str = "connections.json";

#[derive(Debug, Serialize, Deserialize)]
struct StoredConnections {
    version: String,
    connections: Vec<Connection>,
}

pub struct ConfigStore {
    app_handle: AppHandle,
    connections: std::sync::Mutex<Vec<Connection>>,
}

impl ConfigStore {
    pub fn new(app_handle: AppHandle) -> Self {
        let connections = Self::load_from_disk(&app_handle).unwrap_or_default();
        Self {
            app_handle,
            connections: std::sync::Mutex::new(connections),
        }
    }

    fn load_from_disk(app_handle: &AppHandle) -> Result<Vec<Connection>, AppError> {
        let app_dir: std::path::PathBuf = app_handle.path().app_config_dir()
            .map_err(|e| AppError::StoreError(format!("{:?}", e)))?;
        
        std::fs::create_dir_all(&app_dir).map_err(|e| AppError::StoreError(e.to_string()))?;
        
        let config_path = app_dir.join(CONFIG_FILE);
        
        if !config_path.exists() {
            return Ok(vec![]);
        }

        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| AppError::StoreError(e.to_string()))?;
        
        let stored: StoredConnections = serde_json::from_str(&content)
            .map_err(|e| AppError::StoreError(e.to_string()))?;
        
        Ok(stored.connections)
    }

    fn save_to_disk(&self) -> Result<(), AppError> {
        let app_dir: std::path::PathBuf = self.app_handle.path().app_config_dir()
            .map_err(|e| AppError::StoreError(format!("{:?}", e)))?;
        
        let config_path = app_dir.join(CONFIG_FILE);
        
        let connections = self.connections.lock().map_err(|_| {
            AppError::StoreError("Lock poisoned".to_string())
        })?;
        
        let stored = StoredConnections {
            version: "1.0".to_string(),
            connections: connections.clone(),
        };
        
        let content = serde_json::to_string_pretty(&stored)
            .map_err(|e| AppError::StoreError(e.to_string()))?;
        
        std::fs::write(&config_path, content)
            .map_err(|e| AppError::StoreError(e.to_string()))?;
        
        Ok(())
    }

    pub async fn get_connections(&self) -> Result<Vec<Connection>, AppError> {
        let connections = self.connections.lock().map_err(|_| {
            AppError::StoreError("Lock poisoned".to_string())
        })?;
        Ok(connections.clone())
    }

    pub async fn create_connection(&self, config: ConnectionConfig) -> Result<Connection, AppError> {
        let connection = Connection {
            id: uuid::Uuid::new_v4().to_string(),
            name: config.name,
            bootstrap_servers: config.bootstrap_servers.split(',').map(|s| s.trim().to_string()).collect(),
            auth: config.auth,
            security: config.security,
            options: config.options,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        {
            let mut connections = self.connections.lock().map_err(|_| {
                AppError::StoreError("Lock poisoned".to_string())
            })?;
            connections.push(connection.clone());
        }
        
        self.save_to_disk()?;
        Ok(connection)
    }

    pub async fn delete_connection(&self, id: &str) -> Result<(), AppError> {
        {
            let mut connections = self.connections.lock().map_err(|_| {
                AppError::StoreError("Lock poisoned".to_string())
            })?;
            connections.retain(|c| c.id != id);
        }
        
        self.save_to_disk()?;
        Ok(())
    }
}
