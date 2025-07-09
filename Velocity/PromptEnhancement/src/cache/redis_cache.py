"""Redis-based caching system with partial query matching capabilities."""

import redis.asyncio as redis
import json
import time
from typing import Dict, Any, Optional, List, Tuple
import hashlib
from difflib import SequenceMatcher
import re
from collections import OrderedDict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisCache:
    """Redis-based cache with partial query matching capabilities."""
    
    def __init__(self, 
                 host: str = "localhost",
                 port: int = 6379,
                 db: int = 0,
                 password: Optional[str] = None,
                 max_size: int = 10000,
                 default_ttl: int = 3600,
                 similarity_threshold: float = 0.6,  # Lowered threshold for more matches
                 max_embeddings_cache: int = 1000):  # Added limit for embeddings cache
        """Initialize the Redis cache."""
        try:
            self.redis = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True
            )
            logger.info(f"Redis cache initialized at {host}:{port}/{db}")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise
            
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.similarity_threshold = similarity_threshold
        self.max_embeddings_cache = max_embeddings_cache
        
        # Initialize TF-IDF vectorizer for semantic similarity
        # Pre-fit the vectorizer on common English words to avoid re-fitting on each query
        self.vectorizer = self._initialize_vectorizer()
        
        # Use OrderedDict for LRU behavior with embeddings
        self._query_embeddings = OrderedDict()
        
        # Initialize statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "partial_hits": 0,
            "evictions": 0
        }
    
    def _initialize_vectorizer(self) -> TfidfVectorizer:
        """Initialize and pre-fit TF-IDF vectorizer on common words."""
        try:
            # Common English words corpus for pre-fitting
            common_words = [
                "the quick brown fox jumps over the lazy dog",
                "hello world programming computer science algorithm",
                "machine learning artificial intelligence data science",
                "cloud computing database network security encryption",
                "web development frontend backend fullstack",
                "python javascript typescript java go rust c++ c#",
                "docker kubernetes container orchestration deployment",
                "agile scrum kanban project management",
                "user interface user experience design implementation",
                "natural language processing computer vision neural networks",
                "api rest graphql microservices architecture",
                "database sql nosql mysql postgresql mongodb",
                "cloud aws azure gcp infrastructure as code",
                "security encryption authentication authorization",
                "testing unit integration system automation",
                "devops ci cd pipeline jenkins github actions",
                "mobile android ios react native flutter",
                "frontend react angular vue svelte",
                "backend node express django flask spring",
                "data structures algorithms complexity analysis"
            ]
            
            # Create and fit vectorizer
            vectorizer = TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),
                max_features=1000,
                min_df=1,
                max_df=0.9
            )
            vectorizer.fit(common_words)
            logger.info("TF-IDF vectorizer initialized and pre-fitted successfully")
            return vectorizer
        except Exception as e:
            logger.error(f"Error initializing vectorizer: {str(e)}")
            # Return a basic vectorizer as fallback
            logger.info("Falling back to basic vectorizer")
            fallback = TfidfVectorizer(stop_words='english')
            fallback.fit(["fallback corpus"])
            return fallback
    
    def _generate_key(self, query: str) -> str:
        """Generate a cache key for the query."""
        return f"query:{hashlib.md5(query.encode()).hexdigest()}"
    
    def _calculate_similarity(self, query1: str, query2: str) -> float:
        """Calculate similarity between two queries using multiple methods."""
        try:
            # Normalize queries
            query1 = query1.lower().strip()
            query2 = query2.lower().strip()
            
            # Early exit for identical queries
            if query1 == query2:
                return 1.0
            
            # 1. Sequence similarity (character-level)
            sequence_similarity = SequenceMatcher(None, query1, query2).ratio()
            
            # Early exit for very different queries
            if sequence_similarity < 0.2:
                return sequence_similarity
            
            # 2. Word overlap with stemming
            words1 = set(re.findall(r'\w+', query1))
            words2 = set(re.findall(r'\w+', query2))
            
            if not words1 or not words2:
                return sequence_similarity
                
            # Calculate word overlap with stemming
            stemmed_words1 = {self._stem_word(word) for word in words1}
            stemmed_words2 = {self._stem_word(word) for word in words2}
            
            overlap = len(stemmed_words1.intersection(stemmed_words2))
            word_similarity = overlap / max(len(stemmed_words1), len(stemmed_words2))
            
            # 3. Semantic similarity using TF-IDF
            semantic_similarity = self._calculate_semantic_similarity(query1, query2)
            
            # Combine scores with adjusted weights
            return (
                0.4 * sequence_similarity +  # Character-level similarity
                0.3 * word_similarity +      # Word overlap
                0.3 * semantic_similarity    # Semantic similarity
            )
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            # Fall back to basic sequence similarity if there's an error
            return SequenceMatcher(None, query1.lower(), query2.lower()).ratio()
    
    def _stem_word(self, word: str) -> str:
        """Simple word stemming."""
        # Basic stemming rules
        if word.endswith('ing'):
            return word[:-3]
        if word.endswith('ed'):
            return word[:-2]
        if word.endswith('s'):
            return word[:-1]
        return word
    
    def _calculate_semantic_similarity(self, query1: str, query2: str) -> float:
        """Calculate semantic similarity using TF-IDF vectors with improved error handling."""
        try:
            # Get or create embeddings with strictly enforced LRU cache management
            if query1 not in self._query_embeddings:
                # Always check if cache needs cleaning before adding new items
                if len(self._query_embeddings) >= self.max_embeddings_cache:
                    # Remove oldest item (first item in OrderedDict)
                    self._query_embeddings.popitem(last=False)
                    self.stats["evictions"] += 1
                
                # Transform using pre-fitted vectorizer (no fitting on each query)
                self._query_embeddings[query1] = self.vectorizer.transform([query1])
            
            # Always move to end (most recently used) whether it's new or existing
            self._query_embeddings.move_to_end(query1)
            
            if query2 not in self._query_embeddings:
                # Always check if cache needs cleaning before adding new items
                if len(self._query_embeddings) >= self.max_embeddings_cache:
                    # Remove oldest item (first item in OrderedDict)
                    self._query_embeddings.popitem(last=False)
                    self.stats["evictions"] += 1
                
                # Transform using pre-fitted vectorizer
                self._query_embeddings[query2] = self.vectorizer.transform([query2])
            
            # Always move to end (most recently used) whether it's new or existing
            self._query_embeddings.move_to_end(query2)
            
            # Calculate cosine similarity - handle sparse matrices properly
            vec1 = self._query_embeddings[query1]
            vec2 = self._query_embeddings[query2]
            
            # Check if vectors are empty
            if vec1.nnz == 0 or vec2.nnz == 0:
                return 0.0
                
            # Use efficient sparse matrix dot product
            similarity = cosine_similarity(vec1, vec2)[0][0]
            
            # Validate the similarity value
            if np.isnan(similarity):
                return 0.0
                
            return float(similarity) if not np.isnan(similarity) else 0.0
        except Exception as e:
            logger.error(f"Error in semantic similarity calculation: {str(e)}")
            return 0.0
    
    async def _find_similar_queries(self, query: str) -> List[Tuple[str, float]]:
        """Find similar queries in the cache with improved algorithm."""
        similar_queries = []
        
        try:
            # Get all query keys, limit to recent ones for efficiency
            all_keys = await self.redis.keys("query:*")
            
            # For large caches, use sampling to improve performance
            if len(all_keys) > 100:
                # Try to use most recent keys first
                recent_keys = []
                try:
                    # Sample a subset of keys to check timestamps
                    sample_keys = np.random.choice(all_keys, min(100, len(all_keys)), replace=False)
                    
                    for key in sample_keys:
                        try:
                            created_at = await self.redis.hget(key, "created_at")
                            if created_at:
                                recent_keys.append((key, float(created_at)))
                        except Exception:
                            continue
                    
                    if recent_keys:
                        # Sort by creation time (most recent first)
                        recent_keys.sort(key=lambda x: x[1], reverse=True)
                        # Take the 50 most recent keys
                        keys = [k[0] for k in recent_keys[:50]]
                    else:
                        # If we couldn't get timestamps, use random sampling
                        keys = np.random.choice(all_keys, min(50, len(all_keys)), replace=False)
                except Exception as e:
                    logger.error(f"Error sampling keys: {e}")
                    # Fallback to random sampling
                    keys = np.random.choice(all_keys, min(50, len(all_keys)), replace=False)
            else:
                keys = all_keys
            
            # Calculate similarities for the selected keys
            for key in keys:
                try:
                    cached_query = await self.redis.hget(key, "query")
                    if cached_query:
                        # Quick check for exact match
                        if cached_query.lower().strip() == query.lower().strip():
                            similar_queries.append((key, 1.0))
                            continue
                        
                        # Calculate similarity only if potentially relevant
                        # This is a cheap pre-check to avoid expensive calculations
                        if any(word in cached_query.lower() for word in query.lower().split()):
                            similarity = self._calculate_similarity(query, cached_query)
                            if similarity >= self.similarity_threshold:
                                similar_queries.append((key, similarity))
                except Exception as e:
                    logger.error(f"Error processing key {key}: {str(e)}")
                    continue
            
            # Sort by similarity score
            return sorted(similar_queries, key=lambda x: x[1], reverse=True)
        except Exception as e:
            logger.error(f"Error finding similar queries: {str(e)}")
            return []
    
    async def get(self, query: str) -> Optional[Dict[str, Any]]:
        """Get a response from the cache with improved partial matching."""
        try:
            # Try exact match first
            key = self._generate_key(query)
            cached_data = await self.redis.hgetall(key)
            
            if cached_data and not await self._is_expired(cached_data):
                self.stats["hits"] += 1
                return json.loads(cached_data["response"])
            
            # Try partial matches with lower threshold
            similar_queries = await self._find_similar_queries(query)
            if similar_queries:
                best_match_key, similarity = similar_queries[0]
                cached_data = await self.redis.hgetall(best_match_key)
                
                if cached_data and not await self._is_expired(cached_data):
                    self.stats["partial_hits"] += 1
                    return json.loads(cached_data["response"])
            
            self.stats["misses"] += 1
            return None
        except Exception as e:
            logger.error(f"Error retrieving from cache: {str(e)}")
            self.stats["misses"] += 1
            return None
    
    async def put(self, query: str, response: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store a response in the cache with improved error handling."""
        try:
            key = self._generate_key(query)
            ttl = ttl or self.default_ttl
            
            # Prepare data for storage
            data = {
                "query": query,
                "response": json.dumps(response),
                "created_at": str(time.time()),
                "ttl": str(ttl)
            }
            
            # Store in Redis
            await self.redis.hmset(key, data)
            await self.redis.expire(key, ttl)
            
            # Clean cache if needed
            await self._clean_cache()
        except Exception as e:
            logger.error(f"Error storing in cache: {str(e)}")
    
    async def _is_expired(self, cached_data: Dict[str, str]) -> bool:
        """Check if cached data is expired."""
        try:
            created_at = float(cached_data.get("created_at", 0))
            ttl = float(cached_data.get("ttl", self.default_ttl))
            return time.time() > (created_at + ttl)
        except Exception as e:
            logger.error(f"Error checking expiration: {str(e)}")
            # If there's an error, consider it expired
            return True
    
    async def _clean_cache(self) -> None:
        """Clean expired entries and enforce size limit."""
        try:
            # Check if cleaning is needed 
            keys = await self.redis.keys("query:*")
            if len(keys) <= self.max_size:
                return

            # Limit how many keys to clean to avoid excessive overhead
            keys_to_check = min(len(keys), 100)
                
            # Remove expired entries first
            keys_to_check = np.random.choice(keys, keys_to_check, replace=False)
            for key in keys_to_check:
                try:
                    cached_data = await self.redis.hgetall(key)
                    if await self._is_expired(cached_data):
                        await self.redis.delete(key)
                        self.stats["evictions"] += 1
                except Exception:
                    # If we can't check expiration, better to leave it
                    continue
            
            # Check again if we need to enforce size limit
            keys = await self.redis.keys("query:*")
            if len(keys) > self.max_size:
                # Get keys sorted by creation time
                keys_with_times = []
                sample_size = min(200, len(keys))
                keys_to_sample = np.random.choice(keys, sample_size, replace=False)
                
                for key in keys_to_sample:
                    try:
                        created_at = await self.redis.hget(key, "created_at")
                        if created_at:
                            keys_with_times.append((key, float(created_at)))
                    except Exception:
                        continue
                
                if keys_with_times:
                    keys_with_times.sort(key=lambda x: x[1])
                    # Remove oldest entries to get below max_size
                    to_remove = int(len(keys) * 0.1)  # Remove 10% of total keys
                    for key, _ in keys_with_times[:min(to_remove, len(keys_with_times))]:
                        try:
                            await self.redis.delete(key)
                            self.stats["evictions"] += 1
                        except Exception:
                            continue
        except Exception as e:
            logger.error(f"Error cleaning cache: {str(e)}")
    
    async def clear(self) -> None:
        """Clear the cache."""
        try:
            keys = await self.redis.keys("query:*")
            for key in keys:
                await self.redis.delete(key)
            self.stats = {"hits": 0, "misses": 0, "partial_hits": 0, "evictions": 0}
            # Also clear embeddings cache
            self._query_embeddings.clear()
            logger.info("Cache cleared successfully")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            keys = await self.redis.keys("query:*")
            return {
                **self.stats,
                "size": len(keys),
                "embeddings_cache_size": len(self._query_embeddings),
                "hit_rate": self.stats["hits"] / (self.stats["hits"] + self.stats["misses"]) if (self.stats["hits"] + self.stats["misses"]) > 0 else 0,
                "partial_hit_rate": self.stats["partial_hits"] / (self.stats["hits"] + self.stats["misses"] + self.stats["partial_hits"]) if (self.stats["hits"] + self.stats["misses"] + self.stats["partial_hits"]) > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {**self.stats, "error": str(e)}