# secure# 🔐 Secure Code Assistant

A VS Code extension that provides multi-agent AI-powered security analysis and code fixes using Semgrep static analysis and Google Gemini AI.

## Features

### 🔍 Real-time Security Analysis
- **Automatic scanning** on file save using Semgrep static analysis
- **Instant feedback** with security issues highlighted in your code
- **Severity classification** (High, Medium, Low) with color-coded diagnostics

### 🤖 AI-Powered Explanations
- **Detailed explanations** of security issues using Google Gemini AI
- **Hover tooltips** with context-aware security advice
- **CWE mapping** for standardized vulnerability classification

### ⚡ One-Click Security Fixes
- **Quick fix suggestions** for common security issues
- **Automatic code replacement** for hardcoded secrets, SQL injection patterns, and more
- **Immediate re-scanning** after fixes are applied

### 📝 Enhanced Prompt Generation
- **Security-aware prompt enhancement** using predetermined security checklists
- **OWASP-based recommendations** integrated into your development workflow
- **Context-aware suggestions** for secure coding practices

### 📊 Security Reporting
- **Comprehensive security reports** in Markdown format
- **Auto-triage functionality** with issue prioritization
- **Executive summaries** with actionable recommendations

## Requirements

### Prerequisites
1. **Semgrep**: Install the static analysis tool
   ```bash
   pip3 install semgrep
   ```

2. **Google Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### System Requirements
- VS Code 1.104.0 or higher
- Node.js (for extension development)
- Python 3.x (for Semgrep)

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile the extension: `npm run compile`
4. Press `F5` to launch the extension in a new VS Code window

## Configuration

Configure the extension through VS Code settings:

### Extension Settings

* `secureAssistant.enableReviewer`: Enable/disable automatic security code review (default: `true`)
* `secureAssistant.autoApplyFix`: Auto-apply security fixes policy
  - `never`: Never auto-apply fixes
  - `prompt`: Ask before applying fixes (default)
  - `auto`: Automatically apply fixes
* `secureAssistant.scanOnSave`: Run security scan when files are saved (default: `true`)
* `secureAssistant.severityThreshold`: Minimum severity threshold for showing issues
  - `Low`: Show all issues
  - `Medium`: Show medium and high severity issues (default)
  - `High`: Show only high severity issues
* `secureAssistant.geminiApiKey`: Your Google Gemini API key for AI-powered explanations

### Setting up Gemini API Key

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open VS Code Settings (`Cmd/Ctrl + ,`)
3. Search for "Secure Assistant"
4. Enter your API key in the "Gemini Api Key" field

## Commands

Access these commands via the Command Palette (`Cmd/Ctrl + Shift + P`):

- **Enhance Prompt (SecureAssistant)**: Enhance your development prompts with security requirements
- **Generate Security Report**: Create a comprehensive security report for your workspace
- **Toggle Security Reviewer**: Enable/disable the security reviewer

## Usage

### Basic Workflow

1. **Open a code file** - The extension automatically activates
2. **Save your file** - Semgrep analysis runs automatically
3. **Review security issues** - Issues appear in the Problems panel and are highlighted in your code
4. **Get explanations** - Hover over highlighted issues for AI-powered explanations
5. **Apply quick fixes** - Click the lightbulb icon or use `Cmd/Ctrl + .` for quick fixes
6. **Generate reports** - Use the command palette to create security reports

### Advanced Features

#### Prompt Enhancement
Use the "Enhance Prompt" command to automatically add security considerations to your development prompts before using other AI coding assistants.

#### Custom Security Reports
Generate detailed reports that include:
- Executive summary of security posture
- Categorized issues by severity
- Specific remediation steps
- CWE mappings for compliance

## Architecture

The extension follows a multi-agent architecture:

- **Coordinator**: Central state management and status tracking
- **Code Reviewer Agent**: Semgrep integration and diagnostics management
- **Prompt Enrichment Agent**: AI-powered prompt enhancement with security checklists
- **Documenter Agent**: Report generation and auto-triage functionality

## Security Checklist

The extension uses a predetermined security checklist based on OWASP guidelines:

1. Input validation and output encoding
2. Parameterized queries (SQL injection prevention)
3. Authentication & authorization checks (RBAC)
4. Avoid hardcoded secrets (use environment variables)
5. Use TLS for transport
6. Rate limiting and brute-force protections
7. Proper error handling (no information leakage)
8. Dependency version checks (no known CVEs)
9. Logging & auditability (avoid logging secrets)
10. Safe deserialization practices

## Known Issues

- **Semgrep Installation**: The extension requires Semgrep to be installed separately
- **API Rate Limits**: Google Gemini API has usage limits that may affect AI explanations
- **Large Files**: Analysis may be slower on very large files

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-repo/secure-code-assistant.git
cd secure-code-assistant

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Package the extension
npx vsce package
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Release Notes

### 0.0.1

- Initial release of Secure Code Assistant
- Multi-agent architecture with Semgrep and Gemini AI integration
- Real-time security analysis and quick fixes
- AI-powered explanations and prompt enhancement
- Comprehensive security reporting

---

**Stay Secure! 🔐**

For support and feature requests, please visit our [GitHub repository](https://github.com/your-repo/secure-code-assistant).-assistant README

This is the README for your extension "secure-code-assistant". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
