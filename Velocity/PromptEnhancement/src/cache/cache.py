"""Caching module for storing frequent queries and their responses."""

import time
from typing import Dict, Any, Optional, List, Tuple, Callable
import hashlib
import json
from collections import OrderedDict
from threading import Lock
from .redis_cache import RedisCache
from .cache_config import CacheManager, DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE
import asyncio
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheEntry:
    """Represents a single cached response with metadata."""
    
    def __init__(self, query: str, response: Any, domain: str, ttl: Optional[int] = None):
        """Initialize a cache entry with improved validation."""
        self.query = query
        self.response = response
        self.domain = domain
        self.created_at = time.time()
        self.ttl = ttl or DEFAULT_CACHE_TTL
    
    def is_expired(self, current_time: Optional[float] = None) -> bool:
        """Check if the entry has expired."""
        if current_time is None:
            current_time = time.time()
        return current_time > (self.created_at + self.ttl)
    
    def get_remaining_ttl(self) -> float:
        """Get the remaining TTL in seconds."""
        return max(0.0, (self.created_at + self.ttl) - time.time())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entry to dictionary for serialization."""
        return {
            "query": self.query,
            "response": self.response,
            "domain": self.domain,
            "created_at": self.created_at,
            "ttl": self.ttl
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheEntry':
        """Create a CacheEntry from a dictionary."""
        entry = cls(
            query=data["query"],
            response=data["response"],
            domain=data["domain"],
            ttl=data["ttl"]
        )
        entry.created_at = data["created_at"]
        return entry

class QueryCache:
    """Cache for storing query responses with configurable invalidation strategies."""
    
    def __init__(self, max_size: int = DEFAULT_CACHE_SIZE, default_ttl: int = DEFAULT_CACHE_TTL, strategy: str = "ttl"):
        """Initialize the cache with improved validation."""
        if max_size <= 0:
            raise ValueError("Cache size must be positive")
        if default_ttl <= 0:
            raise ValueError("TTL must be positive")
        if strategy not in ["ttl", "lru", "lfu"]:
            raise ValueError("Invalid cache strategy")
            
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.strategy = strategy
        self.cache = {}
        self.lock = Lock()
        self.stats = {"hits": 0, "misses": 0, "evictions": 0, "partial_hits": 0}
        
        # Get the cache manager singleton
        self.cache_manager = CacheManager.get_instance()
        
        # Initialize Redis cache if available through the manager
        self.redis_cache = None
        self.redis_enabled = self.cache_manager.is_redis_available()
        if self.redis_enabled:
            try:
                redis_client = self.cache_manager.get_redis_client()
                if redis_client:
                    self.redis_cache = RedisCache(
                        host=redis_client.connection_pool.connection_kwargs['host'],
                        port=redis_client.connection_pool.connection_kwargs['port'],
                        db=redis_client.connection_pool.connection_kwargs['db'],
                        password=redis_client.connection_pool.connection_kwargs.get('password'),
                        max_size=max_size,
                        default_ttl=default_ttl
                    )
                    logger.info("Redis cache initialized through CacheManager")
                else:
                    self.redis_enabled = False
                    logger.warning("Redis client not available from CacheManager")
            except Exception as e:
                logger.error(f"Failed to initialize Redis cache: {e}")
                logger.info("Falling back to in-memory cache only")
                self.redis_cache = None
                self.redis_enabled = False
        
        # Initialize access tracking for LRU/LFU
        if strategy in ["lru", "lfu"]:
            self.access_times = {}
            self.access_counts = {} if strategy == "lfu" else None
    
    async def _test_redis_connection(self) -> bool:
        """Test if Redis connection is working."""
        if not self.redis_cache:
            return False
        try:
            # Try a simple ping to test the connection
            await self.redis_cache.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis connection test failed: {e}")
            return False
    
    def _generate_key(self, query: str) -> str:
        """Generate a cache key with improved validation."""
        if not query or not isinstance(query, str):
            raise ValueError("Invalid query for cache key generation")
        return hashlib.md5(query.encode()).hexdigest()
    
    def _validate_entry(self, entry: Any) -> bool:
        """Validate cache entry with improved checks."""
        if not entry or not isinstance(entry, dict):
            return False
            
        # Check for enhanced prompt entries
        if "enhanced_prompt" in entry:
            return (
                isinstance(entry["enhanced_prompt"], str) and
                len(entry["enhanced_prompt"].split()) > 3  # Reduced from 10 to 3 for more lenient validation
            )
            
        # Check for other types of entries
        return (
            "content" in entry and
            isinstance(entry["content"], str)
        )
    
    async def get(self, query: str) -> Optional[Dict[str, Any]]:
        """Retrieve a response from the cache with improved validation."""
        # Try Redis cache first if enabled
        if self.redis_cache and self.redis_enabled:
            try:
                redis_result = await self.redis_cache.get(query)
                if redis_result:
                    self.stats["hits"] += 1
                    return redis_result
            except Exception as e:
                logger.error(f"Error retrieving from Redis cache: {e}")
                # Disable Redis for future operations if connection fails
                if "connection" in str(e).lower():
                    logger.warning("Redis connection failed, disabling Redis cache")
                    self.redis_enabled = False
        
        # Try in-memory cache
        key = self._generate_key(query)
        with self.lock:
            entry = self.cache.get(key)
            
            if entry and not entry.is_expired():
                # Update access tracking
                if self.strategy in ["lru", "lfu"]:
                    self.access_times[key] = time.time()
                    if self.strategy == "lfu":
                        self.access_counts[key] = self.access_counts.get(key, 0) + 1
                
                # Validate entry
                if self._validate_entry(entry.response):
                    self.stats["hits"] += 1
                    return entry.response
                else:
                    # Invalidate corrupted entry
                    del self.cache[key]
                    self.stats["evictions"] += 1
                    
            self.stats["misses"] += 1
            return None
    
    async def put(self, query: str, response: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store a response in the cache with improved validation."""
        if not self._validate_entry(response):
            logger.warning("Invalid response format, not caching")
            return
            
        key = self._generate_key(query)
        ttl = ttl or self.default_ttl
        
        # Store in Redis if enabled
        if self.redis_cache and self.redis_enabled:
            try:
                await self.redis_cache.put(query, response, ttl)
            except Exception as e:
                logger.error(f"Failed to store in Redis cache: {e}")
                # Disable Redis for future operations if connection fails
                if "connection" in str(e).lower():
                    logger.warning("Redis connection failed, disabling Redis cache")
                    self.redis_enabled = False
        
        with self.lock:
            # Check cache size and evict if needed
            if len(self.cache) >= self.max_size:
                self._evict_entries()
                
            # Create new entry
            entry = CacheEntry(query, response, "", ttl)
            self.cache[key] = entry
            
            # Initialize access tracking
            if self.strategy in ["lru", "lfu"]:
                self.access_times[key] = time.time()
                if self.strategy == "lfu":
                    self.access_counts[key] = 1
    
    def _evict_entries(self) -> None:
        """Evict entries based on the selected strategy."""
        if self.strategy == "ttl":
            # Evict expired entries
            current_time = time.time()
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.is_expired(current_time)
            ]
            for key in expired_keys:
                del self.cache[key]
                self.stats["evictions"] += 1
                
        elif self.strategy == "lru":
            # Evict least recently used
            if self.access_times:
                oldest_key = min(self.access_times.items(), key=lambda x: x[1])[0]
                del self.cache[oldest_key]
                del self.access_times[oldest_key]
                self.stats["evictions"] += 1
                
        elif self.strategy == "lfu":
            # Evict least frequently used
            if self.access_counts:
                least_used_key = min(self.access_counts.items(), key=lambda x: x[1])[0]
                del self.cache[least_used_key]
                del self.access_counts[least_used_key]
                del self.access_times[least_used_key]
                self.stats["evictions"] += 1
    
    async def clear(self) -> None:
        """Clear the cache with improved cleanup."""
        with self.lock:
            self.cache.clear()
            if self.strategy in ["lru", "lfu"]:
                self.access_times.clear()
                if self.strategy == "lfu":
                    self.access_counts.clear()
            self.stats = {"hits": 0, "misses": 0, "evictions": 0, "partial_hits": 0}
            
            # Clear Redis cache if enabled
            if self.redis_cache and self.redis_enabled:
                try:
                    await self.redis_cache.clear()
                except Exception as e:
                    logger.error(f"Failed to clear Redis cache: {e}")
                    # Disable Redis for future operations if connection fails
                    if "connection" in str(e).lower():
                        logger.warning("Redis connection failed, disabling Redis cache")
                        self.redis_enabled = False
    
    async def get_stats(self) -> Dict[str, int]:
        """Get cache statistics with improved metrics."""
        with self.lock:
            stats = {
                "hits": self.stats["hits"],
                "misses": self.stats["misses"],
                "evictions": self.stats["evictions"],
                "partial_hits": self.stats["partial_hits"],
                "size": len(self.cache),
                "hit_rate": self.stats["hits"] / (self.stats["hits"] + self.stats["misses"]) if (self.stats["hits"] + self.stats["misses"]) > 0 else 0,
                "redis_enabled": self.redis_enabled
            }
            
            # Add Redis stats if enabled
            if self.redis_cache and self.redis_enabled:
                try:
                    redis_stats = await self.redis_cache.get_stats()
                    stats["redis_size"] = redis_stats["size"]
                    stats["redis_hit_rate"] = redis_stats["hit_rate"]
                    stats["redis_partial_hit_rate"] = redis_stats["partial_hit_rate"]
                except Exception as e:
                    logger.error(f"Failed to get Redis stats: {e}")
                    stats["redis_error"] = str(e)
            
            return stats

