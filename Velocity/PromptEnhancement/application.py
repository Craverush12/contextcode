"""
Velocity Router Application

Main entry point for the Velocity Router service.
"""

import os
import sys
import time
import re
import asyncio
from pathlib import Path
import hashlib
from fastapi import FastAPI, Request, WebSocket, UploadFile, File, Form
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
import uvicorn
from contextlib import asynccontextmanager
import warnings
import json
from dotenv import load_dotenv
from typing import Dict, Tuple, List, Optional
import numpy as np
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from PIL import Image
import base64
import io
try:
    import uvloop  # High-performance event loop
    UVLOOP_AVAILABLE = True
except ImportError:
    UVLOOP_AVAILABLE = False

from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware

# Rate limiting imports
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Load environment variables from .env file
load_dotenv()

# Suppress specific LangChain deprecation warnings
warnings.filterwarnings("ignore", message=".*LangChain uses pydantic v2 internally.*")
warnings.filterwarnings("ignore", message=".*The class `LLMChain` was deprecated.*")

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import router modules - Use lazy imports for components involved in circular dependencies
from src.enhancement.enhancer import PromptEnhancer
from src.config.config_manager import ConfigProvider
from src.core import CacheProvider
from src.core import ModelProvider, ModelSelector, Analyzer  # Add Analyzer here too
from src.core.module_init import container
from src.analysis.web_search import get_instance as get_search_instance  # Import our new WebSearch module
from src.llm.selector_v4 import ModelSelector  # Import ModelSelector directly
from src.analysis.prompt_quality_analyzer import PromptQualityAnalyzer  # Import the new PromptQualityAnalyzer

# Import standardized logging
from src.logging.logger import configure_logging, get_logger, log_context, async_log_execution_time, log_http_access

# Import Refine module
from src.enhancement.refine import Refine

# Import the IntentAnalyzer
from src.analysis.intent_analyzer import IntentAnalyzer

# Import the Analyzer class
from src.analysis.analyzer import Analyzer

# Import the RelevancePlanner class
from src.analysis.relevance_planner import RelevancePlanner

# Import modularized API helper functions
from src.api.classifiers import WebsiteClassifier, estimate_reading_time
from src.api.validators import validate_classification_input, extract_domain_from_url
from src.api.text_analyzer import TextAnalyzer
from src.api.text_validators import validate_text_analysis_input
from src.api.question_generator import QuestionGenerator
from src.api.question_validators import validate_question_input
from src.api.ai_query_processor import AIQueryProcessor
from src.api.ai_query_validators import validate_ai_query_input, sanitize_query_data
from src.api.prompt_enhancer import PromptEnhancer
from src.api.follow_up_suggestions import FollowUpSuggestionsGenerator
from src.api.website_intelligence import WebsiteIntelligenceAnalyzer
from src.api.remix_suggestions import RemixSuggestionsGenerator
from src.api.routes import api_router
from src.api.individual_model_responses import individual_models_router

# Configure logging first, before any other imports or operations
configure_logging(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    console_output=True,
    file_output=True,
    log_file="velocity.log", 
    json_format=True,
    log_dir="logs",
    separate_log_files=True,
    access_log_enabled=True,  
)  

# Get logger for this module
logger = get_logger(__name__)

# Initialize rate limiter with proper configuration
def get_client_id(request: Request):
    """
    Custom key function for rate limiting that considers both IP and auth token.
    This allows for per-user rate limiting while falling back to IP-based limiting.
    """
    # Try to get user identification from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header and auth_header != os.environ.get("API_AUTH_TOKEN", "secret-token"):
        # Use auth token for authenticated users (more generous limits)
        return f"user:{auth_header[-10:]}"  # Use last 10 chars of token
    
    return f"ip:{get_remote_address(request)}"


storage_uri = os.environ.get("REDIS_URL", "memory://")
limiter = Limiter(
    key_func=get_client_id,
    storage_uri=storage_uri,
    strategy="moving-window",  
    headers_enabled=True,      
)

# Custom rate limit exceeded handler
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded responses.
    Provides detailed information and suggestions for users.
    """
    response = JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. You have exceeded the rate limit of {exc.detail}",
            "retry_after": getattr(exc, 'retry_after', 60),
            "suggestions": [
                "Wait before making another request",
                "Consider upgrading to a higher tier for increased limits",
                "Use authenticated requests for higher rate limits"
            ],
            "documentation": "https://docs.velocity-router.com/rate-limits"
        }
    )
    
    # Add rate limit headers
    response.headers["Retry-After"] = str(getattr(exc, 'retry_after', 60))
    
    # Log rate limit hit for monitoring
    client_id = get_client_id(request)
    logger.warning(f"Rate limit exceeded for {client_id} on {request.url.path}")
    
    return response

# Instantiate Refine class
refine = Refine()

# Initialize WebSearch singleton
web_search = get_search_instance()

try:
    import uvloop  # High-performance event loop
    UVLOOP_AVAILABLE = True
except ImportError:
    UVLOOP_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI application.
    Handles initialization and cleanup of resources.
    """
    logger.info("Starting Velocity Router application", service_name="velocity-router")
    
    try:
        # Initialize configuration
        config_provider = container.resolve(ConfigProvider)
        
        # Initialize components with configuration
        cache_provider = container.resolve(CacheProvider)
        model_selector = container.resolve(ModelSelector)
        analyzer = container.resolve(Analyzer)
        
        # Initialize IntentAnalyzer with configuration
        intent_analyzer = IntentAnalyzer({
            "cache_enabled": True,
            "cache_size": 1000,
            "min_confidence_threshold": 0.85
        })
        
        # Store components in app state for access in routes
        app.state.analyzer = analyzer
        app.state.intent_analyzer = intent_analyzer
        
        # Clear all caches on startup to ensure fresh provider selection
        cache_clear_success = await clear_all_caches()
        if not cache_clear_success:
            logger.warning("Some caches could not be cleared on startup")
        
        # Initialize LangSmith tracing
        try:
            # Import LangSmith client only when needed to avoid startup dependency
            from langsmith import Client
            import os
            
            # Get LangSmith configuration
            langsmith_api_key = config_provider.get_config("langsmith.api_key") or os.environ.get("LANGCHAIN_API_KEY") or os.environ.get("LANGSMITH_API_KEY")
            langsmith_project = os.environ.get("LANGCHAIN_PROJECT", "velocity-llm-router-test-1")
            langsmith_endpoint = os.environ.get("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
            
            if langsmith_api_key:
                # Initialize LangSmith client
                langsmith_client = Client(
                    api_key=langsmith_api_key,
                    api_url=langsmith_endpoint
                )
                
                # Test the connection to LangSmith
                try:
                    # Just try to get projects to test the connection
                    _ = langsmith_client.list_projects()
                    logger.info(f"LangSmith tracing initialized successfully for project: {langsmith_project}")
                except Exception as e:
                    logger.error(f"LangSmith connection test failed: {str(e)}")
            else:
                logger.warning("LangSmith API key not found, tracing will be disabled")
        except ImportError:
            logger.warning("LangSmith package not installed, tracing will be disabled")
        except Exception as e:
            logger.error(f"Error initializing LangSmith: {str(e)}")
        
        # Log successful initialization
        logger.info("Application components initialized successfully")
        
    except Exception as e:
        logger.error(f"Error during application startup: {str(e)}", exc_info=True)
        raise
    
    yield
    
    # Cleanup tasks
    logger.info("Shutting down Velocity Router application")
    if hasattr(cache_provider, 'close') and callable(getattr(cache_provider, 'close')):
        await cache_provider.close()
    logger.info("Application shutdown completed")

# Configure the FastAPI application with proper state and rate limiting
app = FastAPI(
    title="Velocity Router",
    description="AI-Powered Prompt Enhancement and Routing Service",
    version="1.0.0",
    lifespan=lifespan
)

# Set the limiter in app state for SlowAPI
app.state.limiter = limiter

# Add exception handler for rate limit exceeded
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Add CORS middleware to allow frontend access
origins = [
    "null",          
    "*",            
    "http://localhost:3000", 
    "http://localhost:8000",  
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",       # Allow file protocol
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"], # Expose all headers
    max_age=3600,        # Cache preflight requests for 1 hour
)

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure appropriately for production
)

# Add SlowAPI middleware - this must be added AFTER setting app.state.limiter
app.add_middleware(SlowAPIMiddleware)

