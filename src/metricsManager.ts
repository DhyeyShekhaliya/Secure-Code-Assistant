import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Issue } from './coordinator';

export interface ScanMetrics {
  id: string;
  timestamp: number;
  filePath: string;
  issuesFound: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  scanDuration: number;
  scanType: 'manual' | 'auto-save';
}

export interface FixMetrics {
  id: string;
  timestamp: number;
  filePath: string;
  ruleId: string;
  issueType: string;
  severity: string;
  fixType: 'quick-fix' | 'manual';
  success: boolean;
}

export interface SessionMetrics {
  sessionStart: number;
  totalScans: number;
  totalIssuesFound: number;
  totalFixesApplied: number;
  filesScanned: Set<string>;
  mostCommonIssues: Record<string, number>;
  securityTrend: 'improving' | 'declining' | 'stable';
}

export interface HistoricalData {
  scans: ScanMetrics[];
  fixes: FixMetrics[];
  sessions: SessionMetrics[];
  summary: {
    totalScansAllTime: number;
    totalIssuesFoundAllTime: number;
    totalFixesAppliedAllTime: number;
    averageIssuesPerScan: number;
    fixSuccessRate: number;
    mostVulnerableFiles: Array<{ file: string; issueCount: number }>;
    mostCommonVulnerabilities: Array<{ type: string; count: number }>;
  };
}

export class MetricsManager {
  private static instance: MetricsManager;
  private metricsFilePath: string;
  private currentSession: SessionMetrics;
  private data: HistoricalData = {
    scans: [],
    fixes: [],
    sessions: [],
    summary: {
      totalScansAllTime: 0,
      totalIssuesFoundAllTime: 0,
      totalFixesAppliedAllTime: 0,
      averageIssuesPerScan: 0,
      fixSuccessRate: 0,
      mostVulnerableFiles: [],
      mostCommonVulnerabilities: []
    }
  };

  private constructor(context: vscode.ExtensionContext) {
    // Ensure global storage directory exists
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
      fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }
    
    this.metricsFilePath = path.join(context.globalStorageUri.fsPath, 'security-metrics.json');
    this.currentSession = {
      sessionStart: Date.now(),
      totalScans: 0,
      totalIssuesFound: 0,
      totalFixesApplied: 0,
      filesScanned: new Set<string>(),
      mostCommonIssues: {},
      securityTrend: 'stable'
    };
    
