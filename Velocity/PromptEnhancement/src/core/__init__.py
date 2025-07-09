"""
Router package for model fallback mechanism with dependency injection support.
"""

from typing import Dict, Any, Type, TypeVar, Optional, cast
import importlib
import logging
from abc import ABC, abstractmethod

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type variable for generic type hints
T = TypeVar('T')

class DIContainer:
    """Dependency Injection Container for the Velocity router."""
    
    _instance = None
    _services: Dict[str, Any] = {}
    _factories: Dict[str, callable] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DIContainer, cls).__new__(cls)
            cls._instance._services = {}
            cls._instance._factories = {}
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance of the container."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register(self, interface_cls, implementation_cls=None):
        """Register a service implementation for an interface."""
        if implementation_cls is None:
            implementation_cls = interface_cls
        
        # Handle string service names or class objects
        service_name = interface_cls if isinstance(interface_cls, str) else interface_cls.__name__
        
        self._services[service_name] = {
            'class': implementation_cls,
            'instance': None
        }
        return self
    
    def register_instance(self, interface_cls, instance):
        """Register an existing instance for an interface."""
        # Handle string service names or class objects
        service_name = interface_cls if isinstance(interface_cls, str) else interface_cls.__name__
        
        self._services[service_name] = {
            'class': instance.__class__,
            'instance': instance
        }
        return self
    
    def register_factory(self, interface_cls, factory_func):
        """Register a factory function for an interface."""
        # Handle string service names or class objects
        service_name = interface_cls if isinstance(interface_cls, str) else interface_cls.__name__
        
        self._factories[service_name] = factory_func
        return self
    
    def resolve(self, interface_cls: Type[T]) -> T:
        """Resolve a service implementation for an interface."""
        # Handle string service names or class objects
        service_name = interface_cls if isinstance(interface_cls, str) else interface_cls.__name__
        
        # Check factories first
        if service_name in self._factories:
            return self._factories[service_name]()
        
        # Then check registered services
        if service_name in self._services:
            service = self._services[service_name]
            if service['instance'] is None:
                # Instantiate the service
                service['instance'] = service['class']()
            return cast(T, service['instance'])
        
        # If not found, try to instantiate the interface directly
        if isinstance(interface_cls, str):
            raise ValueError(f"Cannot resolve implementation for string type {service_name}")
        
        try:
            return interface_cls()
        except Exception as e:
            raise ValueError(f"Cannot resolve implementation for {service_name}: {str(e)}")

# Global container instance
container = DIContainer()

# Interfaces for dependency injection
class ConfigProvider(ABC):
    """Interface for configuration providers."""
    
    @abstractmethod
    def get_config(self, key: str, default: Any = None) -> Any:
        """Get a configuration value by key."""
        pass
    
    @abstractmethod
    def get_section(self, section: str) -> Dict[str, Any]:
        """Get an entire configuration section."""
        pass

class CacheProvider(ABC):
    """Interface for cache providers."""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get a cached value by key."""
        pass
    
    @abstractmethod
    async def put(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store a value in the cache."""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a value from the cache."""
        pass

class ModelProvider(ABC):
    """Interface for model providers."""
    
    @abstractmethod
    async def get_response(self, prompt: str, system_message: Optional[str] = None) -> str:
        """Get a response from the model.
        
        Args:
            prompt: The prompt to send to the model
            system_message: Optional system message to control the model's behavior
            
        Returns:
            The response from the model
        """
        pass

    async def get_streaming_response(self, prompt: str, system_message: Optional[str] = None):
        """Get a streaming response from the model.
        
        Args:
            prompt: The prompt to send to the model
            system_message: Optional system message to control the model's behavior
            
        Yields:
            String chunks of the model's response
        """
        # Default implementation for backward compatibility
        response = await self.get_response(prompt, system_message)
        yield response

class Analyzer(ABC):
    """Interface for query analyzers."""
    
    @abstractmethod
    def analyze(self, query: str) -> Dict[str, Any]:
        """Analyze a query and return the results."""
        pass

class ModelSelector(ABC):
    """Interface for model selectors."""
    
    @abstractmethod
    async def select_provider(self, analysis: Dict[str, Any]) -> Any:
        """Select a provider based on analysis."""
        pass

# Helper function for loading components
def load_component(module_path, class_name):
    """Dynamically load a component from a module."""
    try:
        module = importlib.import_module(module_path)
        return getattr(module, class_name)
    except (ImportError, AttributeError) as e:
        logger.error(f"Error loading component {class_name} from {module_path}: {str(e)}")
        raise

# Initialize the container with default implementations
from src.config.config_manager import ConfigurationManager

# Register the configuration manager
container.register_instance(ConfigProvider, ConfigurationManager.get_instance())

# Register the InMemoryCache implementation for CacheProvider
from src.cache.in_memory_cache import InMemoryCache
container.register(CacheProvider, InMemoryCache)

# Register the SimpleSelector implementation for ModelSelector 
# but avoid circular imports by using global function
def get_selector():
    """Lazy import and instantiation of the selector to avoid circular imports."""
    # Dynamically import the selector only when needed
    selector_module = importlib.import_module('src.llm.selector_v4')
    selector_class = getattr(selector_module, 'SimpleSelector')
    return selector_class.get_instance()

# Register the Analyzer implementation
def get_analyzer():
    """Lazy import and instantiation of the analyzer to avoid circular imports."""
    analyzer_module = importlib.import_module('src.analysis.analyzer')
    analyzer_class = getattr(analyzer_module, 'Analyzer')
    return analyzer_class()

# Register a factory function for Analyzer
container.register_factory(Analyzer, get_analyzer)

# Register a factory function that will lazily load the selector
container.register_factory(ModelSelector, get_selector)

# Register the LLMProvider implementation for ModelProvider
from src.llm.llm_provider import LLMProvider
provider = LLMProvider.get_instance()
container.register_instance(ModelProvider, provider)

# Remove direct import of PromptEnhancer to avoid circular imports
# Instead, register a factory for it
def get_enhancer():
    """Lazy import and instantiation of the enhancer to avoid circular imports."""
    enhancer_module = importlib.import_module('src.enhancement.enhancer')
    enhancer_class = getattr(enhancer_module, 'PromptEnhancer')
    return enhancer_class()

# Register a factory function for PromptEnhancer - use string type directly
# The DIContainer needs to be updated to handle string names
container.register_factory("PromptEnhancer", get_enhancer)

# We'll register other implementations as they're refactored
# to support dependency injection