import * as vscode from 'vscode';
import { Issue, Coordinator } from './coordinator';
import { SemgrepRunner } from './semgrepRunner';
import { DiagnosticsManager } from './diagnostics';
import { MetricsManager } from './metricsManager';

export class CodeActionsProvider implements vscode.CodeActionProvider {
  constructor(
    private coordinator: Coordinator,
    private diagnosticsManager: DiagnosticsManager,
    private metricsManager: MetricsManager
  ) {}

  private async recordFixApplication(document: vscode.TextDocument, issue: Issue, success: boolean): Promise<void> {
    try {
      this.metricsManager.recordFix(document.fileName, issue, 'quick-fix', success);
      console.log(`📊 Recorded fix application: ${issue.ruleId} - ${success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Failed to record fix metrics:', error);
    }
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'SecureAssistant') {
        const quickFix = this.createQuickFix(document, diagnostic);
        if (quickFix) {
          actions.push(quickFix);
        }
      }
    }

    return actions;
  }

  private createQuickFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | null {
    const ruleId = diagnostic.code as string;
    
    // Create specific fixes based on rule patterns
    if (ruleId?.includes('hardcoded') || ruleId?.includes('secret')) {
      return this.createHardcodedSecretFix(document, diagnostic);
    }
    
    if (ruleId?.includes('sql-injection') || ruleId?.includes('sqli')) {
      return this.createSqlInjectionFix(document, diagnostic);
    }
    
    if (ruleId?.includes('xss') || ruleId?.includes('cross-site-scripting') || ruleId?.includes('innerHTML')) {
      return this.createXssFix(document, diagnostic);
    }
    
    if (ruleId?.includes('random') || ruleId?.includes('insecure-random')) {
      return this.createInsecureRandomFix(document, diagnostic);
    }
    
    if (ruleId?.includes('authorization') || ruleId?.includes('missing-authorization')) {
      return this.createAuthorizationFix(document, diagnostic);
    }
    
    if (ruleId?.includes('deprecated') || ruleId?.includes('vulnerable')) {
      return this.createDependencyFix(document, diagnostic);
    }

    // Generic fix action
    return this.createGenericFix(document, diagnostic);
  }

  private createHardcodedSecretFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Replace with environment variable',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // More comprehensive pattern matching for secrets
    const patterns = [
      /(['"`])sk-[a-zA-Z0-9]{20,}(['"`])/,  // API keys starting with sk-
      /(['"`])pk_[a-zA-Z0-9]{20,}(['"`])/,  // Public keys starting with pk_
      /(['"`])Bearer [a-zA-Z0-9+=\/]{20,}(['"`])/, // Bearer tokens
      /(['"`])([a-zA-Z0-9+=\/]{20,})(['"`])/, // Generic long strings
    ];
    
    let replacement = lineText;
    let matched = false;
    
    for (const pattern of patterns) {
      const match = lineText.match(pattern);
      if (match) {
        const secretValue = match[2] || match[1];
        const envVarName = this.generateEnvVarName(secretValue);
        replacement = lineText.replace(match[0], `process.env.${envVarName}`);
        matched = true;
        break;
      }
    }
    
    if (matched) {
      fix.edit.replace(document.uri, line.range, replacement);
      fix.diagnostics = [diagnostic];
      fix.isPreferred = true;
    }
    
    return fix;
  }

  private createSqlInjectionFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Use parameterized query',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // Replace SQL injection patterns with parameterized versions
    let replacement = lineText;
    
    // Pattern: "SELECT * FROM table WHERE column = " + variable
    const selectPattern = /("SELECT \* FROM \w+ WHERE \w+ = ") \+ (\w+)/;
    const selectMatch = lineText.match(selectPattern);
    if (selectMatch) {
      replacement = lineText.replace(selectPattern, '"SELECT * FROM users WHERE id = ?"');
      // Add parameter array if it's a database query call
      if (lineText.includes('.query(')) {
        replacement = replacement.replace('.query(', `.query(\n        ${selectMatch[1]}?, [${selectMatch[2]}]`);
      }
    }
    
    // Pattern: Template literals with variables
    const templatePattern = /`([^`]*)\$\{(\w+)\}([^`]*)`/;
    const templateMatch = lineText.match(templatePattern);
    if (templateMatch) {
      replacement = lineText.replace(templatePattern, `"${templateMatch[1]}?${templateMatch[3]}", [${templateMatch[2]}]`);
    }
    
    fix.edit.replace(document.uri, line.range, replacement);
    fix.diagnostics = [diagnostic];
    return fix;
  }

  private createXssFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Fix XSS vulnerability',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // Replace innerHTML with textContent for XSS prevention
    let replacement = lineText;
    
    // Pattern: element.innerHTML = variable
    const innerHTMLPattern = /(\w+\.getElementById\([^)]+\))\.innerHTML = (\w+)/;
    const innerHTMLMatch = lineText.match(innerHTMLPattern);
    if (innerHTMLMatch) {
      replacement = lineText.replace(innerHTMLPattern, `${innerHTMLMatch[1]}.textContent = ${innerHTMLMatch[2]}`);
    }
    
    // Pattern: element.outerHTML = variable
    const outerHTMLPattern = /(\w+)\.outerHTML = (\w+)/;
    const outerHTMLMatch = lineText.match(outerHTMLPattern);
    if (outerHTMLMatch) {
      replacement = lineText.replace(outerHTMLPattern, `${outerHTMLMatch[1]}.textContent = ${outerHTMLMatch[2]}`);
    }
    
    // Pattern: document.write()
    const docWritePattern = /document\.write\(([^)]+)\)/;
    const docWriteMatch = lineText.match(docWritePattern);
    if (docWriteMatch) {
      replacement = lineText.replace(docWritePattern, `// Use createElement and textContent instead of document.write\n    // const element = document.createElement('div');\n    // element.textContent = ${docWriteMatch[1]};\n    // document.body.appendChild(element);`);
    }
    
    fix.edit.replace(document.uri, line.range, replacement);
    fix.diagnostics = [diagnostic];
    return fix;
  }

  private createInsecureRandomFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Use cryptographically secure random',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // Replace Math.random() with crypto.randomBytes()
    let replacement = lineText;
    
    // Pattern: Math.random()
    const mathRandomPattern = /Math\.random\(\)/;
    if (mathRandomPattern.test(lineText)) {
      replacement = lineText.replace(mathRandomPattern, 'crypto.randomBytes(16).toString("hex")');
      
      // Add crypto import if not present in file
      const firstLine = document.lineAt(0);
      if (!document.getText().includes('require(\'crypto\')') && !document.getText().includes('import') && !document.getText().includes('crypto')) {
        const importLine = 'const crypto = require(\'crypto\');\n';
        fix.edit.insert(document.uri, firstLine.range.start, importLine);
      }
    }
    
    // Pattern: Math.random().toString(36)
    const mathRandomToStringPattern = /Math\.random\(\)\.toString\(\d+\)/;
    if (mathRandomToStringPattern.test(lineText)) {
      replacement = lineText.replace(mathRandomToStringPattern, 'crypto.randomBytes(16).toString("hex")');
    }
    
    fix.edit.replace(document.uri, line.range, replacement);
    fix.diagnostics = [diagnostic];
    return fix;
  }

  private createAuthorizationFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Add authorization check',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // Add authorization middleware or check
    let replacement = lineText;
    
    // For Express routes, add middleware
    if (lineText.includes('app.') || lineText.includes('router.')) {
      const routePattern = /(app\.|router\.)(get|post|put|delete)\((['"`][^'"`]*['"`]),\s*(function|.*=>)/;
      const match = lineText.match(routePattern);
      if (match) {
        replacement = lineText.replace(routePattern, `$1$2($3, authenticateToken, $4`);
      }
    }
    
    // For functions, add auth check at the beginning
    if (lineText.includes('function') && (lineText.includes('delete') || lineText.includes('admin') || lineText.includes('update'))) {
      const nextLine = document.lineAt(diagnostic.range.start.line + 1);
      const authCheck = '    // Add authorization check\n    if (!req.user || !req.user.isAdmin) {\n        throw new Error(\'Unauthorized\');\n    }\n';
      fix.edit.insert(document.uri, nextLine.range.start, authCheck);
    }
    
    fix.edit.replace(document.uri, line.range, replacement);
    fix.diagnostics = [diagnostic];
    return fix;
  }

  private createDependencyFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Update to secure version',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    let replacement = lineText;
    
    // Update vulnerable versions to secure ones
    if (lineText.includes('"express"')) {
      replacement = lineText.replace(/"express":\s*"[^"]*"/, '"express": "^4.18.0"');
    } else if (lineText.includes('"lodash"')) {
      replacement = lineText.replace(/"lodash":\s*"[^"]*"/, '"lodash": "^4.17.21"');
    } else if (lineText.includes('"moment"')) {
      replacement = lineText.replace(/"moment":\s*"[^"]*"/, '"dayjs": "^1.11.0" // Replaced deprecated moment.js');
    } else if (lineText.includes('"request"')) {
      replacement = lineText.replace(/"request":\s*"[^"]*"/, '"axios": "^1.0.0" // Replaced deprecated request');
    } else if (lineText.includes('"jquery"')) {
      replacement = lineText.replace(/"jquery":\s*"[^"]*"/, '"jquery": "^3.6.0"');
    }
    
    fix.edit.replace(document.uri, line.range, replacement);
    fix.diagnostics = [diagnostic];
    return fix;
  }

  private createGenericFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Add security TODO comment',
      vscode.CodeActionKind.QuickFix
    );
    
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    const todoComment = `// SECURITY TODO: ${diagnostic.message}\n`;
    const newText = todoComment + lineText;
    
    fix.edit.replace(document.uri, line.range, newText);
    fix.diagnostics = [diagnostic];
    
    return fix;
  }

  private generateEnvVarName(secretValue: string): string {
    // Generate a reasonable environment variable name
    if (secretValue.includes('key')) {
      return 'API_KEY';
    }
    if (secretValue.includes('token')) {
      return 'ACCESS_TOKEN';
    }
    if (secretValue.includes('pass')) {
      return 'PASSWORD';
    }
    if (secretValue.includes('secret')) {
      return 'SECRET';
    }
    return 'SECRET_VALUE';
  }

  public async applyFixAndRescan(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument
  ): Promise<void> {
    const applied = await vscode.workspace.applyEdit(edit);
    
    if (applied && this.coordinator.isEnabled()) {
      // Small delay to allow editor update
      await new Promise(resolve => setTimeout(resolve, 250));
      
      try {
        const issues = await SemgrepRunner.runSemgrep(document.fileName);
        this.coordinator.recordIssues(document.fileName, issues);
        this.diagnosticsManager.applyDiagnosticsForFile(document, issues);
      } catch (error) {
        console.error('Failed to rescan after fix:', error);
      }
    }
  }
}