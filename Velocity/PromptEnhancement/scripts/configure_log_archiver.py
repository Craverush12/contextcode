#!/usr/bin/env python3
"""
Configuration Script for Velocity Log Archival System

This script helps you configure the automated log archival system with:
- Pre-defined configuration presets
- Custom configuration options
- Interactive setup wizard
- Configuration validation
- Integration with application startup
"""

import sys
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.logging.log_archiver import ArchivalConfig, LogArchiver

# Configuration presets
PRESETS = {
    "development": {
        "name": "Development Environment",
        "description": "Fast archival with minimal retention for development",
        "config": {
            "log_directory": "logs",
            "archive_directory": "logs/archives",
            "retention_days": 7,
            "compress_level": 3,
            "run_at_time": "02:00",
            "enabled": True,
            "backup_before_archive": False,
            "preserve_log_structure": True
        }
    },
    "production": {
        "name": "Production Environment",
        "description": "Balanced performance with good compression and retention",
        "config": {
            "log_directory": "logs",
            "archive_directory": "logs/archives",
            "retention_days": 30,
            "compress_level": 6,
            "run_at_time": "02:00",
            "enabled": True,
            "backup_before_archive": True,
            "preserve_log_structure": True
        }
    },
    "enterprise": {
        "name": "Enterprise Environment",
        "description": "Maximum compression and long retention for enterprise use",
        "config": {
            "log_directory": "logs",
            "archive_directory": "logs/archives",
            "retention_days": 90,
            "compress_level": 9,
            "run_at_time": "03:00",
            "enabled": True,
            "backup_before_archive": True,
            "preserve_log_structure": True
        }
    },
    "testing": {
        "name": "Testing Environment",
        "description": "Quick archival for testing with minimal settings",
        "config": {
            "log_directory": "logs",
            "archive_directory": "logs/test_archives",
            "retention_days": 3,
            "compress_level": 1,
            "run_at_time": "01:00",
            "enabled": False,  # Disabled by default for testing
            "backup_before_archive": False,
            "preserve_log_structure": False
        }
    }
}

def print_banner():
    """Print a beautiful banner for the configuration script."""
    print("🎯 VELOCITY LOG ARCHIVAL CONFIGURATION")
    print("=" * 50)
    print("Configure automated weekly log archival with ease!")
    print()

def show_presets():
    """Display available configuration presets."""
    print("📋 Available Configuration Presets:")
    print()
    
    for key, preset in PRESETS.items():
        print(f"🔧 {key.upper()}")
        print(f"   Name: {preset['name']}")
        print(f"   Description: {preset['description']}")
        
        config = preset['config']
        print(f"   ⚙️ Settings:")
        print(f"      📁 Log directory: {config['log_directory']}")
        print(f"      📦 Archive directory: {config['archive_directory']}")
        print(f"      🗓️ Retention: {config['retention_days']} days")
        print(f"      🗜️ Compression: Level {config['compress_level']}")
        print(f"      ⏰ Run time: {config['run_at_time']}")
        print(f"      ✅ Enabled: {config['enabled']}")
        print()

