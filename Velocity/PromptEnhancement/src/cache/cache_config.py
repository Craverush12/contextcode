"""Cache configuration for the router system."""

import os
import redis
import logging
from typing import Optional, Union, Dict, Any
from langchain_community.cache import InMemoryCache, RedisCache
import langchain
from src.core import CacheProvider
from src.config.config_manager import ConfigurationManager, config_manager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get configuration from the ConfigurationManager
config_provider = config_manager

# Default cache settings from consolidated config
DEFAULT_CACHE_TTL = config_provider.get_config("cache.default_ttl", 7200)
DEFAULT_CACHE_SIZE = config_provider.get_config("cache.max_size", 10000)

class CacheManager(CacheProvider):
    """Unified cache management system to coordinate different cache implementations.
    
    This class standardizes cache access across different components (Redis, in-memory, langchain)
    and provides a central place to configure and monitor caching behavior.
    """
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance of CacheManager."""
        if cls._instance is None:
            cls._instance = CacheManager()
        return cls._instance
    
    def __init__(self):
        """Initialize the cache manager with different cache implementations."""
        # Flag to check if Redis is available
        self.redis_available = False
        
        # LangChain cache configuration
        self.langchain_cache = None
        
        # Get configuration from the ConfigurationManager
        use_redis = config_provider.get_config("cache.use_redis", False)
        redis_enabled = config_provider.get_config("redis.enabled", False)
        
        # Setup Redis if configured
        self.redis_client = None
        if use_redis and redis_enabled:
            try:
                # Create Redis client using configuration from config_manager
                redis_host = config_provider.get_config("redis.host", "localhost")
                redis_port = config_provider.get_config("redis.port", 6379)
                redis_db = config_provider.get_config("redis.db", 0)
                redis_password = config_provider.get_config("redis.password", None)
                
                # Get all Redis connection parameters from config
                connection_kwargs = {
                    "host": redis_host,
                    "port": redis_port,
                    "db": redis_db,
                    "socket_timeout": config_provider.get_config("redis.socket_timeout", 5),
                    "socket_connect_timeout": config_provider.get_config("redis.socket_connect_timeout", 3),
                    "socket_keepalive": config_provider.get_config("redis.socket_keepalive", True),
                    "health_check_interval": config_provider.get_config("redis.health_check_interval", 30),
                    "retry_on_timeout": config_provider.get_config("redis.retry_on_timeout", True),
                    "decode_responses": False,  # Keep binary responses for better performance
                    "max_connections": config_provider.get_config("redis.max_connections", 10)
                }
                
                # Add password if provided
                if redis_password:
                    connection_kwargs["password"] = redis_password
                
                # Create Redis client with connection pooling
                self.redis_client = redis.Redis(**connection_kwargs)
                
                # Try to ping Redis to make sure it's actually running
                self.redis_client.ping()
                
                # Set up LangChain Redis cache
                self.langchain_cache = RedisCache(redis_=self.redis_client, ttl=DEFAULT_CACHE_TTL)
                langchain.llm_cache = self.langchain_cache
                
                # Flag Redis as available
                self.redis_available = True
                
                logger.debug(f"Redis cache initialized successfully at {redis_host}:{redis_port}/{redis_db}")
            
            except (redis.exceptions.ConnectionError, Exception) as e:
                logger.error(f"Redis connection failed: {str(e)}")
                logger.debug("Falling back to in-memory cache...")
                
                # Set up in-memory cache as fallback
                self.langchain_cache = InMemoryCache()
                langchain.llm_cache = self.langchain_cache
        else:
            # Use in-memory cache if Redis is not enabled in config
            logger.debug("Setting up in-memory cache (Redis not enabled in configuration)...")
            self.langchain_cache = InMemoryCache()
            langchain.llm_cache = self.langchain_cache
        
        # Initialize in-memory cache for direct access
        self._memory_cache = {}
        
        logger.debug("CacheManager initialization complete")
    
    def get_redis_client(self):
        """Get the Redis client if available, None otherwise."""
        return self.redis_client if self.redis_available else None
    
    def get_langchain_cache(self):
        """Get the LangChain cache object."""
        return self.langchain_cache
    
    def is_redis_available(self) -> bool:
        """Check if Redis is available."""
        if not self.redis_available or not self.redis_client:
            return False
        
        try:
            # Use a short timeout for ping to prevent hanging
            self.redis_client.ping()
            return True
        except redis.exceptions.ConnectionError as e:
            logger.warning(f"Redis connection error: {str(e)}")
            self.redis_available = False
            return False
        except redis.exceptions.TimeoutError as e:
            logger.warning(f"Redis timeout error: {str(e)}")
            self.redis_available = False
            return False
        except Exception as e:
            logger.error(f"Unexpected Redis error: {str(e)}")
            self.redis_available = False
            return False
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get a value from the cache.
        
        This method first checks Redis if available, then falls back to in-memory cache.
        
        Args:
            key: The key to look up in the cache
            
        Returns:
            The cached value if found, otherwise None
        """
        logger.debug(f"Getting value for key: {key}")
        
        # Try Redis first if available
        if self.is_redis_available() and self.redis_client:
            try:
                data = self.redis_client.get(f"cache:{key}")
                if data:
                    logger.debug(f"Cache hit from Redis for key: {key}")
                    import json
                    try:
                        return json.loads(data)  # More secure JSON deserialization
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to decode JSON for key: {key}")
                        return None
            except Exception as e:
                logger.error(f"Error retrieving from Redis: {e}")
        
        # Fall back to in-memory cache
        value = self._memory_cache.get(key)
        if value:
            logger.debug(f"Cache hit from memory cache for key: {key}")
            return value
        
        logger.debug(f"Cache miss for key: {key}")
        return None
    
    async def put(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store a value in the cache.
        
        Stores in both Redis (if available) and in-memory cache.
        
        Args:
            key: The key under which to store the value
            value: The value to store
            ttl: Time-to-live in seconds, defaults to DEFAULT_CACHE_TTL
        """
        if ttl is None:
            ttl = DEFAULT_CACHE_TTL
            
        logger.debug(f"Storing value for key: {key} with TTL: {ttl}")
        
        # Store in Redis if available
        if self.is_redis_available() and self.redis_client:
            try:
                import json
                serialized_value = json.dumps(value)
                self.redis_client.setex(f"cache:{key}", ttl, serialized_value)
                logger.debug(f"Stored value in Redis for key: {key}")
            except Exception as e:
                logger.error(f"Error storing in Redis: {e}")
        
        # Also store in memory cache
        self._memory_cache[key] = value
        logger.debug(f"Stored value in memory cache for key: {key}")
    
    async def delete(self, key: str) -> bool:
        """Delete a value from the cache.
        
        Args:
            key: The key to delete
            
        Returns:
            True if the key was deleted, False if it didn't exist
        """
        deleted = False
        
        # Delete from Redis if available
        if self.is_redis_available() and self.redis_client:
            try:
                redis_deleted = self.redis_client.delete(f"cache:{key}") > 0
                deleted = deleted or redis_deleted
                logger.debug(f"Deleted from Redis for key {key}: {redis_deleted}")
            except Exception as e:
                logger.error(f"Error deleting from Redis: {e}")
        
        # Delete from memory cache
        if key in self._memory_cache:
            del self._memory_cache[key]
            deleted = True
            logger.debug(f"Deleted from memory cache for key: {key}")
            
        return deleted
    
    async def clear(self) -> None:
        """Clear the cache completely."""
        # Clear Redis cache if available
        if self.is_redis_available() and self.redis_client:
            try:
                keys = self.redis_client.keys("cache:*")
                if keys:
                    self.redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} keys from Redis cache")
            except Exception as e:
                logger.error(f"Error clearing Redis cache: {e}")
        
        # Clear memory cache
        count = len(self._memory_cache)
        self._memory_cache.clear()
        logger.info(f"Cleared {count} items from memory cache")
    
    def get_cache_config(self) -> Dict[str, Any]:
        """Get current cache configuration."""
        return {
            "redis_available": self.is_redis_available(),
            "default_ttl": DEFAULT_CACHE_TTL,
            "default_size": DEFAULT_CACHE_SIZE,
            "langchain_cache_type": type(self.langchain_cache).__name__,
            "memory_cache_size": len(self._memory_cache)
        }


# Initialize and register CacheManager with the container
cache_manager = CacheManager.get_instance()

# Register the cache manager with the container
from src.core import container, CacheProvider
container.register_instance(CacheProvider, cache_manager)