# Include API routers
app.include_router(api_router)
app.include_router(individual_models_router)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Add request context to logs and log request/response information with improved performance."""
    # Generate request ID in format req-{16 digit uuid} - check if already provided in headers
    request_id = request.headers.get("X-Request-ID")
    if not request_id:
        # Generate 16-digit hex UUID for request tracking
        request_id = f"req-{os.urandom(8).hex()}"
    
    # Attach request ID to request object for access in endpoints
    request.state.request_id = request_id
    
    # Extract client info - only once
    client_ip = request.client.host if request.client else "unknown"
    path = request.url.path
    method = request.method
    
    # Extract user ID from various sources
    user_id = extract_user_id_from_request(request)
    
    # Setup logging context for this request - all logs within this context will include request_id
    with log_context(logger, request_id=request_id, client_ip=client_ip, path=path, user_id=user_id):
        # Use perf_counter for more accurate timing
        start_time = time.perf_counter()
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration with high precision
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        # Get response size
        response_size = len(response.body) if hasattr(response, 'body') and response.body else 0
        
        # Extract headers for access log
        referer = request.headers.get("referer", "-")
        user_agent = request.headers.get("user-agent", "-")
        
        # Log HTTP access in Apache-like format with user ID and request ID
        log_http_access(
            client_ip=client_ip,
            user_id=user_id or "anonymous",
            method=method,
            url=str(request.url),
            protocol=f"HTTP/{request.scope.get('http_version', '1.1')}",
            status_code=response.status_code,
            response_size=response_size,
            referer=referer,
            user_agent=user_agent,
            duration_ms=duration_ms
        )
        
        # Regular structured log for debugging - request_id will be included via log_context
        logger.info(
            f"{method} {path} - {response.status_code} - {duration_ms}ms - {request_id}",
            status_code=response.status_code,
            duration_ms=duration_ms,
            user_id=user_id,
            request_id=request_id
        )
        
        # Add request ID to response headers for traceability and debugging
        response.headers["X-Request-ID"] = request_id
        return response

@app.middleware("http")
async def authentication_middleware(request: Request, call_next):
    """Authenticate all incoming requests."""
    # Skip authentication for WebSocket connections, domain analyzer pages, static files, and health check
    if (request.url.path.startswith("/ws/") or 
        request.url.path.startswith("/domain-analyzer") or 
        request.url.path == "/context-test" or
        "/static/" in request.url.path or
        request.url.path == "/ws/domain-provider-analysis" or
        request.url.path == "/health" or
        request.url.path.startswith("/docs") or
        request.url.path == "/openapi.json" or
        request.url.path.startswith("/context/")):  # Allow context API and test UI for testing
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    # Simple check: require a non-empty Authorization header (customize as needed)
    if not auth_header or auth_header != os.environ.get("API_AUTH_TOKEN", "secret-token"):
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    return await call_next(request)

@app.middleware("http")
async def global_exception_handler_middleware(request: Request, call_next):
    """
    Global exception handler that catches unhandled exceptions and logs them with request ID.
    
    This ensures that any unexpected errors during request processing are properly
    logged with the request ID for debugging and tracking purposes.
    """
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Get request ID for error tracking
        request_id = get_request_id_from_request(request) or "unknown"
        
        # Log the unhandled exception with request context
        logger.exception(
            "💥 Unhandled exception in request processing",
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            exception_type=type(e).__name__,
            exception_message=str(e),
            client_ip=request.client.host if request.client else "unknown"
        )
        
        # Return a proper error response
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error occurred",
                "request_id": request_id,
                "message": "An unexpected error occurred while processing your request. Please try again.",
                "support_info": f"Include request ID {request_id} when contacting support"
            },
            headers={"X-Request-ID": request_id}
        )

@app.middleware("http")
async def user_id_extraction_middleware(request: Request, call_next):
    """Extract user_id from headers and JSON body for logging purposes."""
    
    # Method 1: Header-based user_id extraction (fast and safe)
    user_id_header = request.headers.get("X-User-ID")
    if user_id_header and user_id_header.strip():
        request.state.user_id = user_id_header.strip()
        logger.debug(f"Extracted user_id from X-User-ID header: {user_id_header}")
        return await call_next(request)
    
    # Method 2: JSON body extraction for NON-STREAMING POST endpoints only
    # Skip streaming endpoints to avoid ASGI protocol conflicts
    if (request.method == "POST" and 
        request.url.path in ["/refine", "/clarify", "/recommendation", 
                           "/intelligence/analyze-selection", "/intelligence/generate-questions", 
                           "/intelligence/ai-query", "/intelligence/generate-follow-ups", 
                           "/intelligence/enhance-prompt", "/intelligence/follow-up-suggestions", 
                           "/intelligence/analyze-website", "/intent/adoption-analysis"]):
        
        # Read the request body once and store it
        body = await request.body()
        
        if body:
            try:
                import json
                data = json.loads(body.decode('utf-8'))
                user_id = data.get("user_id", "")
                if user_id and user_id.strip():
                    request.state.user_id = user_id.strip()
                    logger.debug(f"Extracted user_id from JSON body: {user_id}")
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                # Log parsing errors with request ID
                logger.warning(f"Failed to parse JSON for user_id extraction: {e}",
                             error_type="json_parsing",
                             request_path=request.url.path)
            
            # Create a new request with the body restored
            async def receive():
                return {"type": "http.request", "body": body, "more_body": False}
            
            # Replace the receive callable
            request._receive = receive
    
    return await call_next(request)

def extract_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user ID from request state, headers, or query parameters.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        User ID string or None if not found
    """
    # PRIORITY 1: Check if user_id is stored in request state (set by endpoints or middleware)
    if hasattr(request.state, 'user_id') and request.state.user_id:
        return request.state.user_id
    
    # PRIORITY 2: Try to get user_id from X-User-ID header
    user_id_header = request.headers.get("X-User-ID")
    if user_id_header:
        return user_id_header
    
    # PRIORITY 3: Try to get user_id from query parameters
    user_id_query = request.query_params.get("user_id")
    if user_id_query:
        return user_id_query
    
    # PRIORITY 4: Try to get user_id from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header:
        # If it's a Bearer token, we might be able to decode it
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            # For now, just use the last 8 characters as user identifier
            # In a real implementation, you'd decode/validate the JWT token
            return f"bearer_{token[-8:]}" if len(token) >= 8 else f"bearer_{token}"
        elif auth_header != os.environ.get("API_AUTH_TOKEN", "secret-token"):
            # If it's not the default API token, use it as user identifier
            return f"api_{auth_header[-8:]}" if len(auth_header) >= 8 else f"api_{auth_header}"
    
    # Default fallback
    return None

def get_request_id_from_request(request: Request) -> Optional[str]:
    """
    Extract request ID from request state.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Request ID string in format req-{16 digit uuid} or None if not found
    """
    if hasattr(request.state, 'request_id') and request.state.request_id:
        return request.state.request_id
    
    # Fallback to header if not in state
    return request.headers.get("X-Request-ID")



@app.get("/health")
@limiter.limit("300/minute")  # 300 requests per minute for health checks (generous for monitoring)
async def health_check(request: Request):
    """Health check endpoint."""
    # Example of accessing request ID within an endpoint
    request_id = get_request_id_from_request(request)
    logger.debug("Health check requested", request_id=request_id)
    return JSONResponse(content={
        "status": "healthy", 
        "service": "velocity-router",
        "request_id": request_id
    })

@app.get("/domain-analyzer", response_class=HTMLResponse)
@limiter.limit("100/minute")  # 100 requests per minute for domain analyzer page
async def domain_analyzer_page(request: Request):
    """Serve the domain analyzer HTML page."""
    try:
        with open("static/domain_analyzer.html", "r") as file:
            content = file.read()
            return HTMLResponse(content=content)
    except Exception as e:
        logger.exception(f"Error serving domain analyzer page: {str(e)}")
        error_html = f"<html><body><h1>Error</h1><p>Could not load domain analyzer page: {str(e)}</p></body></html>"
        return HTMLResponse(content=error_html, status_code=500)






