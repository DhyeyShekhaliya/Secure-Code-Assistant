# 🔐 Secure Code Assistant

An opinionated VS Code extension providing real‑time static security scanning (Semgrep) plus AI‑assisted (Gemini) explanations, reporting, and security‑aware prompt enhancement (prompt only – no code generation). Built for fast feedback, minimal noise, and secure-by-default developer workflows.

## Features

### 🔍 Real‑Time Static Analysis (Semgrep)
- Automatic scan on save (configurable)
- Inline diagnostics with severity coloring (High / Medium / Low)
- Custom ruleset focused on:
  - Hardcoded secrets & credentials
  - SQL injection string‑concat patterns
  - Insecure randomness (Math.random)
  - DOM XSS sinks (innerHTML / document.write)
  - Missing auth patterns in Express style routes
  - Vulnerable dependency versions (express / lodash / deprecated libs) in package manifests (JSON)
  - Additional credential patterns in JSON/YAML config

### 🤖 AI-Powered Explanations (Gemini)
- On-hover enriched security reasoning (severity normalization + CWE if available)
- Robust JSON parsing with fallback heuristic explanations (never leaves you with “AI unavailable” silently)
- Caches explanations per issue signature to reduce API calls

### ⚡ One‑Click (Selective) Fixes
- Quick Fix entries for supported detectable patterns (e.g., obvious secret literals)
- Metrics captured for applied fixes (success/failure)
- Triggers re-scan to validate remediation

### 📝 Security Prompt Enhancement (Prompt‑Only Mode)
- Enhances your natural language prompt with targeted security requirements
- Strictly returns a single enhanced prompt 
- Guardrails strip accidental code fences / code tokens
- Fallback deterministic template if AI unavailable

### 📊 Security Reporting
- AI-enriched Markdown report (if API key configured) or deterministic fallback report
- Summaries + grouped issues + remediation recommendations
- Generated as `SECURITY_REPORT.md` in workspace

## Requirements

### External Tools
| Component | Purpose | Install |
|----------|---------|---------|
| Semgrep  | Static security rules engine | `pip install semgrep` |
| Google Gemini API Key (optional) | AI explanations & prompt enhancement | https://aistudio.google.com/app/apikey |

### Runtime
- VS Code ≥ 1.104.0
- Node.js (build/extension host)
- Python 3.x (Semgrep CLI)

## Installation (Developer)
```bash
git clone <your-fork-or-repo>
cd secure-code-assistant
npm install
npm run compile
```
Launch the extension: Press F5 (Extension Development Host).

## Configuration

Configure the extension through VS Code settings:

### Extension Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `secureAssistant.enableReviewer` | Master on/off for scanning + diagnostics | `true` |
| `secureAssistant.autoApplyFix` | Auto apply quick fixes (`never` \| `prompt` \| `auto`) | `prompt` |
| `secureAssistant.scanOnSave` | Run Semgrep automatically on save | `true` |
| `secureAssistant.severityThreshold` | Minimum severity to surface (`Low`/`Medium`/`High`) | `Medium` |
| `secureAssistant.geminiApiKey` | Gemini API key (enables AI features) | *(unset)* |

### Configure Gemini API Key
1. Get a key at https://aistudio.google.com/app/apikey  
2. Command Palette → “Secure Code Assistant: Configure Gemini API Key”  
3. (Alt) Add to settings.json:  
   ```json
   {
     "secureAssistant.geminiApiKey": "Yourkey..."
   }
   ```
4. Or create a `.env` file with `GOOGLE_GENERATIVE_AI_API_KEY=YOUR_KEY`

## Commands

Access these commands via the Command Palette (`Cmd/Ctrl + Shift + P`):

- Enhance Prompt (SecureAssistant): Add security hardening to a natural language prompt (returns prompt only)
- Generate Security Report: Produce Markdown summary (AI-enhanced if available)
- Toggle Security Reviewer: Enable/disable scanning + diagnostics
- Show Metrics: View aggregated scan/fix metrics
- Configure Gemini API Key / Reload AI Config

## Usage

### Basic Workflow
1. Open a supported source file (JS/TS, JSON manifests, YAML secrets)  
2. Save → automatic Semgrep scan  
3. Hover a diagnostic → AI (or heuristic) explanation + suggested fix context  
4. Apply quick fix where offered  
5. Use “Enhance Prompt” for secure AI prompt refinement  
6. Generate security report for audit / sharing  

### Advanced Features

#### Prompt Enhancement
Produces a single security-enriched prompt. No code output (guardrails reject code‑like tokens). If AI unavailable, a deterministic fallback template is displayed.

#### Custom Security Reports
Generate detailed reports that include:
- Executive summary of security posture
- Categorized issues by severity
- Specific remediation steps
- CWE mappings for compliance

## Architecture Overview
| Component | Responsibility |
|-----------|----------------|
| Coordinator | State + issue registry + events |
| SemgrepRunner | Executes Semgrep with bundled rules |
| DiagnosticsManager | Applies/removes VS Code diagnostics |
| CodeActionsProvider | Supplies quick fixes + telemetry hooks |
| GeminiService | AI prompt enhancement + explanations + reporting (with guardrails) |
| MetricsManager | Aggregates scan/fix stats (frequency, success) |

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

## Limitations / Known Issues
- Semgrep must be installed separately (no auto-install)
- Current ruleset targets JavaScript/TypeScript + JSON/YAML (Python patterns not yet merged in active config)
- AI explanations depend on external API availability & rate limits
- Large monolithic files may scan slower
- Some dynamic SQL / auth logic may evade pattern-based detection

## Development
```bash
git clone <repo>
cd secure-code-assistant
npm install
npm run compile
```
Launch debug host (F5). Package with: `npx vsce package`.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Release Notes

### 0.0.1
- Initial foundation: Semgrep scanning, diagnostics, quick fixes
- Gemini integration for explanations + prompt enhancement
- Guardrailed prompt-only enhancement (no code generation)
- AI + fallback security report generation
- Metrics collection for scans & fixes

---

**Stay Secure!** 🔐  
Open issues / feedback welcome via the repository.
