# Token Tracker

A compact terminal-style desktop application for monitoring AI token usage across multiple services with visual graphs and custom service support.

## Features

- **Terminal Interface**: Command-line style interface for quick interactions
- **Multi-Service Support**: Track usage for OpenAI, Anthropic, Cohere, Google AI, and Mistral
- **Custom Services**: Add your own AI services through terminal commands
- **Secure API Key Storage**: Keys stored in system keyring (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- **Real-time Usage Data**: Fetch token counts, costs, and breakdown by prompt/completion tokens
- **Visual Graphs**: 
  - Daily usage line chart (last 30 days)
  - GitHub-style contribution graph (last 12 weeks)
- **Historical Tracking**: Automatically stores usage history locally
- **Compact Design**: Small panel that occupies minimal screen space
- **Dark Theme**: Black background with white text and blue graphs

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust and Cargo
- Tauri CLI

### Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:
```bash
npm run tauri dev
```

### Building

Build for production:
```bash
npm run tauri build
```

## Usage

The terminal interface supports the following commands:

### Commands

- `help` - Show available commands
- `list` - List all services and their API key status
- `add-service` - Add a new custom service (interactive wizard)
- `remove-service <id>` - Remove a custom service
- `set <service>` - Set API key for a service
- `get <service>` - Fetch token usage for a service
- `graph <service>` - Show usage graphs for a service
- `remove <service>` - Remove API key for a service
- `clear` - Clear the terminal output

### Adding Custom Services

Use the `add-service` command to add custom AI services:

```
$ add-service
Adding new service...
Enter service ID (e.g., 'perplexity'): perplexity
Enter service name (e.g., 'Perplexity AI'): Perplexity AI
Enter API endpoint (e.g., 'https://api.perplexity.ai/v1/usage'): https://api.perplexity.ai/v1/usage
Enter API key header (e.g., 'Authorization' or 'x-api-key'): Authorization
Enter prompt cost per 1K tokens (e.g., '0.01'): 0.01
Enter completion cost per 1K tokens (e.g., '0.02'): 0.02
✓ Service 'Perplexity AI' added successfully
```

### Example Usage

```
$ list
Services:
  [ ] openai (openai)
  [✓] anthropic (anthropic)
  [ ] cohere (cohere)
  [ ] google (google)
  [ ] mistral (mistral)

$ set openai
Enter API key for openai: sk-...
✓ API key saved for openai

$ get openai
Fetching usage for openai...
=== OpenAI Usage ===
Total Tokens:     1,234,567
Prompt Tokens:    987,654
Completion Tokens: 246,913
Estimated Cost:   6.1734 USD
Period:           2026-10-15 to 2026-10-15
Last Updated:     10/15/2026, 11:59:59 PM

$ graph openai
Loading graphs for openai...
[Displays daily usage chart and contribution graph]
```

## Security

- API keys stored using system's secure credential manager
- Keys never logged or transmitted except to respective AI service APIs
- Application runs locally on your machine
- Usage history stored locally in JSON format

## API Key Sources

- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Cohere: https://dashboard.cohere.com/api-keys
- Google AI: https://makersuite.google.com/app/apikey
- Mistral: https://console.mistral.ai/

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Backend**: Rust + Tauri 2
- **HTTP Client**: reqwest
- **Secure Storage**: keyring
- **Charts**: Recharts
- **Build Tool**: Vite

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