async def deduct_tokens_async(user_id: str, auth_token: str):
    """
    Asynchronously deduct tokens from user's account after successful enhancement.
    This runs in the background without blocking the response.
    """
    try:
        # Ensure parameters are strings
        if not isinstance(user_id, str) or not isinstance(auth_token, str):
            logger.error(f"Invalid parameter types for token deduction: user_id={type(user_id)}, auth_token={type(auth_token)}")
            return
            
        import httpx
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            deduct_response = await client.post(
                f"https://thinkvelocity.in/backend-V1-D/token/deduct-tokens/{user_id}",
                json={"tokens": 4},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            if deduct_response.status_code == 200:
                logger.info(f"Successfully deducted 4 tokens for user {user_id}")
            else:
                logger.warning(f"Failed to deduct tokens for user {user_id}: {deduct_response.status_code}")
                
    except Exception as e:
        logger.error(f"Error deducting tokens for user {user_id}: {str(e)}")
        # Don't raise - this is a background task and shouldn't affect the main response

@app.post("/enhance/stream")
@limiter.limit("15/minute")  # 15 requests per minute for streaming enhancement
@async_log_execution_time()
async def enhance_prompt_stream(request: Request):
    """Streaming version of enhanced prompt enhancement with intelligent relevance planning."""
    
    # Parse request data OUTSIDE the generator to avoid middleware issues
    try:
        data = await request.json()
        prompt = data.get("prompt", "").strip()
        context = data.get("context", {})
        context_id = data.get("context_id", "").strip()  # Add context_id extraction
        llm = data.get("llm")
        domain = data.get("domain")
        writing_style = data.get("writing_style")
        user_id = data.get("user_id", "")
        auth_token = data.get("auth_token", "")
        intent = data.get("intent", "")
        intent_description = data.get("intent_description", "")
        settings = data.get("settings", {})
        
        # Set user_id in request state for logging (streaming endpoint needs this)
        if user_id and user_id.strip() and not hasattr(request.state, 'user_id'):
            request.state.user_id = user_id.strip()
        
        # Fast validation
        if not prompt:
            return StreamingResponse(
                iter([f"data: {json.dumps({'error': 'Prompt is required'})}\n\n"]),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
            
    except Exception as e:
        return StreamingResponse(
            iter([f"data: {json.dumps({'error': f'Invalid request data: {str(e)}'})}\n\n"]),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    
    async def generate_stream():
        performance_start = time.perf_counter()
        step_times = {}
        
        try:
            # Step 1: Initialize with parsed data
            parse_start = time.perf_counter()
            
            yield f"data: {json.dumps({'status': 'initializing', 'message': 'Starting prompt enhancement...'})}\n\n"
            
            # Normalize context efficiently - use the outer scope variables
            final_context = context
            if final_context == "" or final_context is None:
                final_context = {}
            elif not isinstance(final_context, dict):
                final_context = {"raw_context": final_context}
            
                        # Add parameters to context
            if llm and llm.strip():
                final_context["llm"] = llm
            if writing_style and writing_style.strip():
                final_context["writing_style"] = writing_style
            if intent and intent.strip():
                final_context["intent"] = intent
            if intent_description and intent_description.strip():
                final_context["intent_description"] = intent_description
                
                            # Add settings to context only if explicitly provided
            if settings:
                # Validate settings before adding to context
                if "word_count" in settings and not isinstance(settings["word_count"], int):
                    yield f"data: {json.dumps({'error': 'word_count must be an integer'})}\n\n"
                    return
                    
                # Only add settings if they were explicitly provided
                final_context["settings"] = settings
                logger.info(f"Added settings to context: {settings}")
            
            # Handle domain
            final_domain = None
            if domain and domain.strip():
                final_domain = domain.strip()
                final_context["domain"] = final_domain
            
            step_times['parse_request'] = time.perf_counter() - parse_start
            
            yield f"data: {json.dumps({'status': 'analyzing', 'message': 'Analyzing prompt and gathering context...'})}\n\n"
            
            # Step 2: Initialize components
            relevance_start = time.perf_counter()
            enhancer = container.resolve(PromptEnhancer)
            cache_provider = container.resolve(CacheProvider)
            model_provider = container.resolve(ModelProvider)
            relevance_planner = container.resolve(RelevancePlanner)
            
            # Define available context sources (include document_context if context_id provided)
            available_sources = {
                "web_context": {
                    "description": "Real-time web search for current information, research, and comparisons",
                    "metadata": {"type": "external", "latency": "high", "accuracy": "high"}
                },
                "rag_strategies": {
                    "description": "Domain-specific prompt strategies and optimization techniques",
                    "metadata": {"type": "internal", "latency": "medium", "accuracy": "high"}
                },
                "chat_history": {
                    "description": "Previous conversation context and user interaction history",
                    "metadata": {"type": "internal", "latency": "low", "accuracy": "medium"}
                }
            }
            
            # Add document context to available sources if context_id is provided
            if context_id:
                available_sources["document_context"] = {
                    "description": "Context from uploaded document (image captions, PDF content, etc.) relevant to the prompt",
                    "metadata": {"type": "internal", "latency": "low", "accuracy": "high", "context_id": context_id}
                }
            
            # Determine relevance for each source
            relevance_analysis = await relevance_planner.determine_relevance(prompt, available_sources)
            step_times['relevance_planning'] = time.perf_counter() - relevance_start
            
            strategy_message = f"Using {relevance_analysis['overall_strategy']} strategy"
            yield f"data: {json.dumps({'status': 'processing', 'message': strategy_message, 'strategy': relevance_analysis['overall_strategy']})}\n\n"
            
            # Step 3: Token validation (only if needed)
            if user_id and user_id != "free-trial":
                yield f"data: {json.dumps({'status': 'validating', 'message': 'Validating tokens...'})}\n\n"
                import httpx
                try:
                    async with httpx.AsyncClient(timeout=httpx.Timeout(3.0)) as client:
                        response = await client.get(f"https://thinkvelocity.in/backend-V1-D/token/fetch-tokens/{user_id}")
                        token_data = response.json()
                        
                        if not token_data.get("success") or token_data.get("tokens", 0) < 4:
                            yield f"data: {json.dumps({'error': 'Insufficient tokens. At least 4 tokens required for enhancement.'})}\n\n"
                            return
                except Exception as e:
                    yield f"data: {json.dumps({'error': 'Token validation failed. Please try again.'})}\n\n"
                    return
            
            # Step 4: Gather context based on relevance scores
            tasks = {}
            parallel_start = time.perf_counter()
            
            # Web search (only if relevant)
            web_relevance = relevance_analysis['relevance_scores'].get('web_context', 0.0)
            if web_relevance > 0.6:
                yield f"data: {json.dumps({'status': 'searching', 'message': 'Gathering web context...'})}\n\n"
                
                async def get_web_context():
                    try:
                        web_search = get_search_instance()
                        # Use search() method and format the results
                        search_results = await web_search.search(prompt, "web", 3)
                        if search_results:
                            # Format search results into web context string
                            web_context = "\n\n".join([
                                f"--- Source: {result['metadata']['source']} ---\n{result['content'][:400]}..." 
                                if len(result['content']) > 400 else
                                f"--- Source: {result['metadata']['source']} ---\n{result['content']}"
                                for result in search_results
                                if "error" not in result.get("metadata", {})
                            ])
                            return web_context
                        return ""
                    except Exception as e:
                        logger.error(f"Web search failed: {str(e)}")
                        return ""
                        
                tasks['web_context'] = asyncio.create_task(get_web_context())
            
            # RAG strategies (only if relevant)
            rag_relevance = relevance_analysis['relevance_scores'].get('rag_strategies', 0.0)
            if rag_relevance > 0.6:
                yield f"data: {json.dumps({'status': 'strategy', 'message': 'Fetching enhancement strategies...'})}\n\n"
                
                llm_for_strategy = final_context.get("llm")
                
                async def get_strategy():
                    try:
                        strategy_domain = final_domain or "general"
                        if not strategy_domain or strategy_domain == "general":
                            try:
                                analyzer = container.resolve(Analyzer)
                                analysis_result = analyzer.analyze(prompt)
                                strategy_domain = analysis_result.get("domain", "general")
                            except Exception:
                                strategy_domain = "general"
                        
                        llm_for_strategy_final = llm_for_strategy or "openai"
                        cache_key = f"prompt_strategy:{llm_for_strategy_final}:{strategy_domain}"
                        cached = await cache_provider.get(cache_key)
                        if cached:
                            return cached.get("strategy", "")
                        
                        from src.enhancement.prompt_strategy_retriever import fetch_prompt_strategies
                        llm_mapping = {
                            "gpt-4": "openai", "openai": "openai", 
                            "claude-3-sonnet": "anthropic", "claude-3-opus": "anthropic", "anthropic": "anthropic",
                            "perplexity": "perplexity", "bolt": "bolt", "vercel": "vercel", 
                            "gamma": "gamma", "grok": "grok", "google": "google"
                        }
                        
                        model_name = llm_mapping.get(llm_for_strategy_final, "openai")
                        loop = asyncio.get_event_loop()
                        strategies = await loop.run_in_executor(None, fetch_prompt_strategies, model_name, 1, strategy_domain)
                        
                        strategy = strategies[0].page_content if strategies else None
                        if strategy:
                            await cache_provider.put(cache_key, {"strategy": strategy}, ttl=3600)
                            return strategy
                        return None
                    except Exception as e:
                        logger.error(f"Strategy fetch failed: {str(e)}")
                        return None
                
                tasks['strategy'] = asyncio.create_task(get_strategy())
            
            # Document context (if context_id provided - always use when provided)
            if context_id:
                yield f"data: {json.dumps({'status': 'document', 'message': 'Retrieving uploaded document context...'})}\n\n"
                
                async def get_document_context():
                    try:
                        logger.info(f"🔍 [STREAM DEBUG] Attempting to retrieve context for context_id: {context_id}")
                        
                        # Debug: Check what contexts are available
                        from src.contextupload.context_manager import context_store
                        available_contexts = list(context_store.keys()) if context_store else []
                        logger.info(f"🔍 [STREAM DEBUG] Available contexts in store: {available_contexts}")
                        
                        stored_context = get_stored_context(context_id)
                        if stored_context:
                            chunks = stored_context["chunks"]
                            embeddings = stored_context["embeddings"]
                            metadata = stored_context["metadata"]
                                                  
                            
                            # Find relevant chunks using similarity search
                            relevant_chunks = await find_similar_chunks(prompt, chunks, embeddings, top_k=5)
                                                        
                            if relevant_chunks:
                                # Format the retrieved context
                                document_context = f"🔥 CRITICAL DOCUMENT CONTEXT - Retrieved from uploaded document '{metadata.get('filename', 'unknown')}':\n\n"
                                for i, chunk_data in enumerate(relevant_chunks, 1):
                                    document_context += f"[Context {i} - Relevance: {chunk_data['score']:.2f}]\n{chunk_data['text']}\n\n"
                                
                                return document_context
                            else:
                                # Force include at least the first chunk to ensure document context is used
                                logger.warning(f"⚠️ [STREAM DEBUG] No relevant chunks found in context {context_id}, using first chunk as fallback")
                                document_context = f"🔥 CRITICAL DOCUMENT CONTEXT - Retrieved from uploaded document '{metadata.get('filename', 'unknown')}':\n\n"
                                document_context += f"[Context 1 - Relevance: N/A]\n{chunks[0]}\n\n"
                                logger.info(f"📄 [STREAM DEBUG] Fallback document context preview: {document_context[:300]}...")
                                return document_context
                        else:
                            logger.error(f"❌ [STREAM DEBUG] Context {context_id} not found in storage")
                            return ""
                    except Exception as e:
                        logger.error(f"💥 [STREAM DEBUG] Document context retrieval failed: {str(e)}")
                        return ""
                
                tasks['document_context'] = asyncio.create_task(get_document_context())
            
            step_times['setup_parallel'] = time.perf_counter() - parallel_start
            
            # Step 5: Wait for context gathering
            context_start = time.perf_counter()
            if tasks:
                results = await asyncio.gather(*tasks.values(), return_exceptions=True)
                task_keys = list(tasks.keys())
                
                for i, result in enumerate(results):
                    key = task_keys[i]
                    if isinstance(result, Exception):
                        logger.error(f"DEBUG - Task {key} failed with exception: {result}")
                        continue
                        
                    if key == 'web_context':
                        final_context["web_context"] = result or ""
                        final_context["has_relevant_content"] = bool(result)
                        logger.info(f"DEBUG - Web context result: length={len(result) if result else 0}, "
                                   f"content_preview={repr(result[:300]) if result else 'None'}")
                    elif key == 'strategy':
                        if result:
                            final_context["llm_prompt_strategy"] = result
                            logger.info(f"DEBUG - Strategy result: length={len(result)}, "
                                       f"content_preview={repr(result[:200])}")
                    elif key == 'document_context':
                        final_context["document_context"] = result or ""
                        final_context["has_document_context"] = bool(result)
                        # Update relevance analysis to reflect successful document context usage
                        if result:
                            relevance_analysis['relevance_scores']['document_context'] = 1.0
                            relevance_analysis['reasoning']['document_context'] = f"Document context successfully retrieved and used from context_id '{context_id}'."
                            if 'document_context' not in relevance_analysis.get('sources_used', []):
                                relevance_analysis.setdefault('sources_used', []).append('document_context')
                            logger.info(f"DEBUG - Document context result: length={len(result)}, "
                                       f"context_id={context_id}, "
                                       f"content_preview={repr(result[:300])}")
                        else:
                            logger.warning(f"Document context retrieval failed for context_id: {context_id}")
        
            step_times['context_preparation'] = time.perf_counter() - context_start
            
            # Step 6: Start streaming enhancement using the same PromptEnhancer as regular endpoint
            yield f"data: {json.dumps({'status': 'enhancing', 'message': 'Generating enhanced prompt...'})}\n\n"
            
            enhance_start = time.perf_counter()
            final_context["relevance_analysis"] = relevance_analysis
            
            # Add Suno character limit instruction if targeting Suno
            if llm and llm.lower() == "suno":
                final_context["suno_char_limit"] = True
                final_context["max_characters"] = 194
                logger.info("Added Suno character limit instruction for streaming: enhanced prompt must be under 195 characters")
            
            # Ensure document context is properly set if context_id exists
            if context_id and final_context.get("document_context"):
                # Set a specific flag to ensure document context is tracked
                final_context["has_document_context"] = True
                logger.info(f"Document context confirmed for context_id {context_id}: {len(final_context['document_context'])} chars")
                
                # Ensure context_id is also passed through
                final_context["context_id"] = context_id
            
            # Log what we're using for enhancement (same as regular endpoint)
            logger.info(f"Streaming Enhancement context: web_context={bool(final_context.get('web_context'))}, "
                       f"document_context={bool(final_context.get('document_context'))}, "
                       f"has_document_context={final_context.get('has_document_context', False)}, "
                       f"context_id={context_id or 'not provided'}, "
                       f"strategy={bool(final_context.get('llm_prompt_strategy'))}, "
                       f"llm={final_context.get('llm', 'not specified')}, "
                       f"domain={final_domain or 'not specified'}, "
                       f"intent={final_context.get('intent', 'not specified')}, "
                       f"intent_description={final_context.get('intent_description', 'not specified')[:50] if final_context.get('intent_description') else 'not specified'}, "
                       f"enhancement_strategy={relevance_analysis['overall_strategy']}, "
                       f"suno_limit={final_context.get('suno_char_limit', False)}")
            
            # Use the new streaming PromptEnhancer method for real-time streaming
            try:
                enhanced_prompt = ""
                
                # Stream the enhanced prompt in real-time using the new streaming method
                async for chunk in enhancer.process_with_web_context_streaming(prompt, final_context):
                    if chunk is not None:  # Allow all chunks including whitespace for proper formatting
                        enhanced_prompt += chunk
                        yield f"data: {json.dumps({'type': 'content', 'chunk': chunk})}\n\n"
                
                # If no content was streamed, use fallback
                if not enhanced_prompt.strip():
                    enhanced_prompt = f"Please provide a detailed response about: {prompt}"
                    yield f"data: {json.dumps({'type': 'content', 'chunk': enhanced_prompt})}\n\n"
                step_times['enhancement'] = time.perf_counter() - enhance_start
                step_times['total'] = time.perf_counter() - performance_start
                
                # Deduct tokens for successful enhancement (only for non-free users)
                if user_id and user_id != "free-trial" and auth_token:
                    asyncio.create_task(deduct_tokens_async(user_id, auth_token))
                
                # Enhanced logging with relevance information (same as regular endpoint)
                logger.info(
                    f"Streaming Enhanced prompt performance: "
                    f"parse={step_times.get('parse_request', 0):.3f}s, "
                    f"relevance={step_times.get('relevance_planning', 0):.3f}s, "
                    f"setup={step_times.get('setup_parallel', 0):.3f}s, "
                    f"validation={step_times.get('token_validation', 0):.3f}s, "
                    f"context={step_times.get('context_preparation', 0):.3f}s, "
                    f"enhance={step_times.get('enhancement', 0):.3f}s, "
                    f"total={step_times['total']:.3f}s, "
                    f"strategy={relevance_analysis['overall_strategy']}, "
                    f"domain={final_domain or 'auto-detected'}, "
                    f"sources_used={[k for k, v in relevance_analysis['relevance_scores'].items() if v > 0.6]}"
                )
                
                # Send final metadata
                final_response = {
                    "type": "complete",
                    "enhanced_prompt": enhanced_prompt,
                    "original_prompt": prompt,
                    "suggested_llm": final_context.get("llm", "openai"),
                    "domain": final_domain,
                    "enhancement_method": "streaming_enhancement",
                    "relevance_analysis": {
                        "strategy": relevance_analysis["overall_strategy"],
                        "sources_used": [k for k, v in relevance_analysis['relevance_scores'].items() if v > 0.6],
                        "reasoning": relevance_analysis["reasoning"]
                    },
                    "metadata": {
                        "enhancement_applied": True,
                        "timestamp": time.time(),
                        "processing_time_ms": round(step_times['total'] * 1000, 2),
                        "tokens_deducted": 4 if user_id and user_id != "free-trial" else 0
                    }
                }
                
                # Add settings to response
                if settings:
                    final_response["settings"] = {
                        "word_count": settings.get("word_count"),
                        "language": settings.get("language"),
                        "complexity_level": settings.get("complexity_level"),
                        "output_format": settings.get("output_format"),
                        "custom_instructions": settings.get("custom_instructions"),
                        "template": settings.get("template")
                }
                
                # Add Suno compliance info if targeting Suno
                if llm and llm.lower() == "suno":
                    final_response["suno_compliant"] = len(enhanced_prompt) < 195
                    final_response["character_count"] = len(enhanced_prompt)
                    if len(enhanced_prompt) >= 195:
                        logger.warning(f"Streaming enhanced prompt for Suno is {len(enhanced_prompt)} characters (should be under 195)")
                    else:
                        logger.info(f"Streaming enhanced prompt for Suno is {len(enhanced_prompt)} characters (compliant)")
                
                if final_context.get("intent"):
                    final_response["intent"] = final_context["intent"]
                if final_context.get("intent_description"):
                    final_response["intent_description"] = final_context["intent_description"]
                if context_id:
                    final_response["context_id"] = context_id
                    final_response["document_context_used"] = bool(final_context.get("document_context"))
                
                yield f"data: {json.dumps(final_response)}\n\n"
                
            except asyncio.TimeoutError:
                error_response = {
                    'error': 'Enhancement timed out. Please try again.',
                    'settings': settings if settings else None
                }
                yield f"data: {json.dumps(error_response)}\n\n"
            except Exception as e:
                error_response = {
                    'error': f'Enhancement failed: {str(e)}',
                    'settings': settings if settings else None
                }
                yield f"data: {json.dumps(error_response)}\n\n"
                
        except Exception as e:
            # Get request ID for error tracking in streaming context 
            request_id = get_request_id_from_request(request)
            
            logger.exception("Error in streaming enhance prompt", 
                           exception_type=type(e).__name__,
                           request_id=request_id,
                           endpoint="/enhance/stream")
            
            error_data = {
                'error': f'Failed to enhance prompt: {str(e)}',
                'request_id': request_id,
                'support_info': f'Include request ID {request_id} when reporting this issue',
                'settings': settings if settings else None
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@app.post("/refine")
@limiter.limit("20/minute")  # 20 requests per minute for refinement
@async_log_execution_time()
async def refine_prompt(request: Request):
    """Refine a prompt based on questions and answers provided by the user."""
    try:
        data = await request.json()
        prompt = data.get("prompt", "")
        user_id = data.get("user_id", "")
        
        # Set user_id in request state for logging
        if user_id and user_id.strip() and not hasattr(request.state, 'user_id'):
            request.state.user_id = user_id.strip()
        
        if prompt == "" or len(prompt) < 1:
            return JSONResponse(content="")
        qa_pairs = data.get("qa_pairs", [])
        context = data.get("context", {})
        # Ensure context is a dictionary
        if context == "":
            logger.warning("Context is an empty string, converting to empty dict")
            context = {}
        elif context is not None and not isinstance(context, dict):
            logger.warning(f"Context is not a dictionary, converting: {type(context)}")
            context = {"raw_context": context}
        if not prompt:
            logger.warning("Empty prompt received")
            return JSONResponse(status_code=400, content={"error": "Prompt is required"})
        if not qa_pairs or not isinstance(qa_pairs, list):
            logger.warning("No question-answer pairs received or invalid format")
            return JSONResponse(status_code=400, content={"error": "Question-answer pairs are required as a list"})
        logger.debug("Refining prompt", prompt_length=len(prompt), qa_pairs_count=len(qa_pairs))
        # Use Refine.refine_prompt
        result = await refine.refine_prompt(prompt, qa_pairs, context)
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Error refining prompt", exception_type=type(e).__name__)
        return JSONResponse(status_code=500, content={"error": f"Failed to refine prompt: {str(e)}"})


@app.post("/analyze")
@limiter.limit("30/minute")  # 30 requests per minute for analysis
@async_log_execution_time()
async def analyze_prompt(request: Request):  
    try:
        data = await request.json()
        query = data.get("query", "")
        
        # Import the CARE analyzer - using import here to avoid circular imports
        from src.analysis.care import get_instance as get_care_analyzer
        
        # Get the CARE analyzer instance
        care_analyzer = get_care_analyzer()
        
        # Delegate the analysis to the CARE analyzer module
        result = await care_analyzer.analyze_prompt(query)
        
        return JSONResponse(content=result)
            
    except Exception as e:
        logger.exception("Error analyzing prompt", exception_type=type(e).__name__)
        return JSONResponse(status_code=500, content={"error": f"Failed to analyze prompt: {str(e)}"})


@app.post("/analyze-quality")
@limiter.limit("25/minute")  # 25 requests per minute for quality analysis
@async_log_execution_time()
async def analyze_prompt_quality(request: Request):
    """
    Analyze the quality of a prompt and classify it as good, ok, or bad.
    Provides detailed analysis including intent clarity, domain relevance, and structural characteristics.
    """
    try:
        # Parse request data
        data = await request.json()
        prompt = data.get("prompt", "").strip()
        
        if not prompt:
            return JSONResponse(
                status_code=400,
                content={"error": "Empty prompt provided"}
            )
        
        # Initialize analyzer
        analyzer = PromptQualityAnalyzer()
        
        # Analyze the prompt
        analysis = analyzer.analyze_prompt(prompt)   
        
        # Return analysis results
        return JSONResponse(content={
            "quality": analysis.quality.value,
            "score": analysis.score,
            "reasons": analysis.reasons,
            "intent_analysis": analysis.intent_analysis,
            "domain_analysis": analysis.domain_analysis
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.error(f"Error analyzing prompt quality: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

@app.websocket("/ws/domain-analysis")
@async_log_execution_time()
async def websocket_domain_analysis(websocket: WebSocket):
    """
    WebSocket endpoint for real-time domain and intent analysis.
    This allows clients to get continuous domain prediction and intent analysis as they type.
    """
    # Use the modular WebSocket domain analyzer service
    from src.enhancement.websocket_domain_analyzer import WebSocketDomainAnalyzer
    
    analyzer = WebSocketDomainAnalyzer()
    await analyzer.handle_websocket_connection(websocket)

# Intent identification moved to src.api.websocket_domain_analyzer
# This function is now available through the WebSocketDomainAnalyzer service
async def identify_intent_with_llm(prompt: str) -> dict:
    """
    Identifies user intent using LLM with comprehensive intent categories.
    This function is a wrapper that uses the modular WebSocketDomainAnalyzer service.
    
    Args:
        prompt: The user's prompt
        
    Returns:
        A dictionary containing intent information with category, confidence, and description
    """
    from src.enhancement.websocket_domain_analyzer import WebSocketDomainAnalyzer
    
    analyzer = WebSocketDomainAnalyzer()
    return await analyzer._identify_intent_with_llm(prompt)

# Add this debug endpoint to test the analyzer directly
@app.post("/identify-intent")
@limiter.limit("40/minute")  # 40 requests per minute for intent identification
@async_log_execution_time()
async def identify_intent_endpoint(request: Request):
    """
    Identify user intent using LLM analysis.
    Returns detailed intent categorization with confidence scoring.
    """
    try:
        # Parse request data
        data = await request.json()
        prompt = data.get("prompt", "").strip()
        
        # Validate input
        if not prompt:
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is required"}
            )
        
        # Validate prompt length
        if len(prompt) > 2000:
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is too long. Maximum 2,000 characters allowed."}
            )
        
        # Identify intent using LLM
        intent_result = await identify_intent_with_llm(prompt)
        
        logger.info(f"Intent identified: {intent_result['intent_category']} with confidence {intent_result['confidence']}")
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "intent_category": intent_result["intent_category"],
                "intent_description": intent_result["intent_description"],
                "confidence": intent_result["confidence"],
                "primary_action": intent_result["primary_action"],
                "complexity": intent_result["complexity"],
                "prompt_length": len(prompt)
            }
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error identifying intent", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to identify intent: {str(e)}"}
        )

@app.post("/intent/adoption-analysis")
@limiter.limit("30/minute")  # 30 requests per minute for adoption analysis
@async_log_execution_time()
async def analyze_intent_adoption(request: Request):
    """
    Analyze intent with focus on adoption improvement and user guidance.
    
    This endpoint provides intent analysis plus actionable insights for better
    intent adoption, usage patterns, and success recommendations.
    """
    try:
        from src.analysis.intent_adoption_engine import get_intent_adoption_engine
        
        # Parse request data
        data = await request.json()
        prompt = data.get("prompt", "").strip()
        user_id = data.get("user_id")
        session_context = data.get("session_context", {})
        
        # Set user_id in request state for logging (if not already set by header)
        if user_id and str(user_id).strip() and not hasattr(request.state, 'user_id'):
            request.state.user_id = str(user_id).strip()
        
        # Validate input
        if not prompt:
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is required"}
            )
        
        # Get adoption engine and analyze
        adoption_engine = get_intent_adoption_engine()
        adoption_analysis = await adoption_engine.analyze_intent_for_adoption(
            prompt=prompt,
            user_id=user_id,
            session_context=session_context
        )
        
        logger.info(f"Intent adoption analysis completed for user: {user_id or 'anonymous'}")
        
        return JSONResponse(content={
            "success": True,
            "data": adoption_analysis
        })
        
    except Exception as e:
        logger.exception("Error in intent adoption analysis")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to analyze intent adoption: {str(e)}"}
        )

