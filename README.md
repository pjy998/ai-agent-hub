# AI Agent Hub

**Language**: [English](#) | [中文](./README_CN.md)

> AI Agent Hub is a powerful VS Code extension that enhances Copilot Chat with structured, multi-step AI workflows for professional development. It transforms simple chat interactions into sophisticated coding assistants through configurable YAML presets, intelligent context collection, and transparent workflow execution.

🚀 **Current Version**: 0.0.9 (MVP - PoC Validation)

## 🎯 Project Goals

**Enhance Copilot Chat AI programming experience for developers**

- **Structured Workflows**: Define complex multi-step AI programming processes through YAML presets
- **Intelligent Context**: Automatically collect project context for better AI code understanding
- **Transparent & Controllable**: Complete Prompt replay and debugging panels to track every AI reasoning step
- **Automated Triggers**: Auto-start workflows on file save, code selection, or chat input
- **Multi-Agent Collaboration**: Professional agents like coder, tester, requirements working together

## 📐 System Architecture

```mermaid
flowchart TD
    subgraph "Developer Operations"
        A[Save File]
        B[Select Text]
        C[Copilot Chat with ai]
    end
    
    subgraph "VS Code Extension Layer"
        D[TriggerListener]
        E[ContextCollector]
        F[FlowDispatcher]
    end
    
    subgraph "MCP Hub Runtime"
        G[FlowRunner]
        H[PromptEngine]
        I[ModelRouter]
        J[AgentManager]
    end
    
    K[CopilotChat]
    
    subgraph "VS Code UI & Insertion"
        L[Insert Code/Tests]
        M[Output Panel]
        N[Prompt Replay UI]
    end
    
    A -->|onSave| D
    B -->|onSelection| D
    C -->|ai input| D
    D -->|collect context| E
    E -->|dispatch preset| F
    F -->|POST /mcp/run| G
    G -->|execute steps| H
    H -->|route to model| I
    I -->|forward to Copilot Chat| F
    F -->|send prompt| K
    K -->|reply| F
    F -->|return reply| I
    I -->|store replay| H
    H -->|step completed| G
    G -->|return results| L
    G -->|return results| M
    G -->|return results| N
```

### ⏱ Example Sequence Diagram (Save File Trigger)

```plantuml
@startuml
participant User
participant "VSCode\nExtension" as VSCode
participant "Trigger\nListener" as Trigger
participant "Context\nCollector" as Context
participant "Flow\nDispatcher" as Dispatcher
participant "MCP\nHub" as MCP
participant "Flow\nRunner" as Runner
participant "Prompt\nEngine" as Prompt
participant "Model\nRouter" as Router
participant "Copilot\nChat" as Copilot
participant "VSCode\nUI" as UI

User -> VSCode: Save File (Ctrl+S)
VSCode -> Trigger: detect onFileSave
Trigger -> Context: collect(file, language, git_diff)
Context -> Dispatcher: dispatch("coding-with-ai", context)
Dispatcher -> MCP: POST /mcp/run { preset: "coding-with-ai", context }
MCP -> Runner: loadPreset("coding-with-ai.yaml")

note over Runner, Prompt: Step 1: Requirements Clarification
Runner -> Prompt: step1: clarify
Prompt -> Router: route(model="copilot-gpt-4.1")
Router -> VSCode: forward prompt to Copilot Chat
VSCode -> Copilot: sendPrompt(clarify_prompt)
Copilot -> VSCode: reply(JSON: { clarified, questions })
VSCode -> Router: return reply
Router -> Prompt: storeReplay(step1, prompt, reply)
Prompt -> Runner: step1 completed

note over Runner, Prompt: Step 2: Code Generation
Runner -> Prompt: step2: coding
Prompt -> Router: route(model="copilot-gpt-4.1")
Router -> VSCode: forward prompt
VSCode -> Copilot: sendPrompt(code_prompt)
Copilot -> VSCode: reply(Markdown: code)
VSCode -> Router: return reply
Router -> Prompt: storeReplay(step2, prompt, reply)
Prompt -> Runner: step2 completed

note over Runner, Prompt: Step 3: Test Generation
Runner -> Prompt: step3: test
Prompt -> Router: route(model="copilot-gpt-4.1")
Router -> VSCode: forward prompt
VSCode -> Copilot: sendPrompt(test_prompt)
Copilot -> VSCode: reply(Markdown: tests)
VSCode -> Router: return reply
Router -> Prompt: storeReplay(step3, prompt, reply)
Prompt -> Runner: step3 completed

Runner -> VSCode: return { code, tests }
VSCode -> UI: insertCode(code, file)
VSCode -> UI: showResults(tests, output_panel)
VSCode -> UI: showReplay(step1, step2, step3)
@enduml
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- VS Code >= 1.80.0
- MCP CLI (`npm install -g ai-mcp`)
- Copilot Chat GPT-4.1 API key (configured in VS Code or environment variables)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pjy998/ai-agent-hub.git
   cd ai-agent-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and start:
   ```bash
   npm run build
   cd packages/ai-agent
   npm run start
   ```

### Usage

- **Chat Trigger**: Enter `ai coding` or `ai requirements` in Copilot Chat.
- **Save Trigger**: Save a file to run `coding-with-ai.yaml`.
- **Selection Trigger**: Select code and trigger `refactor.yaml` via right-click.
- **Prompt Replay**: View logs in `~/.ai-agent-hub/replay/`.

## 🛠️ Core Features (0.0.1)

### 🎯 **Copilot Chat Enhancement Features**
- **Smart Triggers**: Auto-start workflows on file save, code selection, and ai chat
- **Context Enhancement**: Automatically collect file content, Git diffs, project structure, and other contextual information
- **Structured Conversations**: Transform simple chats into multi-step professional programming dialogues

### 🔧 **Workflow Engine**
- **YAML Preset System**: Configurable multi-step AI workflow definitions
- **Multi-Agent Collaboration**: Professional agents for coder, tester, and requirements analysis
- **Process Orchestration**: Advanced flow control including sequential execution, conditional branching, and parallel processing

### 📊 **Transparency & Debugging**
- **Prompt Replay**: Complete recording of every AI interaction step
- **Debug Panel**: Visualize workflow execution status and results
- **Performance Monitoring**: Track token usage and response times

### 📦 **Preset Workflows**
- **coding-with-ai.yaml**: Requirements clarification → Code generation → Test writing
- **refactor.yaml**: Code analysis → Refactoring suggestions → Test validation
- **requirements-analysis.yaml**: Requirements breakdown → Technical solution → Implementation plan

## 🆚 **Comparison with Regular Copilot Chat**

| Feature | Regular Copilot Chat | AI Agent Hub |
|---------|---------------------|-------------|
| **Interaction** | Single Q&A | Multi-step structured workflows |
| **Context Understanding** | Current file | Project-level context + Git diffs |
| **Specialization** | General AI assistant | Professional coding agent collaboration |
| **Workflow** | Manual guidance | Automated triggering and execution |
| **Transparency** | Black box operation | Complete Prompt replay and debugging |
| **Customization** | Fixed patterns | Flexible YAML-configured workflows |
| **Quality Assurance** | User-dependent validation | Built-in test generation and validation |
| **Learning Curve** | Learn as you go | Configure once, benefit long-term |

### 🎯 **Use Cases**

**Use Regular Copilot Chat when you need:**
- Quick code snippet generation
- Simple question answering
- Temporary code explanation

**Use AI Agent Hub when you need:**
- Complete feature development (requirements → code → tests)
- Large-scale code refactoring
- Standardized AI workflows for team collaboration
- Traceable AI decision processes
- Enterprise-grade code quality assurance

## 📂 Project Structure

```
ai-agent-hub/
├─ packages/
│  ├─ ai-agent/             # VS Code extension
│  │   ├─ package.json
│  │   ├─ src/
│  │   │   └─ extension.ts
│  │   ├─ extension-config.json
│  │   └─ README.md
│  └─ ai-mcp/               # MCP CLI tool
│      ├─ package.json
│      ├─ src/
│      │   └─ index.ts
│      └─ README.md
├─ agents/
│  └─ presets/
│      ├─ coding-with-ai.yaml
│      ├─ refactor.yaml
│      └─ requirements-analysis.yaml
├─ package.json
├─ README.md
├─ roadmap.md
└─ LICENSE
```

## 🤝 Contributing

See `roadmap.md` for priorities. Fork, branch (`feature/your-feature`), and submit PRs. Report issues or discuss new features on GitHub Issues.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/pjy998/ai-agent-hub)
- [Issues](https://github.com/pjy998/ai-agent-hub/issues)
- [Roadmap](roadmap.md)