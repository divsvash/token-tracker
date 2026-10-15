use crate::token_usage::TokenUsage;
use crate::service_config::ServiceConfig;
use chrono::Utc;
use serde_json::Value;

pub async fn fetch_usage_custom(config: &ServiceConfig, api_key: &str) -> Result<TokenUsage, String> {
    let client = reqwest::Client::new();
    
    let mut request = client.get(&config.api_endpoint);
    
    // Add API key header
    if config.api_key_header.to_lowercase() == "authorization" {
        request = request.header("Authorization", format!("Bearer {}", api_key));
    } else if config.api_key_header.to_lowercase() == "x-api-key" {
        request = request.header("x-api-key", api_key);
    } else if config.api_key_header.to_lowercase() == "x-goog-api-key" {
        request = request.query(&[("key", api_key)]);
    } else {
        request = request.header(&config.api_key_header, api_key);
    }
    
    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch usage: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error ({}): {}", status, error_text));
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Try to extract token usage from various possible response formats
    let total_tokens = extract_total_tokens(&data);
    let prompt_tokens = extract_prompt_tokens(&data);
    let completion_tokens = extract_completion_tokens(&data);
    
    // Calculate cost using service-specific rates
    let cost_estimate = calculate_cost(prompt_tokens, completion_tokens, config);

    Ok(TokenUsage {
        service: config.name.clone(),
        total_tokens,
        prompt_tokens,
        completion_tokens,
        cost_estimate,
        currency: "USD".to_string(),
        period_start: Utc::now().format("%Y-%m-%d").to_string(),
        period_end: Utc::now().format("%Y-%m-%d").to_string(),
        last_updated: Utc::now().to_rfc3339(),
    })
}

fn extract_total_tokens(data: &Value) -> u64 {
    data["total_usage"]
        .as_u64()
        .or_else(|| data["totalTokens"].as_u64())
        .or_else(|| data["usage"].as_array().and_then(|arr| {
            arr.iter().filter_map(|item| item["tokens"].as_u64().or(item["n_tokens"].as_u64())).sum::<u64>().into()
        }))
        .or_else(|| data["data"].as_array().and_then(|arr| {
            arr.iter().filter_map(|item| item["n_tokens"].as_u64()).sum::<u64>().into()
        }))
        .unwrap_or(0)
}

fn extract_prompt_tokens(data: &Value) -> u64 {
    data["prompt_tokens"]
        .as_u64()
        .or_else(|| data["promptTokens"].as_u64())
        .or_else(|| data["usage"]["input_tokens"].as_u64())
        .or_else(|| data["usage"]["prompt_tokens"].as_u64())
        .unwrap_or(0)
}

fn extract_completion_tokens(data: &Value) -> u64 {
    data["completion_tokens"]
        .as_u64()
        .or_else(|| data["completionTokens"].as_u64())
        .or_else(|| data["usage"]["output_tokens"].as_u64())
        .or_else(|| data["usage"]["completion_tokens"].as_u64())
        .unwrap_or(0)
}

fn calculate_cost(prompt_tokens: u64, completion_tokens: u64, config: &ServiceConfig) -> f64 {
    (prompt_tokens as f64 / 1000.0) * config.prompt_cost_per_1k + 
    (completion_tokens as f64 / 1000.0) * config.completion_cost_per_1k
}
