use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub api_endpoint: String,
    pub api_key_header: String,
    pub prompt_cost_per_1k: f64,
    pub completion_cost_per_1k: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfigs {
    pub services: Vec<ServiceConfig>,
}

impl ServiceConfigs {
    pub fn new() -> Self {
        Self { services: Self::default_services() }
    }

    fn default_services() -> Vec<ServiceConfig> {
        vec![
            ServiceConfig {
                id: "openai".to_string(),
                name: "OpenAI".to_string(),
                display_name: "openai".to_string(),
                api_endpoint: "https://api.openai.com/v1/usage".to_string(),
                api_key_header: "Authorization".to_string(),
                prompt_cost_per_1k: 0.005,
                completion_cost_per_1k: 0.015,
            },
            ServiceConfig {
                id: "anthropic".to_string(),
                name: "Anthropic".to_string(),
                display_name: "anthropic".to_string(),
                api_endpoint: "https://api.anthropic.com/v1/messages".to_string(),
                api_key_header: "x-api-key".to_string(),
                prompt_cost_per_1k: 0.003,
                completion_cost_per_1k: 0.015,
            },
            ServiceConfig {
                id: "cohere".to_string(),
                name: "Cohere".to_string(),
                display_name: "cohere".to_string(),
                api_endpoint: "https://api.cohere.ai/v1/usage".to_string(),
                api_key_header: "Authorization".to_string(),
                prompt_cost_per_1k: 0.0015,
                completion_cost_per_1k: 0.002,
            },
            ServiceConfig {
                id: "google".to_string(),
                name: "Google".to_string(),
                display_name: "google".to_string(),
                api_endpoint: "https://generativelanguage.googleapis.com/v1beta/models".to_string(),
                api_key_header: "x-goog-api-key".to_string(),
                prompt_cost_per_1k: 0.00025,
                completion_cost_per_1k: 0.0005,
            },
            ServiceConfig {
                id: "mistral".to_string(),
                name: "Mistral".to_string(),
                display_name: "mistral".to_string(),
                api_endpoint: "https://api.mistral.ai/v1/users/batches".to_string(),
                api_key_header: "Authorization".to_string(),
                prompt_cost_per_1k: 0.0007,
                completion_cost_per_1k: 0.0007,
            },
        ]
    }

    fn get_config_path() -> Result<PathBuf, String> {
        let mut path = dirs::data_local_dir()
            .ok_or("Failed to get local data directory")?;
        path.push("token-tracker");
        fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
        path.push("services.json");
        Ok(path)
    }

    pub fn load() -> Result<Self, String> {
        let path = Self::get_config_path()?;
        
        if !path.exists() {
            let default = Self::new();
            default.save()?;
            return Ok(default);
        }

        let mut file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mut contents = String::new();
        file.read_to_string(&mut contents).map_err(|e| format!("Failed to read file: {}", e))?;

        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::get_config_path()?;
        let json = serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize: {}", e))?;
        
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&path)
            .map_err(|e| format!("Failed to create file: {}", e))?;
        
        file.write_all(json.as_bytes()).map_err(|e| format!("Failed to write: {}", e))
    }

    pub fn add_service(&mut self, config: ServiceConfig) -> Result<(), String> {
        if self.services.iter().any(|s| s.id == config.id) {
            return Err(format!("Service with id '{}' already exists", config.id));
        }
        self.services.push(config);
        Ok(())
    }

    pub fn remove_service(&mut self, id: &str) -> Result<(), String> {
        let index = self.services.iter().position(|s| s.id == id)
            .ok_or_else(|| format!("Service with id '{}' not found", id))?;
        self.services.remove(index);
        Ok(())
    }

    pub fn get_service(&self, id: &str) -> Option<&ServiceConfig> {
        self.services.iter().find(|s| s.id == id)
    }
}
