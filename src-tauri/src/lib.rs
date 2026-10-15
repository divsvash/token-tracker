mod token_usage;
mod api_integrations;
mod key_storage;
mod usage_history;
mod service_config;

use token_usage::TokenUsage;
use api_integrations::fetch_usage_custom;
use key_storage::{store_api_key, get_api_key, delete_api_key, list_stored_keys};
use usage_history::UsageHistory;
use service_config::{ServiceConfig, ServiceConfigs};

#[tauri::command]
async fn get_token_usage(service: String, api_key: String) -> Result<TokenUsage, String> {
    let configs = ServiceConfigs::load().map_err(|e| e.to_string())?;
    let config = configs.get_service(&service)
        .ok_or_else(|| format!("Service '{}' not found", service))?;

    let usage = fetch_usage_custom(config, &api_key).await?;
    
    // Save to history
    let mut history = UsageHistory::load().unwrap_or_else(|_| UsageHistory::new());
    history.add_record(&usage);
    let _ = history.save();

    Ok(usage)
}

#[tauri::command]
async fn save_api_key(service: String, api_key: String) -> Result<(), String> {
    store_api_key(&service, &api_key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn retrieve_api_key(service: String) -> Result<String, String> {
    get_api_key(&service).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_api_key(service: String) -> Result<(), String> {
    delete_api_key(&service).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_stored_keys() -> Result<Vec<String>, String> {
    list_stored_keys().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_daily_usage(service: String, days: i64) -> Result<Vec<(String, u64)>, String> {
    let history = UsageHistory::load().map_err(|e| e.to_string())?;
    Ok(history.get_daily_usage(&service, days))
}

#[tauri::command]
async fn get_contribution_data(service: String, days: i64) -> Result<Vec<(String, u64)>, String> {
    let history = UsageHistory::load().map_err(|e| e.to_string())?;
    Ok(history.get_contribution_data(&service, days))
}

#[tauri::command]
async fn list_services() -> Result<Vec<ServiceConfig>, String> {
    let configs = ServiceConfigs::load().map_err(|e| e.to_string())?;
    Ok(configs.services)
}

#[tauri::command]
async fn add_service(
    id: String,
    name: String,
    display_name: String,
    api_endpoint: String,
    api_key_header: String,
    prompt_cost_per_1k: f64,
    completion_cost_per_1k: f64,
) -> Result<(), String> {
    let mut configs = ServiceConfigs::load().map_err(|e| e.to_string())?;
    
    let config = ServiceConfig {
        id,
        name,
        display_name,
        api_endpoint,
        api_key_header,
        prompt_cost_per_1k,
        completion_cost_per_1k,
    };
    
    configs.add_service(config)?;
    configs.save().map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_service(id: String) -> Result<(), String> {
    let mut configs = ServiceConfigs::load().map_err(|e| e.to_string())?;
    configs.remove_service(&id)?;
    configs.save().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_token_usage,
            save_api_key,
            retrieve_api_key,
            remove_api_key,
            get_all_stored_keys,
            get_daily_usage,
            get_contribution_data,
            list_services,
            add_service,
            remove_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
