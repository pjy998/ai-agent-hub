import * as vscode from 'vscode';

/**
 * 统一的输出通道管理器
 * 解决多个类创建重复OutputChannel的问题
 */
export class OutputManager {
    private static instance: OutputManager;
    private channels: Map<string, vscode.OutputChannel> = new Map();
    
    private constructor() {}
    
    public static getInstance(): OutputManager {
        if (!OutputManager.instance) {
            OutputManager.instance = new OutputManager();
        }
        return OutputManager.instance;
    }
    
    /**
     * 获取或创建输出通道
     * @param channelName 通道名称
     * @param displayName 显示名称
     * @returns 输出通道
     */
    public getChannel(channelName: string, displayName?: string): vscode.OutputChannel {
        if (!this.channels.has(channelName)) {
            const channel = vscode.window.createOutputChannel(displayName || channelName);
            this.channels.set(channelName, channel);
        }
        return this.channels.get(channelName)!;
    }
    
    /**
     * 获取主输出通道
     */
    public getMainChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-main', 'AI Agent Hub');
    }
    
    /**
     * 获取Token Probe输出通道
     */
    public getTokenProbeChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-token-probe', 'AI Agent - Token Probe');
    }
    
    /**
     * 获取C#分析输出通道
     */
    public getCSharpAnalysisChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-csharp', 'AI Agent - C# Analysis');
    }
    
    /**
     * 获取LLM监控输出通道
     */
    public getLLMMonitorChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-llm-monitor', 'AI Agent - LLM Monitor');
    }
    
    /**
     * 获取配置生成器输出通道
     */
    public getConfigGeneratorChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-config', 'AI Agent - Config Generator');
    }
    
    /**
     * 获取项目扫描输出通道
     */
    public getProjectScanChannel(): vscode.OutputChannel {
        return this.getChannel('ai-agent-project-scan', 'AI Agent - Project Scan');
    }
    
    /**
     * 显示指定通道
     * @param channelName 通道名称
     * @param preserveFocus 是否保持焦点
     */
    public showChannel(channelName: string, preserveFocus: boolean = true): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.show(preserveFocus);
        }
    }
    
    /**
     * 清空指定通道
     * @param channelName 通道名称
     */
    public clearChannel(channelName: string): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.clear();
        }
    }
    
    /**
     * 向指定通道输出消息
     * @param channelName 通道名称
     * @param message 消息内容
     */
    public appendLine(channelName: string, message: string): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.appendLine(message);
        }
    }
    
    /**
     * 向主通道输出消息
     * @param message 消息内容
     */
    public log(message: string): void {
        this.getMainChannel().appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
    
    /**
     * 向主通道输出错误消息
     * @param message 错误消息
     * @param error 错误对象
     */
    public logError(message: string, error?: Error): void {
        const errorMsg = error ? `${message}: ${error.message}` : message;
        this.getMainChannel().appendLine(`[${new Date().toLocaleTimeString()}] ❌ ${errorMsg}`);
        if (error?.stack) {
            this.getMainChannel().appendLine(error.stack);
        }
    }
    
    /**
     * 向主通道输出警告消息
     * @param message 警告消息
     */
    public logWarning(message: string): void {
        this.getMainChannel().appendLine(`[${new Date().toLocaleTimeString()}] ⚠️ ${message}`);
    }
    
    /**
     * 向主通道输出成功消息
     * @param message 成功消息
     */
    public logSuccess(message: string): void {
        this.getMainChannel().appendLine(`[${new Date().toLocaleTimeString()}] ✅ ${message}`);
    }
    
    /**
     * 向主通道输出信息消息
     * @param message 信息消息
     */
    public logInfo(message: string): void {
        this.getMainChannel().appendLine(`[${new Date().toLocaleTimeString()}] ℹ️ ${message}`);
    }
    
    /**
     * 释放所有输出通道
     */
    public dispose(): void {
        for (const channel of this.channels.values()) {
            channel.dispose();
        }
        this.channels.clear();
    }
    
    /**
     * 获取所有通道名称
     */
    public getChannelNames(): string[] {
        return Array.from(this.channels.keys());
    }
    
    /**
     * 检查通道是否存在
     * @param channelName 通道名称
     */
    public hasChannel(channelName: string): boolean {
        return this.channels.has(channelName);
    }
}

// 导出单例实例
export const outputManager = OutputManager.getInstance();