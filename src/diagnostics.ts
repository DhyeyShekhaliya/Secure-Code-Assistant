import * as vscode from 'vscode';
import { Issue } from './coordinator';

export class DiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('secureAssistant');
  }

  public applyDiagnosticsForFile(document: vscode.TextDocument, issues: Issue[]) {
    const diagnostics: vscode.Diagnostic[] = issues.map(issue => {
      const range = new vscode.Range(
        Math.max(0, issue.line - 1), // Convert to 0-based indexing
        Math.max(0, issue.column - 1),
        Math.max(0, issue.line - 1),
        Math.max(0, issue.column + 10) // Extend range for better visibility
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        issue.message,
        this.mapSeverityToDiagnostic(issue.severity)
      );

      diagnostic.code = issue.ruleId;
      diagnostic.source = 'SecureAssistant';
      
      // Add additional information
      if (issue.cwe) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(document.uri, range),
            `CWE: ${issue.cwe}`
          )
        ];
      }

      return diagnostic;
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public clearDiagnosticsForFile(uri: vscode.Uri) {
    this.diagnosticCollection.delete(uri);
  }

  public clearAllDiagnostics() {
    this.diagnosticCollection.clear();
  }

  private mapSeverityToDiagnostic(severity: 'Low' | 'Medium' | 'High'): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'High':
        return vscode.DiagnosticSeverity.Error;
      case 'Medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'Low':
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  public dispose() {
    this.diagnosticCollection.dispose();
  }
}