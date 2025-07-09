"""Consolidated configuration management system for Velocity.

This module provides a unified way to manage hierarchical configuration from multiple sources:
1. Default configuration values
2. Configuration files
3. Environment variables
4. Command line arguments

It supports different environments (development, testing, production) and provides
validation for configuration values.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List, Union, cast
import importlib.util
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import the ConfigProvider interface
from src.core import ConfigProvider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConfigValidationRule:
    """Rule for validating configuration values."""
    required: bool = False
    type: Optional[type] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    allowed_values: Optional[List[Any]] = None
    nested_rules: Optional[Dict[str, 'ConfigValidationRule']] = None

class ConfigurationManager(ConfigProvider):
    """Unified hierarchical configuration manager for Velocity."""
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance of ConfigurationManager."""
        if cls._instance is None:
            cls._instance = ConfigurationManager()
        return cls._instance
    
    def __init__(self):
        """Initialize the configuration manager with default values."""
        self._config: Dict[str, Any] = {}
        self._validation_rules: Dict[str, ConfigValidationRule] = {}
        self._env = os.environ.get("VELOCITY_ENV", "development")
        
        # Load default configuration
        self._load_default_config()
        
        # Load environment-specific configuration
        self._load_env_config()
        
        # Override with environment variables
        self._load_env_vars()
        
        # Set up validation rules
        self._setup_validation_rules()
        
        # Validate the configuration
        self._validate_config()
        
        logger.info(f"Configuration loaded for environment: {self._env}")
    
    def _load_default_config(self):
        """Load default configuration from the main config file."""
        try:
            # Dynamically import the config module
            config_path = Path(__file__).parent / "config.py"
            spec = importlib.util.spec_from_file_location("config", config_path)
            if spec and spec.loader:
                config_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(config_module)
                
                # Get all uppercase variables from the module
                for key in dir(config_module):
                    if key.isupper():
                        value = getattr(config_module, key)
                        # Convert to sections based on naming convention
                        section = key.split('_')[0].lower() if '_' in key else 'general'
                        
                        if section not in self._config:
                            self._config[section] = {}
                        
                        # If it's a CONFIG dict, use it directly
                        if key.endswith('_CONFIG') and isinstance(value, dict):
                            self._config[section] = value
                        else:
                            # Just add as a value in the section
                            self._config[section][key] = value
        except Exception as e:
            logger.error(f"Error loading default configuration: {str(e)}")
            # If the config file doesn't exist, create default configuration
            self._create_default_config()
    
    def _create_default_config(self):
        """Create a default configuration in memory when no config file exists."""
        logger.info("Creating default configuration...")
        
        # Set up basic default configuration
        self._config = {
            "general": {
                "env": self._env,
                "debug": self._env == "development",
                "log_level": "INFO"
            },
            "cache": {
                "enabled": True,
                "max_size": 10000,
                "default_ttl": 3600,  # 1 hour
                "use_redis": False
            },
            "redis": {
                "enabled": False,
                "host": "localhost",
                "port": 6379,
                "password": "",
                "db": 0
            },
            "llm": {
                "default_provider": "openai",
                "timeout": 60,
                "max_retries": 3
            },
            "openai": {
                "api_key": os.environ.get("OPENAI_API_KEY", ""),
                "model": "gpt-4"
            },
            "groq": {
                "api_key": os.environ.get("GROQ_API_KEY", ""),
                "model": "llama-3.1-8b-instant"  # Updated to the correct model name
            },
            "nvidia": {
                "api_key": os.environ.get("NVIDIA_API_KEY", ""),
                "model": "meta/llama2-70b"
            },
            "gemini": {
                "api_key": os.environ.get("GEMINI_API_KEY", ""),
                "model": "google/gemma-7b"
            }
        }
        
        logger.info("Default configuration created successfully")
    
    def _load_env_config(self):
        """Load environment-specific configuration."""
        env_config_path = Path(__file__).parent.parent / f"config.{self._env}.py"
        if env_config_path.exists():
            try:
                spec = importlib.util.spec_from_file_location(f"config_{self._env}", env_config_path)
                if spec and spec.loader:
                    env_config = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(env_config)
                    
                    # Override with environment-specific config
                    for key in dir(env_config):
                        if key.isupper():
                            value = getattr(env_config, key)
                            section = key.split('_')[0].lower() if '_' in key else 'general'
                            
                            if section not in self._config:
                                self._config[section] = {}
                            
                            # Handle CONFIG dictionaries
                            if key.endswith('_CONFIG') and isinstance(value, dict):
                                # Deep merge with default config
                                if section in self._config:
                                    self._config[section] = self._deep_merge(self._config[section], value)
                                else:
                                    self._config[section] = value
                            else:
                                # Just override the value
                                self._config[section][key] = value
            except Exception as e:
                logger.error(f"Error loading environment configuration: {str(e)}")
    
    def _load_env_vars(self):
        """Override configuration with environment variables.
        
        Environment variables should be in the format:
        VELOCITY_SECTION_KEY=value
        """
        prefix = "VELOCITY_"
        for key, value in os.environ.items():
            if key.startswith(prefix):
                parts = key[len(prefix):].lower().split('_', 1)
                if len(parts) == 2:
                    section, subkey = parts
                    if section not in self._config:
                        self._config[section] = {}
                    
                    # Try to convert value to appropriate type
                    try:
                        # Try as JSON first (for complex objects)
                        self._config[section][subkey] = json.loads(value)
                    except json.JSONDecodeError:
                        # Then try as boolean
                        if value.lower() in ('true', 'yes', '1'):
                            self._config[section][subkey] = True
                        elif value.lower() in ('false', 'no', '0'):
                            self._config[section][subkey] = False
                        else:
                            # Try as number
                            try:
                                if '.' in value:
                                    self._config[section][subkey] = float(value)
                                else:
                                    self._config[section][subkey] = int(value)
                            except ValueError:
                                # Default to string
                                self._config[section][subkey] = value
        
        # Map common LLM API keys from environment variables to config keys
        # These keys should already be loaded by dotenv
        env_var_map = {
            "OPENAI_API_KEY": ("openai", "api_key"),
            "GROQ_API_KEY": ("groq", "api_key"),
            "GEMINI_API_KEY": ("gemini", "api_key"),
            "NVIDIA_API_KEY": ("nvidia", "api_key"),
        }
        for env_var, (section, subkey) in env_var_map.items():
            value = os.environ.get(env_var)
            if value:
                if section not in self._config:
                    self._config[section] = {}
                self._config[section][subkey] = value
    
    def _setup_validation_rules(self):
        """Set up validation rules for the configuration."""
        # General rules
        self._validation_rules["general"] = ConfigValidationRule(nested_rules={
            "env": ConfigValidationRule(
                required=True, 
                type=str, 
                allowed_values=["development", "testing", "production"]
            )
        })
        
        # Cache rules
        self._validation_rules["cache"] = ConfigValidationRule(nested_rules={
            "enabled": ConfigValidationRule(required=True, type=bool),
            "max_size": ConfigValidationRule(required=True, type=int, min_value=1),
            "default_ttl": ConfigValidationRule(required=True, type=int, min_value=1),
            "use_redis": ConfigValidationRule(required=True, type=bool)
        })
        
        # Redis rules
        self._validation_rules["redis"] = ConfigValidationRule(nested_rules={
            "enabled": ConfigValidationRule(required=True, type=bool),
            "host": ConfigValidationRule(required=True, type=str),
            "port": ConfigValidationRule(required=True, type=int, min_value=1, max_value=65535)
        })
        
        # Add more validation rules for other sections as needed
    
    def _validate_config(self):
        """Validate the configuration against the rules."""
        errors = []
        
        for section, rule in self._validation_rules.items():
            if section not in self._config:
                if rule.required:
                    errors.append(f"Missing required section: {section}")
                continue
            
            if rule.nested_rules:
                for key, nested_rule in rule.nested_rules.items():
                    if key not in self._config[section]:
                        if nested_rule.required:
                            errors.append(f"Missing required config: {section}.{key}")
                        continue
                    
                    value = self._config[section][key]
                    
                    # Type validation
                    if nested_rule.type and not isinstance(value, nested_rule.type):
                        errors.append(f"Invalid type for {section}.{key}: expected {nested_rule.type.__name__}, got {type(value).__name__}")
                    
                    # Min/max validation for numbers
                    if isinstance(value, (int, float)):
                        if nested_rule.min_value is not None and value < nested_rule.min_value:
                            errors.append(f"Value for {section}.{key} is below minimum: {value} < {nested_rule.min_value}")
                        if nested_rule.max_value is not None and value > nested_rule.max_value:
                            errors.append(f"Value for {section}.{key} is above maximum: {value} > {nested_rule.max_value}")
                    
                    # Allowed values validation
                    if nested_rule.allowed_values is not None and value not in nested_rule.allowed_values:
                        errors.append(f"Invalid value for {section}.{key}: {value} (allowed: {nested_rule.allowed_values})")
        
        if errors:
            for error in errors:
                logger.error(f"Configuration error: {error}")
            # Don't raise an exception, just warn about the issues
    
    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries, with override taking precedence."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge dictionaries
                result[key] = self._deep_merge(result[key], value)
            else:
                # Override or add value
                result[key] = value
        
        return result
    
    # ConfigProvider interface implementation
    def get_config(self, key: str, default: Any = None) -> Any:
        """Get a configuration value by key.
        
        Key should be in format: "section.key"
        """
        parts = key.split('.')
        if len(parts) != 2:
            return default
        
        section, subkey = parts
        if section not in self._config:
            return default
        
        return self._config[section].get(subkey, default)
    
    def get_section(self, section: str) -> Dict[str, Any]:
        """Get an entire configuration section."""
        return self._config.get(section, {}).copy()
    
    # Additional helper methods
    def get_environment(self) -> str:
        """Get the current environment."""
        return self._env
    
    def set_environment(self, env: str) -> None:
        """Set the environment and reload configuration."""
        if env not in ["development", "testing", "production"]:
            logger.warning(f"Unknown environment: {env}, defaulting to 'development'")
            env = "development"
        
        self._env = env
        
        # Reload configuration for the new environment
        self._config = {}
        self._load_default_config()
        self._load_env_config()
        self._load_env_vars()
        self._validate_config()
        
        logger.info(f"Configuration reloaded for environment: {self._env}")
    
    def export_config(self) -> Dict[str, Any]:
        """Export the entire configuration as a dictionary."""
        return self._config.copy()
    
    def reload(self) -> None:
        """Reload the configuration from all sources."""
        self._config = {}
        self._load_default_config()
        self._load_env_config()
        self._load_env_vars()
        self._validate_config()
        logger.info("Configuration reloaded")


# Create an adapter for older code that directly imports constants from config.py
class LegacyConfigAdapter:
    """Adapter for code that relies on direct imports from config.py."""
    
    def __init__(self, config_manager: ConfigurationManager):
        self.config_manager = config_manager
    
    def __getattr__(self, name: str) -> Any:
        """Intercept attribute access to provide compatibility with old code."""
        # Look up the value in the configuration
        for section in self.config_manager.export_config().values():
            if isinstance(section, dict) and name in section:
                return section[name]
        
        # Check for CONFIG dictionaries
        if name.endswith('_CONFIG'):
            section_name = name.split('_')[0].lower()
            section = self.config_manager.get_section(section_name)
            if section:
                return section
        
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")


# Initialize the configuration manager
config_manager = ConfigurationManager.get_instance()

# Create a legacy adapter for backward compatibility
legacy_config = LegacyConfigAdapter(config_manager)