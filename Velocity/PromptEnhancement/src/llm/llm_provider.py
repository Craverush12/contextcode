"""LLM provider implementation for the dependency injection system.

This module provides a concrete implementation of the ModelProvider interface
that wraps the existing ModelFallback class for backward compatibility.
"""

import logging
from typing import Dict, Any, Optional, List
import asyncio
from dataclasses import dataclass

from src.core import ModelProvider as ModelProviderInterface, container, ConfigProvider
from src.llm.model_fallback import ModelFallback, ModelProvider as ModelType, ModelConfig
from src.core.api_key_manager import ChatGroqKeyManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LLMProviderConfig:
    """Configuration for the LLM provider."""
    use_model_fallback: bool = True
    preferred_provider: Optional[str] = None
    max_concurrency: int = 5
    enable_retries: bool = True
    timeout: int = 60

class LLMProvider(ModelProviderInterface):
    """Implementation of the ModelProvider interface using ModelFallback."""
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance of LLMProvider."""
        if cls._instance is None:
            cls._instance = LLMProvider()
        return cls._instance
    
    def __init__(self, config_provider=None):
        """Initialize the LLM provider with dependency injection."""
        self.config_provider = config_provider or container.resolve(ConfigProvider)
        self.config = self.config_provider.get_section("llm") or {}
        self.model_fallback = None
        self.key_manager = ChatGroqKeyManager()  # Initialize the key manager
        self._initialize_model_fallback()
        
        # Create semaphore for concurrency control
        self._semaphore = asyncio.Semaphore(self.config.get("max_concurrency", 5))
        
        logger.debug("LLMProvider initialized with dependency injection")
    
    def _initialize_model_fallback(self):
        """Initialize the model fallback with configurations from ConfigProvider."""
        model_configs = {}
        
        # Get API keys from config provider
        nvidia_api_key = self.config_provider.get_config("nvidia.api_key")
        openai_api_key = self.config_provider.get_config("openai.api_key")
        gemini_api_key = self.config_provider.get_config("gemini.api_key")
        groq_api_key = self.config_provider.get_config("groq.api_key")
        
        # 1. Add NVIDIA configuration as primary provider
        model_configs[ModelType.NVIDIA] = ModelConfig(
            provider=ModelType.NVIDIA,
            model_name=self.config_provider.get_config("nvidia.model", "nv-mistralai/mistral-nemo-12b-instruct"),
            api_key=nvidia_api_key or "",  # Use empty string if API key is not available
            temperature=self.config_provider.get_config("nvidia.temperature", 0.7),
            max_tokens=self.config_provider.get_config("nvidia.max_tokens", 2048),
            timeout=self.config_provider.get_config("nvidia.timeout", 30),
            retry_attempts=self.config_provider.get_config("nvidia.retry_attempts", 2) if self.config.get("enable_retries", True) else 0,
            cooldown_period=self.config_provider.get_config("nvidia.cooldown_period", 60)
        )
        
        # 2. Add OpenAI configuration if API key available
        if openai_api_key:
            model_configs[ModelType.OPENAI] = ModelConfig(
                provider=ModelType.OPENAI,
                model_name=self.config_provider.get_config("openai.model", "gpt-4-turbo-preview"),
                api_key=openai_api_key,
                temperature=self.config_provider.get_config("openai.temperature", 0.7),
                max_tokens=self.config_provider.get_config("openai.max_tokens", 2048),
                timeout=self.config_provider.get_config("openai.timeout", 30),
                retry_attempts=self.config_provider.get_config("openai.retry_attempts", 2) if self.config.get("enable_retries", True) else 0,
                cooldown_period=self.config_provider.get_config("openai.cooldown_period", 60)
            )
        
        # 3. Add Gemini configuration if API key available
        if gemini_api_key:
            model_configs[ModelType.GEMINI] = ModelConfig(
                provider=ModelType.GEMINI,
                model_name=self.config_provider.get_config("gemini.model", "google/gemma-7b"),
                api_key=gemini_api_key,
                temperature=self.config_provider.get_config("gemini.temperature", 0.7),
                max_tokens=self.config_provider.get_config("gemini.max_tokens", 2048),
                timeout=self.config_provider.get_config("gemini.timeout", 30),
                retry_attempts=self.config_provider.get_config("gemini.retry_attempts", 2) if self.config.get("enable_retries", True) else 0,
                cooldown_period=self.config_provider.get_config("gemini.cooldown_period", 60)
            )
        
        # 4. Add Groq configuration if API key available
        if groq_api_key:
            model_configs[ModelType.GROQ] = ModelConfig(
                provider=ModelType.GROQ,
                model_name=self.config_provider.get_config("groq.model", "llama-3.3-70b-versatile"),
                api_key=self.key_manager.get_current_key(),  # Use the key manager
                temperature=self.config_provider.get_config("groq.temperature", 0.7),
                max_tokens=self.config_provider.get_config("groq.max_tokens", 2048),
                timeout=self.config_provider.get_config("groq.timeout", 30),
                retry_attempts=self.config_provider.get_config("groq.retry_attempts", 2) if self.config.get("enable_retries", True) else 0,
                cooldown_period=self.config_provider.get_config("groq.cooldown_period", 60)
            )
        
        # Create the ModelFallback instance
        self.model_fallback = ModelFallback(model_configs)
    
    async def get_response(self, prompt: str, system_message: Optional[str] = None) -> str:
        """Get a response from the model provider with fallback support.
        
        This method implements the ModelProvider interface and delegates to ModelFallback.
        
        Args:
            prompt: The prompt to send to the model
            system_message: Optional system message to control the model's behavior
            
        Returns:
            The model's response
        """
        try:
            # Use the model fallback mechanism to get a response
            response = await self.model_fallback.get_response(prompt, system_message)
            
            if not response:
                # If no response, try to get a fallback response
                logger.warning("No response from primary model, trying fallback")
                response = await self.model_fallback.get_fallback_response(prompt, system_message)
                
            if not response:
                # If still no response, return a default message
                logger.error("No response from any model")
                return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
                
            return response
        except Exception as e:
            # Log the error and return a default message
            logger.error(f"Error getting response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
            
    async def get_response_with_fallback(self, prompt: str, system_message: Optional[str] = None) -> str:
        """Get a response using fallback providers directly, skipping the primary provider.
        
        This method is specifically designed to handle cases where the primary provider fails,
        such as with NVIDIA AI Endpoints function ID errors.
        
        Args:
            prompt: The prompt to send to the model
            system_message: Optional system message to control the model's behavior
            
        Returns:
            The model's response from a fallback provider
        """
        try:
            # Skip the primary provider and go directly to fallbacks
            response = await self.model_fallback.get_fallback_response(prompt, system_message)
                
            if not response:
                # If no response from fallbacks, return a default message
                logger.error("No response from any fallback model")
                return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
                
            return response
        except Exception as e:
            # Log the error and return a default message
            logger.error(f"Error getting fallback response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
    
    async def get_streaming_response(self, prompt: str, system_message: Optional[str] = None):
        """Get a streaming response from the model provider with fallback support.
        
        This method implements streaming response using LangChain's built-in streaming capabilities.
        
        Args:
            prompt: The prompt to send to the model
            system_message: Optional system message to control the model's behavior
            
        Yields:
            String chunks of the model's response
        """
        try:
            # Use the model fallback mechanism to get a streaming response
            async for chunk in self.model_fallback.get_streaming_response(prompt, system_message):
                yield chunk
        except Exception as e:
            # Log the error and yield error message
            logger.error(f"Error getting streaming response: {str(e)}")
            yield "I'm sorry, I'm having trouble processing your request right now. Please try again later."
    
    async def get_batch_responses(self, prompts: List[str]) -> List[Dict[str, Any]]:
        """Get responses for multiple prompts.
        
        Note: This is an extended method not in the ModelProvider interface.
        
        Args:
            prompts: List of prompts to send to the LLM
            
        Returns:
            List of responses with metadata
        """
        try:
            return await self.model_fallback.get_responses_batch(
                prompts, 
                max_concurrency=self.config.max_concurrency
            )
        except Exception as e:
            logger.error(f"Error getting batch responses: {str(e)}")
            # Return error results for all prompts
            return [{
                "success": False,
                "prompt": prompt,
                "error": {"message": str(e), "error_type": "unknown"}
            } for prompt in prompts]
    
    def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all LLM providers.
        
        Note: This is an extended method not in the ModelProvider interface.
        
        Returns:
            Dictionary with provider status information
        """
        return self.model_fallback.get_provider_status()


# Initialize and register the LLM provider
llm_provider = LLMProvider.get_instance()

# Register with the DI container
from src.core import container, ModelProvider as ModelProviderInterface
container.register_instance(ModelProviderInterface, llm_provider)