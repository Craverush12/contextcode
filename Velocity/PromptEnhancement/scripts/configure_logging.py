#!/usr/bin/env python3
"""
Velocity Router Logging Configuration Script

This script allows you to configure the logging system for the Velocity Router.
You can switch between unified and separate log files, set log levels, and manage
log file locations.

Usage:
    python scripts/configure_logging.py --help
    python scripts/configure_logging.py --separate-files
    python scripts/configure_logging.py --unified --level DEBUG
    python scripts/configure_logging.py --preview
"""

import os
import sys
import argparse
import json
from pathlib import Path
from datetime import datetime

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.logging.logger import configure_logging, get_logger

def get_current_config():
    """Get the current logging configuration from application.py."""
    app_file = project_root / "application.py"
    
    if not app_file.exists():
        return None
    
    # Read the current configuration from application.py
    with open(app_file, 'r') as f:
        content = f.read()
    
    # Extract current configuration (simple parsing)
    config = {
        "separate_log_files": "separate_log_files=True" in content,
        "log_level": "INFO",  # Default
        "console_output": "console_output=True" in content,
        "file_output": "file_output=True" in content,
        "json_format": "json_format=True" in content,
        "log_dir": "logs"
    }
    
    # Try to extract log level from environment or default
    if 'LOG_LEVEL' in content:
        # This is a simple extraction - in a real scenario you might want more sophisticated parsing
        config["log_level"] = os.environ.get("LOG_LEVEL", "INFO")
    
    return config

def update_application_config(
    separate_files=None, 
    log_level=None, 
    console_output=None, 
    file_output=None, 
    json_format=None,
    log_dir=None
):
    """Update the logging configuration in application.py."""
    app_file = project_root / "application.py"
    
    if not app_file.exists():
        print(f"❌ Error: {app_file} not found!")
        return False
    
    # Read current content
    with open(app_file, 'r') as f:
        content = f.read()
    
    # Find the configure_logging call
    start_marker = "configure_logging("
    end_marker = ")"
    
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("❌ Error: configure_logging call not found in application.py")
        return False
    
    # Find the end of the configure_logging call
    paren_count = 0
    end_idx = start_idx + len(start_marker)
    for i, char in enumerate(content[start_idx + len(start_marker):], start=start_idx + len(start_marker)):
        if char == '(':
            paren_count += 1
        elif char == ')':
            if paren_count == 0:
                end_idx = i + 1
                break
            paren_count -= 1
    
    # Build new configuration
    current_config = get_current_config()
    
    new_config = f"""configure_logging(
    level=os.environ.get("LOG_LEVEL", "{log_level or current_config.get('log_level', 'INFO')}"),
    console_output={str(console_output if console_output is not None else current_config.get('console_output', True))},
    file_output={str(file_output if file_output is not None else current_config.get('file_output', True))},
    log_file="velocity.log",  # Used only if separate_log_files=False
    json_format={str(json_format if json_format is not None else current_config.get('json_format', True))},
    log_dir="{log_dir or current_config.get('log_dir', 'logs')}",
    separate_log_files={str(separate_files if separate_files is not None else current_config.get('separate_log_files', True))},  # Enable separate log files for different levels
    info_log_file="velocity_info.log",
    warning_log_file="velocity_warning.log",
    error_log_file="velocity_error.log",
    access_log_enabled=True,  # Enable HTTP access logging
    access_log_file="velocity_access.log"
)"""
    
    # Replace the configuration
    new_content = content[:start_idx] + new_config + content[end_idx:]
    
    # Write back to file
    with open(app_file, 'w') as f:
        f.write(new_content)
    
    return True

def preview_log_files(separate_files=True, log_dir="logs"):
    """Preview what log files will be created."""
    print("\n📋 Log Files Preview:")
    print("=" * 50)
    
    log_path = Path(log_dir)
    
    if separate_files:
        files = [
            ("velocity_info.log", "INFO, DEBUG, TRACE levels", "📘"),
            ("velocity_warning.log", "WARNING level", "⚠️"),
            ("velocity_error.log", "ERROR, CRITICAL levels", "❌"),
            ("velocity_access.log", "HTTP access logs with user IDs (JSON format)", "🌐")
        ]
        
        print("📁 Separate log files mode:")
        for filename, description, icon in files:
            full_path = log_path / filename
            print(f"  {icon} {full_path}")
            print(f"     └── {description}")
            
    else:
        print("📁 Unified log file mode:")
        files = [
            ("velocity.log", "All log levels except access logs", "📄"),
            ("velocity_access.log", "HTTP access logs with user IDs (JSON format)", "🌐")
        ]
        
        for filename, description, icon in files:
            full_path = log_path / filename
            print(f"  {icon} {full_path}")
            print(f"     └── {description}")
    
    print()

