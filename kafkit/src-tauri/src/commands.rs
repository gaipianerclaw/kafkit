use crate::models::*;
use crate::AppState;
use tauri::State;

type Result<T> = std::result::Result<T, AppError>;

#[tauri::command]
pub async fn get_connections(state: State<'_, AppState>) -> Result<Vec<ConnectionSummary>> {
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    
    Ok(connections.into_iter().map(|c| ConnectionSummary {
        id: c.id,
        name: c.name,
        bootstrap_servers: c.bootstrap_servers,
        auth_type: match c.auth {
            AuthConfig::None => "none".to_string(),
            AuthConfig::SaslPlain { .. } => "saslPlain".to_string(),
            AuthConfig::SaslScram { .. } => "saslScram".to_string(),
            AuthConfig::SaslGssapi { .. } => "saslGssapi".to_string(),
            AuthConfig::Ssl { .. } => "ssl".to_string(),
        },
        is_connected: false, // TODO: 实现连接状态检测
    }).collect())
}

#[tauri::command]
pub async fn get_connection(
    id: String,
    state: State<'_, AppState>,
) -> Result<Connection> {
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    connections.into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::ConnectionNotFound(id))
}

#[tauri::command]
pub async fn test_connection(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<ConnectionTestResult> {
    println!("[Kafkit] Testing connection to: {}", config.bootstrap_servers);
    
    match state.connection_manager.test_connection(&config).await {
        Ok(_) => {
            println!("[Kafkit] Connection test successful");
            Ok(ConnectionTestResult {
                success: true,
                message: format!("成功连接到 {}", config.bootstrap_servers),
                details: Some({
                    let mut map = std::collections::HashMap::new();
                    map.insert("servers".to_string(), serde_json::json!(config.bootstrap_servers));
                    map
                }),
            })
        }
        Err(e) => {
            println!("[Kafkit] Connection test failed: {:?}", e);
            Ok(ConnectionTestResult {
                success: false,
                message: e.to_string(),
                details: None,
            })
        }
    }
}

#[tauri::command]
pub async fn create_connection(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<Connection> {
    println!("[Kafkit] Creating connection: name={}, servers={}", config.name, config.bootstrap_servers);
    
    let store = state.config_store.lock().await;
    match store.create_connection(config).await {
        Ok(conn) => {
            println!("[Kafkit] Connection created successfully: id={}", conn.id);
            Ok(conn)
        }
        Err(e) => {
            println!("[Kafkit] Failed to create connection: {:?}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn update_connection(
    id: String,
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<Connection> {
    // 先删除旧连接
    {
        let store = state.config_store.lock().await;
        store.delete_connection(&id).await?;
    }
    
    // 创建新连接
    let store = state.config_store.lock().await;
    let mut connection = store.create_connection(config).await?;
    connection.id = id; // 保持原 ID
    Ok(connection)
}

#[tauri::command]
pub async fn delete_connection(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let store = state.config_store.lock().await;
    store.delete_connection(&id).await?;
    state.connection_manager.close_connection(&id).await;
    Ok(())
}

#[tauri::command]
pub async fn list_topics(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TopicInfo>> {
    println!("[Kafkit] list_topics called for connection: {}", connection_id);
    
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    let connection = connections.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id.clone()))?;
    
    println!("[Kafkit] Found connection: {} -> {:?}", connection_id, connection.bootstrap_servers);
    
    match state.connection_manager.list_topics(&connection).await {
        Ok(topics) => {
            println!("[Kafkit] Successfully fetched {} topics", topics.len());
            Ok(topics)
        }
        Err(e) => {
            println!("[Kafkit] Failed to list topics: {:?}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_topic_detail(
    connection_id: String,
    topic: String,
    state: State<'_, AppState>,
) -> Result<TopicDetail> {
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    let connection = connections.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;
    
    state.connection_manager.get_topic_detail(&connection, &topic).await
}

#[tauri::command]
pub async fn create_topic(
    connection_id: String,
    name: String,
    num_partitions: i32,
    replication_factor: i32,
    _configs: Option<std::collections::HashMap<String, String>>,
    state: State<'_, AppState>,
) -> Result<()> {
    println!("[Kafkit] Creating topic: {} with {} partitions", name, num_partitions);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 创建 topic
    state.connection_manager.create_topic(
        &connection,
        &name,
        num_partitions,
        replication_factor,
    ).await
}

#[tauri::command]
pub async fn delete_topic(
    connection_id: String,
    topic: String,
    state: State<'_, AppState>,
) -> Result<()> {
    println!("[Kafkit] Deleting topic: {}", topic);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 删除 topic
    state.connection_manager.delete_topic(&connection, &topic).await
}

#[tauri::command]
pub async fn start_consuming(
    connection_id: String,
    topic: String,
    partition: Option<i32>,
    start_offset: OffsetSpec,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<String> {
    println!("[Kafkit] Start consuming from topic: {:?}", topic);
    
    // 获取连接信息
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    let connection = connections.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;
    
    // 启动消费者
    state.consumer_service.start_consuming(
        &connection,
        &topic,
        partition,
        start_offset,
        window,
    ).await
}

#[tauri::command]
pub async fn stop_consuming(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    println!("[Kafkit] Stop consuming session: {}", session_id);
    state.consumer_service.stop_consuming(&session_id).await
}

#[tauri::command]
pub async fn fetch_messages(
    _connection_id: String,
    topic: String,
    partition: i32,
    offset: i64,
    _limit: i32,
    _state: State<'_, AppState>,
) -> Result<serde_json::Value> {
    println!("[Kafkit] Fetch messages from {} partition {} offset {}", topic, partition, offset);
    // TODO: 实现真实的消息获取
    Ok(serde_json::json!({
        "messages": [],
        "total": 0
    }))
}

#[tauri::command]
pub async fn produce_message(
    connection_id: String,
    topic: String,
    message: ProduceMessage,
    state: State<'_, AppState>,
) -> Result<ProduceResult> {
    println!("[Kafkit] Producing message to topic: {}", topic);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 发送消息
    state.connection_manager.produce_message(&connection, &topic, message).await
}

#[tauri::command]
pub async fn produce_batch(
    connection_id: String,
    topic: String,
    messages: Vec<ProduceMessage>,
    options: BatchProduceOptions,
    state: State<'_, AppState>,
) -> Result<BatchProduceResult> {
    println!("[Kafkit] Producing {} messages to topic: {}", messages.len(), topic);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 批量发送消息
    state.connection_manager.produce_batch(&connection, &topic, messages, Some(options)).await
}

#[tauri::command]
pub async fn list_consumer_groups(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ConsumerGroupInfo>> {
    println!("[Kafkit] Listing consumer groups");
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 获取消费组列表
    state.connection_manager.list_consumer_groups(&connection).await
}

#[tauri::command]
pub async fn get_consumer_lag(
    connection_id: String,
    group_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PartitionLag>> {
    println!("[Kafkit] Getting consumer lag for group: {}", group_id);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 获取消费延迟
    state.connection_manager.get_consumer_lag(&connection, &group_id).await
}

#[tauri::command]
pub async fn reset_consumer_offset(
    connection_id: String,
    group_id: String,
    topic: String,
    partition: Option<i32>,
    reset_to: OffsetResetSpec,
    state: State<'_, AppState>,
) -> Result<Vec<PartitionOffsetResult>> {
    println!("[Kafkit] Resetting offset for group: {}", group_id);
    
    // 获取连接信息
    let connection = {
        let store = state.config_store.lock().await;
        let connections = store.get_connections().await?;
        connections.into_iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
    };
    
    // 重置 offset
    state.connection_manager.reset_consumer_offset(&connection, &group_id, &topic, partition, &reset_to).await
}

#[tauri::command]
pub async fn save_to_file(
    file_path: String,
    content: String,
) -> Result<()> {
    println!("[Kafkit] Saving to file: {}", file_path);
    std::fs::write(&file_path, content)
        .map_err(|e| AppError::Other(format!("Failed to write file: {}", e)))?;
    Ok(())
}

#[tauri::command]
pub async fn append_to_file(
    file_path: String,
    content: String,
) -> Result<()> {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| AppError::Other(format!("Failed to open file: {}", e)))?;
    file.write_all(content.as_bytes())
        .map_err(|e| AppError::Other(format!("Failed to append to file: {}", e)))?;
    Ok(())
}

// ================= 连接配置导入导出 =================

#[tauri::command]
pub async fn export_connections(
    file_path: String,
    connection_ids: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<usize> {
    println!("[Kafkit] Exporting connections to: {}", file_path);
    
    let store = state.config_store.lock().await;
    let connections = store.get_connections().await?;
    
    // 如果指定了连接ID列表，则只导出这些连接
    let connections_to_export: Vec<Connection> = match connection_ids {
        Some(ids) => connections.into_iter()
            .filter(|c| ids.contains(&c.id))
            .collect(),
        None => connections,
    };
    
    let export_count = connections_to_export.len();
    
    // 构建导出数据结构
    #[derive(serde::Serialize)]
    struct ExportData {
        version: String,
        export_time: String,
        connections: Vec<Connection>,
    }
    
    let export_data = ExportData {
        version: "1.0".to_string(),
        export_time: chrono::Utc::now().to_rfc3339(),
        connections: connections_to_export,
    };
    
    let content = serde_json::to_string_pretty(&export_data)
        .map_err(|e| AppError::Other(format!("Failed to serialize connections: {}", e)))?;
    
    std::fs::write(&file_path, content)
        .map_err(|e| AppError::Other(format!("Failed to write export file: {}", e)))?;
    
    println!("[Kafkit] Exported {} connections", export_count);
    Ok(export_count)
}

#[tauri::command]
pub async fn import_connections(
    file_path: String,
    skip_existing: Option<bool>,
    state: State<'_, AppState>,
) -> Result<ImportResult> {
    use std::collections::HashSet;
    
    println!("[Kafkit] Importing connections from: {}", file_path);
    
    // 读取文件内容
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| AppError::Other(format!("Failed to read import file: {}", e)))?;
    
    // 解析导入数据
    #[derive(serde::Deserialize)]
    struct ImportData {
        #[allow(dead_code)]
        version: Option<String>,
        #[allow(dead_code)]
        export_time: Option<String>,
        connections: Vec<Connection>,
    }
    
    let import_data: ImportData = serde_json::from_str(&content)
        .map_err(|e| AppError::Other(format!("Invalid import file format: {}", e)))?;
    
    // 获取现有连接的名称集合（用于去重检查）
    let store = state.config_store.lock().await;
    let existing_connections = store.get_connections().await?;
    let existing_names: HashSet<String> = existing_connections
        .iter()
        .map(|c| c.name.clone())
        .collect();
    
    drop(store); // 释放锁，后续操作需要重新获取
    
    let skip_existing = skip_existing.unwrap_or(true);
    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();
    
    for mut conn in import_data.connections {
        // 检查是否已存在同名连接
        if skip_existing && existing_names.contains(&conn.name) {
            println!("[Kafkit] Skipping existing connection: {}", conn.name);
            skipped += 1;
            continue;
        }
        
        // 生成新ID，避免与现有连接冲突
        conn.id = uuid::Uuid::new_v4().to_string();
        conn.created_at = chrono::Utc::now().to_rfc3339();
        conn.updated_at = chrono::Utc::now().to_rfc3339();
        
        // 转换为 ConnectionConfig
        let config = ConnectionConfig {
            name: conn.name.clone(),
            bootstrap_servers: conn.bootstrap_servers.join(","),
            auth: conn.auth,
            security: conn.security,
            options: conn.options,
        };
        
        // 创建连接
        let store = state.config_store.lock().await;
        match store.create_connection(config).await {
            Ok(_) => {
                println!("[Kafkit] Imported connection: {}", conn.name);
                imported += 1;
            }
            Err(e) => {
                println!("[Kafkit] Failed to import connection {}: {:?}", conn.name, e);
                errors.push(format!("{}: {}", conn.name, e));
            }
        }
    }
    
    println!("[Kafkit] Import complete: {} imported, {} skipped, {} errors", 
             imported, skipped, errors.len());
    
    Ok(ImportResult {
        imported,
        skipped,
        errors,
    })
}

#[derive(serde::Serialize)]
pub struct ImportResult {
    imported: usize,
    skipped: usize,
    errors: Vec<String>,
}
