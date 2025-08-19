# AI MCP (Multi-agent Coordination Platform)

The MCP component provides the runtime engine for executing AI workflows defined in YAML presets.

## Features

- **Flow Runner**: Executes multi-step workflows from YAML presets
- **Prompt Engine**: Handles prompt templating and context injection
- **Model Router**: Routes requests to appropriate AI models (Copilot Chat GPT-4.1)
- **Agent Manager**: Manages different agent types (coder, tester, requirements)
- **Replay System**: Logs all interactions for debugging and transparency

## Installation

```bash
# Install globally
npm install -g ai-mcp

# Or install locally
npm install
npm run build
```

## Usage

### Start MCP Hub Server

```bash
# Start on default port 3000
ai-mcp start

# Start on custom port
ai-mcp start --port 8080
```

### List Available Presets

```bash
ai-mcp list
```

### API Endpoints

- `POST /mcp/run` - Execute a workflow
- `GET /mcp/presets` - List available presets
- `GET /health` - Health check

### Example API Usage

```bash
curl -X POST http://localhost:3000/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "preset": "coding-with-ai",
    "context": {
      "file": "src/example.ts",
      "language": "typescript",
      "selection": "function example() { }"
    }
  }'
```

## Preset Configuration

Presets are defined in YAML format in the `agents/presets/` directory:

```yaml
name: my-workflow
description: Custom workflow description
agents:
  - coder
  - tester

steps:
  - name: step1
    agent: coder
    prompt: |
      Your prompt template here.
      Context: {{file}}
      Code: {{selection}}
    output: result1
    
  - name: step2
    agent: tester
    prompt: |
      Generate tests for: {{result1}}
    output: tests
```

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test