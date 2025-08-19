# AI Agent VS Code Extension

This is the VS Code extension component of AI Agent Hub that provides seamless integration between VS Code and the MCP (Model Context Protocol) Hub for AI-powered coding workflows.

## Features

- **Chat Participants**: Three specialized AI assistants accessible via VS Code Chat
  - `@ai-agent.coding` - AI coding assistant for code generation and implementation
  - `@ai-agent.refactor` - Code refactoring and optimization assistant
  - `@ai-agent.requirements` - Requirements analysis and documentation assistant
- **Smart Context Collection**: Automatically gathers file content, language info, Git diffs, and project structure
- **MCP Integration**: Communicates with MCP Hub via stdio for workflow execution
- **Debug Panel**: Interactive panel for workflow history and prompt replay
- **Auto-trigger**: Optional automatic workflow triggering on file changes
- **Error Handling**: Comprehensive error handling with user-friendly feedback

## Prerequisites

1. **MCP Hub Server**: Ensure the MCP Hub server is running
   ```bash
   npx ai-agent-hub-mcp start
   ```

2. **AI Agent Presets**: Verify that YAML presets are properly configured in the MCP Hub

## Installation

1. Build the extension:
   ```bash
   npm run build
   ```

2. Install in VS Code:
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X)
   - Click "..." menu and select "Install from VSIX..."
   - Select the generated .vsix file

## Configuration

Configure the extension in VS Code settings (`Ctrl+,` → search "ai-agent"):

- `ai-agent.mcpEndpoint`: MCP Hub endpoint (default: stdio mode, no HTTP endpoint needed)
- `ai-agent.enableAutoTrigger`: Enable automatic workflow triggers on file changes (default: `false`)
- `ai-agent.defaultPreset`: Default preset for AI Agent workflows (default: `coding-with-ai`)
- `ai-agent.timeout`: Request timeout in milliseconds (default: `60000`)
- `ai-agent.enableDebugMode`: Enable debug mode for detailed logging (default: `false`)

## Commands

- `AI Agent: Trigger Coding Workflow` - Manually trigger coding workflow
- `AI Agent: Trigger Refactor Workflow` - Manually trigger refactor workflow  
- `AI Agent: Show Prompt Replay` - View prompt replay panel
- `AI Agent: Open Debug Panel` - Open the interactive debug panel

## Usage

### Chat Participants (Recommended)

1. **Open VS Code Chat**: Press `Ctrl+Alt+I` or click the chat icon
2. **Use AI Assistants**:
   - `@ai-agent.coding help me implement a function to calculate fibonacci numbers`
   - `@ai-agent.refactor optimize this code for better performance`
   - `@ai-agent.requirements analyze the requirements for this feature`

### Manual Triggers

1. **Command Palette**: Press `Ctrl+Shift+P` and search for "AI Agent"
2. **Context Menu**: Right-click in editor to access refactor workflow
3. **Auto-trigger**: Enable in settings to trigger on file changes

### Debug Panel

1. **Access**: Click the "AI Agent Hub" status bar item or use command palette
2. **Features**: View workflow history, replay prompts, and debug information

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Architecture

The extension follows this workflow:

1. **User Interaction**: Chat participants, commands, or auto-triggers
2. **Context Collection**: Gather file content, Git diff, project structure
3. **MCP Communication**: Send request to MCP Hub with context and preset
4. **AI Processing**: MCP Hub orchestrates AI agents for analysis, coding, testing
5. **Result Display**: Show results in chat, create files, or display in debug panel

## Troubleshooting

### Common Issues

1. **"Cannot connect to AI Agent Hub server"**
   - Ensure MCP Hub is running via `npx ai-agent-hub-mcp start`
   - Check `ai-agent.mcpEndpoint` setting
   - Verify firewall/network settings

2. **"AI Agent preset not found"**
   - Verify YAML presets exist in `packages/ai-mcp/presets/`
   - Check preset names match configuration
   - Restart MCP Hub server

3. **Chat participants not appearing**
   - Ensure VS Code version supports Chat API (1.80+)
   - Reload VS Code window
   - Check extension activation

### Debug Mode

Enable debug mode in settings to see detailed logs:
1. Set `ai-agent.enableDebugMode` to `true`
2. Open VS Code Developer Console (`Help` → `Toggle Developer Tools`)
3. Check Console tab for detailed logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
 
 MIT License - see LICENSE file for details