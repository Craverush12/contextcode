"""Default configuration settings for the application."""

import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Ensure we have the right imports for the current project structure
try:
    # Fallback to local imports if router module is not available
    from src.logging.logger import get_logger
    from src.llm.model_fallback import ModelProvider, ModelConfig
    
    # Configure logging with custom logger
    logger = get_logger(__name__)
except ImportError:
    # Configure logging with basic logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

# Load API keys from environment variables 
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Check and log warnings for missing API keys
if not NVIDIA_API_KEY:
    logger.warning("NVIDIA_API_KEY not found in environment variables")
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found in environment variables")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found in environment variables")

# Build LLM configurations
NVIDIA_CONFIG = {
    "model": "meta/llama3-70b-instruct",
    "temperature": 0.7,
    "max_tokens": 4096,
    "api_key": NVIDIA_API_KEY,
    "base_url": "https://api.nvidia.com/v1",
    "stream": True
}

GROQ_CONFIG = {
    "model": "llama-3.1-8b-instant",
    "temperature": 0.7,
    "max_tokens": 8192,
    "api_key": GROQ_API_KEY,
    "base_url": "https://api.groq.com/openai/v1",
    "stream": True
}

GEMINI_CONFIG = {
    "model": "gemini-2.5-flash",
    "temperature": 0.7,
    "max_tokens": 4096,
    "api_key": GEMINI_API_KEY,
    "stream": True
}

OPENAI_CONFIG = {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 4096,
    "api_key": OPENAI_API_KEY,
    "stream": True
}

# Model configurations for model_fallback.py
try:
    MODEL_CONFIGS = {
        ModelProvider.NVIDIA: ModelConfig(
            provider=ModelProvider.NVIDIA,
            model_name="meta/llama3-70b-instruct",
            api_key=NVIDIA_API_KEY,
            temperature=0.7,
            max_tokens=2048,
            cooldown_period=60  # 1 minute cooldown
        ),
        ModelProvider.GROQ: ModelConfig(
            provider=ModelProvider.GROQ,
            model_name="llama-3.3-70b-versatile",  # Fixed lowercase model name for Groq
            api_key=GROQ_API_KEY,
            temperature=0.7,
            max_tokens=2048,
            cooldown_period=60  # 1 minute cooldown
        ),
        ModelProvider.GEMINI: ModelConfig(
            provider=ModelProvider.GEMINI,
            model_name="gemini-pro",  # Updated to use gemini-pro model
            api_key=GEMINI_API_KEY,
            temperature=0.7,
            max_tokens=2048,
            cooldown_period=60  # 1 minute cooldown
        ),
        ModelProvider.OPENAI: ModelConfig(
            provider=ModelProvider.OPENAI,
            model_name="gpt-4",  # Example model name
            api_key=OPENAI_API_KEY,
            temperature=0.7,
            max_tokens=2048,
            cooldown_period=60  # 1 minute cooldown
        )
    }
except NameError:
    # If ModelProvider or ModelConfig is not defined, we skip this part
    logger.warning("ModelProvider or ModelConfig not defined, skipping MODEL_CONFIGS")