class CacheManager:
    def __init__(self, config_provider):
        self.config = config_provider.get_section("cache")
        self.redis_enabled = self.config.get("use_redis", False)
        self.redis_url = self.config.get("redis_url", "redis://localhost:6379/0")
        self.default_ttl = self.config.get("default_ttl", 3600)
        self.max_size = self.config.get("max_size", 10000)
        self.strategy = self.config.get("strategy", "lru")
        
        # Initialize Redis if enabled
        self.redis_cache = None
        if self.redis_enabled:
            try:
                import aioredis
                self.redis_cache = aioredis.from_url(self.redis_url)
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Redis cache: {e}")
                self.redis_enabled = False
        
        # In-memory cache
        self.cache = {}
        self.lock = asyncio.Lock()
        self.access_times = {}
        self.access_counts = {}
        
    async def get(self, key: str) -> Optional[Dict]:
        """Get value from cache with improved performance."""
        # Try Redis first if enabled
        if self.redis_enabled:
            try:
                cached = await self.redis_cache.get(key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                logger.error(f"Redis get failed: {e}")
        
        # Fallback to memory cache
        with self.lock:
            entry = self.cache.get(key)
            if entry and not entry.is_expired():
                # Update access tracking
                if self.strategy in ["lru", "lfu"]:
                    self.access_times[key] = time.time()
                    if self.strategy == "lfu":
                        self.access_counts[key] = self.access_counts.get(key, 0) + 1
                return entry.value
        return None

    async def put(self, key: str, value: Dict, ttl: Optional[int] = None) -> None:
        """Store value in cache with improved performance."""
        ttl = ttl or self.default_ttl
        
        # Store in Redis if enabled
        if self.redis_enabled:
            try:
                await self.redis_cache.set(
                    key,
                    json.dumps(value),
                    ex=ttl
                )
            except Exception as e:
                logger.error(f"Redis put failed: {e}")
        
        # Store in memory cache
        with self.lock:
            if len(self.cache) >= self.max_size:
                self._evict_entries()
            
            entry = CacheEntry(key, value, ttl)
            self.cache[key] = entry
            
            # Initialize access tracking
            if self.strategy in ["lru", "lfu"]:
                self.access_times[key] = time.time()
                if self.strategy == "lfu":
                    self.access_counts[key] = 1

    def _evict_entries(self):
        """Evict entries based on the selected strategy."""
        if self.strategy == "lru":
            # Evict least recently used
            oldest_key = min(self.access_times.items(), key=lambda x: x[1])[0]
            del self.cache[oldest_key]
            del self.access_times[oldest_key]
        elif self.strategy == "lfu":
            # Evict least frequently used
            least_frequent_key = min(self.access_counts.items(), key=lambda x: x[1])[0]
            del self.cache[least_frequent_key]
            del self.access_counts[least_frequent_key]
            del self.access_times[least_frequent_key]
        else:
            # Default: evict random entry
            key = next(iter(self.cache))
            del self.cache[key]
            if key in self.access_times:
                del self.access_times[key]
            if key in self.access_counts:
                del self.access_counts[key]