@app.get("/intent/adoption-profile/{user_id}")
@limiter.limit("20/minute")  # 20 requests per minute for profile access
@async_log_execution_time()
async def get_user_adoption_profile(request: Request, user_id: str):
    """
    Get user's intent adoption profile and progress analytics.
    
    Returns comprehensive insights about the user's intent usage patterns,
    adoption stage, success rates, and personalized recommendations.
    """
    try:
        from src.analysis.intent_adoption_engine import get_intent_adoption_engine
        
        adoption_engine = get_intent_adoption_engine()
        profile = adoption_engine.get_user_adoption_profile(user_id)
        
        return JSONResponse(content={
            "success": True,
            "profile": profile
        })
        
    except Exception as e:
        logger.exception("Error getting user adoption profile")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get adoption profile: {str(e)}"}
        )

@app.get("/intent/platform-analytics")
@limiter.limit("10/minute")  # 10 requests per minute for platform analytics
@async_log_execution_time()
async def get_platform_adoption_analytics(request: Request):
    """
    Get platform-wide intent adoption analytics and insights.
    
    Provides comprehensive analytics about intent adoption across the platform,
    including adoption rates, success patterns, and improvement opportunities.
    """
    try:
        from src.analysis.intent_adoption_engine import get_intent_adoption_engine
        
        adoption_engine = get_intent_adoption_engine()
        analytics = adoption_engine.get_platform_adoption_analytics()
        
        return JSONResponse(content={
            "success": True,
            "analytics": analytics
        })
        
    except Exception as e:
        logger.exception("Error getting platform adoption analytics")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get platform analytics: {str(e)}"}
        )

