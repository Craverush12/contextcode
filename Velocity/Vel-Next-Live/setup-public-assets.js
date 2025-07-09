const fs = require('fs');
const path = require('path');

// Create necessary directories
const directories = [
  'public/assets',
  'public/fonts',
  'public/models'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Function to copy files
const copyFiles = (source, destination) => {
  if (!fs.existsSync(source)) {
    console.log(`Source directory not found: ${source}`);
    return;
  }

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFiles(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied: ${sourcePath} -> ${destPath}`);
    }
  });
};

// Copy assets
if (fs.existsSync('src/assets')) {
  copyFiles('src/assets', 'public/assets');
  console.log('Assets copied to public/assets');
}

// Copy fonts
if (fs.existsSync('src/fonts')) {
  copyFiles('src/fonts', 'public/fonts');
  console.log('Fonts copied to public/fonts');
}

// Copy models
if (fs.existsSync('src/models')) {
  copyFiles('src/models', 'public/models');
  console.log('Models copied to public/models');
}

console.log('Setup complete! Static assets have been moved to the public directory.'); 