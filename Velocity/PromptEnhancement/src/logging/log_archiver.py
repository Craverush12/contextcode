"""
Weekly Log Archival System for Velocity Router

This module provides automated log rotation and archival capabilities:
- Weekly log file compression into ZIP archives
- Configurable retention policies
- Background scheduling with thread safety
- Integration with existing logging system
- Disk space management
- Beautiful console output for monitoring
"""

import os
import shutil
import zipfile
import schedule
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging
from dataclasses import dataclass
import json
import glob

# Import our enhanced logger for beautiful output
from .logger import get_logger, StructuredLogger

@dataclass
class ArchivalConfig:
    """Configuration for log archival system."""
    log_directory: str = "logs"
    archive_directory: str = "logs/archives"
    retention_days: int = 30  # Keep archives for 30 days
    max_archive_size_mb: int = 100  # Max size per archive in MB
    compress_level: int = 6  # ZIP compression level (0-9)
    run_at_time: str = "02:00"  # Run at 2 AM every Sunday
    enabled: bool = True
    backup_before_archive: bool = True
    preserve_log_structure: bool = True

class LogArchiver:
    """Automated log archival system with weekly scheduling."""
    
    def __init__(self, config: Optional[ArchivalConfig] = None):
        """Initialize the log archiver with configuration."""
        self.config = config or ArchivalConfig()
        self.logger = get_logger("log_archiver")
        self.scheduler_thread: Optional[threading.Thread] = None
        self.running = False
        self._stop_event = threading.Event()
        
        # Ensure archive directory exists
        os.makedirs(self.config.archive_directory, exist_ok=True)
        
        self.logger.info("🗂️ Log Archiver initialized", 
                        archive_dir=self.config.archive_directory,
                        retention_days=self.config.retention_days)
    
    def get_log_files(self) -> List[Path]:
        """Get list of log files to archive."""
        log_dir = Path(self.config.log_directory)
        if not log_dir.exists():
            self.logger.warning("📁 Log directory not found", directory=str(log_dir))
            return []
        
        # Find all .log files
        log_files = []
        patterns = ["*.log", "*.txt"]
        
        for pattern in patterns:
            log_files.extend(log_dir.glob(pattern))
        
        # Filter out empty files and very recent files (< 1 hour old)
        filtered_files = []
        cutoff_time = datetime.now() - timedelta(hours=1)
        
        for log_file in log_files:
            if log_file.is_file():
                # Check file size and modification time
                stat = log_file.stat()
                if stat.st_size > 0:  # Not empty
                    mod_time = datetime.fromtimestamp(stat.st_mtime)
                    if mod_time < cutoff_time:  # Not too recent
                        filtered_files.append(log_file)
        
        self.logger.debug("📋 Found log files for archival", 
                         total_files=len(log_files),
                         eligible_files=len(filtered_files))
        
        return filtered_files
    
    def create_archive_name(self) -> str:
        """Create a timestamped archive name."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"velocity_logs_{timestamp}.zip"
    
    def archive_logs(self) -> bool:
        """Archive current log files into a ZIP file."""
        try:
            log_files = self.get_log_files()
            if not log_files:
                self.logger.info("📭 No log files found for archival")
                return True
            
            archive_path = Path(self.config.archive_directory) / self.create_archive_name()
            
            self.logger.info("📦 Starting log archival process", 
                           files_count=len(log_files),
                           archive_path=str(archive_path))
            
            # Create backup if requested
            if self.config.backup_before_archive:
                self._create_backup(log_files)
            
            # Create ZIP archive
            total_size = 0
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED, 
                               compresslevel=self.config.compress_level) as zipf:
                
                for log_file in log_files:
                    try:
                        # Add file to archive
                        arcname = log_file.name
                        if self.config.preserve_log_structure:
                            # Preserve directory structure within logs
                            rel_path = log_file.relative_to(Path(self.config.log_directory))
                            arcname = str(rel_path)
                        
                        zipf.write(log_file, arcname)
                        file_size = log_file.stat().st_size
                        total_size += file_size
                        
                        self.logger.debug("📄 Added file to archive", 
                                        file=log_file.name,
                                        size_mb=round(file_size / 1024 / 1024, 2))
                        
                    except Exception as e:
                        self.logger.error("❌ Failed to add file to archive", 
                                        file=str(log_file),
                                        error=str(e))
            
            # Verify archive was created successfully
            if archive_path.exists():
                archive_size = archive_path.stat().st_size
                compression_ratio = (1 - archive_size / total_size) * 100 if total_size > 0 else 0
                
                self.logger.info("✅ Archive created successfully", 
                               archive_path=str(archive_path),
                               original_size_mb=round(total_size / 1024 / 1024, 2),
                               archive_size_mb=round(archive_size / 1024 / 1024, 2),
                               compression_ratio=f"{compression_ratio:.1f}%")
                
                # Clear archived log files
                self._clear_archived_logs(log_files)
                
                # Clean up old archives
                self._cleanup_old_archives()
                
                return True
            else:
                self.logger.error("❌ Archive creation failed - file not found")
                return False
                
        except Exception as e:
            self.logger.error("💥 Archive creation failed with exception", 
                            error=str(e), exc_info=True)
            return False
    
    def _create_backup(self, log_files: List[Path]) -> None:
        """Create backup copies of log files before archiving."""
        try:
            backup_dir = Path(self.config.archive_directory) / "backups"
            backup_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            for log_file in log_files:
                backup_name = f"{log_file.stem}_{timestamp}{log_file.suffix}"
                backup_path = backup_dir / backup_name
                shutil.copy2(log_file, backup_path)
                
            self.logger.debug("💾 Created backup copies", 
                            backup_dir=str(backup_dir),
                            files_count=len(log_files))
                            
        except Exception as e:
            self.logger.warning("⚠️ Backup creation failed", error=str(e))
    
    def _clear_archived_logs(self, log_files: List[Path]) -> None:
        """Clear or truncate archived log files."""
        try:
            for log_file in log_files:
                try:
                    # Truncate file instead of deleting to preserve file handles
                    with open(log_file, 'w') as f:
                        f.truncate(0)
                    
                    self.logger.debug("🧹 Cleared log file", file=str(log_file))
                    
                except Exception as e:
                    self.logger.warning("⚠️ Failed to clear log file", 
                                      file=str(log_file), error=str(e))
                                      
        except Exception as e:
            self.logger.error("❌ Failed to clear archived logs", error=str(e))
    
    def _cleanup_old_archives(self) -> None:
        """Remove archives older than retention period."""
        try:
            archive_dir = Path(self.config.archive_directory)
            cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
            
            removed_count = 0
            total_size_removed = 0
            
            # Find old archive files
            for archive_file in archive_dir.glob("velocity_logs_*.zip"):
                try:
                    mod_time = datetime.fromtimestamp(archive_file.stat().st_mtime)
                    if mod_time < cutoff_date:
                        file_size = archive_file.stat().st_size
                        archive_file.unlink()
                        removed_count += 1
                        total_size_removed += file_size
                        
                        self.logger.debug("🗑️ Removed old archive", 
                                        file=archive_file.name,
                                        age_days=(datetime.now() - mod_time).days)
                        
                except Exception as e:
                    self.logger.warning("⚠️ Failed to remove old archive", 
                                      file=str(archive_file), error=str(e))
            
            if removed_count > 0:
                self.logger.info("🧹 Cleaned up old archives", 
                               removed_count=removed_count,
                               space_freed_mb=round(total_size_removed / 1024 / 1024, 2))
            else:
                self.logger.debug("✨ No old archives to clean up")
                
        except Exception as e:
            self.logger.error("❌ Archive cleanup failed", error=str(e))
    
    def get_archive_stats(self) -> Dict[str, Any]:
        """Get statistics about current archives."""
        try:
            archive_dir = Path(self.config.archive_directory)
            if not archive_dir.exists():
                return {"error": "Archive directory not found"}
            
            archives = list(archive_dir.glob("velocity_logs_*.zip"))
            
            if not archives:
                return {
                    "total_archives": 0,
                    "total_size_mb": 0,
                    "oldest_archive": None,
                    "newest_archive": None
                }
            
            total_size = sum(archive.stat().st_size for archive in archives)
            
            # Sort by modification time
            archives_with_time = [(archive, archive.stat().st_mtime) for archive in archives]
            archives_with_time.sort(key=lambda x: x[1])
            
            oldest = archives_with_time[0][0]
            newest = archives_with_time[-1][0]
            
            return {
                "total_archives": len(archives),
                "total_size_mb": round(total_size / 1024 / 1024, 2),
                "oldest_archive": {
                    "name": oldest.name,
                    "date": datetime.fromtimestamp(oldest.stat().st_mtime).isoformat(),
                    "size_mb": round(oldest.stat().st_size / 1024 / 1024, 2)
                },
                "newest_archive": {
                    "name": newest.name,
                    "date": datetime.fromtimestamp(newest.stat().st_mtime).isoformat(),
                    "size_mb": round(newest.stat().st_size / 1024 / 1024, 2)
                }
            }
            
        except Exception as e:
            self.logger.error("❌ Failed to get archive stats", error=str(e))
            return {"error": str(e)}
    
    def start_scheduler(self) -> None:
        """Start the weekly archival scheduler."""
        if self.running:
            self.logger.warning("⚠️ Scheduler already running")
            return
        
        if not self.config.enabled:
            self.logger.info("📴 Log archival is disabled in configuration")
            return
        
        # Schedule weekly archival every Sunday at specified time
        schedule.every().sunday.at(self.config.run_at_time).do(self._scheduled_archive)
        
        self.running = True
        self._stop_event.clear()
        
        # Start scheduler thread
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        self.logger.info("🚀 Weekly log archival scheduler started", 
                        run_time=f"Every Sunday at {self.config.run_at_time}",
                        retention_days=self.config.retention_days)
    
    def stop_scheduler(self) -> None:
        """Stop the weekly archival scheduler."""
        if not self.running:
            self.logger.info("📴 Scheduler is not running")
            return
        
        self.running = False
        self._stop_event.set()
        schedule.clear()
        
        if self.scheduler_thread and self.scheduler_thread.is_alive():
            self.scheduler_thread.join(timeout=5)
        
        self.logger.info("🛑 Weekly log archival scheduler stopped")
    
    def _run_scheduler(self) -> None:
        """Run the scheduler in background thread."""
        self.logger.debug("🔄 Scheduler thread started")
        
        while self.running and not self._stop_event.is_set():
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                self.logger.error("💥 Scheduler error", error=str(e))
                time.sleep(300)  # Wait 5 minutes before retrying
        
        self.logger.debug("🔄 Scheduler thread stopped")
    
    def _scheduled_archive(self) -> None:
        """Execute scheduled archival with enhanced logging."""
        self.logger.info("⏰ Starting scheduled weekly log archival")
        
        try:
            success = self.archive_logs()
            if success:
                stats = self.get_archive_stats()
                self.logger.info("✅ Scheduled archival completed successfully", **stats)
            else:
                self.logger.error("❌ Scheduled archival failed")
                
        except Exception as e:
            self.logger.error("💥 Scheduled archival error", error=str(e), exc_info=True)
    
    def force_archive_now(self) -> bool:
        """Force immediate archival (for testing or manual triggers)."""
        self.logger.info("🚀 Manual log archival triggered")
        return self.archive_logs()

# Global archiver instance
_archiver_instance: Optional[LogArchiver] = None

def get_archiver(config: Optional[ArchivalConfig] = None) -> LogArchiver:
    """Get or create the global log archiver instance."""
    global _archiver_instance
    
    if _archiver_instance is None:
        _archiver_instance = LogArchiver(config)
    
    return _archiver_instance

def start_log_archival(config: Optional[ArchivalConfig] = None) -> LogArchiver:
    """Start the log archival system with optional configuration."""
    archiver = get_archiver(config)
    archiver.start_scheduler()
    return archiver

def stop_log_archival() -> None:
    """Stop the log archival system."""
    global _archiver_instance
    
    if _archiver_instance:
        _archiver_instance.stop_scheduler()

def archive_logs_now(config: Optional[ArchivalConfig] = None) -> bool:
    """Force immediate log archival."""
    archiver = get_archiver(config)
    return archiver.force_archive_now()
