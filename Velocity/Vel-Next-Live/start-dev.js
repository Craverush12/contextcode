const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Velocity Next.js development environment...');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
} else {
  console.log('✅ Dependencies already installed.');
}

// Run the setup-assets script
console.log('🗂️ Setting up static assets...');
try {
  execSync('npm run setup-assets', { stdio: 'inherit' });
} catch (error) {
  console.error('⚠️ Error setting up assets. Check the error and try again.');
  process.exit(1);
}

// Start the development server
console.log('🌐 Starting development server...');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('⚠️ Error starting development server. Check the error and try again.');
  process.exit(1);
} 