@app.post("/clarify")
@limiter.limit("30/minute")  # 30 requests per minute for clarification questions
@async_log_execution_time()
async def get_questions(request: Request):
    """
    Generate contextual questions based on user's prompt.
    Returns only the questions without any enhancement or other processing.
    """
    try:
        # Parse request data
        data = await request.json()
        prompt = data.get("prompt", "")
        user_id = data.get("user_id", "")
        
        # Set user_id in request state for logging
        if user_id and user_id.strip() and not hasattr(request.state, 'user_id'):
            request.state.user_id = user_id.strip()
        
        # Validate input
        if not prompt or not prompt.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is required"}
            )
            
        # Generate questions using refine module
        questions_result = await refine.ask_question(prompt, {})
        
        # Return only the questions
        return JSONResponse(content={"questions": questions_result.get("questions", [])})
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error generating questions", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate questions: {str(e)}"}
        )

@app.post("/recommendation")
@limiter.limit("25/minute")  # 25 requests per minute for recommendations
@async_log_execution_time()
async def get_recommendations(request: Request):
    """
    Generate a single recommendation to improve the user's prompt.
    Returns exactly one suggestion of 17 words to make the prompt more effective.
    """
    try:
        # Parse request data
        data = await request.json()
        prompt = data.get("prompt", "")
        user_id = data.get("user_id", "")
        
        # Set user_id in request state for logging
        if user_id and user_id.strip() and not hasattr(request.state, 'user_id'):
            request.state.user_id = user_id.strip()
        
        # Validate input
        if not prompt or not prompt.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is required"}
            )
        
        # Define system message for generating a single, concise recommendation
        system_message = (
            "You are an expert at providing recommendations to improve prompts. "
            "Your task is to analyze the given prompt and generate ONE specific, actionable recommendation "
            "to help make the prompt clearer or more effective. "
            "IMPORTANT: Your recommendation MUST be EXACTLY 17 words - no more, no less."
        )
        
        # Get the model provider for generating the recommendation
        model_provider = container.resolve(ModelProvider)
        
        # Create a prompt for the recommendation
        direct_prompt = f"""Original prompt: {prompt}\n\nAnalyze this prompt and provide ONE specific, actionable recommendation to improve it. Your recommendation MUST be EXACTLY 17 words long - no more, no less.\n\nReturn only the recommendation as plain text without any formatting, quotes, or additional text."""
        
        # Get recommendation from the model
        recommendation_response = await model_provider.get_response(direct_prompt, system_message=system_message)
        
        # Clean up the response
        recommendation = recommendation_response.strip()
        
        # Remove any quotes, numbers, or formatting that might be present
        recommendation = recommendation.replace('"', '').replace("'", "")
        recommendation = re.sub(r'^\d+\.\s*', '', recommendation)
        recommendation = re.sub(r'^Recommendation:\s*', '', recommendation, flags=re.IGNORECASE)
        
        # Count words and log if not exactly 17
        word_count = len(recommendation.split())
        if word_count != 17:
            logger.warning(f"Recommendation word count is {word_count}, not the required 17 words")
        
        return JSONResponse(content={"recommendation": recommendation})
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error generating recommendation", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate recommendation: {str(e)}"}
        )

