"""
Standardized logging module for the Velocity router.

This module provides a consistent logging infrastructure with:
- Centralized configuration
- Structured logging with JSON output
- Custom log levels
- Performance measurement decorators
- Context propagation
- Thread/context safety
- Separate log files for different log levels
- HTTP access logging with user tracking
"""

import logging
import sys
import os
import time
import uuid
import json
import inspect
import functools
from datetime import datetime
from typing import Any, Dict, Optional, Callable, List, Union
import traceback
import threading
from pathlib import Path
import asyncio
import contextlib

# Define custom log level for trace logging
TRACE = 5
logging.addLevelName(TRACE, "TRACE")

# Define custom log level for access logging
ACCESS = 25  # Set above INFO level (20) so it's always logged
logging.addLevelName(ACCESS, "ACCESS")

# Thread local storage for context information
_context_storage = threading.local()

class LogLevelFilter(logging.Filter):
    """Filter logs to only allow specific log levels."""
    
    def __init__(self, level_names: List[str]):
        """
        Initialize filter with a list of allowed log level names.
        
        Args:
            level_names: List of log level names to allow (e.g., ['INFO', 'DEBUG'])
        """
        super().__init__()
        self.allowed_levels = {getattr(logging, level.upper()) for level in level_names if hasattr(logging, level.upper())}
        # Add custom levels
        if 'TRACE' in [level.upper() for level in level_names]:
            self.allowed_levels.add(TRACE)
        if 'ACCESS' in [level.upper() for level in level_names]:
            self.allowed_levels.add(ACCESS)
    
    def filter(self, record):
        """Return True if the record should be logged."""
        return record.levelno in self.allowed_levels

class AccessLogFormatter(logging.Formatter):
    """Format access log records in a web server-like format with user ID."""
    
    def format(self, record):
        """Format the access log record in Apache-like format with user ID."""
        # Extract access log data from the record
        ip = getattr(record, 'client_ip', '-')
        user_id = getattr(record, 'user_id', '-')
        timestamp = datetime.fromtimestamp(record.created).strftime('%d/%b/%Y:%H:%M:%S %z')
        method = getattr(record, 'method', '-')
        url = getattr(record, 'url', '-')
        protocol = getattr(record, 'protocol', 'HTTP/1.1')
        status_code = getattr(record, 'status_code', '-')
        response_size = getattr(record, 'response_size', '-')
        referer = getattr(record, 'referer', '"-"')
        user_agent = getattr(record, 'user_agent', '"-"')
        duration_ms = getattr(record, 'duration_ms', '-')
        
        # Format: IP - USER_ID [TIMESTAMP] "METHOD URL PROTOCOL" STATUS SIZE "REFERER" "USER_AGENT" DURATION
        return f'{ip} - {user_id} [{timestamp}] "{method} {url} {protocol}" {status_code} {response_size} {referer} {user_agent} {duration_ms} ms'

class JsonFormatter(logging.Formatter):
    """Format log records as JSON for easy parsing and analysis."""
    
    def format(self, record):
        """Format the log record as a JSON object."""
        # Get the log message
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "path": f"{record.pathname}:{record.lineno}",
            "function": record.funcName,
        }
        
        # Add exception info if available
        if record.exc_info:
            exception_type = record.exc_info[0].__name__ if record.exc_info[0] else None
            exception_message = str(record.exc_info[1]) if record.exc_info[1] else None
            exception_traceback = self.formatException(record.exc_info) if record.exc_info[2] else None
            
            log_record["exception"] = {
                "type": exception_type,
                "message": exception_message,
                "traceback": exception_traceback
            }
        
        # Add extra attributes from record
        for key, value in record.__dict__.items():
            if key not in ["args", "exc_info", "exc_text", "levelname", 
                           "levelno", "msecs", "msg", "created", "relativeCreated",
                           "funcName", "lineno", "module", "name", "pathname", 
                           "process", "processName", "thread", "threadName"]:
                log_record[key] = value
        
        # Add thread context if available
        if hasattr(_context_storage, 'context'):
            for key, value in _context_storage.context.items():
                log_record[key] = value
        
        # ENSURE critical fields are ALWAYS present in ALL logs for consistency
        # If not in context, set to null
        required_fields = {
            'request_id': None,
            'client_ip': None, 
            'user_id': None,
            'path': None
        }
        
        for field, default_value in required_fields.items():
            if field not in log_record:
                log_record[field] = default_value
        
        return json.dumps(log_record)

