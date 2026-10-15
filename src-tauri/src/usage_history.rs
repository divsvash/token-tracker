use crate::token_usage::TokenUsage;
use chrono::{Utc, Duration};
use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    pub service: String,
    pub date: String,
    pub total_tokens: u64,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub cost_estimate: f64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageHistory {
    pub records: Vec<UsageRecord>,
}

impl UsageHistory {
    pub fn new() -> Self {
        Self { records: Vec::new() }
    }

    fn get_history_path() -> Result<PathBuf, String> {
        let mut path = dirs::data_local_dir()
            .ok_or("Failed to get local data directory")?;
        path.push("token-tracker");
        fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
        path.push("usage_history.json");
        Ok(path)
    }

    pub fn load() -> Result<Self, String> {
        let path = Self::get_history_path()?;
        
        if !path.exists() {
            return Ok(Self::new());
        }

        let mut file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mut contents = String::new();
        file.read_to_string(&mut contents).map_err(|e| format!("Failed to read file: {}", e))?;

        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::get_history_path()?;
        let json = serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize: {}", e))?;
        
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&path)
            .map_err(|e| format!("Failed to create file: {}", e))?;
        
        file.write_all(json.as_bytes()).map_err(|e| format!("Failed to write: {}", e))
    }

    pub fn add_record(&mut self, usage: &TokenUsage) {
        let now = Utc::now();
        let record = UsageRecord {
            service: usage.service.clone(),
            date: usage.period_start.clone(),
            total_tokens: usage.total_tokens,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            cost_estimate: usage.cost_estimate,
            timestamp: now.timestamp(),
        };

        self.records.push(record);
        self.records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Keep only last 365 days
        let cutoff = now - Duration::days(365);
        self.records.retain(|r| r.timestamp > cutoff.timestamp());
    }

    pub fn get_daily_usage(&self, service: &str, days: i64) -> Vec<(String, u64)> {
        let now = Utc::now();
        let mut result = Vec::new();

        for i in (0..days).rev() {
            let date = (now - Duration::days(i)).format("%Y-%m-%d").to_string();
            let day_total: u64 = self.records
                .iter()
                .filter(|r| r.service == service && r.date == date)
                .map(|r| r.total_tokens)
                .sum();
            result.push((date, day_total));
        }

        result
    }

    pub fn get_contribution_data(&self, service: &str, days: i64) -> Vec<(String, u64)> {
        let now = Utc::now();
        let mut result = Vec::new();

        for i in (0..days).rev() {
            let date = (now - Duration::days(i)).format("%Y-%m-%d").to_string();
            let day_total: u64 = self.records
                .iter()
                .filter(|r| r.service == service && r.date == date)
                .map(|r| r.total_tokens)
                .sum();
            result.push((date, day_total));
        }

        result
    }
}
