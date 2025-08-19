const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * 测试VS Code扩展的聊天功能
 */
async function testChatFunctionality() {
    console.log('🔍 Testing AI Agent Chat Functionality...');
    
    try {
        // 1. 检查扩展是否已加载
        const extension = vscode.extensions.getExtension('jieky.ai-agent-vscode');
        if (!extension) {
            console.error('❌ Extension not found: jieky.ai-agent-vscode');
            return false;
        }
        
        console.log('✅ Extension found:', extension.id);
        console.log('📦 Extension version:', extension.packageJSON.version);
        console.log('🔄 Extension active:', extension.isActive);
        
        // 2. 激活扩展（如果未激活）
        if (!extension.isActive) {
            console.log('🚀 Activating extension...');
            await extension.activate();
            console.log('✅ Extension activated');
        }
        
        // 3. 检查聊天参与者配置
        const packageJson = extension.packageJSON;
        const chatParticipants = packageJson.contributes?.chatParticipants || [];
        
        console.log('\n📋 Chat Participants Configuration:');
        chatParticipants.forEach((participant, index) => {
            console.log(`  ${index + 1}. ID: ${participant.id}`);
            console.log(`     Name: ${participant.name}`);
            console.log(`     Description: ${participant.description}`);
            console.log(`     Sticky: ${participant.isSticky}`);
        });
        
        if (chatParticipants.length === 0) {
            console.error('❌ No chat participants found in package.json');
            return false;
        }
        
        // 4. 检查VS Code聊天API是否可用
        if (!vscode.chat) {
            console.error('❌ VS Code Chat API not available');
            console.log('💡 This might indicate VS Code version compatibility issues');
            return false;
        }
        
        console.log('✅ VS Code Chat API is available');
        
        // 5. 检查MCP配置
        const workspaceConfig = vscode.workspace.getConfiguration();
        const mcpEnabled = workspaceConfig.get('mcp.enabled');
        const mcpAutoStart = workspaceConfig.get('mcp.autoStart');
        const mcpServers = workspaceConfig.get('mcp.servers');
        
        console.log('\n🔧 MCP Configuration:');
        console.log(`  Enabled: ${mcpEnabled}`);
        console.log(`  Auto Start: ${mcpAutoStart}`);
        console.log(`  Servers:`, mcpServers);
        
        // 6. 检查扩展导出的功能
        const exports = extension.exports;
        console.log('\n📤 Extension Exports:');
        if (exports) {
            console.log('  Available exports:', Object.keys(exports));
        } else {
            console.log('  No exports available');
        }
        
        // 7. 检查命令注册
        const commands = await vscode.commands.getCommands(true);
        const aiAgentCommands = commands.filter(cmd => cmd.startsWith('ai-agent.'));
        
        console.log('\n⚡ Registered Commands:');
        aiAgentCommands.forEach(cmd => {
            console.log(`  - ${cmd}`);
        });
        
        if (aiAgentCommands.length === 0) {
            console.error('❌ No AI Agent commands found');
            return false;
        }
        
        console.log('\n✅ Chat functionality test completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`  - Extension loaded: ✅`);
        console.log(`  - Chat participants: ${chatParticipants.length}`);
        console.log(`  - Commands registered: ${aiAgentCommands.length}`);
        console.log(`  - MCP enabled: ${mcpEnabled ? '✅' : '❌'}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error during chat functionality test:', error);
        return false;
    }
}

/**
 * 检查扩展文件完整性
 */
function checkExtensionFiles() {
    console.log('\n📁 Checking Extension Files...');
    
    const extensionPath = path.join(__dirname);
    const requiredFiles = [
        'package.json',
        'out/extension.js',
        'icon.png'
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(extensionPath, file);
        if (fs.existsSync(filePath)) {
            console.log(`  ✅ ${file}`);
        } else {
            console.log(`  ❌ ${file} (missing)`);
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

// 如果直接运行此脚本
if (require.main === module) {
    console.log('🧪 AI Agent Chat Functionality Test');
    console.log('=====================================\n');
    
    // 检查文件完整性
    const filesOk = checkExtensionFiles();
    
    if (!filesOk) {
        console.error('\n❌ Some required files are missing. Please rebuild the extension.');
        process.exit(1);
    }
    
    // 注意：这个测试需要在VS Code环境中运行
    console.log('\n💡 Note: This test should be run within VS Code environment.');
    console.log('   You can run it using VS Code\'s built-in terminal or debug console.');
}

module.exports = {
    testChatFunctionality,
    checkExtensionFiles
};