def validate_config(config: Dict[str, Any]) -> tuple[bool, list[str]]:
    """Validate configuration settings."""
    errors = []
    
    # Check required fields
    required_fields = [
        'log_directory', 'archive_directory', 'retention_days',
        'compress_level', 'run_at_time', 'enabled'
    ]
    
    for field in required_fields:
        if field not in config:
            errors.append(f"Missing required field: {field}")
    
    # Validate specific values
    if 'retention_days' in config:
        if not isinstance(config['retention_days'], int) or config['retention_days'] < 1:
            errors.append("retention_days must be a positive integer")
    
    if 'compress_level' in config:
        if not isinstance(config['compress_level'], int) or not (0 <= config['compress_level'] <= 9):
            errors.append("compress_level must be an integer between 0 and 9")
    
    if 'run_at_time' in config:
        try:
            time_parts = config['run_at_time'].split(':')
            if len(time_parts) != 2:
                raise ValueError()
            hour, minute = int(time_parts[0]), int(time_parts[1])
            if not (0 <= hour <= 23) or not (0 <= minute <= 59):
                raise ValueError()
        except (ValueError, AttributeError):
            errors.append("run_at_time must be in HH:MM format (24-hour)")
    
    # Check directory paths
    for dir_field in ['log_directory', 'archive_directory']:
        if dir_field in config:
            path = Path(config[dir_field])
            try:
                # Try to create the directory to check permissions
                path.mkdir(parents=True, exist_ok=True)
            except PermissionError:
                errors.append(f"No permission to create {dir_field}: {config[dir_field]}")
            except Exception as e:
                errors.append(f"Invalid {dir_field} path: {config[dir_field]} ({e})")
    
    return len(errors) == 0, errors

def load_preset(preset_name: str) -> Optional[Dict[str, Any]]:
    """Load a configuration preset."""
    if preset_name.lower() in PRESETS:
        return PRESETS[preset_name.lower()]['config'].copy()
    return None

def interactive_config() -> Dict[str, Any]:
    """Interactive configuration wizard."""
    print("🧙 Interactive Configuration Wizard")
    print("-" * 40)
    
    config = {}
    
    # Log directory
    default_log_dir = "logs"
    log_dir = input(f"📁 Log directory [{default_log_dir}]: ").strip()
    config['log_directory'] = log_dir or default_log_dir
    
    # Archive directory
    default_archive_dir = "logs/archives"
    archive_dir = input(f"📦 Archive directory [{default_archive_dir}]: ").strip()
    config['archive_directory'] = archive_dir or default_archive_dir
    
    # Retention days
    while True:
        try:
            retention = input("🗓️ Retention days [30]: ").strip()
            config['retention_days'] = int(retention) if retention else 30
            if config['retention_days'] < 1:
                raise ValueError()
            break
        except ValueError:
            print("❌ Please enter a positive integer")
    
    # Compression level
    while True:
        try:
            compression = input("🗜️ Compression level (0-9) [6]: ").strip()
            config['compress_level'] = int(compression) if compression else 6
            if not (0 <= config['compress_level'] <= 9):
                raise ValueError()
            break
        except ValueError:
            print("❌ Please enter a number between 0 and 9")
    
    # Run time
    while True:
        run_time = input("⏰ Run time (HH:MM) [02:00]: ").strip()
        config['run_at_time'] = run_time or "02:00"
        
        try:
            time_parts = config['run_at_time'].split(':')
            hour, minute = int(time_parts[0]), int(time_parts[1])
            if not (0 <= hour <= 23) or not (0 <= minute <= 59):
                raise ValueError()
            break
        except (ValueError, IndexError):
            print("❌ Please enter time in HH:MM format (24-hour)")
    
    # Enabled
    enabled = input("✅ Enable automatic archival? (y/n) [y]: ").strip().lower()
    config['enabled'] = enabled not in ['n', 'no', 'false']
    
    # Backup before archive
    backup = input("💾 Create backup before archival? (y/n) [y]: ").strip().lower()
    config['backup_before_archive'] = backup not in ['n', 'no', 'false']
    
    # Preserve log structure
    preserve = input("🗂️ Preserve log directory structure? (y/n) [y]: ").strip().lower()
    config['preserve_log_structure'] = preserve not in ['n', 'no', 'false']
    
    return config

def save_config(config: Dict[str, Any], config_file: str = "config/log_archiver.json"):
    """Save configuration to file."""
    config_path = Path(config_file)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Add metadata
    config_with_meta = {
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "version": "1.0",
            "description": "Velocity Log Archival System Configuration"
        },
        "archival": config
    }
    
    with open(config_path, 'w') as f:
        json.dump(config_with_meta, f, indent=2)
    
    print(f"💾 Configuration saved to: {config_path}")

