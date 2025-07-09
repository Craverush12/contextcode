"""Configuration settings for the Dynamic LLM Router."""

import os
from dotenv import load_dotenv
from src.logging.logger import get_logger

# Configure logging
logger = get_logger(__name__)

# Load environment variables from .env file
load_dotenv()

# LangSmith configuration
LANGSMITH_API_KEY = os.environ.get("LANGSMITH_API_KEY")
LANGSMITH_PROJECT = os.environ.get("LANGSMITH_PROJECT", "velocity-llm-router")
LANGSMITH_ENDPOINT = os.environ.get("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
LANGSMITH_TRACING = os.environ.get("LANGSMITH_TRACING", "true").lower() == "true"

# Set environment variables for LangSmith
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_ENDPOINT"] = LANGSMITH_ENDPOINT
os.environ["LANGCHAIN_API_KEY"] = LANGSMITH_API_KEY
os.environ["LANGCHAIN_PROJECT"] = LANGSMITH_PROJECT

LANGSMITH_CONFIG = {
    "api_key": LANGSMITH_API_KEY,
    "project": LANGSMITH_PROJECT,
    "endpoint": LANGSMITH_ENDPOINT,
    "tracing_enabled": LANGSMITH_TRACING,
    "tags": ["production", "prompt_generation"],
    "metadata": {
        "track_costs": True,
        "track_latency": True,
        "track_tokens": True
    }
}

# Redis configuration
REDIS_CONFIG = {
    "enabled": True,  # Set to True to enable Redis
    # "host": "localhost",
    "host":"216.10.251.235",
    "port": 6379,
    "db": 0,
    "password": "redisThinkVel@2025",
    "max_size": 10000,
    "default_ttl": 3600,
    "similarity_threshold": 0.8,
    # Connection optimization settings
    "socket_timeout": 5,  # 5 second timeout for operations
    "socket_connect_timeout": 3,  # 3 second timeout for connections
    "socket_keepalive": True,  # Keep connections alive
    "health_check_interval": 30,  # Check connection health every 30 seconds
    "retry_on_timeout": True,  # Auto-retry on timeout
    "max_connections": 10  # Connection pool size
}

# Cache configuration
CACHE_CONFIG = {
    "enabled": True,
    "max_size": 1000,
    "default_ttl": 3600,
    "strategy": "ttl",
    "ttl_by_domain": {
        "general_knowledge": 86400,  # 24 hours
        "news": 1800,               # 30 minutes
        "weather": 900,             # 15 minutes
        "coding": 604800,           # 1 week
    },
    "use_redis": True,  # Enable Redis-based caching
    "redis_config": REDIS_CONFIG
}

# Enhanced analyzer configuration
ANALYZER_CONFIG = {
    "complexity_estimation": {
        "enabled": True,
        "weights": {
            "word_count": 0.3,
            "sentence_length": 0.2,
            "vocabulary_richness": 0.2,
            "question_count": 0.1,
            "nested_structure": 0.1,
            "multi_part": 0.1,
        },
    },
    "domains": [
        "coding",
        "creative_writing", 
        "math",
        "science",
        "general_knowledge",
        "analysis",
        "news",
        "weather"
    ],
    "complexity_thresholds": {
        "low": 0.3,
        "high": 0.7
    }
}

# Check for required API keys
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables. Please set it in your .env file.")

# Groq LLaMA configuration
GROQ_CONFIG = {
    "model": "llama-3.3-70b-versatile",  # Fixed lowercase model name
    "temperature": 0.7,
    "api_key": GROQ_API_KEY
}