@app.post("/classify-website")
@limiter.limit("50/minute")  # 50 requests per minute for website classification
@async_log_execution_time()
async def classify_website(request: Request):
    """
    Classify website content and determine optimal AI routing using LLMs.
    
    Uses AI models to analyze website metadata and provide intelligent classification
    for content type, platform, and optimal AI model recommendations.
    """
    try:
        # Parse request data
        data = await request.json()
        
        # Validate input using modularized validator
        is_valid, error_message = validate_classification_input(data)
        if not is_valid:
            return JSONResponse(
                status_code=400,
                content={"error": error_message}
            )
        
        # Extract and prepare data
        url = data.get("url", "")
        page_title = data.get("page_title", "")
        meta_description = data.get("meta_description", "")
        domain = data.get("domain", "")
        
        # Extract domain from URL if not provided using modularized function
        if not domain and url:
            domain = extract_domain_from_url(url)
            if not domain:
                logger.warning(f"Failed to parse domain from URL: {url}")
                domain = ""
        
        # Initialize classification result
        classification_result = {
            "success": True,
            "data": {
                "classification": "unknown",
                "confidence": 0.0,
                "category": "unknown",
                "platform": domain.replace("www.", "") if domain else "unknown",
                "is_ai_platform": False,
                "content_type": "unknown",
                "language": "en",  # Default to English
                "reading_time": 0,
                "website_type": "unknown",
                "recommended_models": ["openai"],  # Default fallback
                "context_complexity": "unknown"
            }
        }
        
        # Get model provider and use modularized classifier
        model_provider = container.resolve(ModelProvider)
        classifier = WebsiteClassifier(model_provider)
        
        # Use modularized classifier for comprehensive website classification
        llm_classification = await classifier.classify_website(
            domain, page_title, meta_description, url
        )
        
        # Update classification result with LLM analysis
        classification_result["data"].update(llm_classification)
        
        # Estimate reading time using modularized function
        reading_time = estimate_reading_time(page_title, meta_description)
        classification_result["data"]["reading_time"] = reading_time
        
        logger.info(f"Website classified: {domain} -> {classification_result['data']['classification']}")
        
        return JSONResponse(content=classification_result)
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error classifying website", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to classify website: {str(e)}"}
        )

@app.post("/intelligence/analyze-selection")
@limiter.limit("30/minute")  # 30 requests per minute for text analysis
@async_log_execution_time()
async def analyze_text_selection(request: Request):
    """
    Analyze selected text to generate contextual summaries and insights using LLMs.
    
    Provides comprehensive analysis including summary, key topics, sentiment,
    complexity, entities, and reading level assessment.
    """
    try:
        # Parse request data
        data = await request.json()
        
        # Validate input using modularized validator
        is_valid, error_message = validate_text_analysis_input(data)
        if not is_valid:
            return JSONResponse(
                status_code=400,
                content={"error": error_message}
            )
        
        # Extract data
        selected_text = data.get("selected_text", "").strip()
        page_title = data.get("page_title", "")
        page_url = data.get("page_url", "")
        context = data.get("context", {})
        
        # Get model provider and use modularized analyzer
        model_provider = container.resolve(ModelProvider)
        analyzer = TextAnalyzer(model_provider)
        
        # Perform comprehensive text analysis using modularized analyzer
        analysis_result = await analyzer.analyze_text(
            selected_text, page_title, page_url, context
        )
        
        # Calculate basic metrics
        word_count = len(selected_text.split())
        analysis_result["word_count"] = word_count
        
        logger.info(f"Text analysis completed: {word_count} words analyzed")
        
        return JSONResponse(content={
            "success": True,
            "data": analysis_result
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error analyzing text selection", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to analyze text: {str(e)}"}
        )



