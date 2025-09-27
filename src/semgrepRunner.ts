import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { Issue } from './coordinator';

export interface SemgrepResult {
  check_id: string;
  path: string;
  start: {
    line: number;
    col: number;
  };
  end: {
    line: number;
    col: number;
  };
  extra: {
    message: string;
    severity: string;
    metadata?: {
      cwe?: string[];
      category?: string;
    };
  };
}

export class SemgrepRunner {
  public static async runSemgrep(filePath: string): Promise<Issue[]> {
    return new Promise((resolve, reject) => {
      const command = 'semgrep';
      const path = require('path');
      const fs = require('fs');
      
      // Try to find .semgrep.yml in multiple locations
      let customRulesPath: string | null = null;
      const possiblePaths = [
        // Current workspace folder
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        // Directory containing the file being scanned
        path.dirname(filePath),
        // Walk up directories to find .semgrep.yml
        path.join(path.dirname(filePath), '..'),
        path.join(path.dirname(filePath), '..', '..'),
      ].filter(Boolean);
      
      for (const basePath of possiblePaths) {
        const testPath = path.join(basePath!, '.semgrep.yml');
        if (fs.existsSync(testPath)) {
          customRulesPath = testPath;
          break;
        }
      }
      
      console.log('SemgrepRunner: Workspace folder:', vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
      console.log('SemgrepRunner: File path:', filePath);
      console.log('SemgrepRunner: Custom rules path:', customRulesPath);
      console.log('SemgrepRunner: Custom rules exist:', customRulesPath ? fs.existsSync(customRulesPath) : false);
      
      // Use custom rules if available, otherwise fall back to default rules
      const configArg = customRulesPath ? customRulesPath : 'p/security-audit';
      
      console.log('SemgrepRunner: Using config:', configArg);
      const args = ['--json', '--config', configArg, filePath];
      
      execFile(command, args, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error && !stdout) {
          // Check if semgrep is installed
          if (error.code === 'ENOENT') {
            vscode.window.showWarningMessage(
              'Semgrep not found. Please install it: pip3 install semgrep',
              'Install Guide'
            ).then(selection => {
              if (selection === 'Install Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://semgrep.dev/docs/getting-started/'));
              }
            });
            resolve([]);
            return;
          }
          reject(error);
          return;
        }

        try {
          const results = stdout ? JSON.parse(stdout) : { results: [] };
          const issues = this.convertSemgrepResults(results.results || [], filePath);
          resolve(issues);
        } catch (parseError) {
          console.error('Failed to parse Semgrep output:', parseError);
          resolve([]);
        }
      });
    });
  }

  private static convertSemgrepResults(results: SemgrepResult[], filePath: string): Issue[] {
    return results.map((result, index) => ({
      id: `${result.check_id}-${index}`,
      file: filePath,
      line: result.start.line,
      column: result.start.col,
      message: result.extra.message,
      severity: this.mapSeverity(result.extra.severity),
      ruleId: result.check_id,
      cwe: result.extra.metadata?.cwe?.[0],
      timestamp: Date.now()
    }));
  }

  private static mapSeverity(semgrepSeverity: string): 'Low' | 'Medium' | 'High' {
    switch (semgrepSeverity.toLowerCase()) {
      case 'error':
        return 'High';
      case 'warning':
        return 'Medium';
      case 'info':
      default:
        return 'Low';
    }
  }
}