def load_config(config_file: str = "config/log_archiver.json") -> Optional[Dict[str, Any]]:
    """Load configuration from file."""
    config_path = Path(config_file)
    
    if not config_path.exists():
        return None
    
    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
        
        if 'archival' in data:
            return data['archival']
        else:
            # Legacy format
            return data
            
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return None

def test_config(config: Dict[str, Any]):
    """Test the configuration by creating an archiver instance."""
    print("🧪 Testing configuration...")
    
    try:
        archival_config = ArchivalConfig(**config)
        archiver = LogArchiver(archival_config)
        
        # Test basic functionality
        stats = archiver.get_archive_stats()
        
        print("✅ Configuration test passed!")
        print(f"📊 Archive directory accessible: {config['archive_directory']}")
        print(f"🗂️ Current archives: {stats.get('total_archives', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def preview_config(config: Dict[str, Any]):
    """Preview the configuration settings."""
    print("👀 Configuration Preview:")
    print("-" * 30)
    
    print(f"📁 Log Directory: {config.get('log_directory', 'N/A')}")
    print(f"📦 Archive Directory: {config.get('archive_directory', 'N/A')}")
    print(f"🗓️ Retention Days: {config.get('retention_days', 'N/A')}")
    print(f"🗜️ Compression Level: {config.get('compress_level', 'N/A')}")
    print(f"⏰ Run Time: {config.get('run_at_time', 'N/A')}")
    print(f"✅ Enabled: {config.get('enabled', 'N/A')}")
    print(f"💾 Backup Before Archive: {config.get('backup_before_archive', 'N/A')}")
    print(f"🗂️ Preserve Structure: {config.get('preserve_log_structure', 'N/A')}")
    print()

def main():
    """Main configuration function."""
    print_banner()
    
    while True:
        print("🚀 Choose configuration method:")
        print("1. 📋 Use preset configuration")
        print("2. 🧙 Interactive wizard")
        print("3. 📄 Load existing configuration")
        print("4. ❌ Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            show_presets()
            preset_name = input("Enter preset name: ").strip().lower()
            
            config = load_preset(preset_name)
            if config is None:
                print("❌ Invalid preset name")
                continue
                
        elif choice == '2':
            config = interactive_config()
            
        elif choice == '3':
            config_file = input("Configuration file path [config/log_archiver.json]: ").strip()
            if not config_file:
                config_file = "config/log_archiver.json"
                
            config = load_config(config_file)
            if config is None:
                print("❌ Could not load configuration file")
                continue
                
        elif choice == '4':
            print("👋 Goodbye!")
            return
            
        else:
            print("❌ Invalid choice")
            continue
        
        # Validate configuration
        is_valid, errors = validate_config(config)
        
        if not is_valid:
            print("❌ Configuration validation failed:")
            for error in errors:
                print(f"   • {error}")
            print()
            continue
        
        # Preview configuration
        preview_config(config)
        
        # Test configuration
        if not test_config(config):
            continue
        
        # Ask to save
        save_choice = input("💾 Save this configuration? (y/n): ").strip().lower()
        if save_choice in ['y', 'yes']:
            config_file = input("Configuration file [config/log_archiver.json]: ").strip()
            if not config_file:
                config_file = "config/log_archiver.json"
            
            save_config(config, config_file)
        
        # Ask to apply immediately
        apply_choice = input("🚀 Start log archival with this configuration? (y/n): ").strip().lower()
        if apply_choice in ['y', 'yes']:
            try:
                from src.logging.log_archiver import start_log_archival
                archival_config = ArchivalConfig(**config)
                start_log_archival(archival_config)
                print("✅ Log archival started successfully!")
                print("🔄 The system will archive logs every Sunday at the specified time")
            except Exception as e:
                print(f"❌ Failed to start log archival: {e}")
        
        break

if __name__ == "__main__":
    main()