    this.loadMetrics();
  }

  public static getInstance(context?: vscode.ExtensionContext): MetricsManager {
    if (!MetricsManager.instance && context) {
      MetricsManager.instance = new MetricsManager(context);
    }
    return MetricsManager.instance;
  }

  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsFilePath)) {
        const rawData = fs.readFileSync(this.metricsFilePath, 'utf8');
        this.data = JSON.parse(rawData);
        
        // Initialize missing properties for backward compatibility
        if (!this.data.scans) { this.data.scans = []; }
        if (!this.data.fixes) { this.data.fixes = []; }
        if (!this.data.sessions) { this.data.sessions = []; }
        if (!this.data.summary) {
          this.data.summary = {
            totalScansAllTime: 0,
            totalIssuesFoundAllTime: 0,
            totalFixesAppliedAllTime: 0,
            averageIssuesPerScan: 0,
            fixSuccessRate: 0,
            mostVulnerableFiles: [],
            mostCommonVulnerabilities: []
          };
        }
      } else {
        this.data = {
          scans: [],
          fixes: [],
          sessions: [],
          summary: {
            totalScansAllTime: 0,
            totalIssuesFoundAllTime: 0,
            totalFixesAppliedAllTime: 0,
            averageIssuesPerScan: 0,
            fixSuccessRate: 0,
            mostVulnerableFiles: [],
            mostCommonVulnerabilities: []
          }
        };
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      this.data = {
        scans: [],
        fixes: [],
        sessions: [],
        summary: {
          totalScansAllTime: 0,
          totalIssuesFoundAllTime: 0,
          totalFixesAppliedAllTime: 0,
          averageIssuesPerScan: 0,
          fixSuccessRate: 0,
          mostVulnerableFiles: [],
          mostCommonVulnerabilities: []
        }
      };
    }
  }

  private saveMetrics(): void {
    try {
      // Update summary before saving
      this.updateSummary();
      fs.writeFileSync(this.metricsFilePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private updateSummary(): void {
    const { scans, fixes } = this.data;
    
    this.data.summary.totalScansAllTime = scans.length;
    this.data.summary.totalIssuesFoundAllTime = scans.reduce((sum, scan) => sum + scan.issuesFound, 0);
    this.data.summary.totalFixesAppliedAllTime = fixes.length;
    this.data.summary.averageIssuesPerScan = scans.length > 0 ? 
      this.data.summary.totalIssuesFoundAllTime / scans.length : 0;
    this.data.summary.fixSuccessRate = fixes.length > 0 ? 
      fixes.filter(fix => fix.success).length / fixes.length : 0;

    // Calculate most vulnerable files
    const fileIssueCount: Record<string, number> = {};
    scans.forEach(scan => {
      const fileName = path.basename(scan.filePath);
      fileIssueCount[fileName] = (fileIssueCount[fileName] || 0) + scan.issuesFound;
    });
    
    this.data.summary.mostVulnerableFiles = Object.entries(fileIssueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([file, count]) => ({ file, issueCount: count }));

    // Calculate most common vulnerabilities
    const vulnerabilityCount: Record<string, number> = {};
    scans.forEach(scan => {
      Object.entries(scan.issuesByType).forEach(([type, count]) => {
        vulnerabilityCount[type] = (vulnerabilityCount[type] || 0) + count;
      });
    });
    
    this.data.summary.mostCommonVulnerabilities = Object.entries(vulnerabilityCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  public recordScan(filePath: string, issues: Issue[], scanType: 'manual' | 'auto-save', duration: number): void {
    const scanMetrics: ScanMetrics = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      filePath,
      issuesFound: issues.length,
      issuesByType: {},
      issuesBySeverity: {},
      scanDuration: duration,
      scanType
    };

    // Group issues by type and severity
    issues.forEach(issue => {
      scanMetrics.issuesByType[issue.ruleId] = (scanMetrics.issuesByType[issue.ruleId] || 0) + 1;
      scanMetrics.issuesBySeverity[issue.severity] = (scanMetrics.issuesBySeverity[issue.severity] || 0) + 1;
      
      // Update session metrics
      this.currentSession.mostCommonIssues[issue.ruleId] = (this.currentSession.mostCommonIssues[issue.ruleId] || 0) + 1;
    });

    // Update session metrics
    this.currentSession.totalScans++;
    this.currentSession.totalIssuesFound += issues.length;
    this.currentSession.filesScanned.add(filePath);

    // Add to historical data
    this.data.scans.push(scanMetrics);
    
    // Keep only last 1000 scans to prevent file from growing too large
    if (this.data.scans.length > 1000) {
      this.data.scans = this.data.scans.slice(-1000);
    }

    this.saveMetrics();
    console.log(`📊 Recorded scan metrics: ${issues.length} issues found in ${path.basename(filePath)}`);
  }

  public recordFix(filePath: string, issue: Issue, fixType: 'quick-fix' | 'manual', success: boolean): void {
    const fixMetrics: FixMetrics = {
      id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      filePath,
      ruleId: issue.ruleId,
      issueType: issue.ruleId,
      severity: issue.severity,
      fixType,
      success
    };

    // Update session metrics
    if (success) {
      this.currentSession.totalFixesApplied++;
    }

    // Add to historical data
    this.data.fixes.push(fixMetrics);
    
    // Keep only last 1000 fixes
    if (this.data.fixes.length > 1000) {
      this.data.fixes = this.data.fixes.slice(-1000);
    }

    this.saveMetrics();
    console.log(`🔧 Recorded fix metrics: ${success ? 'Success' : 'Failed'} - ${issue.ruleId}`);
  }

  public getCurrentSessionMetrics(): SessionMetrics {
    return {
      ...this.currentSession,
      filesScanned: new Set(this.currentSession.filesScanned) // Return a copy
    };
  }

  public getHistoricalData(): HistoricalData {
    return JSON.parse(JSON.stringify(this.data)); // Return a deep copy
  }

  public generateMetricsReport(): string {
    const session = this.getCurrentSessionMetrics();
    const data = this.getHistoricalData();
    
    const sessionDuration = Math.round((Date.now() - session.sessionStart) / 1000 / 60); // minutes
    
    return `# 📊 Security Metrics Report

## Current Session (${sessionDuration} minutes)
- **Scans Performed**: ${session.totalScans}
- **Issues Found**: ${session.totalIssuesFound}
- **Fixes Applied**: ${session.totalFixesApplied}
- **Files Scanned**: ${session.filesScanned.size}

### Most Common Issues This Session
${Object.entries(session.mostCommonIssues)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([issue, count]) => `- **${issue}**: ${count} occurrences`)
  .join('\n') || '- No issues found this session'}

## All-Time Statistics
- **Total Scans**: ${data.summary.totalScansAllTime}
- **Total Issues Found**: ${data.summary.totalIssuesFoundAllTime}
- **Total Fixes Applied**: ${data.summary.totalFixesAppliedAllTime}
- **Average Issues per Scan**: ${data.summary.averageIssuesPerScan.toFixed(1)}
- **Fix Success Rate**: ${(data.summary.fixSuccessRate * 100).toFixed(1)}%

### Most Vulnerable Files
${data.summary.mostVulnerableFiles.slice(0, 5)
  .map(item => `- **${item.file}**: ${item.issueCount} issues`)
  .join('\n') || '- No vulnerable files identified'}

### Most Common Vulnerabilities
${data.summary.mostCommonVulnerabilities.slice(0, 5)
  .map(item => `- **${item.type}**: ${item.count} occurrences`)
  .join('\n') || '- No vulnerabilities recorded'}

## Recent Activity (Last 10 Scans)
${data.scans.slice(-10).reverse()
  .map(scan => {
    const date = new Date(scan.timestamp).toLocaleString();
    const fileName = path.basename(scan.filePath);
    const issues = scan.issuesFound;
    const duration = scan.scanDuration;
    return `- **${date}**: ${fileName} - ${issues} issues (${duration}ms, ${scan.scanType})`;
  })
  .join('\n') || '- No recent scans'}

---
*Report generated at ${new Date().toLocaleString()}*
`;
  }

  public endSession(): void {
    // Save current session to sessions array
    this.data.sessions.push({
      ...this.currentSession,
      filesScanned: new Set(this.currentSession.filesScanned)
    });
    
    // Keep only last 50 sessions
    if (this.data.sessions.length > 50) {
      this.data.sessions = this.data.sessions.slice(-50);
    }
    
    this.saveMetrics();
  }

  public dispose(): void {
    this.endSession();
  }
}