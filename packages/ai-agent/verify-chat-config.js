const fs = require('fs');
const path = require('path');

/**
 * Verify chat participants configuration without VS Code runtime
 */
function verifyChatConfiguration() {
    console.log('🔍 Verifying AI Agent Chat Configuration...');
    console.log('=' .repeat(50));
    
    try {
        // 1. Check package.json
        const packageJsonPath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.error('❌ package.json not found');
            return false;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log('✅ Package.json loaded');
        console.log(`📦 Extension: ${packageJson.name} v${packageJson.version}`);
        
        // 2. Check chat participants configuration
        const chatParticipants = packageJson.contributes?.chatParticipants || [];
        console.log(`\n📋 Chat Participants (${chatParticipants.length} found):`);
        
        if (chatParticipants.length === 0) {
            console.error('❌ No chat participants configured');
            return false;
        }
        
        const expectedParticipants = ['ai-agent.coding', 'ai-agent.refactor', 'ai-agent.requirements'];
        let allFound = true;
        
        expectedParticipants.forEach(expectedId => {
            const participant = chatParticipants.find(p => p.id === expectedId);
            if (participant) {
                console.log(`  ✅ ${participant.id}`);
                console.log(`     Name: ${participant.name}`);
                console.log(`     Description: ${participant.description}`);
                console.log(`     Sticky: ${participant.isSticky}`);
            } else {
                console.log(`  ❌ ${expectedId} - NOT FOUND`);
                allFound = false;
            }
        });
        
        // 3. Check commands
        const commands = packageJson.contributes?.commands || [];
        console.log(`\n🔧 Commands (${commands.length} found):`);
        
        const expectedCommands = [
            'ai-agent.triggerCoding',
            'ai-agent.triggerRefactor', 
            'ai-agent.connectMCP'
        ];
        
        expectedCommands.forEach(expectedCmd => {
            const command = commands.find(c => c.command === expectedCmd);
            if (command) {
                console.log(`  ✅ ${command.command}: ${command.title}`);
            } else {
                console.log(`  ❌ ${expectedCmd} - NOT FOUND`);
                allFound = false;
            }
        });
        
        // 4. Check compiled extension file
        const extensionJsPath = path.join(__dirname, 'out', 'extension.js');
        if (fs.existsSync(extensionJsPath)) {
            const stats = fs.statSync(extensionJsPath);
            console.log(`\n📄 Compiled extension: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`   Last modified: ${stats.mtime.toLocaleString()}`);
            
            // Check if the compiled file contains chat participant creation
            const extensionContent = fs.readFileSync(extensionJsPath, 'utf8');
            const hasChatParticipants = extensionContent.includes('createChatParticipant');
            
            if (hasChatParticipants) {
                console.log('  ✅ Contains chat participant creation code');
            } else {
                console.log('  ❌ Missing chat participant creation code');
                allFound = false;
            }
        } else {
            console.log('\n❌ Compiled extension.js not found');
            allFound = false;
        }
        
        // 5. Check VS Code MCP configuration
        const vscodeSettingsPath = path.join(__dirname, '..', '..', '.vscode', 'settings.json');
        if (fs.existsSync(vscodeSettingsPath)) {
            const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
            console.log('\n⚙️ VS Code MCP Configuration:');
            
            if (settings['mcp.servers'] && settings['mcp.servers']['ai-agent-hub']) {
                const mcpConfig = settings['mcp.servers']['ai-agent-hub'];
                console.log(`  ✅ MCP Server configured: ${mcpConfig.command}`);
                console.log(`  ✅ MCP Enabled: ${settings['mcp.enabled']}`);
                console.log(`  ✅ MCP Auto Start: ${settings['mcp.autoStart']}`);
            } else {
                console.log('  ❌ MCP server configuration not found');
                allFound = false;
            }
        } else {
            console.log('\n⚠️ VS Code settings.json not found (this is normal if not in workspace)');
        }
        
        // 6. Summary
        console.log('\n' + '='.repeat(50));
        if (allFound) {
            console.log('🎉 All chat configuration checks PASSED!');
            console.log('\n💡 Next steps:');
            console.log('   1. Install the extension in VS Code');
            console.log('   2. Open VS Code Chat (Ctrl+Alt+I)');
            console.log('   3. Try typing @coding, @refactor, or @requirements');
            console.log('   4. Verify MCP server is running (check VS Code output)');
        } else {
            console.log('❌ Some configuration issues detected');
            console.log('\n🔧 Recommended actions:');
            console.log('   1. Check package.json contributes section');
            console.log('   2. Recompile the extension: npm run compile');
            console.log('   3. Verify VS Code MCP settings');
        }
        
        return allFound;
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifyChatConfiguration();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyChatConfiguration };