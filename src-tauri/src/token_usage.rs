use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub service: String,
    pub total_tokens: u64,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub cost_estimate: f64,
    pub currency: String,
    pub period_start: String,
    pub period_end: String,
    pub last_updated: String,
}
