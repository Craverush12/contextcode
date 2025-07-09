"""Model fallback mechanism for resilient LLM API access."""

from enum import Enum, auto
from typing import Dict, Any, Optional, List, Tuple
import time
import asyncio
import importlib
import logging
import traceback
import json
from dataclasses import dataclass
from src.core.api_key_manager import ChatGroqKeyManager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define model providers
class ModelProvider(Enum):
    """Supported model providers."""
    NVIDIA = "nvidia"  # NVIDIA as primary provider
    OPENAI = "openai"  # OpenAI as first fallback
    GEMINI = "gemini"  # Google as second fallback
    GROQ = "groq"      # Groq as final fallback
 
class ErrorType(Enum):
    """Standardized error types for better error handling."""
    API_KEY = "api_key_error"       # API key missing or invalid
    TIMEOUT = "timeout_error"       # Request timed out
    CONNECTION = "connection_error" # Network or connection issues
    RATE_LIMIT = "rate_limit_error" # Rate limiting or quota issues
    CONTENT_POLICY = "content_policy_error" # Content policy violation
    VALIDATION = "validation_error" # Input validation error
    MODEL = "model_error"           # Model-specific error
    INTERNAL = "internal_error"     # Internal server error
    UNKNOWN = "unknown_error"       # Unclassified error

@dataclass
class ModelConfig:
    """Configuration for a language model provider."""
    provider: ModelProvider
    model_name: str
    api_key: str
    temperature: float = 0.7
    max_tokens: int = 1024
    timeout: int = 8  # Reduced to 8 seconds to allow faster fallback between providers
    retry_attempts: int = 1  # Reduced to 1 retry to prevent blocking fallback
    cooldown_period: int = 300  # 5 minutes default

class ModelError(Exception):
    """Custom exception for model errors with standardized categorization."""
    def __init__(self, message: str, error_type: ErrorType = ErrorType.UNKNOWN, provider: Optional[ModelProvider] = None, recovery_strategy: Optional[str] = None):
        self.message = message
        self.error_type = error_type
        self.provider = provider
        self.recovery_strategy = recovery_strategy
        super().__init__(self.message)

    def __str__(self):
        provider_str = f"[{self.provider.value}] " if self.provider else ""
        recovery_str = f" - Recovery strategy: {self.recovery_strategy}" if self.recovery_strategy else ""
        return f"{provider_str}{self.error_type.value}: {self.message}{recovery_str}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for serialization."""
        return {
            "message": self.message,
            "error_type": self.error_type.value,
            "provider": self.provider.value if self.provider else None,
            "recovery_strategy": self.recovery_strategy
        }

