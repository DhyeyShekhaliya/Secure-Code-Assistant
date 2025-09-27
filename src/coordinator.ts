import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface Issue {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  ruleId: string;
  cwe?: string;
  fix?: string;
  explanation?: string;
  timestamp: number;
  // AI-enhanced properties
  hasAIExplanation?: boolean;
  aiSeverity?: 'Low' | 'Medium' | 'High';
}

export class Coordinator extends EventEmitter {
  private static instance: Coordinator;
  private issueCache: Map<string, Issue[]> = new Map();
  private statusBarItem!: vscode.StatusBarItem;
  private cacheFilePath: string;
  private isReviewerEnabled = true;

  private constructor(context: vscode.ExtensionContext) {
    super();
    this.cacheFilePath = path.join(context.globalStorageUri.fsPath, '.secure-assistant-cache.json');
    this.setupStatusBar();
    this.loadCache();
  }

  public static getInstance(context?: vscode.ExtensionContext): Coordinator {
    if (!Coordinator.instance && context) {
      Coordinator.instance = new Coordinator(context);
    }
    return Coordinator.instance;
  }

  private setupStatusBar() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'secureCodeAssistant.toggleReviewer';
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  private updateStatusBar() {
    const totalIssues = Array.from(this.issueCache.values()).flat().length;
    const status = this.isReviewerEnabled ? 'Active' : 'Disabled';
    this.statusBarItem.text = `$(shield) SecureAssistant: ${status} (${totalIssues})`;
    this.statusBarItem.tooltip = `Security issues found: ${totalIssues}. Click to ${this.isReviewerEnabled ? 'disable' : 'enable'} reviewer.`;
  }

  public recordIssues(filePath: string, issues: Issue[]) {
    this.issueCache.set(filePath, issues);
    this.emit('issuesUpdated', filePath, issues);
    this.updateStatusBar();
    this.persistCache();
  }

  public getIssuesForFile(filePath: string): Issue[] {
    return this.issueCache.get(filePath) || [];
  }

  public getAllIssues(): Map<string, Issue[]> {
    return new Map(this.issueCache);
  }

  public clearFileIssues(filePath: string) {
    this.issueCache.delete(filePath);
    this.emit('issuesCleared', filePath);
    this.updateStatusBar();
    this.persistCache();
  }

  public isEnabled(): boolean {
    return this.isReviewerEnabled;
  }

  public toggle(): boolean {
    this.isReviewerEnabled = !this.isReviewerEnabled;
    this.updateStatusBar();
    
    if (!this.isReviewerEnabled) {
      // Clear all diagnostics when disabled
      this.emit('reviewerDisabled');
    }
    
    return this.isReviewerEnabled;
  }

  private async persistCache() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const cacheData = {
        issues: Object.fromEntries(this.issueCache),
        lastUpdated: Date.now()
      };
      
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  private loadCache() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
        this.issueCache = new Map(Object.entries(cacheData.issues || {}));
        this.updateStatusBar();
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}