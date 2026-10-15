use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "token-tracker";

pub fn store_api_key(service: &str, api_key: &str) -> Result<(), KeyringError> {
    let entry = Entry::new(SERVICE_NAME, service)?;
    entry.set_password(api_key)
}

pub fn get_api_key(service: &str) -> Result<String, KeyringError> {
    let entry = Entry::new(SERVICE_NAME, service)?;
    entry.get_password()
}

pub fn delete_api_key(service: &str) -> Result<(), KeyringError> {
    let entry = Entry::new(SERVICE_NAME, service)?;
    entry.delete_credential()
}

pub fn list_stored_keys() -> Result<Vec<String>, KeyringError> {
    let services = vec!["openai", "anthropic", "cohere", "google", "mistral"];
    let mut keys = Vec::new();
    
    for service in services {
        let entry = Entry::new(SERVICE_NAME, service)?;
        if entry.get_password().is_ok() {
            keys.push(service.to_string());
        }
    }
    
    Ok(keys)
}