@app.post("/intelligence/generate-questions")
@limiter.limit("25/minute")  # 25 requests per minute for question generation
@async_log_execution_time()
async def generate_contextual_questions(request: Request):
    """
    Generate contextual questions based on selected content with optimal AI model routing.
    
    Uses LLMs to analyze content and generate relevant questions with appropriate
    model recommendations, difficulty levels, and response time estimates.
    """
    try:
        # Parse request data
        data = await request.json()
        selected_text = data.get("selected_text", "").strip()
        website_type = data.get("website_type", "general")
        content_analysis = data.get("content_analysis", {})
        user_context = data.get("user_context", {})
        
        # Validate input using modularized validator
        validate_question_input(selected_text)
        
        # Get model provider for LLM-based question generation
        model_provider = container.resolve(ModelProvider)
        
        # Generate questions using modularized generator
        question_generator = QuestionGenerator(model_provider)
        questions_result = await question_generator.generate_questions(
            selected_text, website_type, content_analysis, user_context
        )
        
        logger.info(f"Generated {len(questions_result['questions'])} contextual questions")
        
        return JSONResponse(content={
            "success": True,
            "data": questions_result
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )
    except Exception as e:
        logger.exception("Error generating questions", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate questions: {str(e)}"}
        )



@app.post("/intelligence/ai-query")
@limiter.limit("15/minute")  # 15 requests per minute for AI query processing (resource intensive)
@async_log_execution_time()
async def process_ai_query(request: Request):
    """
    Process user questions with smart enhancement and route to optimal AI model.
    
    Handles question enhancement, context integration, model routing, and provides
    comprehensive response metadata including token usage and confidence scoring.
    """
    try:
        # Parse and sanitize request data
        raw_data = await request.json()
        data = sanitize_query_data(raw_data)
        
        user_question = data["user_question"]
        predefined_prompt = data["predefined_prompt"]
        selected_text = data["selected_text"]
        context = data["context"]
        model = data["model"]
        enhance_prompt = data["enhance_prompt"]
        conversation_history = data["conversation_history"]
        
        # Use predefined prompt if provided, otherwise use user question
        base_question = predefined_prompt if predefined_prompt else user_question
        
        # Validate input using modularized validator
        validate_ai_query_input(
            user_question=user_question,
            predefined_prompt=predefined_prompt,
            base_question=base_question
            )
        
        # Get model provider for processing
        model_provider = container.resolve(ModelProvider)
        
        # Process the query using modularized processor
        start_time = time.perf_counter()
        
        ai_query_processor = AIQueryProcessor(model_provider)
        query_result = await ai_query_processor.process_query(
            base_question, selected_text, context, model, enhance_prompt, conversation_history
        )
        
        processing_time = round((time.perf_counter() - start_time), 2)
        query_result["processing_time"] = processing_time
        
        logger.info(f"AI query processed in {processing_time}s using {query_result.get('model_used', 'unknown')} model")
        
        return JSONResponse(content={
            "success": True,
            "data": query_result
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )
    except Exception as e:
        logger.exception("Error processing AI query", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process query: {str(e)}"}
        )



@app.post("/intelligence/generate-follow-ups")
@limiter.limit("20/minute")  # 20 requests per minute for follow-up generation
@async_log_execution_time()
async def generate_follow_up_questions(request: Request):
    """
    Generate contextual follow-up questions based on AI responses.
    
    Analyzes AI responses and conversation context to generate relevant
    follow-up questions categorized by type with relevance scoring.
    """
    from src.api.follow_up_generator import FollowUpGenerator
    
    # Get model provider and create generator
    model_provider = container.resolve(ModelProvider)
    generator = FollowUpGenerator(model_provider)
    
    # Process the request using the API module
    return await generator.process_request(request)



@app.post("/intelligence/enhance-prompt")
@limiter.limit("20/minute")  # 20 requests per minute for prompt enhancement
@async_log_execution_time()
async def enhance_user_prompt(request: Request):
    """
    Enhance user questions with context for better AI responses.
    
    Uses LLMs to improve prompts by adding context, specificity, and clarity
    with configurable enhancement levels and detailed improvement tracking.
    """
    try:
        # Parse request data
        data = await request.json()
        original_prompt = data.get("original_prompt", "").strip()
        context = data.get("context", {})
        enhancement_level = data.get("enhancement_level", "moderate")
        
        # Validate input
        if not original_prompt:
            return JSONResponse(
                status_code=400,
                content={"error": "Original prompt is required"}
            )
        
        # Validate prompt length
        if len(original_prompt) < 3:
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is too short for meaningful enhancement"}
            )
        
        if len(original_prompt) > 2000:
            return JSONResponse(
                status_code=400,
                content={"error": "Prompt is too long. Maximum 2,000 characters allowed."}
            )
        
        # Validate enhancement level
        valid_levels = ["light", "moderate", "aggressive"]
        if enhancement_level not in valid_levels:
            enhancement_level = "moderate"
        
        # Get model provider for prompt enhancement
        model_provider = container.resolve(ModelProvider)
        
        # Use the modularized PromptEnhancer
        prompt_enhancer = PromptEnhancer(model_provider)
        enhancement_result = await prompt_enhancer.enhance_prompt_with_llm(
            original_prompt, context, enhancement_level
        )
        
        logger.info(f"Enhanced prompt from {len(original_prompt)} to {len(enhancement_result['enhanced_prompt'])} characters")
        
        return JSONResponse(content={
            "success": True,
            "data": enhancement_result
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error enhancing prompt", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to enhance prompt: {str(e)}"}
        )

# Provider detection utility - kept here as it's used by other parts of the application
def detect_explicit_provider_mention(prompt: str) -> str:
    """
    Detect if the user explicitly mentions a specific AI provider in their prompt.
    
    Args:
        prompt: The user's input prompt
        
    Returns:
        The detected provider name (normalized) or None if no explicit mention found
    """
    return PromptEnhancer.detect_explicit_provider_mention(prompt)



@app.post("/intelligence/follow-up-suggestions")
@limiter.limit("25/minute")  # 25 requests per minute for follow-up suggestions
@async_log_execution_time()
async def generate_follow_up_suggestions(request: Request):
    """
    Generate contextual follow-up suggestions based on AI responses.
    
    This endpoint provides follow-up question suggestions categorized by type
    to help users continue productive conversations with AI systems.
    """
    # Get model provider and create suggestions generator
    model_provider = container.resolve(ModelProvider)
    generator = FollowUpSuggestionsGenerator(model_provider)
    
    # Process the request using the API module
    return await generator.process_request(request)


@app.post("/debug/clear-cache")
@limiter.limit("10/minute")  # 10 requests per minute for cache clearing (administrative)
async def clear_provider_cache(request: Request):
    """Debug endpoint to clear the provider selection cache."""
    try:
        selector = container.resolve(ModelSelector)
        
        # Clear both main cache and fallback cache
        selector._provider_cache.clear()
        selector._cache_timestamps.clear()
        selector._fallback_cache.clear()
        
        # Also clear the provider format cache
        selector.clear_provider_cache()
        
        # Clear LangChain cache if it exists
        try:
            import langchain
            if hasattr(langchain, "llm_cache") and langchain.llm_cache is not None:
                langchain.llm_cache.clear()
        except Exception as e:
            logger.warning(f"Could not clear LangChain cache: {str(e)}")
        
        # Clear any other caches that might be interfering
        try:
            cache_provider = container.resolve(CacheProvider)
            if hasattr(cache_provider, 'clear'):
                await cache_provider.clear()
        except Exception as e:
            logger.warning(f"Could not clear CacheProvider cache: {str(e)}")
        return JSONResponse(content={
            "success": True,
            "message": "All provider selection caches cleared successfully"
        })
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": str(e)
        })

async def clear_all_caches():
    """
    Clear all provider selection caches programmatically to reset provider selection logic.
    This function clears all caches without needing an endpoint call.
    """
    try:
        # Get the selector instance
        selector = container.resolve(ModelSelector)
        
        # Clear main provider selection caches
        if hasattr(selector, '_provider_cache'):
            selector._provider_cache.clear()
        
        if hasattr(selector, '_cache_timestamps'):
            selector._cache_timestamps.clear()
        
        if hasattr(selector, '_fallback_cache'):
            selector._fallback_cache.clear()
        
        if hasattr(selector, '_batch_cache'):
            selector._batch_cache.clear()
        
        # Clear provider format cache
        if hasattr(selector, 'clear_provider_cache'):
            selector.clear_provider_cache()
        
        # Clear LangChain cache if it exists
        try:
            import langchain
            if hasattr(langchain, "llm_cache") and langchain.llm_cache is not None:
                langchain.llm_cache.clear()
        except Exception as e:
            logger.warning(f"Could not clear LangChain cache: {str(e)}")
        
        # Clear CacheProvider cache
        try:
            cache_provider = container.resolve(CacheProvider)
            if hasattr(cache_provider, 'clear'):
                await cache_provider.clear()
        except Exception as e:
            logger.warning(f"Could not clear CacheProvider cache: {str(e)}")
        
        # Clear prompt strategy cache
        try:
            from src.enhancement.prompt_strategy_retriever import clear_cache
            clear_cache()
        except Exception as e:
            logger.warning(f"Could not clear prompt strategy cache: {str(e)}")
        
        # Clear any Python function caches using functools.lru_cache
        try:
            if hasattr(selector, '_format_providers'):
                selector._format_providers.cache_clear()
        except Exception as e:
            logger.warning(f"Could not clear _format_providers cache: {str(e)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error clearing caches: {str(e)}", exc_info=True)
        return False


@app.post("/intelligence/analyze-website")
@limiter.limit("30/minute")  # 30 requests per minute for website analysis
@async_log_execution_time()
async def analyze_website_intelligence(request: Request):
    """
    Analyze website content using LLM to determine type, category, and optimal AI model recommendations.
    
    Uses AI models to analyze website metadata and provide intelligent classification
    for website type, content category, and optimal AI model recommendations with confidence scoring.
    """
    # Get model provider and create analyzer
    model_provider = container.resolve(ModelProvider)
    analyzer = WebsiteIntelligenceAnalyzer(model_provider)
    
    # Process the request using the modularized analyzer
    return await analyzer.process_request(request)


# ==================== CONTEXT MANAGEMENT SYSTEM ====================

# Import all context upload functionality from the modularized package
from src.contextupload import (
    # Context management
    load_contexts_from_disk, 
    store_context,
    get_stored_context,
    delete_stored_context,
    chunk_text,
    get_document_extractor,
    validate_image,
    generate_image_caption,
    get_supported_image_formats,
    generate_embeddings,
    find_similar_chunks
)

# Load existing contexts on startup
load_contexts_from_disk()


# ==================== REMIX SUGGESTIONS API ====================

@app.get("/remix-suggestion/{user_id}")
@limiter.limit("20/minute")  # 20 requests per minute for remix suggestions
@async_log_execution_time()
async def generate_remix_suggestions(request: Request, user_id: str):
    """
    Generate personalized prompt suggestions based on user onboarding data.
    Uses a three-tier approach:
    1. Try predefined prompts from API based on occupation
    2. If not found, generate using LLM
    3. If both fail, use general fallback
    """
    try:
        # Get occupation from header or default to None
        occupation = request.headers.get("X-User-Occupation")
        
        # Initialize ModelProvider from container
        model_provider = container.resolve(ModelProvider)
        
        # Create RemixSuggestionsGenerator instance
        remix_generator = RemixSuggestionsGenerator(model_provider)
        
        # Store onboarding data in request state
        request.state.onboarding_data = {
            "occupation": occupation or "Unknown",
            "problems_faced": "Professional development and task management",
            "use_case": "General productivity improvement",
            "llm_platform": "OpenAI",
            "source": "header"
        }
        
        # Process the request
        result = await remix_generator.process_request(request, user_id)
        
        # Ensure we have a proper response structure
        if isinstance(result, JSONResponse):
            return result
            
        return JSONResponse(content={
            "success": True,
            "user_id": user_id,
            "occupation": occupation,
            "suggested_questions": result.get("suggested_questions", []),
            "is_repeat_request": result.get("is_repeat_request", False)
        })
        
    except Exception as e:
        logger.exception("Error in remix suggestions endpoint", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate remix suggestions: {str(e)}"}
        )


