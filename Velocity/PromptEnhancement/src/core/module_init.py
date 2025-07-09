"""
Module initialization file to ensure correct dependency ordering.

This file explicitly initializes all modules in the correct order to avoid
circular dependencies and ensure proper registration with the DI container.
"""

# Step 1: Initialize logging first
from src.logging.logger import configure_logging, get_logger
import os

# Configure logging with consistent JSON format and separate files 
# (matches the main application.py configuration)
logger = configure_logging(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    console_output=True,
    file_output=True,
    log_file="velocity.log",  # Used only if separate_log_files=False
    json_format=True,
    log_dir="logs",
    separate_log_files=True,  # Enable separate log files for different levels
    access_log_enabled=True,  # Enable HTTP access logging
)

# Get module logger
logger = get_logger(__name__)

# Step 2: Import container and interfaces
from src.core import container, ConfigProvider, CacheProvider, Analyzer, ModelSelector, ModelProvider

# Step 3: Load configuration
from src.config.config_manager import ConfigurationManager, config_manager

# Step 4: Initialize cache
from src.cache.cache_config import CacheManager, cache_manager

# Step 5: Initialize analyzer
from src.analysis.analyzer import Analyzer, get_instance as get_analyzer_instance
analyzer = get_analyzer_instance()

# Step 6: Initialize model provider
from src.llm.llm_provider import LLMProvider

# Step 7: Initialize selector
from src.llm.selector_v4 import SimpleSelector, selector

# Step 8: Initialize enhancer
from src.enhancement.enhancer import PromptEnhancer

# Step 9: Initialize RelevancePlanner
from src.analysis.relevance_planner import RelevancePlanner

# Re-register all components to ensure they're properly set up
container.register_instance(ConfigProvider, config_manager)
container.register_instance(CacheProvider, cache_manager)
container.register_instance(Analyzer, analyzer)
container.register_instance(ModelSelector, selector)

# Register RelevancePlanner as a factory (since it needs ModelProvider dependency)
def get_relevance_planner():
    """Factory function to create RelevancePlanner with ModelProvider dependency."""
    model_provider = container.resolve(ModelProvider)
    return RelevancePlanner(model_provider)

container.register_factory(RelevancePlanner, get_relevance_planner)

# Export components for easier imports
__all__ = [
    'container', 'config_manager', 'cache_manager', 
    'selector'
]