const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 AI Agent Hub Extension - Marketplace Publishing Script\n');

// Check if we're ready to publish
console.log('📋 Pre-publish checks...');

// 1. Check if VSIX exists
const vsixFile = 'ai-agent-vscode-0.0.4.vsix';
if (!fs.existsSync(vsixFile)) {
    console.log('❌ VSIX file not found. Run validation script first.');
    process.exit(1);
}
console.log('✅ VSIX file exists');

// 2. Check if vsce is installed
try {
    execSync('vsce --version', { stdio: 'pipe' });
    console.log('✅ vsce is installed');
} catch (error) {
    console.log('❌ vsce not found. Installing...');
    try {
        execSync('npm install -g vsce', { stdio: 'inherit' });
        console.log('✅ vsce installed successfully');
    } catch (installError) {
        console.log('❌ Failed to install vsce. Please install manually: npm install -g vsce');
        process.exit(1);
    }
}

// 3. Check package.json version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.version !== '0.0.4') {
    console.log(`❌ Package version mismatch. Expected 0.0.4, got ${packageJson.version}`);
    process.exit(1);
}
console.log('✅ Package version correct');

console.log('\n🎯 Publishing options:');
console.log('1. Publish directly to marketplace (requires login)');
console.log('2. Generate publish command for manual execution');
console.log('3. Show manual upload instructions');

// For now, we'll show the commands
console.log('\n📝 To publish to Visual Studio Marketplace:');
console.log('');
console.log('Option 1 - Command Line Publishing:');
console.log('-----------------------------------');
console.log('# Login to marketplace (one-time setup)');
console.log('vsce login jieky');
console.log('');
console.log('# Publish the extension');
console.log('vsce publish');
console.log('');
console.log('# Or publish from VSIX file');
console.log(`vsce publish --packagePath ${vsixFile}`);
console.log('');

console.log('Option 2 - Manual Upload:');
console.log('-------------------------');
console.log('1. Go to: https://marketplace.visualstudio.com/manage');
console.log('2. Sign in with your Microsoft account');
console.log('3. Select publisher: jieky');
console.log('4. Click "New extension"');
console.log(`5. Upload file: ${vsixFile}`);
console.log('6. Fill in any additional information');
console.log('7. Submit for review');
console.log('');

console.log('📊 Extension Information:');
console.log(`Name: ${packageJson.displayName}`);
console.log(`ID: ${packageJson.name}`);
console.log(`Version: ${packageJson.version}`);
console.log(`Publisher: ${packageJson.publisher}`);
console.log(`Description: ${packageJson.description}`);
console.log(`Categories: ${packageJson.categories.join(', ')}`);
console.log('');

console.log('🔍 Post-publish verification:');
console.log('1. Check extension appears in marketplace');
console.log('2. Install from marketplace: code --install-extension jieky.ai-agent-vscode');
console.log('3. Test all functionality');
console.log('4. Monitor for user feedback and issues');
console.log('');

console.log('✅ Ready for marketplace publishing!');
console.log('Choose your preferred publishing method above.');