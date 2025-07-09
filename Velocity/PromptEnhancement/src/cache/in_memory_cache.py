"""
Simple in-memory implementation of the CacheProvider interface.
"""

from typing import Dict, Any, Optional
import time
from collections import OrderedDict
import hashlib
import asyncio
from src.core import CacheProvider

class InMemoryCache(CacheProvider):
    """Simple in-memory cache implementation of the CacheProvider interface."""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        """Initialize the in-memory cache.
        
        Args:
            max_size: Maximum number of items to store in the cache
            default_ttl: Default time-to-live in seconds for cache entries
        """
        self.cache = OrderedDict()  # Use OrderedDict for LRU behavior
        self.timestamps = {}
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.lock = asyncio.Lock()  # Use asyncio.Lock for thread safety in async context
    
    def _generate_key(self, key: str) -> str:
        """Generate a cache key for the given string.
        
        Args:
            key: The string to generate a key for
            
        Returns:
            The generated cache key
        """
        if not isinstance(key, str):
            key = str(key)
        return hashlib.md5(key.encode()).hexdigest()
    
    def _is_expired(self, key: str) -> bool:
        """Check if a cache entry has expired.
        
        Args:
            key: The cache key to check
            
        Returns:
            True if the entry has expired, False otherwise
        """
        if key not in self.timestamps:
            return True
        
        timestamp = self.timestamps[key]
        current_time = time.time()
        return current_time > (timestamp + self.default_ttl)
    
    def _clean_cache(self) -> None:
        """Remove expired entries and enforce the maximum cache size."""
        # Remove expired entries
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.timestamps.items()
            if current_time > (timestamp + self.default_ttl)
        ]
        
        for key in expired_keys:
            if key in self.cache:
                self.cache.pop(key, None)
            self.timestamps.pop(key, None)
        
        # If still over max_size, remove oldest entries (LRU)
        while len(self.cache) > self.max_size:
            self.cache.popitem(last=False)  # Remove oldest item
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get a value from the cache by key.
        
        Args:
            key: The key to retrieve the value for
            
        Returns:
            The cached value, or None if the key is not in the cache or has expired
        """
        async with self.lock:
            cache_key = self._generate_key(key)
            
            if cache_key not in self.cache:
                return None
            
            # Check if the entry has expired
            if self._is_expired(cache_key):
                # Remove expired entry
                self.cache.pop(cache_key, None)
                self.timestamps.pop(cache_key, None)
                return None
            
            # Move to end of OrderedDict (most recently used)
            value = self.cache[cache_key]
            self.cache.move_to_end(cache_key)
            
            return value
    
    async def put(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store a value in the cache.
        
        Args:
            key: The key to store the value under
            value: The value to store
            ttl: Optional time-to-live in seconds for this entry
        """
        async with self.lock:
            cache_key = self._generate_key(key)
            
            # Store the value
            self.cache[cache_key] = value
            self.timestamps[cache_key] = time.time()
            
            # Move to end of OrderedDict (most recently used)
            self.cache.move_to_end(cache_key)
            
            # Clean the cache if necessary
            self._clean_cache()
    
    async def delete(self, key: str) -> bool:
        """Delete a value from the cache.
        
        Args:
            key: The key to delete
            
        Returns:
            True if the key was found and deleted, False otherwise
        """
        async with self.lock:
            cache_key = self._generate_key(key)
            
            if cache_key in self.cache:
                self.cache.pop(cache_key, None)
                self.timestamps.pop(cache_key, None)
                return True
            
            return False
    
    async def close(self) -> None:
        """Close the cache and free any resources."""
        async with self.lock:
            self.cache.clear()
            self.timestamps.clear()