# ==================== CONTEXT UPLOAD & RETRIEVAL API ====================

@app.post("/context/upload")
@limiter.limit("10/minute")  # 10 uploads per minute (file processing is resource intensive)
@async_log_execution_time()
async def upload_context(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None)
):
    """
    Upload and process documents (PDF, PPTX) for context retrieval.
    
    This endpoint accepts document files, extracts text content, chunks it for optimal
    retrieval, generates embeddings, and stores everything with a unique context ID.
    
    Works as both a Velocity plugin endpoint and standalone context service.
    """
    try:
        # Validate file type
        if not file.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "No file provided"}
            )
        
        file_extension = Path(file.filename).suffix.lower()
        
        # Use modularized file type detection
        document_extensions = ['.pdf', '.pptx', '.docx', '.txt']
        image_extensions = get_supported_image_formats()
        all_supported = document_extensions + image_extensions
        
        if file_extension not in all_supported:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Unsupported file type. Only documents (PDF, PPTX, DOCX, TXT) and images (JPG, PNG, WEBP, BMP, TIFF) are supported.",
                    "supported_formats": {
                        "documents": document_extensions,
                        "images": image_extensions
                    }
                }
            )
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_content) > max_size:
            return JSONResponse(
                status_code=400,
                content={"error": f"File too large. Maximum size is {max_size // (1024*1024)}MB."}
            )
        
        # Process based on file type
        logger.info(f"Processing {file_extension} file: {file.filename}")
        
        if file_extension in document_extensions:
            # Handle documents using modularized extractor
            extractor = get_document_extractor(file_extension)
            if extractor:
                extracted_text = extractor(file_content)
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Unsupported document format"}
                )
            
            if not extracted_text or len(extracted_text.strip()) < 50:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Could not extract sufficient text from the document. Please ensure the file contains readable text."}
                )
                
            content_type = "document"
            
        elif file_extension in image_extensions:
            # Handle images using modularized validation
            if not validate_image(file_content, file.filename):
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid or corrupted image file. Please upload a valid image."}
                )
            
            # Generate image caption using vision model
            logger.info(f"Generating caption for image: {file.filename}")
            extracted_text = await generate_image_caption(file_content, file.filename)
            
            if not extracted_text or len(extracted_text.strip()) < 20:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Could not generate description for the image. Please try a different image."}
                )
                
            content_type = "image"
            
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "Unsupported file format"}
            )
        
        # Generate unique context ID
        file_hash = hashlib.md5(file_content).hexdigest()
        context_id = f"ctx_{file_hash[:8]}_{int(time.time())}"
        
        # Chunk the text for better retrieval
        chunks = chunk_text(extracted_text, chunk_size=500, overlap=50)
        
        if not chunks:
            return JSONResponse(
                status_code=400,
                content={"error": "Could not create text chunks from the document"}
            )
        
        # Generate embeddings for similarity search
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        embeddings = await generate_embeddings(chunks)
        
        # Store context with metadata
        metadata = {
            "filename": file.filename,
            "file_type": file_extension,
            "content_type": content_type,
            "file_size": len(file_content),
            "title": title or file.filename,
            "description": description or f"{'Image caption' if content_type == 'image' else 'Text content'} extracted from {file.filename}",
            "text_length": len(extracted_text),
            "chunk_count": len(chunks),
            "upload_time": time.time(),
            "processing_method": "vision_model" if content_type == "image" else "text_extraction"
        }
        
        store_context(context_id, chunks, embeddings, metadata)
        
        # Log successful upload
        logger.info(f"Successfully uploaded and processed context {context_id}")
        
        return JSONResponse(content={
            "message": "Upload successful",
            "context_id": context_id,
            "metadata": {
                "filename": file.filename,
                "file_type": file_extension,
                "content_type": content_type,
                "text_length": len(extracted_text),
                "chunk_count": len(chunks),
                "title": metadata["title"],
                "description": metadata["description"],
                "processing_method": metadata["processing_method"]
            }
        })
        
    except Exception as e:
        logger.exception("Error during context upload", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process document: {str(e)}"}
        )

@app.post("/context/retrieve")
@limiter.limit("30/minute")  # 30 retrievals per minute
@async_log_execution_time()
async def retrieve_context(request: Request):
    """
    Retrieve relevant context from uploaded documents using similarity search.
    
    Takes a context ID and query, performs semantic similarity search on the stored
    document chunks, and returns the most relevant sections.
    
    This enables contextual AI responses based on uploaded document content.
    """
    try:
        # Parse request data
        data = await request.json()
        context_id = data.get("context_id", "").strip()
        query = data.get("query", "").strip()
        top_k = min(data.get("top_k", 3), 10)  # Limit to max 10 results
        
        # Validate inputs
        if not context_id:
            return JSONResponse(
                status_code=400,
                content={"error": "context_id is required"}
            )
        
        if not query:
            return JSONResponse(
                status_code=400,
                content={"error": "query is required"}
            )
        
        if len(query) < 3:
            return JSONResponse(
                status_code=400,
                content={"error": "Query must be at least 3 characters long"}
            )
        
        # Retrieve stored context
        stored_context = get_stored_context(context_id)
        if not stored_context:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Context not found",
                    "message": f"No context found with ID: {context_id}",
                    "suggestion": "Please verify the context_id or upload the document first."
                }
            )
        
        chunks = stored_context["chunks"]
        embeddings = stored_context["embeddings"]
        metadata = stored_context["metadata"]
        
        # Perform similarity search
        logger.info(f"Searching context {context_id} for query: {query[:100]}...")
        similar_chunks = await find_similar_chunks(query, chunks, embeddings, top_k)
        
        if not similar_chunks:
            return JSONResponse(content={
                "context_id": context_id,
                "query": query,
                "matches": [],
                "message": "No relevant content found for your query",
                "suggestions": [
                    "Try rephrasing your query",
                    "Use different keywords",
                    "Check if the document contains information about your topic"
                ]
            })
        
        # Log successful retrieval
        logger.info(f"Found {len(similar_chunks)} relevant chunks for context {context_id}")
        
        return JSONResponse(content={
            "context_id": context_id,
            "query": query,
            "matches": similar_chunks,
            "metadata": {
                "source_filename": metadata.get("filename"),
                "source_title": metadata.get("title"),
                "total_chunks": metadata.get("chunk_count", 0),
                "retrieved_chunks": len(similar_chunks)
            }
        })
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON format in request body"}
        )
    except Exception as e:
        logger.exception("Error during context retrieval", exception_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to retrieve context: {str(e)}"}
        )

@app.get("/context/{context_id}/info")
@limiter.limit("60/minute")  # 60 info requests per minute
async def get_context_info(request: Request, context_id: str):
    """
    Get information about a stored context without performing a search.
    
    Returns metadata about the uploaded document and context statistics.
    """
    try:
        stored_context = get_stored_context(context_id)
        if not stored_context:
            return JSONResponse(
                status_code=404,
                content={"error": f"Context not found: {context_id}"}
            )
        
        metadata = stored_context["metadata"]
        
        return JSONResponse(content={
            "context_id": context_id,
            "info": {
                "filename": metadata.get("filename"),
                "file_type": metadata.get("file_type"),
                "title": metadata.get("title"),
                "description": metadata.get("description"),
                "file_size": metadata.get("file_size"),
                "text_length": metadata.get("text_length"),
                "chunk_count": metadata.get("chunk_count"),
                "upload_time": metadata.get("upload_time"),
                "created_at": time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(metadata.get("upload_time", 0)))
            }
        })
        
    except Exception as e:
        logger.exception("Error getting context info")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get context info: {str(e)}"}
        )


@app.delete("/context/{context_id}")
@limiter.limit("20/minute")  # 20 deletions per minute
async def delete_context(request: Request, context_id: str):
    """
    Delete a stored context and its associated data.
    
    Removes all chunks, embeddings, and metadata for the specified context ID.
    """
    try:
        # Use the modularized delete function
        success = delete_stored_context(context_id)
        
        if not success:
            return JSONResponse(
                status_code=404,
                content={"error": f"Context not found: {context_id}"}
            )
        
        return JSONResponse(content={
            "message": f"Context {context_id} successfully deleted",
            "context_id": context_id
        })
        
    except Exception as e:
        logger.exception("Error deleting context")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to delete context: {str(e)}"}
        )

if __name__ == "__main__":
    logger.info("Starting Velocity Router application server")
    
    # Determine environment
    is_dev = os.environ.get("ENV", "production").lower() == "development"
    
    # Configure server settings
    server_config = {
        "host": "0.0.0.0",
        "port": int(os.environ.get("PORT", 8000)),
        "reload": is_dev,
        # Performance optimizations
        "workers": int(os.environ.get("WORKERS", os.cpu_count() or 1)),
        "loop": "auto",  # Let uvicorn choose the best event loop
        "http": "auto",  # Let uvicorn choose the best HTTP protocol implementation
        "limit_concurrency": int(os.environ.get("MAX_CONCURRENCY", 1000)),
        "timeout_keep_alive": 65,  # Keep-alive timeout (seconds)
        "access_log": False,  # Disable access logs since we have our own logging middleware
    }
    
    # In development mode, use only 1 worker and enable reload
    if is_dev:
        server_config["workers"] = 1
    
    logger.info(f"Server configuration: {server_config}")
    uvicorn.run("application:app", **server_config)