class ModelFallback:
    """Handles model fallback mechanism with cooldown periods and standardized error handling."""
    
    def __init__(self, configs: Dict[ModelProvider, ModelConfig]):
        """Initialize the model fallback with provider configurations."""
        self.configs = configs
        self.models = {}
        self.error_counts = {provider: 0 for provider in ModelProvider}
        self.cooldown_until = {provider: 0 for provider in ModelProvider}
        # Initialize key manager with the API key from config
        if ModelProvider.GROQ in self.configs and self.configs[ModelProvider.GROQ].api_key:
            self.key_manager = ChatGroqKeyManager(api_key=self.configs[ModelProvider.GROQ].api_key)
        else:
            self.key_manager = None
        self.last_used_model = None  # Initialize last_used_model
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize the LLM models for each provider with standardized error handling."""
        # Initialize Groq model if available and has valid API key
        if ModelProvider.GROQ in self.configs and self.configs[ModelProvider.GROQ].api_key and self.key_manager:
            try:
                from langchain_groq import ChatGroq
                
                self.models[ModelProvider.GROQ] = ChatGroq(
                    model=self.configs[ModelProvider.GROQ].model_name,
                    groq_api_key=self.key_manager.get_current_key(),  # Use the key manager
                    temperature=self.configs[ModelProvider.GROQ].temperature,
                    max_tokens=self.configs[ModelProvider.GROQ].max_tokens,
                    request_timeout=self.configs[ModelProvider.GROQ].timeout
                )
                logger.info("Successfully initialized Groq model")
                # Reset error count on successful initialization
                self.error_counts[ModelProvider.GROQ] = 0
            except ImportError as e:
                error = ModelError(
                    message=f"Groq module not available: {str(e)}", 
                    error_type=ErrorType.INTERNAL,
                    provider=ModelProvider.GROQ,
                    recovery_strategy="Install required package: pip install langchain-groq"
                )
                logger.error(str(error))
            except Exception as e:
                error_type, details = self._categorize_error(e)
                error = ModelError(
                    message=f"Failed to initialize Groq model: {details}",
                    error_type=error_type,
                    provider=ModelProvider.GROQ,
                    recovery_strategy=self._get_recovery_strategy(error_type)
                )
                logger.error(str(error))
                self.error_counts[ModelProvider.GROQ] += 1
                # Set cooldown period for initialization failure
                self._set_cooldown(ModelProvider.GROQ)
        
        # Initialize NVIDIA model if available and has valid API key
        if ModelProvider.NVIDIA in self.configs and self.configs[ModelProvider.NVIDIA].api_key:
            try:
                from langchain_nvidia_ai_endpoints import ChatNVIDIA
                
                self.models[ModelProvider.NVIDIA] = ChatNVIDIA(
                    model=self.configs[ModelProvider.NVIDIA].model_name,
                    nvidia_api_key=self.configs[ModelProvider.NVIDIA].api_key,
                    temperature=self.configs[ModelProvider.NVIDIA].temperature,
                    max_tokens=self.configs[ModelProvider.NVIDIA].max_tokens,
                    request_timeout=self.configs[ModelProvider.NVIDIA].timeout
                )
                logger.info("Successfully initialized NVIDIA model")
                # Reset error count on successful initialization
                self.error_counts[ModelProvider.NVIDIA] = 0
            except ImportError as e:
                error = ModelError(
                    message=f"NVIDIA module not available: {str(e)}", 
                    error_type=ErrorType.INTERNAL,
                    provider=ModelProvider.NVIDIA,
                    recovery_strategy="Install required package: pip install langchain-nvidia-ai-endpoints"
                )
                logger.error(str(error))
                # Don't increment error count for import issues
            except Exception as e:
                error_type, details = self._categorize_error(e)
                error = ModelError(
                    message=f"Failed to initialize NVIDIA model: {details}",
                    error_type=error_type,
                    provider=ModelProvider.NVIDIA,
                    recovery_strategy=self._get_recovery_strategy(error_type)
                )
                logger.error(str(error))
                self.error_counts[ModelProvider.NVIDIA] += 1
                # Set cooldown period for initialization failure
                self._set_cooldown(ModelProvider.NVIDIA)
        elif ModelProvider.NVIDIA in self.configs and not self.configs[ModelProvider.NVIDIA].api_key:
            logger.warning(f"Skipping NVIDIA model initialization due to missing API key")
            # Don't increment error count for missing API key
        
        # Initialize Gemini model if available and has valid API key
        if ModelProvider.GEMINI in self.configs and self.configs[ModelProvider.GEMINI].api_key:
            try:
                # Try to import Gemini dynamically
                gemini_module = importlib.import_module('langchain_google_genai')
                ChatGoogleGenerativeAI = getattr(gemini_module, 'ChatGoogleGenerativeAI')
                
                self.models[ModelProvider.GEMINI] = ChatGoogleGenerativeAI(
                    model=self.configs[ModelProvider.GEMINI].model_name,
                    google_api_key=self.configs[ModelProvider.GEMINI].api_key,
                    temperature=self.configs[ModelProvider.GEMINI].temperature,
                    max_tokens=self.configs[ModelProvider.GEMINI].max_tokens,
                    request_timeout=self.configs[ModelProvider.GEMINI].timeout
                )
                logger.info("Successfully initialized Gemini model")
                # Reset error count on successful initialization
                self.error_counts[ModelProvider.GEMINI] = 0
            except ImportError as e:
                error = ModelError(
                    message=f"Gemini module not available: {str(e)}", 
                    error_type=ErrorType.INTERNAL,
                    provider=ModelProvider.GEMINI,
                    recovery_strategy="Install required package: pip install langchain-google-genai"
                )
                logger.error(str(error))
                # Don't increment error count for import issues
            except Exception as e:
                error_type, details = self._categorize_error(e)
                error = ModelError(
                    message=f"Failed to initialize Gemini model: {details}",
                    error_type=error_type,
                    provider=ModelProvider.GEMINI,
                    recovery_strategy=self._get_recovery_strategy(error_type)
                )
                logger.error(str(error))
                self.error_counts[ModelProvider.GEMINI] += 1
                # Set cooldown period for initialization failure
                self._set_cooldown(ModelProvider.GEMINI)
        elif ModelProvider.GEMINI in self.configs and not self.configs[ModelProvider.GEMINI].api_key:
            logger.warning(f"Skipping Gemini model initialization due to missing API key")
            # Don't increment error count for missing API key
        
        # Initialize OpenAI model if available and has valid API key
        if ModelProvider.OPENAI in self.configs and self.configs[ModelProvider.OPENAI].api_key:
            try:
                from langchain_openai import ChatOpenAI
                
                self.models[ModelProvider.OPENAI] = ChatOpenAI(
                    model=self.configs[ModelProvider.OPENAI].model_name,
                    openai_api_key=self.configs[ModelProvider.OPENAI].api_key,
                    temperature=self.configs[ModelProvider.OPENAI].temperature,
                    max_tokens=self.configs[ModelProvider.OPENAI].max_tokens,
                    request_timeout=self.configs[ModelProvider.OPENAI].timeout
                )
                logger.info("Successfully initialized OpenAI model")
                # Reset error count on successful initialization
                self.error_counts[ModelProvider.OPENAI] = 0
            except ImportError as e:
                error = ModelError(
                    message=f"OpenAI module not available: {str(e)}", 
                    error_type=ErrorType.INTERNAL,
                    provider=ModelProvider.OPENAI,
                    recovery_strategy="Install required package: pip install langchain-openai"
                )
                logger.error(str(error))
                # Don't increment error count for import issues
            except Exception as e:
                error_type, details = self._categorize_error(e)
                error = ModelError(
                    message=f"Failed to initialize OpenAI model: {details}",
                    error_type=error_type,
                    provider=ModelProvider.OPENAI,
                    recovery_strategy=self._get_recovery_strategy(error_type)
                )
                logger.error(str(error))
                self.error_counts[ModelProvider.OPENAI] += 1
                # Set cooldown period for initialization failure
                self._set_cooldown(ModelProvider.OPENAI)
        elif ModelProvider.OPENAI in self.configs and not self.configs[ModelProvider.OPENAI].api_key:
            logger.warning(f"Skipping OpenAI model initialization due to missing API key")
            # Don't increment error count for missing API key
    
    def _categorize_error(self, error: Exception) -> Tuple[ErrorType, str]:
        """Categorize errors into standardized types with improved detection.
        
        Args:
            error: The exception to categorize
            
        Returns:
            Tuple of (ErrorType, detailed error message)
        """
        error_type = type(error).__name__
        error_str = str(error).lower()
        
        # Add stack trace for better debugging
        stack_trace = traceback.format_exc()
        
        # Create detailed error message
        detailed_error = f"{error_type}: {str(error)}"
        
        # API key errors
        if any(term in error_str for term in ["api key", "apikey", "key", "authentication", "auth", "credential", "invalid key", "unauthorized"]):
            return ErrorType.API_KEY, detailed_error
        
        # Timeout errors
        elif any(term in error_str for term in ["timeout", "timed out", "deadline", "too long"]):
            return ErrorType.TIMEOUT, detailed_error
        
        # Connection errors
        elif any(term in error_str.lower() for term in ["connection", "network", "unreachable", "dns", "socket", "connection refused", "host"]):
            return ErrorType.CONNECTION, detailed_error
        
        # Content policy errors
        elif any(term in error_str.lower() for term in ["content policy", "safety", "moderation", "harmful", "inappropriate", "blocked", "violates", "violation"]):
            return ErrorType.CONTENT_POLICY, detailed_error
        
        # Validation errors (prompt too long, etc.)
        elif any(term in error_str.lower() for term in ["validation", "too long", "token limit", "parameter", "invalid", "format", "schema", "required"]):
            return ErrorType.VALIDATION, detailed_error
        
        # Rate limit errors
        elif any(term in error_str.lower() for term in ["rate limit", "ratelimit", "too many requests", "quota", "exceeded", "limit exceeded", "capacity"]):
            return ErrorType.RATE_LIMIT, detailed_error
            
        # Model errors - with specific handling for NVIDIA function ID errors
        elif "function" in error_str.lower() and "not found" in error_str.lower() and "account" in error_str.lower():
            return ErrorType.MODEL, f"{detailed_error} - This appears to be a NVIDIA AI Endpoints function ID error. The model name may be incorrect or no longer available."
        elif any(term in error_str.lower() for term in ["model", "not found", "unavailable", "unsupported", "overloaded"]):
            return ErrorType.MODEL, detailed_error
        
        # Internal server errors
        elif any(term in error_str.lower() for term in ["internal", "server error", "500", "backend", "crash"]):
            return ErrorType.INTERNAL, detailed_error
        
        # Default to unknown
        return ErrorType.UNKNOWN, detailed_error
    
    def _get_recovery_strategy(self, error_type: ErrorType) -> str:
        """Get a recovery strategy based on the error type.
        
        Args:
            error_type: The type of error
            
        Returns:
            A string describing the recovery strategy
        """
        strategies = {
            ErrorType.API_KEY: "Check your API key, regenerate if necessary, or verify billing status",
            ErrorType.TIMEOUT: "Try reducing request complexity or splitting into smaller chunks",
            ErrorType.CONNECTION: "Check your internet connection or try again later",
            ErrorType.RATE_LIMIT: "Wait and retry later, reduce request frequency, or increase quota limits",
            ErrorType.CONTENT_POLICY: "Modify your content to comply with provider's content policies",
            ErrorType.VALIDATION: "Check input parameters and reduce token length if needed",
            ErrorType.MODEL: "Try a different model or verify that the requested model exists. For NVIDIA AI Endpoints errors, ensure you're using a valid model name like 'meta/llama3-70b-instruct' instead of deprecated models.",
            ErrorType.INTERNAL: "Wait and retry later, the provider's service may be experiencing issues",
            ErrorType.UNKNOWN: "Try again later or switch to a different provider"
        }
        
        return strategies.get(error_type, "Try again later")
    
    def _is_in_cooldown(self, provider: ModelProvider) -> bool:
        """Check if a model provider is in cooldown period.
        
        Args:
            provider: The model provider to check
            
        Returns:
            True if the provider is in cooldown, False otherwise
        """
        current_time = time.time()
        return current_time < self.cooldown_until[provider]
    
    def _set_cooldown(self, provider: ModelProvider):
        """Set the cooldown period for a model provider with exponential backoff based on error count.
        
        Args:
            provider: The model provider to set cooldown for
        """
        if provider in self.configs:
            # Apply exponential backoff based on error count
            error_count = self.error_counts[provider]
            backoff_factor = min(2 ** error_count, 8)  # Limit to 8x the base cooldown
            cooldown_period = self.configs[provider].cooldown_period * backoff_factor
            
            self.cooldown_until[provider] = time.time() + cooldown_period
            logger.info(f"Set cooldown period for {provider.value}: {cooldown_period} seconds (error count: {error_count})")
    
    async def _try_model(self, provider: ModelProvider, prompt: str, system_message: Optional[str] = None) -> Optional[str]:
        """Try to get a response from a specific model provider with retry logic and standardized error handling."""
        # Check if model is configured
        if provider not in self.models:
            error = ModelError(
                message=f"Model {provider.value} not configured",
                error_type=ErrorType.INTERNAL,
                provider=provider,
                recovery_strategy="Check your model configurations and initialize the provider"
            )
            logger.warning(str(error))
            return None
        
        # Check if API key is valid
        if provider in self.configs and not self.configs[provider].api_key:
            error = ModelError(
                message=f"Model {provider.value} has missing or invalid API key",
                error_type=ErrorType.API_KEY,
                provider=provider,
                recovery_strategy="Check your API key configuration"
            )
            logger.warning(str(error))
            return None
            
        # Check if model is in cooldown
        if self._is_in_cooldown(provider):
            logger.warning(f"Model {provider.value} is in cooldown period (until {time.ctime(self.cooldown_until[provider])})")
            return None
        
        # Get retry attempts from config or default to 2
        retry_attempts = self.configs[provider].retry_attempts if provider in self.configs else 2
        
        for attempt in range(retry_attempts + 1):  # +1 for the initial attempt
            try:
                if attempt > 0:
                    logger.info(f"Retry attempt {attempt} for {provider.value}")
                    # Add exponential backoff between retries
                    await asyncio.sleep(2 ** attempt)
                
                # Log current key status for Groq
                if provider == ModelProvider.GROQ and self.key_manager:
                    key_status = self.key_manager.get_status()
                    logger.info(f"Current Groq API key status: {key_status}")
                
                logger.info(f"Attempting to get response from {provider.value}")
                
                # Use different invocation depending on whether a system message is provided
                if system_message:
                    from langchain_core.messages import HumanMessage, SystemMessage
                    messages = [
                        SystemMessage(content=system_message),
                        HumanMessage(content=prompt)
                    ]
                    # Use timeout to avoid hanging
                    response = await asyncio.wait_for(
                        self.models[provider].ainvoke(messages),
                        timeout=self.configs[provider].timeout
                    )
                else:
                    # Use timeout to avoid hanging with standard prompt
                    response = await asyncio.wait_for(
                        self.models[provider].ainvoke(prompt),
                        timeout=self.configs[provider].timeout
                    )
                    
                logger.info(f"Successfully got response from {provider.value}")
                
                # Reset error count on successful response
                self.error_counts[provider] = 0
                
                # Rotate API key for Groq after successful response
                if provider == ModelProvider.GROQ and self.key_manager:
                    old_key_index = self.key_manager.current_key_index
                    self.key_manager._rotate_key()
                    new_key_index = self.key_manager.current_key_index
                    logger.warning(f"🔄 ROTATED GROQ API KEY: Switched from key {old_key_index + 1} to key {new_key_index + 1}")
                    logger.info(f"Key rotation status: {self.key_manager.get_status()}")
                
                return response.content
                
            except asyncio.TimeoutError:
                error = ModelError(
                    message=f"Request to {provider.value} timed out after {self.configs[provider].timeout} seconds",
                    error_type=ErrorType.TIMEOUT,
                    provider=provider,
                    recovery_strategy="Try reducing the complexity of your request or splitting it into smaller chunks"
                )
                logger.error(str(error))
                self.error_counts[provider] += 1
                
                # Only set cooldown if this is the last retry attempt
                if attempt == retry_attempts:
                    self._set_cooldown(provider)
                    logger.info(f"Set cooldown period for {provider.value} after timeout")
                    
            except Exception as e:
                error_type, details = self._categorize_error(e)
                error = ModelError(
                    message=f"Error with {provider.value}: {details}",
                    error_type=error_type,
                    provider=provider,
                    recovery_strategy=self._get_recovery_strategy(error_type)
                )
                logger.error(str(error))
                self.error_counts[provider] += 1
                
                # Check if we should immediately break for certain errors (no point retrying)
                error_str = str(e).lower()
                if any(term in error_str for term in ["auth", "api key", "credential", "content policy", "safety", "not found", "rate limit", "ratelimit", "too many requests", "quota", "exceeded"]):
                    self._set_cooldown(provider)
                    logger.info(f"Set cooldown period for {provider.value} - no retry for {error_type.value}")
                    break
                
                # Only set cooldown if this is the last retry attempt
                if attempt == retry_attempts:
                    self._set_cooldown(provider)
                    logger.info(f"Set cooldown period for {provider.value} after all retries failed")
        
        return None
    
    async def get_response(self, prompt: str, system_message: Optional[str] = None) -> str:
        """Get a response from the models with fallback mechanism and standardized error handling.
        
        Args:
            prompt: The prompt to send to the models
            system_message: Optional system message to control the model's behavior
            
        Returns:
            The response from the first successful model
            
        Raises:
            ModelError: If all model providers fail to respond
        """
        # Try to use the last successful model first if available
        if self.last_used_model and self.last_used_model in self.models and not self._is_in_cooldown(self.last_used_model):
            logger.info(f"Trying last successful model {self.last_used_model.value} first")
            response = await self._try_model(self.last_used_model, prompt, system_message)
            if response is not None:
                logger.info(f"Successfully got response from last successful model {self.last_used_model.value}")
                return response
        
        # Filter providers to only include those with valid API keys
        valid_providers = []
        # Prioritize Groq, with NVIDIA as fallback, followed by others
        for provider in [ModelProvider.GROQ, ModelProvider.NVIDIA, ModelProvider.GEMINI, ModelProvider.OPENAI]:
            if provider in self.configs and provider in self.models:
                # Check if API key is valid (not None or empty string)
                if self.configs[provider].api_key:
                    valid_providers.append(provider)
                else:
                    logger.warning(f"Skipping {provider.value} due to missing API key")
        
        if not valid_providers:
            error = ModelError(
                message="No model providers with valid API keys available",
                error_type=ErrorType.API_KEY,
                recovery_strategy="Please check your API key configuration"
            )
            logger.error(str(error))
            raise error
        
        # Try models in order of preference (only those with valid API keys)
        error_messages = []
        for provider in [ModelProvider.GROQ, ModelProvider.NVIDIA, ModelProvider.OPENAI, ModelProvider.GEMINI]:
            logger.info(f"Trying {provider.value}")
            response = await self._try_model(provider, prompt, system_message)
            if response is not None:
                logger.info(f"Successfully got response from {provider.value}")
                self.last_used_model = provider  # Track the successful model
                return response
            else:
                error_messages.append(f"{provider.value}: In cooldown or failed to respond")
        
        # If all models fail, raise a specific error
        error_details = "; ".join(error_messages)
        error = ModelError(
            message=f"All model providers failed to respond. Details: {error_details}",
            error_type=ErrorType.UNKNOWN,
            recovery_strategy="Check your API keys, internet connection, or try again later"
        )
        logger.error(str(error))
        raise error
        
    async def get_fallback_response(self, prompt: str, system_message: Optional[str] = None) -> str:
        """Get a response from fallback models, skipping the primary provider (NVIDIA).
        
        This method is specifically designed to handle cases where the primary provider fails,
        such as with NVIDIA AI Endpoints function ID errors.
        
        Args:
            prompt: The prompt to send to the models
            system_message: Optional system message to control the model's behavior
            
        Returns:
            The response from the first successful fallback model
            
        Raises:
            ModelError: If all fallback model providers fail to respond
        """
        # Filter fallback providers to only include those with valid API keys
        valid_providers = []
        for provider in [ModelProvider.GROQ, ModelProvider.OPENAI, ModelProvider.GEMINI]:
            if provider in self.configs and provider in self.models:
                # Check if API key is valid (not None or empty string)
                if self.configs[provider].api_key:
                    valid_providers.append(provider)
                else:
                    logger.warning(f"Skipping {provider.value} due to missing API key")
        
        if not valid_providers:
            error = ModelError(
                message="No fallback model providers with valid API keys available",
                error_type=ErrorType.API_KEY,
                recovery_strategy="Please check your API key configuration"
            )
            logger.error(str(error))
            raise error
        
        # Try fallback models in order of preference (only those with valid API keys)
        error_messages = []
        for provider in valid_providers:
            logger.info(f"Trying {provider.value} as fallback model (skipping NVIDIA)")
            response = await self._try_model(provider, prompt, system_message)
            if response is not None:
                logger.info(f"Successfully got response from fallback provider {provider.value}")
                self.last_used_model = provider  # Track the successful model
                return response
            else:
                error_messages.append(f"{provider.value}: In cooldown or failed to respond")
        
        # If all fallback models fail, raise a specific error
        error_details = "; ".join(error_messages)
        error = ModelError(
            message=f"All fallback model providers failed to respond. Details: {error_details}",
            error_type=ErrorType.UNKNOWN,
            recovery_strategy="Check your API keys, internet connection, or try again later"
        )
        logger.error(str(error))
        raise error
    
    async def get_streaming_response(self, prompt: str, system_message: Optional[str] = None):
        """Get a streaming response from the models with fallback mechanism.
        
        Args:
            prompt: The prompt to send to the models
            system_message: Optional system message to control the model's behavior
            
        Yields:
            String chunks of the response from the first successful model
        """
        # Try to use the last successful model first if available
        if self.last_used_model and self.last_used_model in self.models and not self._is_in_cooldown(self.last_used_model):
            logger.info(f"Trying last successful model {self.last_used_model.value} first for streaming")
            chunk_received = False
            async for chunk in self._try_streaming_model(self.last_used_model, prompt, system_message):
                if chunk:
                    chunk_received = True
                    yield chunk
            if chunk_received:
                return
        
        # Filter providers to only include those with valid API keys
        valid_providers = []
        for provider in [ModelProvider.GROQ, ModelProvider.NVIDIA, ModelProvider.OPENAI, ModelProvider.GEMINI]:
            if provider in self.configs and provider in self.models:
                if self.configs[provider].api_key:
                    valid_providers.append(provider)
        
        if not valid_providers:
            yield "No model providers with valid API keys available"
            return
        
        # Try models in order of preference
        for provider in valid_providers:
            logger.info(f"Trying {provider.value} for streaming")
            try:
                chunk_count = 0
                async for chunk in self._try_streaming_model(provider, prompt, system_message):
                    if chunk:
                        chunk_count += 1
                        yield chunk
                        
                if chunk_count > 0:
                    logger.info(f"Successfully got streaming response from {provider.value}")
                    self.last_used_model = provider
                    return
            except Exception as e:
                logger.warning(f"Streaming failed for {provider.value}: {str(e)}")
                continue
        
        # If all models fail
        yield "All model providers failed to respond"
    
    async def _try_streaming_model(self, provider: ModelProvider, prompt: str, system_message: Optional[str] = None):
        """Try to get a streaming response from a specific model provider.
        
        Args:
            provider: The model provider to try
            prompt: The prompt to send
            system_message: Optional system message
            
        Yields:
            String chunks from the model response
        """
        if provider not in self.models:
            logger.warning(f"Model {provider.value} is not available")
            return
            
        # Check if model is in cooldown
        if self._is_in_cooldown(provider):
            logger.warning(f"Model {provider.value} is in cooldown period")
            return
        
        try:
            logger.info(f"Attempting to get streaming response from {provider.value}")
            
            # Use LangChain's astream method for proper async streaming
            if system_message:
                from langchain_core.messages import HumanMessage, SystemMessage
                messages = [
                    SystemMessage(content=system_message),
                    HumanMessage(content=prompt)
                ]
                # Use astream for async streaming response
                async for chunk in self.models[provider].astream(messages):
                    if hasattr(chunk, 'content') and chunk.content:
                        yield chunk.content
            else:
                # Use astream for async streaming response with standard prompt
                async for chunk in self.models[provider].astream(prompt):
                    if hasattr(chunk, 'content') and chunk.content:
                        yield chunk.content
                        
        except Exception as e:
            logger.error(f"Streaming error for {provider.value}: {str(e)}")
            # Set cooldown on error
            self.cooldown_until[provider] = time.time() + self.configs[provider].cooldown_period
            self.error_counts[provider] += 1
    
    def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status information about all providers.
        
        Returns:
            Dictionary with provider status information
        """
        current_time = time.time()
        status = {}
        
        # Check NVIDIA first as primary provider
        if ModelProvider.NVIDIA in self.models:
            cooldown_time = self.cooldown_until[ModelProvider.NVIDIA]
            in_cooldown = current_time < cooldown_time
            cooldown_remaining = max(0, cooldown_time - current_time) if in_cooldown else 0
            has_valid_api_key = ModelProvider.NVIDIA in self.configs and bool(self.configs[ModelProvider.NVIDIA].api_key)
            
            status[ModelProvider.NVIDIA.value] = {
                "available": True,
                "has_valid_api_key": has_valid_api_key,
                "in_cooldown": in_cooldown,
                "cooldown_remaining_seconds": int(cooldown_remaining),
                "error_count": self.error_counts[ModelProvider.NVIDIA],
                "is_last_used": ModelProvider.NVIDIA == self.last_used_model,
                "primary": True  # Mark as primary provider
            }
        else:
            status[ModelProvider.NVIDIA.value] = {
                "available": False,
                "has_valid_api_key": False,
                "in_cooldown": False,
                "cooldown_remaining_seconds": 0,
                "error_count": self.error_counts[ModelProvider.NVIDIA],
                "is_last_used": False,
                "primary": True  # Still mark as primary even if not available
            }
        
        # Check other providers
        for provider in [p for p in ModelProvider if p != ModelProvider.NVIDIA]:
            if provider in self.models:
                cooldown_time = self.cooldown_until[provider]
                in_cooldown = current_time < cooldown_time
                cooldown_remaining = max(0, cooldown_time - current_time) if in_cooldown else 0
                has_valid_api_key = provider in self.configs and bool(self.configs[provider].api_key)
                
                status[provider.value] = {
                    "available": True,
                    "has_valid_api_key": has_valid_api_key,
                    "in_cooldown": in_cooldown,
                    "cooldown_remaining_seconds": int(cooldown_remaining),
                    "error_count": self.error_counts[provider],
                    "is_last_used": provider == self.last_used_model,
                    "primary": False  # Not primary provider
                }
            else:
                status[provider.value] = {
                    "available": False,
                    "has_valid_api_key": False,
                    "in_cooldown": False,
                    "cooldown_remaining_seconds": 0,
                    "error_count": self.error_counts[provider],
                    "is_last_used": False,
                    "primary": False  # Not primary provider
                }
        
        return status
    
    async def get_responses_batch(self, prompts: List[str], max_concurrency: int = 5) -> List[Dict[str, Any]]:
        """Process multiple prompts with controlled concurrency.
        
        Args:
            prompts: List of prompts to process
            max_concurrency: Maximum number of concurrent requests
            
        Returns:
            List of responses with metadata
        """
        results = []
        sem = asyncio.Semaphore(max_concurrency)
        
        async def process_with_semaphore(prompt):
            async with sem:
                try:
                    response = await self.get_response(prompt)
                    return {
                        "success": True,
                        "prompt": prompt,
                        "response": response,
                        "provider": self.last_used_model.value if self.last_used_model else None,
                    }
                except ModelError as e:
                    return {
                        "success": False,
                        "prompt": prompt,
                        "error": e.to_dict(),
                    }
        
        # Create tasks for all prompts
        tasks = [process_with_semaphore(prompt) for prompt in prompts]
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks)
        
        return results