class StructuredLogger(logging.Logger):
    """Enhanced logger with structured logging capabilities."""
    
    def __init__(self, name: str, level: int = logging.NOTSET):
        """Initialize a structured logger."""
        super().__init__(name, level)
        self.init_context()
    
    def init_context(self):
        """Initialize context storage."""
        if not hasattr(_context_storage, 'context'):
            _context_storage.context = {}
    
    def trace(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log at TRACE level (more detailed than DEBUG)."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
            
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(TRACE):
            self._log(TRACE, msg, args, extra=extra)
    
    def access(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log at ACCESS level for HTTP access logging."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
            
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(ACCESS):
            self._log(ACCESS, msg, args, extra=extra)
    
    def info(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced info method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.INFO):
            self._log(logging.INFO, msg, args, extra=extra)
    
    def debug(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced debug method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.DEBUG):
            self._log(logging.DEBUG, msg, args, extra=extra)
    
    def warning(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced warning method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.WARNING):
            self._log(logging.WARNING, msg, args, extra=extra)
    
    def error(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced error method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.ERROR):
            self._log(logging.ERROR, msg, args, extra=extra)
    
    def critical(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced critical method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.CRITICAL):
            self._log(logging.CRITICAL, msg, args, extra=extra)
    
    def exception(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Enhanced exception method that properly handles extra keyword arguments."""
        # Extract standard kwargs that should be passed to _log
        extra = kwargs.pop('extra', {}) if 'extra' in kwargs else {}
        
        # Move all custom kwargs to extra
        for key, value in kwargs.items():
            extra[key] = value
        
        # Call the parent _log method with the standard arguments plus our extra dict
        if self.isEnabledFor(logging.ERROR):
            self._log(logging.ERROR, msg, args, exc_info=True, extra=extra)
    
    def set_context(self, **kwargs: Any) -> None:
        """Set contextual information for the current thread."""
        self.init_context()
        _context_storage.context.update(kwargs)
    
    def get_context(self) -> Dict[str, Any]:
        """Get the current context dictionary."""
        self.init_context()
        return dict(_context_storage.context)
    
    def clear_context(self) -> None:
        """Clear all contextual information."""
        self.init_context()
        _context_storage.context.clear()
    
    def with_context(self, **kwargs: Any) -> 'StructuredLogger':
        """Create a new logger with the given context added."""
        self.set_context(**kwargs)
        return self
    
    def performance(self, operation: str, duration: float, **kwargs: Any) -> None:
        """Log a performance metric."""
        # Convert seconds to milliseconds for easier reading
        duration_ms = round(duration * 1000, 2)
        
        # Add performance-specific fields
        kwargs.update({
            "operation": operation,
            "duration_ms": duration_ms,
            "metric_type": "performance"
        })
        
        # Log at INFO level
        self.info(f"Performance metric: {operation}", **kwargs)

# Register the StructuredLogger class with the logging module
logging.setLoggerClass(StructuredLogger)

def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger with the given name."""
    return logging.getLogger(name)

def configure_logging(
    level: Union[int, str] = logging.INFO,
    console_output: bool = True,
    file_output: bool = False,
    log_file: str = "velocity.log",
    json_format: bool = True,
    log_dir: Optional[str] = None,
    separate_log_files: bool = False,
    info_log_file: str = None,
    warning_log_file: str = None,
    error_log_file: str = None,
    access_log_enabled: bool = False,
    access_log_file: str = None
) -> StructuredLogger:
    """Configure logging for the entire application.
    
    Args:
        level: Log level (e.g., "DEBUG", "INFO", "WARNING", etc.)
        console_output: Whether to output logs to console
        file_output: Whether to output logs to a file
        log_file: Path to log file (if file_output is True and separate_log_files is False)
        json_format: Whether to format logs as JSON
        log_dir: Directory for log files (defaults to current directory)
        separate_log_files: Whether to create separate files for different log levels
        info_log_file: Path for info-level logs (when separate_log_files is True)
        warning_log_file: Path for warning-level logs (when separate_log_files is True)
        error_log_file: Path for error-level logs (when separate_log_files is True)
        access_log_enabled: Whether to enable HTTP access logging
        access_log_file: Path for HTTP access logs (when access_log_enabled is True)
                        Format depends on json_format setting: JSON if True, Apache-style if False
        
    Returns:
        The root logger
    """
    # Get current date for log file naming
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")
    if info_log_file is None:
        info_log_file = f"info-{date_str}.log"
    if warning_log_file is None:
        warning_log_file = f"warning-{date_str}.log"
    if error_log_file is None:
        error_log_file = f"error-{date_str}.log"
    if access_log_file is None:
        access_log_file = f"access-{date_str}.log"
    
    # Convert string level to int if needed
    if isinstance(level, str):
        # Handle the special case for "TRACE" before converting
        if level.upper() == "TRACE":
            level = TRACE
        else:
            level = getattr(logging, level.upper(), logging.INFO)
    
    # Get the root logger
    root_logger = get_logger("")
    root_logger.setLevel(level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatters
    if json_format:
        formatter = JsonFormatter()
        # Use JSON format for access logs when json_format is True
        access_formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s"
        )
        # Use Apache-like format for access logs when json_format is False
        access_formatter = AccessLogFormatter()
    
    # Add console handler if requested
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        # Exclude access logs from console output
        console_filter = LogLevelFilter(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'TRACE'])
        console_handler.addFilter(console_filter)
        root_logger.addHandler(console_handler)
    
    # Add file handler(s) if requested
    if file_output:
        # Ensure log directory exists
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
            
        if separate_log_files:
            # Create separate handlers for different log levels
            log_file_configs = [
                {
                    'filename': info_log_file,
                    'levels': ['DEBUG', 'INFO', 'TRACE'],
                    'description': 'Info/Debug'
                },
                {
                    'filename': warning_log_file,
                    'levels': ['WARNING'],
                    'description': 'Warning'
                },
                {
                    'filename': error_log_file,
                    'levels': ['ERROR', 'CRITICAL'],
                    'description': 'Error/Critical'
                }
            ]
            
            for config in log_file_configs:
                # Determine file path
                if log_dir:
                    log_path = os.path.join(log_dir, config['filename'])
                else:
                    log_path = config['filename']
                
                # Create file handler
                file_handler = logging.FileHandler(log_path)
                file_handler.setFormatter(formatter)
                
                # Add level filter
                level_filter = LogLevelFilter(config['levels'])
                file_handler.addFilter(level_filter)
                
                # Add handler to logger
                root_logger.addHandler(file_handler)
                
                # Remove or comment out print statements that flood the terminal
                # print(f"Created {config['description']} log file: {log_path}")
        else:
            # Single file for all logs (original behavior)
            if log_dir:
                log_path = os.path.join(log_dir, log_file)
            else:
                log_path = log_file
                
            file_handler = logging.FileHandler(log_path)
            file_handler.setFormatter(formatter)
            # Exclude access logs from regular log file
            regular_filter = LogLevelFilter(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'TRACE'])
            file_handler.addFilter(regular_filter)
            root_logger.addHandler(file_handler)
            # Remove or comment out print statements that flood the terminal
            # print(f"Created unified log file: {log_path}")
    
    # Add access log handler if requested
    if access_log_enabled:
        # Determine access log file path
        if log_dir:
            access_log_path = os.path.join(log_dir, access_log_file)
        else:
            access_log_path = access_log_file
        
        # Create access log handler
        access_handler = logging.FileHandler(access_log_path)
        access_handler.setFormatter(access_formatter)
        
        # Add access level filter
        access_filter = LogLevelFilter(['ACCESS'])
        access_handler.addFilter(access_filter)
        
        # Set the access handler level to allow ACCESS logs
        access_handler.setLevel(ACCESS)
        
        # Add handler to logger
        root_logger.addHandler(access_handler)
        
        # Ensure the http.access logger allows ACCESS level
        access_logger = get_logger("http.access")
        access_logger.setLevel(ACCESS)
        
        access_format = "JSON" if json_format else "Apache-style"
        # Remove or comment out print statements that flood the terminal
        # print(f"Created HTTP access log file: {access_log_path} (format: {access_format})")
    
    # Log startup information
    level_name = logging.getLevelName(level)
    log_mode = "Separate files" if separate_log_files and file_output else "Unified file" if file_output else "Console only"
    access_mode = "Enabled" if access_log_enabled else "Disabled"
    # Remove or comment out print statements that flood the terminal
    # print(f"Logging configured - Level: {level_name}, Console: {console_output}, File: {file_output}, JSON: {json_format}, Mode: {log_mode}, Access Log: {access_mode}")
    
    return root_logger

def log_execution_time(logger: Optional[StructuredLogger] = None) -> Callable:
    """Decorator to log execution time of a function.
    
    Args:
        logger: Logger to use. If None, a logger will be created with the function's module name.
    
    Returns:
        A decorator that logs execution time.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Get logger if not provided
            nonlocal logger
            if logger is None:
                logger = get_logger(func.__module__)
            
            # Generate unique operation ID for tracking
            operation_id = str(uuid.uuid4())
            function_name = func.__qualname__
            
            # Log start of operation
            logger.info(
                f"Starting {function_name}",
                operation_id=operation_id,
                function=function_name
            )
            
            # Execute function and measure time
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                success = True
                return result
            except Exception as e:
                success = False
                logger.exception(
                    f"Exception in {function_name}",
                    operation_id=operation_id,
                    function=function_name,
                    exception={"type": type(e).__name__, "message": str(e)}
                )
                raise
            finally:
                # Log performance metric
                end_time = time.time()
                duration = end_time - start_time
                logger.performance(
                    function_name,
                    duration,
                    operation_id=operation_id,
                    success=success
                )
        
        return wrapper
    
    return decorator

def async_log_execution_time(logger: Optional[StructuredLogger] = None) -> Callable:
    """Decorator to log execution time of an async function.
    
    Args:
        logger: Logger to use. If None, a logger will be created with the function's module name.
    
    Returns:
        A decorator that logs execution time.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Get logger if not provided
            nonlocal logger
            if logger is None:
                logger = get_logger(func.__module__)
            
            # Generate unique operation ID for tracking
            operation_id = str(uuid.uuid4())
            function_name = func.__qualname__
            
            # Log start of operation
            logger.info(
                f"Starting {function_name}",
                operation_id=operation_id,
                function=function_name
            )
            
            # Execute function and measure time
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                success = True
                return result
            except Exception as e:
                success = False
                logger.exception(
                    f"Exception in {function_name}",
                    operation_id=operation_id,
                    function=function_name,
                    exception={"type": type(e).__name__, "message": str(e)}
                )
                raise
            finally:
                # Log performance metric
                end_time = time.time()
                duration = end_time - start_time
                logger.performance(
                    function_name,
                    duration,
                    operation_id=operation_id,
                    success=success
                )
        
        return wrapper
    
    return decorator

@contextlib.contextmanager
def log_context(logger: StructuredLogger, **context):
    """Context manager for temporarily setting logger context.
    
    Args:
        logger: The logger to set context for
        **context: Context key-value pairs
    """
    # Save the old context
    old_context = logger.get_context()
    
    try:
        # Set the new context
        logger.set_context(**context)
        yield
    finally:
        # Restore the old context
        logger.clear_context()
        logger.set_context(**old_context)

def log_http_access(
    client_ip: str,
    user_id: str,
    method: str,
    url: str,
    protocol: str,
    status_code: int,
    response_size: int,
    referer: str = "-",
    user_agent: str = "-",
    duration_ms: float = 0.0
) -> None:
    """Log HTTP access information in Apache-like format with user ID.
    
    Args:
        client_ip: Client IP address
        user_id: User ID (extracted from auth token or request)
        method: HTTP method (GET, POST, etc.)
        url: Request URL
        protocol: HTTP protocol (HTTP/1.1, etc.)
        status_code: HTTP status code
        response_size: Response size in bytes
        referer: HTTP referer header
        user_agent: User agent string
        duration_ms: Request duration in milliseconds
    """
    access_logger = get_logger("http.access")
    
    access_logger.access(
        f"HTTP {method} {url} - {status_code}",
        client_ip=client_ip,
        user_id=user_id,
        method=method,
        url=url,
        protocol=protocol,
        status_code=status_code,
        response_size=response_size,
        referer=f'"{referer}"' if referer != "-" else '"-"',
        user_agent=f'"{user_agent}"' if user_agent != "-" else '"-"',
        duration_ms=duration_ms
    )