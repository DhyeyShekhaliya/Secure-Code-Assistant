import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as vscode from 'vscode';
import { Issue } from './coordinator';

export interface GeminiExplanation {
  severity: 'High' | 'Medium' | 'Low';
  explanation: string;
  fix: string;
  cwe?: string;
}

export class GeminiService {
  private model: any;
  private explanationCache: Map<string, GeminiExplanation> = new Map();
  private hasShownApiKeyPrompt: boolean = false;

  constructor() {
    this.initializeModel();
  }

  private initializeModel() {
    console.log('GeminiService: Initializing model...');
    
    const config = vscode.workspace.getConfiguration('secureAssistant');
    let apiKey = config.get<string>('geminiApiKey');
    
    console.log('GeminiService: Workspace config API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');
    
    // If not in settings, try multiple environment variable sources
    if (!apiKey) {
      // Try common environment variable names
      const envVars = [
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GEMINI_API_KEY', 
        'GOOGLE_AI_API_KEY',
        'GENERATIVE_AI_API_KEY'
      ];
      
      for (const envVar of envVars) {
        apiKey = process.env[envVar];
        console.log(`GeminiService: Checking ${envVar}:`, apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');
        if (apiKey) {
          console.log(`GeminiService: Found API key in ${envVar}`);
          break;
        }
      }
    }
    
    // Try to read from .env file if still not found
    if (!apiKey) {
      try {
        const fs = require('fs');
        const path = require('path');
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (workspaceRoot) {
          const envPath = path.join(workspaceRoot, '.env');
          console.log(` GeminiService: Checking .env file at: ${envPath}`);
          
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('GOOGLE_GENERATIVE_AI_API_KEY=')) {
                apiKey = trimmed.split('=')[1].replace(/["']/g, '');
                console.log('  GeminiService: Found API key in .env file');
                break;
              }
              if (trimmed.startsWith('GEMINI_API_KEY=')) {
                apiKey = trimmed.split('=')[1].replace(/["']/g, '');
                console.log('  GeminiService: Found API key in .env file (GEMINI_API_KEY)');
                break;
              }
            }
          } else {
            console.log(' GeminiService: No .env file found');
          }
        }
      } catch (error) {
        console.warn(' GeminiService: Failed to read .env file:', error);
      }
    }
    
    if (!apiKey) {
      console.warn(' Gemini API key not configured.');
      console.log('    To enable AI features, try one of these methods:');
      console.log('   1. Run command: "Configure Gemini API Key" (easiest)');
      console.log('   2. Add to workspace settings.json: "secureAssistant.geminiApiKey": "your-key"');
      console.log('   3. Create .env file with: GOOGLE_GENERATIVE_AI_API_KEY=your-key');
      console.log('   4. Set shell environment: export GOOGLE_GENERATIVE_AI_API_KEY="your-key"');
      console.log('   5. Get free API key: https://aistudio.google.com/app/apikey');
      
      // Show user-friendly notification only once per session
      if (!this.hasShownApiKeyPrompt) {
        this.hasShownApiKeyPrompt = true;
        vscode.window.showInformationMessage(
          '    AI features disabled. Configure Gemini API key to enable enhanced prompts.',
          'Get API Key',
          'Configure Now',
          'Create .env'
        ).then(selection => {
          if (selection === 'Get API Key') {
            vscode.env.openExternal(vscode.Uri.parse('https://aistudio.google.com/app/apikey'));
          } else if (selection === 'Configure Now') {
            vscode.commands.executeCommand('secureCodeAssistant.configureApiKey');
          } else if (selection === 'Create .env') {
            this.showEnvFileInstructions();
          }
        });
      }
      return;
    }

    try {
      // Set environment variable for API key
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
      this.model = google('models/gemini-2.0-flash-lite');
      console.log('Gemini AI model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error);
    }
  }

  private async showEnvFileInstructions() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const envContent = `# Secure Code Assistant Configuration
# Get your free API key from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here

# Alternative variable names (any of these work):
# GEMINI_API_KEY=your-api-key-here
# GOOGLE_AI_API_KEY=your-api-key-here
`;

    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(workspaceRoot, '.env');
      
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, envContent);
        vscode.window.showInformationMessage(
          '  Created .env file! Please edit it with your API key.',
          'Open .env File'
        ).then(selection => {
          if (selection === 'Open .env File') {
            vscode.workspace.openTextDocument(envPath).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
        });
      } else {
        vscode.window.showInformationMessage(
          '.env file already exists. Please add your API key to it.',
          'Open .env File'
        ).then(selection => {
          if (selection === 'Open .env File') {
            vscode.workspace.openTextDocument(envPath).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create .env file: ${error}`);
    }
  }

  public async generateResponse(prompt: string): Promise<string | null> {
    console.log('    GeminiService: Generating AI response...');
    
    if (!this.model) {
      console.warn('    GeminiService: Model not available for generateResponse');
      return null;
    }

    try {
      console.log(`    GeminiService: Sending prompt to AI model (${prompt.length} chars)...`);
      
      const { text } = await generateText({
        model: this.model,
        system: "You are an expert software developer specializing in secure coding practices. Provide clean, production-ready code with comprehensive security measures. Include comments explaining security considerations. Format your response in markdown with proper code blocks.",
        prompt,
        temperature: 0.3
      });

      console.log(`    GeminiService: Received AI response (${text.length} chars)`);
      
      if (!text || text.trim().length === 0) {
        console.warn('    GeminiService: Empty response from AI model');
        return null;
      }
      
      return text.trim();
    } catch (error) {
      console.error('    GeminiService: Failed to generate AI response:', error);
      throw error;
    }
  }

  public async explainIssue(issue: Issue): Promise<GeminiExplanation | null> {
    console.log(`    GeminiService: Explaining issue ${issue.ruleId}...`);
    
    if (!this.model) {
      console.warn('    GeminiService: Model not available for explainIssue');
      return null;
    }

    // Check cache first
    const cacheKey = `${issue.ruleId}-${issue.message}`;
    if (this.explanationCache.has(cacheKey)) {
      console.log(`    GeminiService: Using cached explanation for ${issue.ruleId}`);
      return this.explanationCache.get(cacheKey)!;
    }

    try {
      const prompt = `You are a secure code reviewer. Analyze the following security issue and respond ONLY with a single JSON object. No markdown, no code fences, no commentary.

Issue Details:
- Rule ID: ${issue.ruleId}
- Message: ${issue.message}
- File: ${issue.file}
- Line: ${issue.line}
- Current Severity: ${issue.severity}
${issue.cwe ? `- CWE: ${issue.cwe}` : ''}

Return ONLY JSON matching exactly:
{
  "severity": "High|Medium|Low",
  "explanation": "Brief explanation (1-3 sentences) of the security issue and risk",
  "fix": "Concise remediation or secure coding change",
  "cwe": "CWE-ID or omit if unknown"
}`;

      console.log(`    GeminiService: Sending explanation request for ${issue.ruleId}...`);
      const { text } = await generateText({
        model: this.model,
        system: "You are a security expert. Output ONLY raw minified JSON object. No backticks, no preamble.",
        prompt,
        temperature: 0.05
      });

      console.log(`    GeminiService: Received explanation response (${text.length} chars)`);
      let raw = text.trim();

      // Strip accidental code fences or surrounding text
      raw = raw.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

      // If extra text present, attempt to extract first JSON object
      if (!raw.startsWith('{')) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          raw = match[0];
        }
      }

      let parsed: GeminiExplanation | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch (jsonErr) {
        console.warn('   GeminiService: Primary JSON.parse failed, attempting lenient cleanup');
        // Attempt minor repairs (remove trailing commas)
        const repaired = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        try {
          parsed = JSON.parse(repaired);
        } catch (jsonErr2) {
          console.error('    GeminiService: JSON parsing failed after repair attempts');
        }
      }

      if (!parsed) {
        console.warn(`   GeminiService: Falling back to heuristic explanation for ${issue.ruleId}`);
        const fallback: GeminiExplanation = {
          severity: (['High','Medium','Low'].includes(issue.severity as any) ? issue.severity : 'Medium') as any,
          explanation: this.buildHeuristicExplanation(issue),
          fix: this.buildHeuristicFix(issue),
          cwe: issue.cwe
        };
        this.explanationCache.set(cacheKey, fallback);
        return fallback;
      }

      // Normalize severity
      const sev = (parsed.severity || '').toLowerCase();
      if (sev.startsWith('h')) {
        parsed.severity = 'High';
      } else if (sev.startsWith('m')) {
        parsed.severity = 'Medium';
      } else if (sev.startsWith('l')) {
        parsed.severity = 'Low';
      } else {
        parsed.severity = issue.severity as any;
      }

      // Basic field validation
      if (!parsed.explanation || parsed.explanation.length < 5) {
        parsed.explanation = this.buildHeuristicExplanation(issue);
      }
      if (!parsed.fix || parsed.fix.length < 3) {
        parsed.fix = this.buildHeuristicFix(issue);
      }
      if (!parsed.cwe && issue.cwe) {
        parsed.cwe = issue.cwe;
      }

      this.explanationCache.set(cacheKey, parsed);
      console.log(`  GeminiService: Successfully explained ${issue.ruleId}`);
      return parsed;
    } catch (error) {
      console.error(`    GeminiService: Failed to explain ${issue.ruleId}:`, error);
      const fallback: GeminiExplanation = {
        severity: (['High','Medium','Low'].includes(issue.severity as any) ? issue.severity : 'Medium') as any,
        explanation: this.buildHeuristicExplanation(issue),
        fix: this.buildHeuristicFix(issue),
        cwe: issue.cwe
      };
      this.explanationCache.set(cacheKey, fallback);
      return fallback; // Never return null now; always provide something
    }
  }

  // Heuristic builder for explanation when AI fails
  private buildHeuristicExplanation(issue: Issue): string {
    const msg = issue.message.toLowerCase();
    if (msg.includes('sql') && msg.includes('injection')) {
      return 'This code is vulnerable to SQL injection because user-controlled input is concatenated directly into a query without parameterization.';
    }
    if (msg.includes('xss')) {
      return 'Potential cross-site scripting (XSS) risk due to unsanitized user-controlled output being rendered.';
    }
    if (msg.includes('csrf')) {
      return 'Missing CSRF protection allows attackers to trick authenticated users into unintended state-changing actions.';
    }
    if (msg.includes('hardcoded') && msg.includes('secret')) {
      return 'A secret appears to be hardcoded, increasing risk of credential leakage and unauthorized access.';
    }
    return 'This finding indicates a security weakness that could be exploited if not remediated with secure coding practices.';
  }

  private buildHeuristicFix(issue: Issue): string {
    const msg = issue.message.toLowerCase();
    if (msg.includes('sql') && msg.includes('injection')) {
      return 'Use parameterized/prepared statements (placeholders) and input validation to construct queries safely.';
    }
    if (msg.includes('xss')) {
      return 'Sanitize and encode user-supplied data before rendering; use a templating engine that auto-escapes.';
    }
    if (msg.includes('csrf')) {
      return 'Implement CSRF tokens, enforce same-site cookies, and validate request origin headers.';
    }
    if (msg.includes('hardcoded') && msg.includes('secret')) {
      return 'Move the secret to an environment variable or secret manager and reference it securely at runtime.';
    }
    return 'Apply secure coding best practices and validate, sanitize, and constrain all external inputs.';
  }

  public async enhancePrompt(userPrompt: string): Promise<string> {
    console.log('    GeminiService: enhancePrompt called with:', userPrompt);
    console.log('    GeminiService: Model available:', !!this.model);
    
    if (!this.model) {
      console.warn('    GeminiService: Model not available for enhancePrompt');
      throw new Error('Gemini AI model not initialized. Configure an API key to enable enhanced prompts.');
    }

    try {
      const prompt = `You are a security-focused prompt engineer.

User request: "${userPrompt}"

TASK: Return ONLY an improved version of the user's request enriched with concrete, relevant security requirements. Do NOT generate any code, pseudo-code, examples, bullet lists of explanations, or commentary. Provide exactly ONE enhanced prompt sentence / short paragraph that can be pasted into another coding assistant.

RULES:
 - No code blocks
 - No backticks
 - No explanations before or after
 - No implementation details beyond what belongs naturally in a prompt
 - Must keep original intent while adding security hardening
 - Include only security measures that plausibly apply
 - Be concise, actionable, specific

SECURITY AREAS (include only if relevant): input validation, authN/authZ (RBAC/JWT), rate limiting, secure password handling (bcrypt/argon2), parameterized DB queries, XSS & injection prevention, secret management via environment variables, proper error handling (no sensitive leakage), logging & auditing, encryption in transit & at rest, file upload validation, session management.

OUTPUT: Enhanced prompt only.`;

      console.log('   GeminiService: Sending enhancePrompt request to AI model...');
      const { text } = await generateText({
        model: this.model,
        system: "You enhance developer prompts with precise security requirements. You NEVER output code or explanations—only the single enhanced prompt.",
        prompt,
        temperature: 0.15
      });
      console.log('  GeminiService: enhancePrompt response received:', text.substring(0, 120) + (text.length > 120 ? '…' : ''));
      const result = text.trim();
      
      if (!result || result.length === 0) {
        console.warn('   GeminiService: Empty response from AI model');
        throw new Error('Empty AI response');
      }

      // Guardrails: strip accidental code fences or markdown
      const sanitized = result
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      // If model ignored instructions and produced multiple lines, collapse to single paragraph
      const collapsed = sanitized.split(/\n+/).map(l => l.trim()).filter(Boolean).join(' ');

      // Reject if obvious code tokens slipped through
      if (/(\bclass\b|\bfunction\b|\bdef\b|\bimport\b|=>|console\.log\(|System\.out|#include|<script>|public\s+static|using\s+[A-Z]|;\s*$)/.test(sanitized) || /(const |let |var |private |protected |async )/.test(sanitized)) {
        console.warn('   GeminiService: Detected code-like content in enhanced prompt, rejecting.');
        throw new Error('AI produced code instead of a pure enhanced prompt');
      }
      
      return collapsed;
      
    } catch (error) {
      console.error('    GeminiService: enhancePrompt failed:', error);
      throw error;
    }
  }

  public async generateSecurityReport(allIssues: Map<string, Issue[]>): Promise<string> {
    if (!this.model) {
      return this.generateBasicReport(allIssues);
    }

    try {
      const issuesData = Array.from(allIssues.entries()).map(([file, issues]) => ({
        file,
        issues: issues.map(issue => ({
          severity: issue.severity,
          ruleId: issue.ruleId,
          message: issue.message,
          line: issue.line,
          cwe: issue.cwe
        }))
      }));
      const jsonPrompt = `You are a security analyst. Summarize the following static analysis findings into a JSON object ONLY (no markdown) with this exact shape:
{
  "executiveSummary": "1-3 sentence risk overview",
  "statistics": {
    "total": number,
    "high": number,
    "medium": number,
    "low": number,
    "filesAffected": number
  },
  "groups": {
    "high": [ { "ruleId": string, "file": string, "line": number, "message": string, "cwe": string|null, "remediation": string } ],
    "medium": [ { "ruleId": string, "count": number, "sampleFiles": [string] } ],
    "low": [ { "ruleId": string, "count": number } ]
  },
  "topRisks": [ { "ruleId": string, "why": string } ],
  "priorityRemediations": [ { "action": string, "benefit": string } ],
  "recommendedNextSteps": [ string ]
}

Rules for transformation:
- For HIGH: list each finding separately with a direct remediation (imperative form)
- For MEDIUM: group by ruleId, include count and up to 3 file samples
- For LOW: group by ruleId with counts only
- Derive 2-4 topRisks focusing on exploitation impact
- Provide 3-6 prioritized remediation actions with clear benefit
- recommendedNextSteps should be short imperative bullet phrases

Input Findings JSON:
${JSON.stringify(issuesData, null, 2)}

Return ONLY JSON.`;

      const { text } = await generateText({
        model: this.model,
        system: "You output strictly JSON for security summarization; no code, no markdown.",
        prompt: jsonPrompt,
        temperature: 0.1
      });

      let raw = text.trim().replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
      if (!raw.startsWith('{')) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          raw = m[0];
        }
      }
      interface ReportJSON { executiveSummary:string; statistics:any; groups:any; topRisks:any[]; priorityRemediations:any[]; recommendedNextSteps:string[]; }
      let parsed: ReportJSON | null = null;
      try { parsed = JSON.parse(raw); } catch {
        // Fallback to basic report if parsing fails
        return this.generateBasicReport(allIssues);
      }

      if (!parsed) {
        return this.generateBasicReport(allIssues);
      }

      const md: string[] = [];
      md.push('# Security Analysis Report');
      md.push('');
      md.push('## Executive Summary');
    md.push(parsed.executiveSummary || 'Summary unavailable.');
      md.push('');
      md.push('## Issue Statistics');
      md.push(`- Total: ${parsed.statistics?.total}`);
      md.push(`- High: ${parsed.statistics?.high}`);
      md.push(`- Medium: ${parsed.statistics?.medium}`);
      md.push(`- Low: ${parsed.statistics?.low}`);
      md.push(`- Files Affected: ${parsed.statistics?.filesAffected}`);
      md.push('');

      // High severity section
      md.push('## High Severity Findings');
      if (parsed.groups?.high?.length) {
        for (const h of parsed.groups.high) {
          md.push(`- **${h.ruleId}** (${h.file}:${h.line}) - ${h.message}${h.cwe ? ` (CWE: ${h.cwe})` : ''}`);
          if (h.remediation) {
            md.push(`  - Remediation: ${h.remediation}`);
          }
        }
      } else {
        md.push('_None_');
      }
      md.push('');

      // Medium grouped
      md.push('## Medium Severity (Grouped)');
      if (parsed.groups?.medium?.length) {
        for (const m of parsed.groups.medium) {
          md.push(`- **${m.ruleId}**: ${m.count} occurrence(s)${m.sampleFiles?.length ? ` (e.g., ${m.sampleFiles.join(', ')})` : ''}`);
        }
      } else {
        md.push('_None_');
      }
      md.push('');

      // Low grouped
      md.push('## Low Severity (Summary)');
      if (parsed.groups?.low?.length) {
        for (const l of parsed.groups.low) {
          md.push(`- **${l.ruleId}**: ${l.count}`);
        }
      } else {
        md.push('_None_');
      }
      md.push('');

      // Top Risks
      md.push('## Top Risks');
      if (parsed.topRisks?.length) {
        for (const r of parsed.topRisks) {
          md.push(`- **${r.ruleId}**: ${r.why}`);
        }
      } else {
        md.push('_None_');
      }
      md.push('');

      // Priority Remediations
      md.push('## Priority Remediations');
      if (parsed.priorityRemediations?.length) {
        for (const pr of parsed.priorityRemediations) {
          md.push(`- **${pr.action}** — ${pr.benefit}`);
        }
      } else {
        md.push('_None_');
      }
      md.push('');

      // Next Steps
      md.push('## Recommended Next Steps');
      if (parsed.recommendedNextSteps?.length) {
        for (const s of parsed.recommendedNextSteps) {
          md.push(`- ${s}`);
        }
      } else {
        md.push('_None_');
      }
      md.push('');
      md.push(`_Generated: ${new Date().toISOString()} (AI-assisted)_`);

      return md.join('\n');
    } catch (error) {
      console.error('Failed to generate AI report:', error);
      return this.generateBasicReport(allIssues);
    }
  }

  private generateBasicReport(allIssues: Map<string, Issue[]>): string {
    const allIssuesList = Array.from(allIssues.values()).flat();
    const highIssues = allIssuesList.filter(i => i.severity === 'High');
    const mediumIssues = allIssuesList.filter(i => i.severity === 'Medium');
    const lowIssues = allIssuesList.filter(i => i.severity === 'Low');

    return `# Security Report

## Summary
- **Total Issues**: ${allIssuesList.length}
- **High Severity**: ${highIssues.length}
- **Medium Severity**: ${mediumIssues.length}
- **Low Severity**: ${lowIssues.length}

## High Priority Issues
${highIssues.map(issue => `- **${issue.ruleId}** in \`${issue.file}:${issue.line}\`: ${issue.message}`).join('\n')}

## Recommendations
1. Address all high severity issues immediately
2. Review and fix medium severity issues
3. Consider low severity issues for code quality improvements

Generated on: ${new Date().toISOString()}
`;
  }
}