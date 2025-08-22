# Dynamic Configuration Generation Example

## Overview
This example demonstrates how to use the new dynamic configuration generation feature with the `@ai-agent.config` chat participant.

## Basic Commands

### 1. Generate Configuration for Current Project
```
@ai-agent.config generate
```
This will automatically detect your project language and generate an appropriate analysis configuration.

### 2. List Available Language Templates
```
@ai-agent.config list
```
Shows all supported languages: C#, Java, Python, JavaScript, TypeScript, Vue.js, Go, Rust

### 3. Detect Project Language
```
@ai-agent.config detect
```
Analyzes your project structure to identify the primary programming language.

### 4. Generate Custom Configuration
```
@ai-agent.config custom "Create a configuration for React TypeScript project with focus on performance and accessibility"
```
Uses Copilot Chat AI to generate a tailored configuration based on your specific requirements.

### 5. Validate Configuration
```
@ai-agent.config validate path/to/config.yaml
```
Validates the structure and content of a YAML configuration file.

### 6. Test Configuration
```
@ai-agent.config test path/to/config.yaml
```
Runs comprehensive tests on the configuration to ensure it works correctly.

## Example Workflow

1. **Start a new project analysis:**
   ```
   @ai-agent.config detect
   ```
   Output: "Detected primary language: TypeScript (Vue.js framework)"

2. **Generate configuration:**
   ```
   @ai-agent.config generate
   ```
   Output: Creates `vue-analysis-config.yaml` with Vue.js-specific analysis rules

3. **Customize for specific needs:**
   ```
   @ai-agent.config custom "Add security checks for Vue.js components and API calls"
   ```
   Output: Enhanced configuration with security-focused analysis steps

4. **Validate the result:**
   ```
   @ai-agent.config validate vue-analysis-config.yaml
   ```
   Output: Validation report with any issues or confirmations

## Generated Configuration Features

- **Multi-step Analysis**: Code quality, security, performance checks
- **Language-specific Rules**: Tailored to your programming language
- **Customizable Templates**: Modify analysis steps based on project needs
- **Integration Ready**: Works seamlessly with existing AI Agent Hub workflows

## Tips

- Use `@ai-agent.config help` for detailed command information
- Generated configurations are saved in your project's `agents/presets` directory
- You can manually edit generated YAML files for fine-tuning
- Use the validation feature before deploying configurations to production