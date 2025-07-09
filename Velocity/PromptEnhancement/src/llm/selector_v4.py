"""Simplified Model Selector that uses LLM for intelligent provider selection."""

from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
import time
import hashlib
import os
import asyncio
from functools import lru_cache
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain.chains.llm import LLMChain
from collections import OrderedDict
from langchain_community.cache import InMemoryCache
import langchain
import logging
from src.core.api_key_manager import ChatGroqKeyManager

# Fix the circular import by importing the container without ModelSelector
# Instead define ModelSelector locally with ABC and create the same interface
from abc import ABC, abstractmethod
from src.core import container, ConfigProvider
from src.llm.models import SelectionResult  # Import from the dedicated models module

# Define ModelSelector locally to break the circular dependency
class ModelSelector(ABC):
    """Interface for model selectors."""
    
    @abstractmethod
    async def select_provider(self, analysis: Dict[str, Any]) -> Any:
        """Select a provider based on analysis."""
        pass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable LangChain's in-memory cache
langchain.llm_cache = InMemoryCache()

class SimpleSelector(ModelSelector):
    """Model selector that uses LLM for intelligent provider selection."""
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance of SimpleSelector."""
        if cls._instance is None:
            cls._instance = SimpleSelector()
        return cls._instance
    
    def __init__(self, config_provider=None):
        """Initialize the selector with provider capabilities and LLM."""
        logger.info("Initializing SimpleSelector with dependency injection...")
        
        # Get the config provider through dependency injection
        self.config_provider = config_provider or container.resolve(ConfigProvider)
        
        # Get cache configuration from ConfigProvider
        cache_config = self.config_provider.get_section("cache") or {}
        self.CACHE_SIZE = cache_config.get("max_size", 1000)
        self.CACHE_TTL = cache_config.get("default_ttl", 3600)
        
        # Initialize caches with improved data structures
        self._provider_cache = OrderedDict()  # Changed to OrderedDict for LRU
        self._cache_timestamps = {}
        self._batch_cache = {}  # For batch processing
        self._fallback_cache = OrderedDict()  # Changed to OrderedDict for LRU
        self._fallback_cache_size = self.CACHE_SIZE  # Use default cache size
        
        # Initialize key manager
        self.key_manager = ChatGroqKeyManager()
        
        # Initialize Groq LLM with optimized settings
        self.groq_api_key = self.key_manager.get_current_key()  # Use the key manager
            
        # Preload LLM with optimized settings and caching
        logger.info("Initializing Groq LLM...")
        self.llm = ChatGroq(
            model=self.config_provider.get_config("groq.model", "llama-3.1-8b-instant"),
            groq_api_key=self.groq_api_key,
            temperature=self.config_provider.get_config("groq.temperature", 0.7),
            max_tokens=self.config_provider.get_config("groq.max_tokens", 100),  # Limit response length for selection
            request_timeout=self.config_provider.get_config("groq.timeout", 3),  # Reduced timeout from 5 to 3 seconds
            cache=True  # Enable LLM response caching
        )
        logger.info("Groq LLM initialized successfully")
        
        # Provider capabilities for LLM to consider
        self.provider_capabilities = {
            "anthropic": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "complex reasoning", "technical writing",
                    "code", "architecture", "system design", "documentation",
                    "UI development", "SwiftUI", "animations", "graphics", "code bugs", "debugging",
                ],
                "description": "Best for analysis, planning, complex reasoning, technical documentation, and specialized UI/graphics development including SwiftUI, coding and debugging."
            },
            "openai": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "image_generation", "creative writing",
                    "code", "documentation", "tutorials", "explanations"
                ],
                "description": "Best for general tasks, creative writing, and educational content"
            },
            "google": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "image_generation", "web search",
                    "code", "documentation", "research", "fact-checking"
                ],
                "description": "Best for general knowledge, web search, and research"
            },
            "perplexity": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "research", "fact-checking",
                    "code", "documentation", "technical writing"
                ],
                "description": "Best for research, fact-checking, and technical documentation"
            },
            "gamma": {
                "strengths": [
                    "presentation", "planning", "education", "visual content",
                    "documentation", "tutorials", "explanations"
                ],
                "description": "Best for creating presentations and visual content"
            },
             "bolt": {
                "strengths": [
                    "fullstack", "frontend", "backend", "deployment", "app", "react", "reactjs", "reactnative",
                    "web development", "api", "database", "cloud",
                    "architecture", "system design", "devops", "scaling, app devlopment"
                ],
                "description": "Best for full-stack development, deployment, and cloud services, app devlopment"
            },
            "vercel": {
                "strengths": [
                    "frontend", "backend", "deployment", "app", 
                    "web development", "api", "database", "cloud",
                    "architecture", "system design", "devops", "scaling"
                ],
                "description": "Best for frontend development,web app devlopment"
            },
            "grok": {
                "strengths": [
                    "social", "chat", "general knowledge", "casual conversation",
                    "documentation", "tutorials", "explanations", "prompting engineering"
                ],
                "description": "Best for social interaction and casual conversation, prompting engineering"
            },
            "suno": {
                "strengths": [
                    "music", "audio", "sound generation", "music composition",
                    "audio processing", "music creation", "songwriting", "audio editing",
                    "music production", "beats", "melodies", "audio synthesis"
                ],
                "description": "Best for music generation, audio creation, and sound synthesis"
            },
            "replit": {
                "strengths": [
                    "code", "programming", "web development", "coding education",
                    "collaborative coding", "rapid prototyping", "debugging",
                    "code hosting", "development environment", "code sharing",
                    "coding tutorials", "interactive coding"
                ],
                "description": "Best for collaborative coding, rapid prototyping, and coding education"
            },
            "lovable": {
                "strengths": [
                    "web apps", "frontend", "ui design", "user experience",
                    "interactive applications", "app development", "modern web",
                    "responsive design", "web components", "user interfaces",
                    "app prototyping", "web development"
                ],
                "description": "Best for creating beautiful web applications and user interfaces"
            },
            "mistral": {
                "strengths": [
                    "analysis", "reasoning", "technical writing", "complex tasks",
                    "multilingual", "code analysis", "research", "technical documentation",
                    "problem solving", "logical reasoning", "scientific writing",
                    "advanced reasoning", "technical support"
                ],
                "description": "Best for advanced reasoning, technical analysis, and multilingual tasks"
            }
        }
        
        # Initialize the LLM chain for provider selection with optimized template
        self.selection_chain = self._create_selection_chain()
        
        # Preload provider capabilities string
        self._providers_str = self._format_providers()
        
    def update_provider_description(self, provider_name: str, new_description: str):
        """Update a provider's description and clear caches to ensure changes take effect."""
        if provider_name not in self.provider_capabilities:
            logger.warning(f"Provider {provider_name} not found in capabilities")
            return False
            
        # Update the description
        self.provider_capabilities[provider_name]["description"] = new_description
        logger.info(f"Updated description for {provider_name}: {new_description}")
        
        # Clear caches to ensure updated description is used
        self.clear_provider_cache()
        
        # Also clear the LLM cache to ensure fresh responses
        if hasattr(langchain, "llm_cache") and langchain.llm_cache is not None:
            try:
                langchain.llm_cache.clear()
                logger.info("Cleared LangChain LLM cache")
            except Exception as e:
                logger.error(f"Error clearing LLM cache: {str(e)}")
                
        return True
        
    def update_all_provider_descriptions(self, descriptions_dict: Dict[str, str]):
        """Update multiple provider descriptions at once and clear all caches.
        
        Args:
            descriptions_dict: Dictionary mapping provider names to their new descriptions
        
        Returns:
            Dict with success status for each provider update
        """
        results = {}
        
        for provider_name, new_description in descriptions_dict.items():
            if provider_name in self.provider_capabilities:
                # Update the description
                self.provider_capabilities[provider_name]["description"] = new_description
                logger.info(f"Updated description for {provider_name}: {new_description}")
                results[provider_name] = True
            else:
                logger.warning(f"Provider {provider_name} not found in capabilities")
                results[provider_name] = False
        
        # Clear all caches once after all updates
        self.clear_provider_cache()
        
        # Clear the LLM cache to ensure fresh responses
        if hasattr(langchain, "llm_cache") and langchain.llm_cache is not None:
            try:
                langchain.llm_cache.clear()
                logger.info("Cleared LangChain LLM cache")
            except Exception as e:
                logger.error(f"Error clearing LLM cache: {str(e)}")
        
        return results
        
        # Initialize batch processing semaphore
        self._batch_semaphore = asyncio.Semaphore(5)  # Limit concurrent batch operations
    
    @lru_cache(maxsize=1)
    def _format_providers(self) -> str:
        """Format providers for LLM with caching (name and description only)."""
        return "\n".join([
            f"{name}:\n  Description: {cap['description']}"
            for name, cap in self.provider_capabilities.items()
        ])
        
    def clear_provider_cache(self):
        """Clear the provider format cache to ensure updated descriptions are used."""
        self._format_providers.cache_clear()
        # Also reset the cached string
        self._providers_str = self._format_providers()
        # Recreate the selection chain to ensure it uses the updated descriptions
        self.selection_chain = self._create_selection_chain()
        logger.info("Provider cache cleared and selection chain recreated")
    
    def _create_selection_chain(self):
        """Create the selection chain using modern RunnableSequence instead of deprecated LLMChain."""
        template = """Given the following user query and available providers, select the most appropriate provider.

User Query: {query}

Available Providers:
{providers}

Consider the following factors:
1. Query type and requirements
2. Provider's description and capabilities
3. Special requirements (e.g., image_generation, presentation creation, full-stack development)

IMPORTANT ROUTING RULES (in order of priority):
- If the query mentions research, studying, investigating, fact-checking, intrusion detection, cybersecurity, security analysis, or finding current information, always select Perplexity
- If the query mentions creating presentations, slides, decks, or visual content, always select Gamma
- If the query mentions full-stack development, web applications, app deployment, or building complete applications, select Bolt
- If the query mentions technical analysis, system design, architecture design, complex reasoning, or technical documentation, consider Anthropic
- If the query mentions code generation, programming, debugging, or software implementation, consider Anthropic
- If the query mentions Google-specific services or general knowledge questions, consider Google
- For creative writing, content creation, or general assistance, consider OpenAI

Security and Research Priority:
- Cybersecurity topics → Perplexity
- Research papers and studies → Perplexity  
- Technical security analysis → Perplexity
- Current events and facts → Perplexity

Select the best provider based ONLY on their descriptions and the query requirements.

Response Format:
Provider: [provider_name]
"""
        prompt = PromptTemplate(
            input_variables=["query", "providers"],
            template=template
        )
        
        # Use the modern RunnableSequence approach instead of LLMChain
        from langchain_core.runnables import RunnablePassthrough
        return {"query": RunnablePassthrough(), "providers": lambda _: self._providers_str} | prompt | self.llm
    
    async def select_provider(self, query_analysis: Dict[str, Any]) -> SelectionResult:
        """Select the best provider for the given query with caching and fallback support."""
        logger.info("Starting provider selection...")
        start_time = time.time()
        
        # Clear provider format cache to ensure updated descriptions are used
        self.clear_provider_cache()
        
        # Check if user provided LLM directly
        if "llm" in query_analysis and query_analysis["llm"]:
            provider_name = query_analysis["llm"]
            logger.info(f"Using user-provided LLM: {provider_name}")
            
            # Store the original provider for potential fallback
            original_provider = provider_name
            
            return SelectionResult(
                provider=provider_name,
                is_from_cache=False,
                cache_key="",
                timestamp=time.time(),
                original_provider=original_provider
            )
        
        # Get the original query
        user_query = query_analysis.get("original_prompt", "").lower()
        cache_key = self._get_cache_key(user_query if user_query else query_analysis)
        logger.info(f"Processing query: {user_query[:100]}...")
        
        # Check fallback cache first (faster than LLM selection)
        if cache_key in self._fallback_cache:
            logger.info("Found result in fallback cache")
            # Move to end (most recently used)
            self._fallback_cache.move_to_end(cache_key)
            fallback_provider = self._fallback_cache[cache_key]
            return SelectionResult(
                provider=fallback_provider,
                is_from_cache=True,
                cache_key=cache_key,
                timestamp=time.time()
            )
        
        # Check main cache
        if cache_key in self._provider_cache and self._is_cache_valid(cache_key):
            logger.info("Found result in main cache")
            # Move to end (most recently used)
            self._provider_cache.move_to_end(cache_key)
            cached_result = self._provider_cache[cache_key]
            
            # Store the original provider for potential fallback
            original_provider = cached_result.get("original_provider", cached_result["provider"])
            
            return SelectionResult(
                provider=cached_result["provider"],
                is_from_cache=True,
                cache_key=cache_key,
                timestamp=self._cache_timestamps[cache_key],
                original_provider=original_provider
            )
        
        # Try fallback logic before LLM call
        logger.info("Trying fallback logic...")
        fallback_provider = self._get_fallback_provider(user_query)
        if fallback_provider:
            logger.info(f"Using fallback provider: {fallback_provider}")
            # Update fallback cache
            self._fallback_cache[cache_key] = fallback_provider
            if len(self._fallback_cache) > self._fallback_cache_size:
                self._fallback_cache.popitem(last=False)  # Remove least recently used
            
            # Store the original provider for potential fallback
            original_provider = fallback_provider
            
            return SelectionResult(
                provider=fallback_provider,
                is_from_cache=True,
                cache_key=cache_key,
                timestamp=time.time(),
                original_provider=original_provider
            )
        
        # Only use LLM if fallback fails
        logger.info("No cache hit, using LLM...")
        try:
            selected_provider = await self._get_llm_selection(user_query)
            logger.info(f"LLM selected provider: {selected_provider}")
        except Exception as e:
            logger.error(f"Error in LLM selection: {str(e)}")
            selected_provider = self._get_fallback_provider(user_query)
            logger.info(f"Using fallback after LLM error: {selected_provider}")
        
        # Cache the result
        logger.info("Caching result...")
        self._provider_cache[cache_key] = {
            "provider": selected_provider,
            "original_provider": selected_provider  # Store original for fallback tracking
        }
        self._cache_timestamps[cache_key] = time.time()
        
        # Update fallback cache
        self._fallback_cache[cache_key] = selected_provider
        if len(self._fallback_cache) > self._fallback_cache_size:
            self._fallback_cache.popitem(last=False)
        
        # Clean cache if needed
        if len(self._provider_cache) > self.CACHE_SIZE:
            logger.info("Cleaning cache...")
            self._clean_cache()
        
        end_time = time.time()
        logger.info(f"Provider selection completed in {end_time - start_time:.2f} seconds")
        
        return SelectionResult(
            provider=selected_provider,
            is_from_cache=False,
            cache_key=cache_key,
            timestamp=time.time(),
            original_provider=selected_provider
        )
    
    async def _get_llm_selection(self, query: str) -> str:
        """Get provider selection from LLM with improved content creation handling."""
        try:
            print(f"\n[LLM Selection] Getting selection for query: {query[:100]}...")
            
            # Ensure we're using the latest provider descriptions
            latest_providers = self._format_providers()
            
            # Get LLM response with timeout
            response = await asyncio.wait_for(
                self.selection_chain.arun(
                    query=query,
                    providers=latest_providers
                ),
                timeout=5.0
            )
            
            print(f"[LLM Selection] Raw response: {response}")
            
            # Validate response format
            if not response or not isinstance(response, str):
                raise ValueError("Invalid response format from LLM")
            
            # Parse response with improved validation
            lines = response.split("\n")
            provider = None
            
            for line in lines:
                if line.startswith("Provider:"):
                    provider = line.split(":")[1].strip().lower()
                    print(f"[LLM Selection] Found provider in response: {provider}")
                    # Validate provider name
                    if not provider or len(provider) < 2:
                        raise ValueError("Invalid provider name in response")
                    
                    # Map provider names to standardized provider names
                    provider_map = {
                        "anthropic": "anthropic",
                        "openai": "openai",
                        "google": "google",
                        "perplexity": "perplexity",
                        "gamma": "gamma",
                        "vercel": "vercel",
                        "bolt": "bolt",
                        "grok": "grok",
                        "suno": "suno",
                        "replit": "replit",
                        "lovable": "lovable",
                        "mistral": "mistral"
                    }
                    
                    # Validate mapped provider
                    mapped_provider = provider_map.get(provider, provider)
                    if mapped_provider not in self.provider_capabilities:
                        # If the mapped provider is not in capabilities, try the original provider
                        if provider in self.provider_capabilities:
                            mapped_provider = provider
                        else:
                            raise ValueError(f"Unsupported provider: {mapped_provider}")
                    
                    provider = mapped_provider
                    print(f"[LLM Selection] Mapped provider to model: {provider}")
                    break
            
            # If no valid provider found, use fallback logic
            if not provider:
                print("[LLM Selection] No valid provider found, using fallback logic")
                # Enhanced fallback logic based on query analysis
                query_lower = query.lower()
                
                # Check for full-stack development projects
                if any(word in query_lower for word in ["fullstack", "full-stack", "full stack", "erp", "enterprise", "system", "architecture", "design", "implementation"]):
                    provider = "anthropic"  # Better for complex system design and architecture
                    print("[LLM Selection] Using fallback: anthropic (full-stack development)")
                
                # Check for presentation creation
                elif any(word in query_lower for word in ["presentation", "present", "slides", "slide", "deck", "slideshow", "ppt", "powerpoint", "keynote"]):
                    provider = "gamma"  # Gamma is specialized for presentations
                    print("[LLM Selection] Using fallback: gamma (presentation creation)")
                
                # Check for research queries
                elif any(word in query_lower for word in ["research", "study", "investigate", "find information", "latest", "current", "recent", "fact check", "facts"]):
                    provider = "perplexity"  # Perplexity is best for research and fact-checking
                    print("[LLM Selection] Using fallback: perplexity (research and fact-checking)")
                
                # Check for content creation tasks
                elif any(word in query_lower for word in ["write", "letter", "story", "article", "blog", "poem", "essay", "content", "creative", "personal"]):
                    provider = "openai"  # Better for creative writing
                    print("[LLM Selection] Using fallback: openai (content creation)")
                
                # Check for code-related queries
                elif any(word in query_lower for word in ["code", "program", "function", "api", "database", "algorithm"]):
                    provider = "anthropic"  # Better for code
                    print("[LLM Selection] Using fallback: anthropic (code-related)")
                
                # Check for analysis/evaluation
                elif any(word in query_lower for word in ["analyze", "analysis", "data analysis", "examine", "evaluate"]):
                    provider = "anthropic"  # Better for analysis
                    print("[LLM Selection] Using fallback: anthropic (analysis/evaluation)")
                
                # Check for technical/development
                elif any(word in query_lower for word in ["dev", "development", "tech", "technical", "vercel", "react", "api"]):
                    provider = "vercel"  # Better for development
                    print("[LLM Selection] Using fallback: vercel (technical/development)")
                
                # Music and audio generation (new provider)
                elif any(word in query_lower for word in ["music", "song", "audio", "sound", "beat", "melody", "composition", "songwriting", "audio synthesis", "music production"]):
                    logger.info("[Fallback] Using fallback: suno (music and audio generation)")
                    return "suno"  # Suno is specialized for music and audio
                
                # Coding education and collaborative coding (new provider)
                elif any(word in query_lower for word in ["coding tutorial", "learn to code", "coding education", "collaborative coding", "code sharing", "programming tutorial", "interactive coding"]):
                    logger.info("[Fallback] Using fallback: replit (coding education)")
                    return "replit"  # Replit is specialized for coding education
                
                # Web app development and UI design (new provider)
                elif any(word in query_lower for word in ["web app", "ui design", "user interface", "frontend development", "responsive design", "web components", "app prototyping"]):
                    logger.info("[Fallback] Using fallback: lovable (web app development)")
                    return "lovable"  # Lovable is specialized for web app development
                
                # Advanced reasoning and multilingual tasks (new provider)
                elif any(word in query_lower for word in ["advanced reasoning", "complex analysis", "multilingual", "technical analysis", "logical reasoning", "scientific writing"]):
                    logger.info("[Fallback] Using fallback: mistral (advanced reasoning)")
                    return "mistral"  # Mistral is specialized for advanced reasoning
                
                # Default fallback
                else:
                    provider = "openai"
                    print("[LLM Selection] Using default fallback: openai")
            
            return provider
            
        except asyncio.TimeoutError:
            # Enhanced timeout handling with logging
            print(f"[LLM Selection] Timeout occurred while selecting provider for query: {query[:100]}...")
            return self._get_fallback_provider(query)
            
        except Exception as e:
            # Enhanced error handling with logging
            print(f"[LLM Selection] Error in LLM selection: {str(e)}")
            return self._get_fallback_provider(query)

    def _get_fallback_provider(self, query: str, failed_provider: str = None) -> str:
        """Get fallback provider based on query analysis and previously failed provider.
        
        Args:
            query: The user query
            failed_provider: The provider that failed, if any
            
        Returns:
            The fallback provider to use
        """
        query_lower = query.lower()
        
        # Define fallback chains for different providers
        fallback_chains = {
            "openai": ["anthropic", "google", "groq"],
            "anthropic": ["openai", "google", "groq"],
            "google": ["anthropic", "openai", "groq"],
            "groq": ["openai", "anthropic", "google"],
            "vercel": ["anthropic", "openai", "groq"],
            "bolt": ["vercel", "anthropic", "openai"],
            "gamma": ["openai", "anthropic", "groq"],
            "perplexity": ["openai", "anthropic", "groq"],
            "grok": ["openai", "anthropic", "groq"],
            "suno": ["openai", "anthropic", "groq"],
            "replit": ["anthropic", "openai", "groq"],
            "lovable": ["vercel", "anthropic", "openai"],
            "mistral": ["anthropic", "openai", "groq"]
        }
        
        # If we have a failed provider, try the next one in its fallback chain
        if failed_provider and failed_provider in fallback_chains:
            logger.info(f"Finding fallback for failed provider: {failed_provider}")
            for fallback in fallback_chains[failed_provider]:
                logger.info(f"Considering fallback: {fallback}")
                return fallback
        
        # Enhanced fallback logic based on query content - ORDER MATTERS (most specific first)
        
        # Music and audio generation (new provider)
        if any(word in query_lower for word in ["music", "song", "audio", "sound", "beat", "melody", "composition", "songwriting", "audio synthesis", "music production"]):
            logger.info("[Fallback] Using fallback: suno (music and audio generation)")
            return "suno"  # Suno is specialized for music and audio
        
        # Coding education and collaborative coding (new provider)
        elif any(word in query_lower for word in ["coding tutorial", "learn to code", "coding education", "collaborative coding", "code sharing", "programming tutorial", "interactive coding"]):
            logger.info("[Fallback] Using fallback: replit (coding education)")
            return "replit"  # Replit is specialized for coding education
        
        # Web app development and UI design (new provider)
        elif any(word in query_lower for word in ["web app", "ui design", "user interface", "frontend development", "responsive design", "web components", "app prototyping"]):
            logger.info("[Fallback] Using fallback: lovable (web app development)")
            return "lovable"  # Lovable is specialized for web app development
        
        # Advanced reasoning and multilingual tasks (new provider)
        elif any(word in query_lower for word in ["advanced reasoning", "complex analysis", "multilingual", "technical analysis", "logical reasoning", "scientific writing"]):
            logger.info("[Fallback] Using fallback: mistral (advanced reasoning)")
            return "mistral"  # Mistral is specialized for advanced reasoning
        
        # Research and information gathering (highest priority for academic/research content)
        elif any(word in query_lower for word in ["research", "study", "investigate", "find information", "latest", "current", "recent", "fact check", "facts", "intrusion detection", "cybersecurity", "security analysis"]):
            logger.info("[Fallback] Using fallback: perplexity (research and fact-checking)")
            return "perplexity"  # Perplexity is best for research and fact-checking
        
        # Presentation creation
        elif any(word in query_lower for word in ["presentation", "present", "slides", "slide", "deck", "slideshow", "ppt", "powerpoint", "keynote"]):
            logger.info("[Fallback] Using fallback: gamma (presentation creation)")
            return "gamma"  # Gamma is specialized for presentations
        
        # Full-stack development (more specific patterns)
        elif any(word in query_lower for word in ["fullstack", "full-stack", "full stack", "web application", "app development", "deploy app", "build app"]):
            logger.info("[Fallback] Using fallback: bolt (full-stack development)")
            return "bolt"  # Better for full-stack application development
        
        # Technical analysis and system design (not just any system)
        elif any(word in query_lower for word in ["analyze", "analysis", "data analysis", "examine", "evaluate", "system design", "architecture design", "technical documentation"]):
            logger.info("[Fallback] Using fallback: anthropic (analysis and evaluation)")
            return "anthropic"  # Better for analysis and evaluation
        
        # Creative writing
        elif any(word in query_lower for word in ["write", "letter", "story", "article", "blog", "poem", "essay", "content", "creative", "personal"]):
            logger.info("[Fallback] Using fallback: openai (creative writing)")
            return "openai"  # Better for creative writing
        
        # Code-related queries
        elif any(word in query_lower for word in ["code", "program", "function", "api", "database", "programming"]):
            logger.info("[Fallback] Using fallback: anthropic (coding)")
            return "anthropic"  # Better for code
        
        # Development (general)
        elif any(word in query_lower for word in ["dev", "development", "tech", "technical"]):
            logger.info("[Fallback] Using fallback: vercel (development)")
            return "vercel"  # Better for development
        
        logger.info("[Fallback] Using default fallback: openai")
        return "openai"  # Default fallback
    
    def _get_cache_key(self, data: Any) -> str:
        """Generate a cache key for the given data."""
        if isinstance(data, str):
            return hashlib.md5(data.encode()).hexdigest()
        elif isinstance(data, dict):
            return hashlib.md5(str(sorted(data.items())).encode()).hexdigest()
        return hashlib.md5(str(data).encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if the cached data is still valid."""
        if cache_key not in self._cache_timestamps:
            return False
        return (time.time() - self._cache_timestamps[cache_key]) < self.CACHE_TTL
    
    def _clean_cache(self):
        """Clean expired cache entries."""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self._cache_timestamps.items()
            if (current_time - timestamp) >= self.CACHE_TTL
        ]
        for key in expired_keys:
            self._provider_cache.pop(key, None)
            self._cache_timestamps.pop(key, None)
    
    async def handle_provider_failure(self, selection_result: SelectionResult, query: str) -> SelectionResult:
        """Handle provider failure by selecting a fallback provider.
        
        Args:
            selection_result: The original selection result with the failed provider
            query: The original query
            
        Returns:
            A new SelectionResult with the fallback provider
        """
        logger.warning(f"Provider {selection_result.provider} failed, selecting fallback")
        
        # Get the original provider that failed
        failed_provider = selection_result.provider
        
        # Get a fallback provider based on the failed provider
        fallback_provider = self._get_fallback_provider(query, failed_provider)
        
        logger.info(f"Selected fallback provider: {fallback_provider}")
        
        # Create a new selection result with the fallback provider
        return SelectionResult(
            provider=fallback_provider,
            is_from_cache=False,
            cache_key=selection_result.cache_key,
            timestamp=time.time(),
            original_provider=selection_result.original_provider or failed_provider,
            is_fallback=True,
            fallback_reason=f"Original provider {failed_provider} failed"
        )
    
    async def select_providers_batch(self, queries: List[Dict[str, Any]]) -> List[SelectionResult]:
        """Select providers for multiple queries in parallel with rate limiting.
        
        Args:
            queries: List of query analysis dictionaries
            
        Returns:
            List of SelectionResult objects
        """
        async with self._batch_semaphore:
            # Process queries in parallel with rate limiting
            tasks = [self.select_provider(query) for query in queries]
            return await asyncio.gather(*tasks)
    
    async def select_domain_llm(self, prompt: str) -> str:
        """Select the best domain for the given prompt using the LLM."""
        # Define a list of possible domains
        domains = [
            "code", "content_creation", "marketing", "image_generation", "finance", "business", 
            "generation", "education", "health", "legal", "music", "prompt_engineering",
            "data_analysis", "research", "security", "general"]
        # Create a prompt for the LLM
        template = (
            "Given the following user query, select the most appropriate domain from this list: "
            f"{', '.join(domains)}.\n\n"
            "User Query: {query}\n\n"
            "Response Format:\nDomain: [domain_name]"
        )
        prompt_template = PromptTemplate(input_variables=["query"], template=template)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        try:
            response = await asyncio.wait_for(chain.arun(query=prompt), timeout=5.0)
            for line in response.split("\n"):
                if line.lower().startswith("domain:"):
                    domain = line.split(":")[1].strip().lower()
                    if domain in domains:
                        return domain
            # fallback: return 'general' if not found
            return "general"
        except Exception as e:
            logger.error(f"Error in LLM domain selection: {str(e)}")
            return "general"
    
    async def select_domain_and_provider(self, prompt: str, provider_capabilities=None) -> Tuple[str, SelectionResult]:
        """Select both the best domain and provider for the given prompt using the LLM.
        
        Args:
            prompt: The user's prompt
            provider_capabilities: Optional dictionary of provider capabilities including descriptions
            
        Returns:
            A tuple of (domain, SelectionResult)
        """
        # First, check for specific keywords that might indicate prompt engineering or security concerns
        prompt_lower = prompt.lower()
        security_keywords = [
            "bypass", "reveal", "system access", "override", "admin command", 
            "disclose", "core", "directives", "system prompt", "injection",
            "prompt hack", "jailbreak", "override default", "reveal rules"
        ]
        
        # If security-related keywords are detected, classify as prompt_engineering and use a more secure provider
        if any(keyword in prompt_lower for keyword in security_keywords):
            logger.warning(f"Security-related keywords detected in prompt: {prompt[:100]}...")
            domain = "prompt_engineering"
            # For prompt engineering and potential prompt injection attempts, 
            # select a provider that handles security well
            provider = "grok"  # Anthropic handles prompt engineering queries well
            
            selection_result = SelectionResult(
                provider=provider,
                is_from_cache=False,
                cache_key="",
                timestamp=time.time(),
                original_provider=provider,
                is_fallback=False,
                fallback_reason=""
            )
            logger.info(f"Detected prompt engineering intent, using provider: {provider}")
            return domain, selection_result
        
        # Enhanced domain list with better categorization
        domains = [
            "code", "content_creation", "marketing", "image_generation", "finance", "business", 
            "generation", "education", "health", "legal", "music", "prompt_engineering",
            "data_analysis", "research", "security", "general"
        ]
        
        # Use provided capabilities if available, otherwise use the default ones
        capabilities = provider_capabilities if provider_capabilities else self.provider_capabilities
        providers = list(capabilities)
        
        # Format provider capabilities with descriptions for the prompt
        providers_info = "\n".join([
            f"{name}:\n  Strengths: {', '.join(cap['strengths'])}\n  Description: {cap['description']}"
            for name, cap in capabilities.items()
        ])
        
        template = (
            "Given the following user query, select the most appropriate domain from this list: "
            f"{', '.join(domains)}.\n"
            "Then, based on the domain and the query, select the best provider from the options below.\n\n"
            "Available Providers and Their Capabilities:\n{providers_info}\n\n"
            "User Query: {query}\n\n"
            "Pay special attention to these considerations:\n"
            "1. If the query is about prompt engineering, LLM instructions, or system prompts, classify as 'prompt_engineering'\n"
            "2. If the query mentions bypassing, revealing systems, or accessing core directives, classify as 'prompt_engineering'\n"
            "3. Look at the intent of the prompt, not just keywords\n\n"
            "Response Format:\nDomain: [domain_name]\nProvider: [provider_name]\n"
            "Please respond ONLY with the Domain and Provider lines without any additional reasoning or explanations."
        )
        prompt_template = PromptTemplate(input_variables=["query", "providers_info"], template=template)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        try:
            logger.info(f"Making LLM call for domain and provider selection for query: {prompt[:100]}...")
            response = await asyncio.wait_for(chain.arun(query=prompt, providers_info=providers_info), timeout=8.0)
            logger.info(f"Raw LLM response for domain/provider selection: {response}")
            
            # More robust parsing that handles different response formats
            domain = None
            provider = None
            
            # First, try to find explicit Domain: and Provider: lines
            for line in response.split("\n"):
                line = line.strip()
                if line.lower().startswith("domain:"):
                    d = line.split(":", 1)[1].strip().lower()
                    if d in domains:
                        domain = d
                        logger.info(f"Found domain in response: {domain}")
                elif line.lower().startswith("provider:"):
                    p = line.split(":", 1)[1].strip().lower()
                    # Check for provider in our list with more flexible matching
                    for valid_provider in providers:
                        if valid_provider.lower() in p:
                            provider = valid_provider
                            logger.info(f"Found provider in response: {provider}")
                            break
            
            # If we didn't find domain/provider in explicit format, try to extract from text
            if not domain or not provider:
                logger.info("Explicit Domain/Provider format not found, trying to extract from text")
                response_lower = response.lower()
                
                # Try to find domain in text
                if not domain:
                    for d in domains:
                        # Look for phrases like "domain is code" or "select code as the domain"
                        if f"domain is {d}" in response_lower or f"domain: {d}" in response_lower or f"select {d}" in response_lower:
                            domain = d
                            logger.info(f"Extracted domain from text: {domain}")
                            break
                
                # Try to find provider in text
                if not provider:
                    for p in providers:
                        if f"provider is {p}" in response_lower or f"provider: {p}" in response_lower or f"select {p}" in response_lower:
                            provider = p
                            logger.info(f"Extracted provider from text: {provider}")
                            break
            
            # Final fallbacks if extraction failed
            if not domain:
                domain = "general"
                logger.info(f"Using default domain: {domain}")
            
            if not provider:
                # Use domain-based default providers
                if domain == "code":
                    provider = "anthropic"
                elif domain in ["content_creation", "creative", "writing"]:
                    provider = "openai"
                else:
                    provider = "openai"  # General default
                logger.info(f"Using default provider for domain {domain}: {provider}")
            
            selection_result = SelectionResult(
                provider=provider,
                is_from_cache=False,
                cache_key="",
                timestamp=time.time(),
                original_provider=provider
            )
            return domain, selection_result
        except Exception as e:
            logger.error(f"Error in LLM domain/provider selection: {str(e)}")
            # Use more appropriate defaults in case of error
            selection_result = SelectionResult(
                provider="openai",
                is_from_cache=False,
                cache_key="",
                timestamp=time.time(),
                original_provider="openai"
            )
            return "general", selection_result
    
    async def async_select_domain_and_provider(self, prompt: str, provider_capabilities=None) -> Tuple[str, SelectionResult]:
        """Select both the best domain and provider for the given prompt using parallel async processes.
        
        This method runs two separate LLM calls in parallel:
        1. One to determine the appropriate domain
        2. One to select the provider based on the query
        
        This approach can be faster than a single combined call and allows each process to be
        specialized for its task.
        
        Args:
            prompt: The user's prompt
            provider_capabilities: Optional dictionary of provider capabilities including descriptions
            
        Returns:
            A tuple of (domain, SelectionResult)
        """
        logger.info("Starting parallel domain and provider selection...")
        start_time = time.time()
        
        # Create tasks for domain and provider selection to run in parallel
        domain_task = asyncio.create_task(self.select_domain_llm(prompt))
        provider_task = asyncio.create_task(self.select_provider({"original_prompt": prompt}))
        
        # Wait for both tasks to complete
        domain, provider_result = await asyncio.gather(domain_task, provider_task)
        
        end_time = time.time()
        logger.info(f"Parallel domain and provider selection completed in {end_time - start_time:.2f} seconds")
        
        return domain, provider_result


# Initialize and register the selector with the container
selector = SimpleSelector.get_instance()
container.register_instance(ModelSelector, selector)