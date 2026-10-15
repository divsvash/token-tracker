import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import DailyUsageChart from "./components/DailyUsageChart";
import ContributionGraph from "./components/ContributionGraph";

interface TokenUsage {
  service: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_estimate: number;
  currency: string;
  period_start: string;
  period_end: string;
  last_updated: string;
}

interface ServiceConfig {
  id: string;
  name: string;
  display_name: string;
  api_endpoint: string;
  api_key_header: string;
  prompt_cost_per_1k: number;
  completion_cost_per_1k: number;
  hasKey?: boolean;
}

type OutputLine = { type: 'text'; content: string } | { type: 'chart'; component: React.ReactNode };

function App() {
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [output, setOutput] = useState<OutputLine[]>([
    { type: 'text', content: "Token Tracker" },
    { type: 'text', content: "Type 'help' for available commands" },
    { type: 'text', content: "" },
  ]);
  const [currentService, setCurrentService] = useState<string>("");
  const [addingService, setAddingService] = useState<boolean>(false);
  const [serviceStep, setServiceStep] = useState<number>(0);
  const [newService, setNewService] = useState<Partial<ServiceConfig>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadServices();
    loadStoredKeys();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function loadServices() {
    try {
      const loadedServices: ServiceConfig[] = await invoke("list_services");
      setServices(loadedServices);
    } catch (err) {
      addOutput(`Error loading services: ${err}`);
    }
  }

  async function loadStoredKeys() {
    try {
      const storedKeys: string[] = await invoke("get_all_stored_keys");
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          hasKey: storedKeys.includes(service.id),
        }))
      );
    } catch (err) {
      console.error("Failed to load stored keys:", err);
    }
  }

  function addOutput(text: string) {
    setOutput((prev) => [...prev, { type: 'text' as const, content: text }]);
  }

  function addChart(component: React.ReactNode) {
    setOutput((prev) => [...prev, { type: 'chart' as const, component }]);
  }

  async function handleCommand(input: string) {
    const command = input.trim().toLowerCase();
    const parts = command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    addOutput(`$ ${input}`);

    if (addingService) {
      await handleServiceInput(input);
      return;
    }

    switch (cmd) {
      case "help":
        addOutput("");
        addOutput("Available commands:");
        addOutput("  list              - List all services and their key status");
        addOutput("  add-service       - Add a new custom service (interactive)");
        addOutput("  remove-service <id> - Remove a custom service");
        addOutput("  set <service>     - Set API key for a service");
        addOutput("  get <service>     - Get token usage for a service");
        addOutput("  graph <service>   - Show usage graphs for a service");
        addOutput("  remove <service>  - Remove API key for a service");
        addOutput("  clear             - Clear the terminal");
        addOutput("  help              - Show this help message");
        addOutput("");
        break;

      case "list":
        addOutput("");
        addOutput("Services:");
        const storedKeys: string[] = await invoke("get_all_stored_keys");
        services.forEach((service) => {
          const status = storedKeys.includes(service.id) ? "[✓]" : "[ ]";
          addOutput(`  ${status} ${service.display_name} (${service.id})`);
        });
        addOutput("");
        break;

      case "add-service":
        setAddingService(true);
        setServiceStep(0);
        setNewService({});
        addOutput("Adding new service...");
        addOutput("Enter service ID (e.g., 'perplexity'):");
        break;

      case "remove-service":
        if (args.length === 0) {
          addOutput("Error: Please specify service ID");
          addOutput("Usage: remove-service <id>");
          return;
        }
        await removeService(args[0]);
        break;

      case "set":
        if (args.length === 0) {
          addOutput("Error: Please specify a service");
          addOutput("Usage: set <service>");
          return;
        }
        const serviceToSet = args[0];
        if (!services.find((s) => s.display_name === serviceToSet || s.id === serviceToSet)) {
          addOutput(`Error: Unknown service '${serviceToSet}'`);
          addOutput("Available services: " + services.map((s) => s.display_name).join(", "));
          return;
        }
        const serviceId = services.find((s) => s.display_name === serviceToSet || s.id === serviceToSet)?.id || serviceToSet;
        setCurrentService(serviceId);
        addOutput(`Enter API key for ${serviceToSet}:`);
        break;

      case "get":
        if (args.length === 0) {
          addOutput("Error: Please specify a service");
          addOutput("Usage: get <service>");
          return;
        }
        const serviceToGet = args[0];
        if (!services.find((s) => s.display_name === serviceToGet || s.id === serviceToGet)) {
          addOutput(`Error: Unknown service '${serviceToGet}'`);
          return;
        }
        const getId = services.find((s) => s.display_name === serviceToGet || s.id === serviceToGet)?.id || serviceToGet;
        await fetchUsage(getId);
        break;

      case "graph":
        if (args.length === 0) {
          addOutput("Error: Please specify a service");
          addOutput("Usage: graph <service>");
          return;
        }
        const serviceToGraph = args[0];
        if (!services.find((s) => s.display_name === serviceToGraph || s.id === serviceToGraph)) {
          addOutput(`Error: Unknown service '${serviceToGraph}'`);
          return;
        }
        const graphId = services.find((s) => s.display_name === serviceToGraph || s.id === serviceToGraph)?.id || serviceToGraph;
        await showGraphs(graphId);
        break;

      case "remove":
        if (args.length === 0) {
          addOutput("Error: Please specify a service");
          addOutput("Usage: remove <service>");
          return;
        }
        const serviceToRemove = args[0];
        if (!services.find((s) => s.display_name === serviceToRemove || s.id === serviceToRemove)) {
          addOutput(`Error: Unknown service '${serviceToRemove}'`);
          return;
        }
        const removeId = services.find((s) => s.display_name === serviceToRemove || s.id === serviceToRemove)?.id || serviceToRemove;
        await deleteKey(removeId);
        break;

      case "clear":
        setOutput([]);
        break;

      default:
        if (currentService) {
          await saveKey(currentService, input);
          setCurrentService("");
        } else {
          addOutput(`Error: Unknown command '${cmd}'`);
          addOutput("Type 'help' for available commands");
        }
    }
  }

  async function handleServiceInput(input: string) {
    switch (serviceStep) {
      case 0:
        setNewService({ ...newService, id: input });
        setServiceStep(1);
        addOutput("Enter service name (e.g., 'Perplexity AI'):");
        break;
      case 1:
        setNewService({ ...newService, name: input, display_name: input.toLowerCase().replace(/\s+/g, '') });
        setServiceStep(2);
        addOutput("Enter API endpoint (e.g., 'https://api.perplexity.ai/v1/usage'):");
        break;
      case 2:
        setNewService({ ...newService, api_endpoint: input });
        setServiceStep(3);
        addOutput("Enter API key header (e.g., 'Authorization' or 'x-api-key'):");
        break;
      case 3:
        setNewService({ ...newService, api_key_header: input });
        setServiceStep(4);
        addOutput("Enter prompt cost per 1K tokens (e.g., '0.01'):");
        break;
      case 4:
        const promptCost = parseFloat(input);
        if (isNaN(promptCost)) {
          addOutput("Error: Invalid number");
          setAddingService(false);
          return;
        }
        setNewService({ ...newService, prompt_cost_per_1k: promptCost });
        setServiceStep(5);
        addOutput("Enter completion cost per 1K tokens (e.g., '0.02'):");
        break;
      case 5:
        const completionCost = parseFloat(input);
        if (isNaN(completionCost)) {
          addOutput("Error: Invalid number");
          setAddingService(false);
          return;
        }
        setNewService({ ...newService, completion_cost_per_1k: completionCost });
        
        await invoke("add_service", {
          id: newService.id,
          name: newService.name,
          display_name: newService.display_name,
          api_endpoint: newService.api_endpoint,
          api_key_header: newService.api_key_header,
          prompt_cost_per_1k: newService.prompt_cost_per_1k,
          completion_cost_per_1k: newService.completion_cost_per_1k,
        });
        
        addOutput(`✓ Service '${newService.name}' added successfully`);
        setAddingService(false);
        setServiceStep(0);
        setNewService({});
        await loadServices();
        break;
    }
  }

  async function removeService(id: string) {
    setLoading(true);
    try {
      await invoke("remove_service", { id });
      addOutput(`✓ Service '${id}' removed`);
      await loadServices();
    } catch (err) {
      addOutput(`✗ Failed to remove service: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveKey(service: string, key: string) {
    setLoading(true);
    try {
      await invoke("save_api_key", { service, apiKey: key });
      addOutput(`✓ API key saved for ${service}`);
      await loadStoredKeys();
    } catch (err) {
      addOutput(`✗ Failed to save API key: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsage(service: string) {
    setLoading(true);
    addOutput(`Fetching usage for ${service}...`);
    try {
      const storedKey: string = await invoke("retrieve_api_key", { service });
      if (!storedKey) {
        addOutput(`✗ No API key found for ${service}`);
        addOutput(`Use 'set ${service}' to add an API key first`);
        return;
      }

      const usage: TokenUsage = await invoke("get_token_usage", {
        service,
        apiKey: storedKey,
      });

      addOutput("");
      addOutput(`=== ${usage.service} Usage ===`);
      addOutput(`Total Tokens:     ${usage.total_tokens.toLocaleString()}`);
      addOutput(`Prompt Tokens:    ${usage.prompt_tokens.toLocaleString()}`);
      addOutput(`Completion Tokens: ${usage.completion_tokens.toLocaleString()}`);
      addOutput(`Estimated Cost:   ${usage.cost_estimate.toFixed(4)} ${usage.currency}`);
      addOutput(`Period:           ${usage.period_start} to ${usage.period_end}`);
      addOutput(`Last Updated:     ${new Date(usage.last_updated).toLocaleString()}`);
      addOutput("");
    } catch (err) {
      addOutput(`✗ Failed to fetch usage: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function showGraphs(service: string) {
    setLoading(true);
    addOutput(`Loading graphs for ${service}...`);
    try {
      const dailyData: Array<[string, number]> = await invoke("get_daily_usage", { service, days: 30 });
      const contributionData: Array<[string, number]> = await invoke("get_contribution_data", { service, days: 84 });

      addChart(<DailyUsageChart data={dailyData.map(([date, tokens]) => ({ date, tokens }))} />);
      addChart(<ContributionGraph data={contributionData} />);
      addOutput("");
    } catch (err) {
      addOutput(`✗ Failed to load graphs: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteKey(service: string) {
    setLoading(true);
    try {
      await invoke("remove_api_key", { service });
      addOutput(`✓ API key removed for ${service}`);
      await loadStoredKeys();
    } catch (err) {
      addOutput(`✗ Failed to remove API key: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    handleCommand(apiKey);
    setApiKey("");
  }

  function getPrompt() {
    if (addingService) {
      const prompts = [
        "Enter service ID:",
        "Enter service name:",
        "Enter API endpoint:",
        "Enter API key header:",
        "Enter prompt cost per 1K:",
        "Enter completion cost per 1K:",
      ];
      return prompts[serviceStep];
    }
    if (currentService) {
      return `Enter key for ${currentService}> `;
    }
    return "$ ";
  }

  return (
    <div className="terminal">
      <div className="terminal-output" ref={outputRef}>
        {output.map((line, index) => (
          <div key={index}>
            {line.type === 'text' ? (
              <div className="terminal-line">{line.content}</div>
            ) : (
              line.component
            )}
          </div>
        ))}
        {loading && <div className="terminal-line loading">Loading...</div>}
      </div>
      <form className="terminal-input" onSubmit={handleSubmit}>
        <span className="prompt">{getPrompt()}</span>
        <input
          ref={inputRef}
          type={currentService ? "password" : "text"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={loading}
          autoFocus
        />
      </form>
    </div>
  );
}

export default App;