def test_logging_setup(separate_files=True, log_level="INFO", log_dir="logs"):
    """Test the logging setup by generating sample log messages."""
    print("\n🧪 Testing Logging Setup...")
    print("=" * 40)
    
    # Configure logging with test settings
    configure_logging(
        level=log_level,
        console_output=True,
        file_output=True,
        log_file="velocity.log",
        json_format=True,
        log_dir=log_dir,
        separate_log_files=separate_files,
        info_log_file="velocity_info.log",
        warning_log_file="velocity_warning.log",
        error_log_file="velocity_error.log",
        access_log_enabled=True,
        access_log_file="velocity_access.log"
    )
    
    # Get a test logger
    logger = get_logger("test_logger")
    
    # Generate test messages
    print("📝 Generating test log messages...")
    
    logger.info("🚀 Application startup - this is an INFO message")
    logger.debug("🔍 Debug information - detailed system state")
    logger.warning("⚠️ This is a WARNING message - potential issue detected")
    logger.error("❌ This is an ERROR message - something went wrong")
    
    try:
        # Simulate an exception
        raise ValueError("This is a test exception for logging")
    except Exception as e:
        logger.exception("💥 Exception occurred during testing")
    
    # Test access logging
    from src.logging.logger import log_http_access
    print("🌐 Generating test HTTP access logs...")
    
    log_http_access(
        client_ip="192.168.1.100",
        user_id="test_user_123",
        method="POST",
        url="http://localhost:8000/enhance",
        protocol="HTTP/1.1",
        status_code=200,
        response_size=1024,
        referer="https://example.com",
        user_agent="TestAgent/1.0",
        duration_ms=150.5
    )
    
    log_http_access(
        client_ip="10.0.0.50",
        user_id="anonymous",
        method="GET",
        url="http://localhost:8000/health",
        protocol="HTTP/1.1",
        status_code=200,
        response_size=45,
        referer="-",
        user_agent="curl/7.68.0",
        duration_ms=5.2
    )
    
    print("✅ Test messages generated successfully!")
    
    # Show file locations
    log_path = Path(log_dir)
    if separate_files:
        files = ["velocity_info.log", "velocity_warning.log", "velocity_error.log", "velocity_access.log"]
    else:
        files = ["velocity.log", "velocity_access.log"]
    
    print("\n📂 Check these files for log output:")
    for filename in files:
        full_path = log_path / filename
        if full_path.exists():
            size = full_path.stat().st_size
            print(f"  ✅ {full_path} ({size} bytes)")
        else:
            print(f"  ❌ {full_path} (not created)")

def main():
    parser = argparse.ArgumentParser(
        description="Configure logging for Velocity Router",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --separate-files                 # Enable separate log files
  %(prog)s --unified                        # Use single log file
  %(prog)s --level DEBUG --separate-files   # Set DEBUG level with separate files
  %(prog)s --preview                        # Preview log file structure
  %(prog)s --test                           # Test current logging setup
        """
    )
    
    # Logging mode
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--separate-files", 
        action="store_true",
        help="Use separate files for different log levels (INFO/DEBUG, WARNING, ERROR)"
    )
    mode_group.add_argument(
        "--unified", 
        action="store_true",
        help="Use a single file for all log levels"
    )
    
    # Configuration options
    parser.add_argument(
        "--level", 
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Set the logging level"
    )
    parser.add_argument(
        "--log-dir", 
        default="logs",
        help="Directory for log files (default: logs)"
    )
    parser.add_argument(
        "--no-console", 
        action="store_true",
        help="Disable console output"
    )
    parser.add_argument(
        "--no-file", 
        action="store_true",
        help="Disable file output"
    )
    parser.add_argument(
        "--no-json", 
        action="store_true",
        help="Disable JSON formatting"
    )
    
    # Actions
    parser.add_argument(
        "--preview", 
        action="store_true",
        help="Preview the log file structure without making changes"
    )
    parser.add_argument(
        "--test", 
        action="store_true",
        help="Test the current logging configuration"
    )
    parser.add_argument(
        "--status", 
        action="store_true",
        help="Show current logging configuration"
    )
    
    args = parser.parse_args()
    
    # Show current status
    if args.status:
        current_config = get_current_config()
        if current_config:
            print("\n📊 Current Logging Configuration:")
            print("=" * 40)
            for key, value in current_config.items():
                print(f"  {key}: {value}")
        else:
            print("❌ Could not read current configuration")
        return
    
    # Preview mode
    if args.preview:
        separate_files = True
        if args.unified:
            separate_files = False
        preview_log_files(separate_files, args.log_dir)
        return
    
    # Test mode
    if args.test:
        current_config = get_current_config() or {}
        test_logging_setup(
            separate_files=current_config.get('separate_log_files', True),
            log_level=args.level or current_config.get('log_level', 'INFO'),
            log_dir=args.log_dir
        )
        return
    
    # Update configuration
    if args.separate_files or args.unified or args.level:
        print("🔧 Updating logging configuration...")
        
        separate_files = None
        if args.separate_files:
            separate_files = True
        elif args.unified:
            separate_files = False
        
        success = update_application_config(
            separate_files=separate_files,
            log_level=args.level,
            console_output=None if not args.no_console else False,
            file_output=None if not args.no_file else False,
            json_format=None if not args.no_json else False,
            log_dir=args.log_dir if args.log_dir != "logs" else None
        )
        
        if success:
            print("✅ Configuration updated successfully!")
            
            # Show preview of new configuration
            preview_log_files(
                separate_files if separate_files is not None else True,
                args.log_dir
            )
            
            print("💡 Restart the application to apply the new logging configuration.")
        else:
            print("❌ Failed to update configuration")
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 