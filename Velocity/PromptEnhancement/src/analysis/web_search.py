"""Web search module for finding relevant content from the web based on user queries.

This module provides web search functionality with prioritized search engines:
1. DuckDuckGo (primary, no API key required)
2. Tavily (fallback, requires API key)
3. Wikipedia (no API key required)

The search strategy uses DuckDuckGo first, and falls back to Tavily if DuckDuckGo fails.
"""

import os
import time
import asyncio
from typing import Dict, List, Any, Optional, Tuple
import json
import re
import logging
from dotenv import load_dotenv

from langchain_community.tools import WikipediaQueryRun
from langchain_community.tools.tavily_search.tool import TavilySearchResults
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import tool
from langchain_core.tools import Tool
from duckduckgo_search import DDGS

from src.logging.logger import get_logger, log_execution_time
from src.cache.cache import QueryCache
from src.core import container, CacheProvider
from src.core import ConfigProvider

# Load environment variables from .env file
load_dotenv()

# Set up logging
logger = get_logger(__name__)

# Singleton instance
_instance = None

class WebSearch:
    """Web search engine for finding and retrieving relevant content from the web."""
    
    _instance = None
    
    @classmethod
    def get_instance(cls, *args, **kwargs):
        """Get the singleton instance of WebSearch."""
        if cls._instance is None:
            cls._instance = WebSearch(*args, **kwargs)
        return cls._instance
    
    def __init__(self, cache_provider=None):
        """Initialize the web search module."""
        logger.debug("Initializing WebSearch")
        # Get container and config provider
        if container:
            # Get cache provider from DI container if not provided
            if cache_provider is None:
                self.cache_provider = container.resolve(CacheProvider)
            else:
                self.cache_provider = cache_provider
                
            # Get config provider from DI container
            self.config_provider = container.resolve(ConfigProvider)
        else:
            logger.warning("DI container not initialized, web search will operate without caching")
            self.cache_provider = None
            self.config_provider = None
        
        # Initialize search tools based on available API keys
        self._initialize_search_tools()
        
        # Track statistics for search operations
        self.stats = {
            "total_searches": 0,
            "cache_hits": 0,
            "api_calls": 0,
            "errors": 0,
            "empty_results": 0
        }
        
        logger.debug("WebSearch initialized")
    
    def _initialize_search_tools(self):
        """Initialize search tools based on available API keys."""
        self.search_tools = {}
        
        # Initialize DuckDuckGo (doesn't require API key)
        try:
            logger.debug("Initializing DuckDuckGo search tool")
            self.search_tools["duckduckgo"] = DDGS()
            logger.debug("DuckDuckGo search tool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize DuckDuckGo: {str(e)}")
        
        # Initialize Tavily if API key is available
        tavily_key = None
        if self.config_provider:
            tavily_key = self.config_provider.get_config("search.tavily_key")
        if not tavily_key:
            tavily_key = os.environ.get("TAVILY_API_KEY")
        
        if tavily_key:
            try:
                logger.debug("Initializing Tavily search tool")
                self.search_tools["tavily"] = TavilySearchResults(max_results=1, api_key=tavily_key)
                logger.debug("Tavily search tool initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Tavily: {str(e)}")
        else:
            logger.warning("Tavily API key not found. Tavily Search will not be available.")
            logger.warning("Please set TAVILY_API_KEY in environment variables or config")
        
        # Always initialize Wikipedia (doesn't require API key)
        try:
            logger.debug("Initializing Wikipedia search tool")
            self.search_tools["wikipedia"] = WikipediaQueryRun()
            logger.debug("Wikipedia search tool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Wikipedia: {str(e)}")
        
        # If no search tools are initialized, log a warning
        if not self.search_tools:
            logger.warning("No search tools were initialized. Web search will not be available.")
    
    @log_execution_time()
    async def search(self, query: str, search_type: str = "web", top_k: int = 3, user_llm: str = None) -> List[Dict[str, Any]]:
        """Optimized search for relevant content from the web based on a query.
        
        Args:
            query: The search query
            search_type: The type of search to perform (not used anymore)
            top_k: Number of results to return
            user_llm: Optional user-provided LLM identifier
            
        Returns:
            List of relevant content results with metadata
        """
        llm_info = f" with user-specified LLM '{user_llm}'" if user_llm else ""
        logger.debug(f"Searching for '{query}'{llm_info}")
        
        # Update stats
        self.stats["total_searches"] += 1
        
        # Check cache first - include user_llm in cache key if provided
        cache_key = f"web_search:{query}:{top_k}"
        if user_llm:
            cache_key += f":{user_llm}"
        
        cached_result = None
        if self.cache_provider:
            cached_result = await self.cache_provider.get(cache_key)
            if cached_result:
                logger.debug(f"Found search results in cache for query: {query}")
                self.stats["cache_hits"] += 1
                return cached_result
        
        try:
            # Prioritized search: DuckDuckGo first, then Tavily as fallback
            search_results = []
            search_priority = ["duckduckgo", "tavily", "wikipedia"]
            
            for tool_name in search_priority:
                if tool_name not in self.search_tools:
                    continue
                    
                tool = self.search_tools[tool_name]
                
                try:
                    # Adjust timeout based on tool type
                    timeout = 2.0 if tool_name == "duckduckgo" else (3.0 if tool_name == "tavily" else 4.0)
                    
                    if tool_name == "duckduckgo":
                        # DuckDuckGo has a different API
                        result = await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(
                                None, lambda: list(tool.text(query, max_results=3))
                            ),
                            timeout=timeout
                        )
                    else:
                        # Other tools use .run() method
                        result = await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(
                                None, tool.run, query
                            ),
                            timeout=timeout
                        )
                    
                    if result:
                        logger.debug(f"{tool_name} search completed successfully for query: {query}")
                        search_results.append((tool_name, result))
                        break  # Use first successful result for priority
                    else:
                        logger.warning(f"{tool_name} returned empty results for query: {query}")
                        
                except asyncio.TimeoutError:
                    logger.warning(f"{tool_name} search timed out for query: {query}")
                except Exception as e:
                    logger.warning(f"{tool_name} search failed: {str(e)}")
                    
                # If we have successful results from DuckDuckGo, don't try others
                if search_results and tool_name == "duckduckgo":
                    break
            
            # Process results
            results = []
            for tool_name, raw_results in search_results:
                if not raw_results:
                    continue
                
                try:
                    # Update stats for successful API calls
                    self.stats["api_calls"] += 1
                    
                    # Extract content based on result format
                    content = ""
                    if tool_name == "duckduckgo":
                        # Handle DuckDuckGo results (list of dicts with 'body' field)
                        if isinstance(raw_results, list) and len(raw_results) > 0:
                            for result in raw_results:
                                if isinstance(result, dict):
                                    body = result.get("body", "")
                                    title = result.get("title", "")
                                    if body:
                                        content += f"{title}: {body}\n\n" if title else f"{body}\n\n"
                    elif tool_name == "tavily":
                        # Handle Tavily results (usually a list of dicts)
                        if isinstance(raw_results, list) and len(raw_results) > 0:
                            for result in raw_results:
                                if isinstance(result, dict):
                                    content += result.get("content", "") + "\n\n"
                        elif isinstance(raw_results, str):
                            # Check if the string contains error information
                            if "HTTPError" in raw_results or "Client Error" in raw_results or "400 Client Error" in raw_results:
                                logger.warning(f"Tavily returned error string: {raw_results}")
                                content = ""  # Don't include error messages in content
                            else:
                                content = raw_results
                        else:
                            # Check if raw_results is an exception or contains error information
                            result_str = str(raw_results)
                            if "HTTPError" in result_str or "Client Error" in result_str or "400 Client Error" in result_str:
                                logger.warning(f"Tavily returned error object: {result_str}")
                                content = ""  # Don't include error messages in content
                            else:
                                content = result_str
                    elif tool_name == "wikipedia":
                        # Handle Wikipedia results
                        if isinstance(raw_results, str):
                            content = raw_results
                    else:
                        # Generic handling - check for error content first
                        if raw_results:
                            result_str = str(raw_results)
                            if "HTTPError" in result_str or "Client Error" in result_str or "400 Client Error" in result_str:
                                logger.warning(f"Generic tool returned error: {result_str}")
                                content = ""  # Don't include error messages in content
                            else:
                                content = result_str
                        else:
                            content = ""
                    
                    # Clean and validate content
                    content = content.strip()
                    
                    # Final safety check - don't include any content that contains error messages
                    if content and ("HTTPError" in content or "Client Error" in content or "400 Client Error" in content):
                        logger.warning(f"Filtered out error content from {tool_name}: {content[:100]}...")
                        content = ""
                    
                    if content and len(content) > 50:  # Only add substantial content
                        results.append({
                            "content": content,
                            "metadata": {
                                "source": tool_name,
                                "query": query,
                                "timestamp": time.time(),
                                "user_llm": user_llm,
                                "content_length": len(content)
                            }
                        })
                        logger.debug(f"Added {tool_name} result with {len(content)} characters")
                    
                    # Early termination if we have enough results
                    if len(results) >= top_k:
                        break
                        
                except Exception as e:
                    logger.warning(f"Error processing {tool_name} results: {str(e)}")
                    self.stats["errors"] += 1
            
            # If no results found, create a minimal fallback
            if not results:
                logger.warning(f"No search results found for query: {query}")
                self.stats["empty_results"] += 1
                results = [{
                    "content": f"No recent web results found for: {query}",
                    "metadata": {
                        "source": "fallback",
                        "query": query,
                        "timestamp": time.time(),
                        "error": "No results found",
                        "user_llm": user_llm
                    }
                }]
            
            # Limit results to top_k
            results = results[:top_k]
            
            # Cache the results with shorter TTL for faster responses
            if self.cache_provider:
                await self.cache_provider.put(cache_key, results, ttl=1800)  # Cache for 30 minutes
            
            logger.debug(f"Found {len(results)} search results for query: {query}")
            return results
            
        except Exception as e:
            logger.error(f"Error in optimized web search: {str(e)}")
            self.stats["errors"] += 1
            return [{
                "content": f"Search unavailable for: {query}",
                "metadata": {
                    "source": "error",
                    "query": query,
                    "timestamp": time.time(),
                    "error": str(e),
                    "user_llm": user_llm
                }
            }]
    
    @log_execution_time()
    async def search_and_enhance(self, query: str, search_type: str = "web", top_k: int = 3, user_llm: str = None) -> Dict[str, Any]:
        """Search for relevant content and use it to enhance the original query.
        
        Args:
            query: The original search query
            search_type: The type of search to perform 
            top_k: Number of results to return
            user_llm: Optional user-provided LLM identifier
            
        Returns:
            Dictionary with enhanced query and search results
        """
        # Check cache first
        cache_key = f"web_search_enhance:{query}:{search_type}:{top_k}"
        if user_llm:
            cache_key += f":{user_llm}"
        
        cached_result = None
        if self.cache_provider:
            cached_result = await self.cache_provider.get(cache_key)
            if cached_result:
                logger.debug(f"Found search and enhance results in cache for query: {query}")
                return cached_result
        
        try:
            # First search for relevant content - pass user_llm to search
            search_results = await self.search(query, search_type, top_k, user_llm)
            
            # If no results, return the original query
            if not search_results or all("error" in result.get("metadata", {}) for result in search_results):
                logger.warning(f"No valid search results found for query: {query}")
                return {
                    "original_query": query,
                    "enhanced_query": query,
                    "search_results": [],
                    "has_relevant_content": False,
                    "user_llm": user_llm
                }
            
            # Extract relevant content from search results
            relevant_content = "\n\n".join([
                f"--- Source: {result['metadata']['source']} ---\n{result['content']}" 
                for result in search_results
                if "error" not in result.get("metadata", {}) and 
                   not ("HTTPError" in result.get("content", "") or 
                        "Client Error" in result.get("content", "") or 
                        "400 Client Error" in result.get("content", ""))
            ])
            
            # Create a context-enriched query
            enhanced_query = f"""Original Query: {query}

Web Search Results:
{relevant_content}

Using the information from the web search results above (if relevant), please provide a comprehensive answer to the original query."""
            
            result = {
                "original_query": query,
                "enhanced_query": enhanced_query,
                "search_results": search_results,
                "has_relevant_content": len(search_results) > 0 and any("error" not in result.get("metadata", {}) for result in search_results),
                "user_llm": user_llm
            }
            
            # Cache the result
            if self.cache_provider:
                await self.cache_provider.put(cache_key, result, ttl=3600)  # Cache for 1 hour
            
            return result
        except Exception as e:
            logger.error(f"Error in web search and enhance: {str(e)}")
            return {
                "original_query": query,
                "enhanced_query": query,
                "search_results": [],
                "has_relevant_content": False,
                "error": str(e),
                "user_llm": user_llm
            }
    
    def get_stats(self) -> Dict[str, int]:
        """Get statistics for search operations."""
        return self.stats

def get_instance():
    """Get the singleton instance of WebSearch."""
    global _instance
    if _instance is None:
        _instance = WebSearch()
    return _instance