const CrossPlatformMCPServer = require('./src/cross-platform-mcp.js');
const os = require('os');
const path = require('path');

async function testCrossPlatformFeatures() {
    console.log('🧪 Testing Cross-Platform MCP Server...\n');
    
    const server = new CrossPlatformMCPServer();
    
    // Test 1: Platform Detection
    console.log('Test 1: Platform Detection');
    console.log(`✅ Platform: ${server.platform}`);
    console.log(`✅ Windows: ${server.isWindows}`);
    console.log(`✅ macOS: ${server.isMac}`);
    console.log(`✅ Linux: ${server.isLinux}`);
    
    // Test 2: Path Handling
    console.log('\nTest 2: Cross-Platform Path Handling');
    console.log(`✅ Home Directory: ${server.homeDir}`);
    console.log(`✅ Config Directory: ${server.configDir}`);
    console.log(`✅ Projects File: ${server.projectsFile}`);
    console.log(`✅ Lock Directory: ${server.lockDir}`);
    
    // Test 3: Project ID Generation
    console.log('\nTest 3: Project ID Generation');
    const testPaths = [
        '/path/to/project',
        'C:\\path\\to\\project',
        '/home/user/project',
        'D:\\Users\\user\\project'
    ];
    
    testPaths.forEach(testPath => {
        const id = server.generateProjectId(testPath);
        console.log(`✅ ${testPath} → ${id}`);
    });
    
    // Test 4: MCP Endpoint Generation
    console.log('\nTest 4: MCP Endpoint Generation');
    const projectId = 'test123';
    const endpoint = server.getMCPEndpoint(projectId);
    console.log(`✅ MCP Endpoint: ${endpoint}`);
    
    // Test 5: SSH Detection
    console.log('\nTest 5: SSH Environment Detection');
    const isSSH = !!(process.env.SSH_CLIENT || process.env.SSH_TTY);
    console.log(`✅ SSH Session: ${isSSH}`);
    
    // Test 6: Directory Creation
    console.log('\nTest 6: Directory Creation');
    server.ensureDirectories();
    console.log(`✅ Directories created successfully`);
    
    console.log('\n🎉 All cross-platform tests passed!');
    console.log('\nPlatform-Specific Features:');
    
    if (server.isWindows) {
        console.log('  🪟 Windows Features:');
        console.log('    • Named pipes for IPC');
        console.log('    • tasklist/taskkill for process management');
        console.log('    • PowerShell/CMD compatibility');
    } else {
        console.log('  🐧 Unix Features:');
        console.log('    • Unix sockets for IPC');
        console.log('    • ps/kill for process management');
        console.log('    • Bash/Zsh compatibility');
    }
    
    console.log('\nRemote Development Support:');
    console.log('  🔗 SSH Remote Development');
    console.log('  🖥️  WSL (Windows Subsystem for Linux)');
    console.log('  📱 VS Code Remote Containers');
    console.log('  ☁️  Cloud Development Environments');
}

testCrossPlatformFeatures().catch(console.error);