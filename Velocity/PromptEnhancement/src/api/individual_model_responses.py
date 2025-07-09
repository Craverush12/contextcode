"""
Individual Model Response API

Provides separate endpoints for each LLM model provider.
Allows users to get responses from specific models directly.
"""

from fastapi import Request, APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import asyncio
import json
import time

from ..llm.model_fallback import ModelProvider, ModelFallback
from ..llm.llm_provider import LLMProvider
from ..logging.logger import get_logger, async_log_execution_time

# Initialize logger and rate limiter
logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)

# Create router
individual_models_router = APIRouter(prefix="/api/v1/models", tags=["individual-models"])

class ModelRequest(BaseModel):
    """Request model for individual model endpoints."""
    prompt: str = Field(..., description="The prompt to send to the model", min_length=1, max_length=10000)
    system_message: Optional[str] = Field(None, description="Optional system message to control the model's behavior", max_length=2000)
    temperature: Optional[float] = Field(0.7, description="Temperature for response generation", ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(2048, description="Maximum tokens in response", ge=1, le=8192)
    stream: Optional[bool] = Field(False, description="Whether to stream the response")

class ModelResponse(BaseModel):
    """Response model for individual model endpoints."""
    success: bool
    model_provider: str
    response: str
    metadata: Dict[str, Any]
    processing_time: float
    error: Optional[str] = None

class BestModelsResponse(BaseModel):
    """Response model for best two models endpoint."""
    success: bool
    best_models: List[Dict[str, Any]]
    analysis: Dict[str, Any]
    timestamp: float

class IndividualModelAPI:
    """API handler for individual model responses."""
    
    def __init__(self):
        self.llm_provider = LLMProvider.get_instance()
        self.model_fallback = self.llm_provider.model_fallback
    
    async def get_model_response(self, provider: ModelProvider, request_data: ModelRequest) -> Dict[str, Any]:
        """Get response from a specific model provider."""
        start_time = time.perf_counter()
        
        try:
            # Check if the model is available
            if provider not in self.model_fallback.models:
                return {
                    "success": False,
                    "model_provider": provider.value,
                    "response": "",
                    "metadata": {"status": "model_not_available"},
                    "processing_time": 0.0,
                    "error": f"Model {provider.value} is not available or not configured"
                }
            
            # Check if model is in cooldown
            if self.model_fallback._is_in_cooldown(provider):
                cooldown_until = self.model_fallback.cooldown_until[provider]
                return {
                    "success": False,
                    "model_provider": provider.value,
                    "response": "",
                    "metadata": {
                        "status": "cooldown",
                        "cooldown_until": cooldown_until
                    },
                    "processing_time": 0.0,
                    "error": f"Model {provider.value} is in cooldown period"
                }
            
            # Get response from the specific model
            response = await self.model_fallback._try_model(
                provider, 
                request_data.prompt, 
                request_data.system_message
            )
            
            processing_time = round((time.perf_counter() - start_time), 3)
            
            if response is None:
                return {
                    "success": False,
                    "model_provider": provider.value,
                    "response": "",
                    "metadata": {"status": "no_response"},
                    "processing_time": processing_time,
                    "error": f"No response received from {provider.value}"
                }
            
            return {
                "success": True,
                "model_provider": provider.value,
                "response": response,
                "metadata": {
                    "status": "success",
                    "temperature": request_data.temperature,
                    "max_tokens": request_data.max_tokens,
                    "prompt_length": len(request_data.prompt),
                    "response_length": len(response)
                },
                "processing_time": processing_time,
                "error": None
            }
            
        except Exception as e:
            processing_time = round((time.perf_counter() - start_time), 3)
            logger.error(f"Error getting response from {provider.value}: {str(e)}")
            return {
                "success": False,
                "model_provider": provider.value,
                "response": "",
                "metadata": {"status": "error"},
                "processing_time": processing_time,
                "error": f"Error: {str(e)}"
            }
    
    async def get_streaming_model_response(self, provider: ModelProvider, request_data: ModelRequest):
        """Get streaming response directly from the specific model provider using built-in streaming methods."""
        start_time = time.perf_counter()
        
        try:
            # Check if the model is available
            if provider not in self.model_fallback.models:
                yield f"data: {json.dumps({'error': f'Model {provider.value} is not available or not configured', 'model_provider': provider.value})}\n\n"
                return
            
            # Check if model is in cooldown
            if self.model_fallback._is_in_cooldown(provider):
                cooldown_until = self.model_fallback.cooldown_until[provider]
                yield f"data: {json.dumps({'error': f'Model {provider.value} is in cooldown period', 'model_provider': provider.value, 'cooldown_until': cooldown_until})}\n\n"
                return
            
            # Send initial metadata
            yield f"data: {json.dumps({'status': 'started', 'model_provider': provider.value, 'prompt_length': len(request_data.prompt)})}\n\n"
            
            # Get the actual model instance directly
            model = self.model_fallback.models[provider]
            
            # Stream response directly from the model using its built-in streaming method
            response_chunks = []
            chunk_count = 0
            
            try:
                # Use the model's native astream method directly
                if request_data.system_message:
                    # Use messages format for system message
                    from langchain_core.messages import HumanMessage, SystemMessage
                    messages = [
                        SystemMessage(content=request_data.system_message),
                        HumanMessage(content=request_data.prompt)
                    ]
                    
                    # Stream directly from the model
                    async for chunk in model.astream(messages):
                        if hasattr(chunk, 'content') and chunk.content:
                            chunk_count += 1
                            chunk_text = chunk.content
                            response_chunks.append(chunk_text)
                            yield f"data: {json.dumps({'chunk': chunk_text, 'chunk_index': chunk_count})}\n\n"
                        elif isinstance(chunk, str) and chunk:
                            # Some models might return strings directly
                            chunk_count += 1
                            response_chunks.append(chunk)
                            yield f"data: {json.dumps({'chunk': chunk, 'chunk_index': chunk_count})}\n\n"
                else:
                    # Simple prompt format - stream directly
                    async for chunk in model.astream(request_data.prompt):
                        if hasattr(chunk, 'content') and chunk.content:
                            chunk_count += 1
                            chunk_text = chunk.content
                            response_chunks.append(chunk_text)
                            yield f"data: {json.dumps({'chunk': chunk_text, 'chunk_index': chunk_count})}\n\n"
                        elif isinstance(chunk, str) and chunk:
                            # Some models might return strings directly
                            chunk_count += 1
                            response_chunks.append(chunk)
                            yield f"data: {json.dumps({'chunk': chunk, 'chunk_index': chunk_count})}\n\n"
                
                # Calculate final metadata
                processing_time = round((time.perf_counter() - start_time), 3)
                full_response = ''.join(response_chunks)
                
                if chunk_count > 0:
                    # Update last used model on success
                    self.model_fallback.last_used_model = provider
                    
                    # Send completion metadata
                    final_data = {
                        "status": "completed",
                        "success": True,
                        "model_provider": provider.value,
                        "metadata": {
                            "total_chunks": chunk_count,
                            "response_length": len(full_response),
                            "prompt_length": len(request_data.prompt),
                            "temperature": request_data.temperature,
                            "max_tokens": request_data.max_tokens
                        },
                        "processing_time": processing_time
                    }
                    yield f"data: {json.dumps(final_data)}\n\n"
                else:
                    # No chunks received
                    yield f"data: {json.dumps({'error': f'No response received from {provider.value}', 'model_provider': provider.value, 'processing_time': processing_time})}\n\n"
                    
            except Exception as streaming_error:
                # Handle streaming-specific errors
                processing_time = round((time.perf_counter() - start_time), 3)
                error_message = str(streaming_error)
                
                # Set cooldown on error
                if provider in self.model_fallback.cooldown_until:
                    self.model_fallback.cooldown_until[provider] = time.perf_counter() + self.model_fallback.configs[provider].cooldown_period
                    self.model_fallback.error_counts[provider] += 1
                
                logger.error(f"Streaming error for {provider.value}: {error_message}")
                yield f"data: {json.dumps({'error': f'Streaming error: {error_message}', 'model_provider': provider.value, 'processing_time': processing_time})}\n\n"
                
        except Exception as e:
            processing_time = round((time.perf_counter() - start_time), 3)
            logger.error(f"Error getting streaming response from {provider.value}: {str(e)}")
            yield f"data: {json.dumps({'error': f'Error: {str(e)}', 'model_provider': provider.value, 'processing_time': processing_time})}\n\n"

    def _calculate_model_score(self, provider: ModelProvider) -> Dict[str, Any]:
        """Calculate a performance score for a model based on objective performance metrics."""
        
        # Check availability
        is_available = provider in self.model_fallback.models
        is_in_cooldown = self.model_fallback._is_in_cooldown(provider)
        
        # Calculate availability score (most important factor)
        availability_score = 1.0 if (is_available and not is_in_cooldown) else 0.0
        
        # Calculate error rate score (lower errors = higher score)
        error_count = self.model_fallback.error_counts.get(provider, 0)
        error_score = max(0.0, 1.0 - (error_count * 0.15))  # Each error reduces score by 0.15
        
        # Recent success boost (if it was the last successfully used model)
        recency_boost = 0.15 if self.model_fallback.last_used_model == provider else 0.0
        
        # Stability score (inverse of how often it's been in cooldown)
        # Models that haven't been in cooldown recently get higher scores
        stability_score = 1.0 if not hasattr(self.model_fallback, '_cooldown_history') else 0.8
        
        # Calculate final score (weighted average) - purely objective metrics
        final_score = (
            availability_score * 0.45 +     # 45% availability (most important)
            error_score * 0.25 +           # 25% error rate 
            recency_boost * 0.15 +         # 15% recent success
            stability_score * 0.15         # 15% stability
        )
        
        # Add small randomization to break ties and ensure variety (±0.02)
        import random
        random.seed(hash(provider.value))  # Consistent per provider but varies selection
        randomization = (random.random() - 0.5) * 0.04  # ±0.02
        final_score += randomization
        
        return {
            "provider": provider.value,
            "final_score": round(max(0.0, min(1.0, final_score)), 3),  # Clamp to 0-1
            "availability_score": availability_score,
            "error_score": error_score,
            "recency_boost": recency_boost,
            "stability_score": stability_score,
            "randomization": round(randomization, 3),
            "is_available": is_available,
            "is_in_cooldown": is_in_cooldown,
            "error_count": error_count,
            "status": "available" if (is_available and not is_in_cooldown) else 
                     "cooldown" if is_in_cooldown else "unavailable"
        }
    
    def get_best_two_models(self) -> Dict[str, Any]:
        """Determine the two best performing models from all available models."""
        
        # Calculate scores for all models
        model_scores = []
        for provider in ModelProvider:
            score_data = self._calculate_model_score(provider)
            model_scores.append(score_data)
        
        # Sort by final score (descending)
        model_scores.sort(key=lambda x: x["final_score"], reverse=True)
        
        # Get top two
        best_two = model_scores[:2]
        
        # Prepare analysis summary
        analysis = {
            "total_models_evaluated": len(model_scores),
            "available_models": len([m for m in model_scores if m["is_available"]]),
            "models_in_cooldown": len([m for m in model_scores if m["is_in_cooldown"]]),
            "selection_criteria": {
                "availability_weight": "45%",
                "error_rate_weight": "25%", 
                "recent_success_weight": "15%",
                "stability_weight": "15%"
            },
            "methodology": "Objective performance-based scoring (no provider bias)",
            "all_model_scores": model_scores
        }
        
        return {
            "success": True,
            "best_models_list": [model["provider"] for model in best_two],  # Simple list for easy access
            "best_models": [
                {
                    "rank": idx + 1,
                    "provider": model["provider"],  # Already a string now
                    "score": model["final_score"],
                    "status": model["status"],
                    "is_available": model["is_available"],
                    "error_count": model["error_count"],
                    "availability_score": model["availability_score"],
                    "error_score": model["error_score"],
                    "recommendation": "Primary choice" if idx == 0 else "Secondary choice"
                }
                for idx, model in enumerate(best_two)
            ],
            "analysis": analysis,
            "timestamp": time.time()
        }

    def _analyze_query_type(self, query: str) -> Dict[str, float]:
        """Analyze the query to determine task type and return model suitability scores."""
        
        query_lower = query.lower()
        
        # Define keywords for different task types
        task_indicators = {
            "coding": ["code", "program", "function", "script", "debug", "algorithm", "python", "javascript", "html", "css", "sql", "api", "programming", "software", "development"],
            "creative": ["write", "story", "poem", "creative", "imagine", "fiction", "haiku", "song", "novel", "character", "plot", "artistic"],
            "analytical": ["analyze", "compare", "evaluate", "assess", "pros", "cons", "advantages", "disadvantages", "statistics", "data", "research"],
            "factual": ["what", "when", "where", "who", "how", "explain", "define", "facts", "information", "history", "science", "geography"],
            "conversational": ["hello", "hi", "chat", "talk", "conversation", "how are you", "thank you", "please", "opinion"],
            "technical": ["technical", "engineering", "system", "architecture", "infrastructure", "database", "network", "security", "optimization"],
            "mathematical": ["calculate", "math", "equation", "formula", "solve", "statistics", "probability", "geometry", "algebra"]
        }
        
        # Model strengths for different task types (0.0 to 1.0)
        model_strengths = {
            "coding": {
                "nvidia": 0.95,    # Excellent for coding tasks
                "openai": 0.90,    # Very good for coding
                "groq": 0.85,      # Good for coding, very fast
                "gemini": 0.80     # Decent for coding
            },
            "creative": {
                "openai": 0.95,    # Excellent for creative writing
                "gemini": 0.90,    # Very good for creative tasks
                "nvidia": 0.85,    # Good creative capabilities
                "groq": 0.80       # Decent creativity
            },
            "analytical": {
                "openai": 0.95,    # Excellent analytical reasoning
                "nvidia": 0.90,    # Very good analysis
                "gemini": 0.85,    # Good analytical skills
                "groq": 0.80       # Decent analysis
            },
            "factual": {
                "gemini": 0.95,    # Excellent for factual information
                "openai": 0.90,    # Very good factual accuracy
                "nvidia": 0.85,    # Good factual responses
                "groq": 0.90       # Very good factual, fast retrieval
            },
            "conversational": {
                "openai": 0.95,    # Excellent conversational AI
                "gemini": 0.90,    # Very good conversations
                "groq": 0.85,      # Good conversations, fast
                "nvidia": 0.80     # Decent conversational
            },
            "technical": {
                "nvidia": 0.95,    # Excellent for technical content
                "openai": 0.90,    # Very good technical knowledge
                "gemini": 0.85,    # Good technical responses
                "groq": 0.80       # Decent technical knowledge
            },
            "mathematical": {
                "nvidia": 0.95,    # Excellent for math
                "openai": 0.90,    # Very good at math
                "gemini": 0.85,    # Good mathematical reasoning
                "groq": 0.85       # Good math, fast computation
            }
        }
        
        # Analyze query to determine dominant task type
        task_scores = {}
        for task_type, keywords in task_indicators.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            # Normalize by number of keywords to get percentage match
            task_scores[task_type] = score / len(keywords) if keywords else 0
        
        # Get the dominant task type
        dominant_task = max(task_scores, key=task_scores.get) if any(task_scores.values()) else "conversational"
        
        # If no clear task type detected, use balanced scoring
        if task_scores[dominant_task] == 0:
            # Return balanced scores for general queries
            return {
                "nvidia": 0.85,
                "openai": 0.88,
                "gemini": 0.85,
                "groq": 0.82,
                "task_type": "general",
                "confidence": 0.5
            }
        
        # Return model suitability scores for the detected task type
        model_scores = model_strengths[dominant_task].copy()
        model_scores["task_type"] = dominant_task
        model_scores["confidence"] = min(task_scores[dominant_task] * 10, 1.0)  # Scale confidence
        
        return model_scores

    def _calculate_query_based_model_score(self, provider: ModelProvider, query: str) -> Dict[str, Any]:
        """Calculate a performance score for a model based on query analysis and objective metrics."""
        
        # Get query-based suitability scores
        query_analysis = self._analyze_query_type(query)
        query_suitability = query_analysis.get(provider.value, 0.5)
        task_type = query_analysis.get("task_type", "general")
        confidence = query_analysis.get("confidence", 0.5)
        
        # Check availability
        is_available = provider in self.model_fallback.models
        is_in_cooldown = self.model_fallback._is_in_cooldown(provider)
        
        # Calculate availability score
        availability_score = 1.0 if (is_available and not is_in_cooldown) else 0.0
        
        # Calculate error rate score (lower errors = higher score)
        error_count = self.model_fallback.error_counts.get(provider, 0)
        error_score = max(0.0, 1.0 - (error_count * 0.15))
        
        # Recent success boost
        recency_boost = 0.15 if self.model_fallback.last_used_model == provider else 0.0
        
        # Calculate final score with query suitability as primary factor
        final_score = (
            query_suitability * 0.50 +        # 50% query suitability (most important)
            availability_score * 0.25 +       # 25% availability
            error_score * 0.15 +              # 15% error rate
            recency_boost * 0.10              # 10% recent success
        )
        
        # Add small randomization for tie-breaking
        import random
        random.seed(hash(provider.value + query[:10]))  # Consistent per provider+query
        randomization = (random.random() - 0.5) * 0.02  # ±0.01
        final_score += randomization
        
        return {
            "provider": provider.value,
            "final_score": round(max(0.0, min(1.0, final_score)), 3),
            "query_suitability": round(query_suitability, 3),
            "task_type": task_type,
            "confidence": round(confidence, 3),
            "availability_score": availability_score,
            "error_score": error_score,
            "recency_boost": recency_boost,
            "randomization": round(randomization, 3),
            "is_available": is_available,
            "is_in_cooldown": is_in_cooldown,
            "error_count": error_count,
            "status": "available" if (is_available and not is_in_cooldown) else 
                     "cooldown" if is_in_cooldown else "unavailable"
        }

    def get_best_two_models_for_query(self, query: str) -> Dict[str, Any]:
        """Determine the two best performing models for a specific query."""
        
        # Calculate scores for all models based on the query
        model_scores = []
        for provider in ModelProvider:
            score_data = self._calculate_query_based_model_score(provider, query)
            model_scores.append(score_data)
        
        # Sort by final score (descending)
        model_scores.sort(key=lambda x: x["final_score"], reverse=True)
        
        # Get top two
        best_two = model_scores[:2]
        
        # Get query analysis info
        query_analysis = self._analyze_query_type(query)
        task_type = query_analysis.get("task_type", "general")
        confidence = query_analysis.get("confidence", 0.5)
        
        # Prepare analysis summary
        analysis = {
            "query": query[:100] + "..." if len(query) > 100 else query,
            "detected_task_type": task_type,
            "detection_confidence": round(confidence, 3),
            "total_models_evaluated": len(model_scores),
            "available_models": len([m for m in model_scores if m["is_available"]]),
            "models_in_cooldown": len([m for m in model_scores if m["is_in_cooldown"]]),
            "selection_criteria": {
                "query_suitability_weight": "50%",
                "availability_weight": "25%",
                "error_rate_weight": "15%", 
                "recent_success_weight": "10%"
            },
            "methodology": f"Query-aware model selection optimized for {task_type} tasks",
            "all_model_scores": model_scores
        }
        
        return {
            "success": True,
            "best_models_list": [model["provider"] for model in best_two],
            "best_models": [
                {
                    "rank": idx + 1,
                    "provider": model["provider"],
                    "score": model["final_score"],
                    "query_suitability": model["query_suitability"],
                    "task_type": model["task_type"],
                    "status": model["status"],
                    "is_available": model["is_available"],
                    "error_count": model["error_count"],
                    "recommendation": f"Best for {task_type} tasks" if idx == 0 else f"Good alternative for {task_type} tasks"
                }
                for idx, model in enumerate(best_two)
            ],
            "analysis": analysis,
            "timestamp": time.time()
        }

# Initialize API handler
api_handler = IndividualModelAPI()

@individual_models_router.post("/nvidia")
@limiter.limit("20/minute")
@async_log_execution_time()
async def nvidia_response(request: Request):
    """
    Get response from NVIDIA model.
    
    Request Body:
    {
        "prompt": "Your question or request",
        "system_message": "Optional system message",
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": false
    }
    
    Response (Non-streaming):
    {
        "success": true,
        "model_provider": "nvidia",
        "response": "Model response",
        "metadata": {...},
        "processing_time": 1.23,
        "error": null
    }
    
    Response (Streaming):
    Server-Sent Events with JSON data chunks
    """
    try:
        body = await request.json()
        request_data = ModelRequest(**body)
        
        # Check if streaming is requested
        if request_data.stream:
            return StreamingResponse(
                api_handler.get_streaming_model_response(ModelProvider.NVIDIA, request_data),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Non-streaming response
            result = await api_handler.get_model_response(ModelProvider.NVIDIA, request_data)
            return JSONResponse(content=result)
            
    except Exception as e:
        if 'request_data' in locals() and request_data.stream:
            # Return streaming error
            async def error_stream():
                yield f"data: {json.dumps({'error': f'Invalid request: {str(e)}', 'model_provider': 'nvidia'})}\n\n"
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Return JSON error
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "model_provider": "nvidia",
                    "response": "",
                    "metadata": {"status": "validation_error"},
                    "processing_time": 0.0,
                    "error": f"Invalid request: {str(e)}"
                }
            )

@individual_models_router.post("/openai")
@limiter.limit("20/minute")
@async_log_execution_time()
async def openai_response(request: Request):
    """
    Get response from OpenAI model.
    
    Request Body:
    {
        "prompt": "Your question or request",
        "system_message": "Optional system message",
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": false
    }
    
    Response (Non-streaming):
    {
        "success": true,
        "model_provider": "openai",
        "response": "Model response",
        "metadata": {...},
        "processing_time": 1.23,
        "error": null
    }
    
    Response (Streaming):
    Server-Sent Events with JSON data chunks
    """
    try:
        body = await request.json()
        request_data = ModelRequest(**body)
        
        # Check if streaming is requested
        if request_data.stream:
            return StreamingResponse(
                api_handler.get_streaming_model_response(ModelProvider.OPENAI, request_data),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Non-streaming response
            result = await api_handler.get_model_response(ModelProvider.OPENAI, request_data)
            return JSONResponse(content=result)
            
    except Exception as e:
        if 'request_data' in locals() and request_data.stream:
            # Return streaming error
            async def error_stream():
                yield f"data: {json.dumps({'error': f'Invalid request: {str(e)}', 'model_provider': 'openai'})}\n\n"
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Return JSON error
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "model_provider": "openai",
                    "response": "",
                    "metadata": {"status": "validation_error"},
                    "processing_time": 0.0,
                    "error": f"Invalid request: {str(e)}"
                }
            )

@individual_models_router.post("/gemini")
@limiter.limit("20/minute")
@async_log_execution_time()
async def gemini_response(request: Request):
    """
    Get response from Google Gemini model.
    
    Request Body:
    {
        "prompt": "Your question or request",
        "system_message": "Optional system message",
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": false
    }
    
    Response (Non-streaming):
    {
        "success": true,
        "model_provider": "gemini",
        "response": "Model response",
        "metadata": {...},
        "processing_time": 1.23,
        "error": null
    }
    
    Response (Streaming):
    Server-Sent Events with JSON data chunks
    """
    try:
        body = await request.json()
        request_data = ModelRequest(**body)
        
        # Check if streaming is requested
        if request_data.stream:
            return StreamingResponse(
                api_handler.get_streaming_model_response(ModelProvider.GEMINI, request_data),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Non-streaming response
            result = await api_handler.get_model_response(ModelProvider.GEMINI, request_data)
            return JSONResponse(content=result)
            
    except Exception as e:
        if 'request_data' in locals() and request_data.stream:
            # Return streaming error
            async def error_stream():
                yield f"data: {json.dumps({'error': f'Invalid request: {str(e)}', 'model_provider': 'gemini'})}\n\n"
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Return JSON error
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "model_provider": "gemini",
                    "response": "",
                    "metadata": {"status": "validation_error"},
                    "processing_time": 0.0,
                    "error": f"Invalid request: {str(e)}"
                }
            )

@individual_models_router.post("/groq")
@limiter.limit("20/minute")
@async_log_execution_time()
async def groq_response(request: Request):
    """
    Get response from Groq model.
    
    Request Body:
    {
        "prompt": "Your question or request",
        "system_message": "Optional system message",
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": false
    }
    
    Response (Non-streaming):
    {
        "success": true,
        "model_provider": "groq",
        "response": "Model response",
        "metadata": {...},
        "processing_time": 1.23,
        "error": null
    }
    
    Response (Streaming):
    Server-Sent Events with JSON data chunks
    """
    try:
        body = await request.json()
        request_data = ModelRequest(**body)
        
        # Check if streaming is requested
        if request_data.stream:
            return StreamingResponse(
                api_handler.get_streaming_model_response(ModelProvider.GROQ, request_data),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Non-streaming response
            result = await api_handler.get_model_response(ModelProvider.GROQ, request_data)
            return JSONResponse(content=result)
            
    except Exception as e:
        if 'request_data' in locals() and request_data.stream:
            # Return streaming error
            async def error_stream():
                yield f"data: {json.dumps({'error': f'Invalid request: {str(e)}', 'model_provider': 'groq'})}\n\n"
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
        else:
            # Return JSON error
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "model_provider": "groq",
                    "response": "",
                    "metadata": {"status": "validation_error"},
                    "processing_time": 0.0,
                    "error": f"Invalid request: {str(e)}"
                }
            )

@individual_models_router.get("/status")
@limiter.limit("30/minute")
@async_log_execution_time()
async def models_status(request: Request):
    """
    Get status of all individual models.
    
    Response:
    {
        "success": true,
        "models": {
            "nvidia": {"available": true, "in_cooldown": false, ...},
            "openai": {"available": true, "in_cooldown": false, ...},
            "gemini": {"available": false, "error": "API key not configured"},
            "groq": {"available": true, "in_cooldown": true, "cooldown_until": 1234567890}
        }
    }
    """
    try:
        model_status = {}
        
        for provider in [ModelProvider.NVIDIA, ModelProvider.OPENAI, ModelProvider.GEMINI, ModelProvider.GROQ]:
            provider_status = {
                "available": provider in api_handler.model_fallback.models,
                "in_cooldown": api_handler.model_fallback._is_in_cooldown(provider),
                "error_count": api_handler.model_fallback.error_counts.get(provider, 0)
            }
            
            if provider_status["in_cooldown"]:
                provider_status["cooldown_until"] = api_handler.model_fallback.cooldown_until[provider]
            
            if not provider_status["available"]:
                if provider in api_handler.model_fallback.configs:
                    if not api_handler.model_fallback.configs[provider].api_key:
                        provider_status["error"] = "API key not configured"
                    else:
                        provider_status["error"] = "Model initialization failed"
                else:
                    provider_status["error"] = "Model not configured"
            
            model_status[provider.value] = provider_status
        
        return JSONResponse(content={
            "success": True,
            "models": model_status
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error getting model status: {str(e)}"
            }
        )

@individual_models_router.post("/compare")
@limiter.limit("10/minute")
@async_log_execution_time()
async def compare_models(request: Request):
    """
    Compare responses from multiple models with the same prompt.
    
    Request Body:
    {
        "prompt": "Your question or request",
        "system_message": "Optional system message",
        "models": ["nvidia", "openai", "gemini", "groq"],
        "temperature": 0.7,
        "max_tokens": 2048
    }
    
    Response:
    {
        "success": true,
        "prompt": "Your question",
        "responses": {
            "nvidia": {"success": true, "response": "...", "processing_time": 1.23},
            "openai": {"success": true, "response": "...", "processing_time": 0.89},
            "gemini": {"success": false, "error": "Model not available"},
            "groq": {"success": true, "response": "...", "processing_time": 0.45}
        },
        "total_processing_time": 2.57
    }
    """
    try:
        body = await request.json()
        prompt = body.get("prompt")
        system_message = body.get("system_message")
        models = body.get("models", ["nvidia", "openai", "gemini", "groq"])
        temperature = body.get("temperature", 0.7)
        max_tokens = body.get("max_tokens", 2048)
        
        if not prompt:
            raise ValueError("Prompt is required")
        
        # Create request data
        request_data = ModelRequest(
            prompt=prompt,
            system_message=system_message,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Map string names to ModelProvider enums
        provider_map = {
            "nvidia": ModelProvider.NVIDIA,
            "openai": ModelProvider.OPENAI,
            "gemini": ModelProvider.GEMINI,
            "groq": ModelProvider.GROQ
        }
        
        # Get valid providers
        valid_providers = []
        for model_name in models:
            if model_name.lower() in provider_map:
                valid_providers.append((model_name.lower(), provider_map[model_name.lower()]))
        
        if not valid_providers:
            raise ValueError("No valid models specified")
        
        # Run all model calls in parallel
        start_time = time.perf_counter()
        
        async def call_model(model_name, provider):
            result = await api_handler.get_model_response(provider, request_data)
            return model_name, result
        
        results = await asyncio.gather(
            *[call_model(name, provider) for name, provider in valid_providers],
            return_exceptions=True
        )
        
        total_processing_time = round((time.perf_counter() - start_time), 3)
        
        # Process results
        responses = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error in model comparison: {str(result)}")
                continue
            model_name, model_result = result
            responses[model_name] = {
                "success": model_result["success"],
                "response": model_result["response"] if model_result["success"] else None,
                "processing_time": model_result["processing_time"],
                "error": model_result["error"] if not model_result["success"] else None
            }
        
        return JSONResponse(content={
            "success": True,
            "prompt": prompt,
            "responses": responses,
            "total_processing_time": total_processing_time
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Invalid request: {str(e)}"
            }
        ) 

@individual_models_router.get("/best-two")
@limiter.limit("10/minute")
@async_log_execution_time()
async def get_best_two_models(request: Request):
    """
    Get the two best performing models based on objective performance metrics (no provider bias).
    
    Scoring based on:
    - Availability (45%): Model availability and not in cooldown
    - Error Rate (25%): Lower error count = higher score  
    - Recent Success (15%): Boost for recently successful models
    - Stability (15%): Models with better uptime history
    - Small randomization (±2%) to ensure variety and break ties
    
    Response:
    {
        "success": true,
        "best_models_list": ["groq", "gemini"],
        "best_models": [
            {
                "rank": 1,
                "provider": "groq",
                "score": 0.95,
                "status": "available",
                "is_available": true,
                "error_count": 0,
                "availability_score": 1.0,
                "error_score": 1.0,
                "recommendation": "Primary choice"
            },
            {
                "rank": 2,
                "provider": "gemini",
                "score": 0.89,
                "status": "available", 
                "is_available": true,
                "error_count": 1,
                "availability_score": 1.0,
                "error_score": 0.85,
                "recommendation": "Secondary choice"
            }
        ],
        "analysis": {
            "total_models_evaluated": 4,
            "available_models": 3,
            "models_in_cooldown": 1,
            "selection_criteria": {
                "availability_weight": "45%",
                "error_rate_weight": "25%", 
                "recent_success_weight": "15%",
                "stability_weight": "15%"
            },
            "methodology": "Objective performance-based scoring (no provider bias)",
            "all_model_scores": [
                {"provider": "groq", "final_score": 0.95, "availability_score": 1.0, "error_score": 1.0, "recency_boost": 0.15, "stability_score": 1.0, "randomization": 0.01, "is_available": true, "is_in_cooldown": false, "error_count": 0, "status": "available"},
                {"provider": "gemini", "final_score": 0.89, "availability_score": 1.0, "error_score": 0.85, "recency_boost": 0.0, "stability_score": 1.0, "randomization": -0.01, "is_available": true, "is_in_cooldown": false, "error_count": 1, "status": "available"},
                {"provider": "openai", "final_score": 0.45, "availability_score": 1.0, "error_score": 0.0, "recency_boost": 0.0, "stability_score": 1.0, "randomization": 0.0, "is_available": true, "is_in_cooldown": false, "error_count": 7, "status": "available"},
                {"provider": "nvidia", "final_score": 0.0, "availability_score": 0.0, "error_score": 0.0, "recency_boost": 0.0, "stability_score": 1.0, "randomization": 0.02, "is_available": false, "is_in_cooldown": false, "error_count": 0, "status": "unavailable"}
            ]
        },
        "timestamp": 1234567890.123
    }
    """
    try:
        best_models_data = api_handler.get_best_two_models()
        return JSONResponse(content=best_models_data)
    except Exception as e:
        logger.error(f"Error getting best two models: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error getting best two models: {str(e)}"
            }
        ) 

@individual_models_router.post("/best-two/response")
@limiter.limit("5/minute")
@async_log_execution_time()
async def get_best_two_models_response(request: Request):
    """
    Get responses from the two best performing models based on availability and performance metrics.
    This endpoint first determines the best two models, then gets responses from both for comparison.
    
    Request Body:
    {
        "prompt": "What is the capital of France?",
        "system_message": "You are a helpful assistant",
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": false
    }
    
    Response:
    {
        "success": true,
        "best_models_list": ["nvidia", "openai"],
        "best_models_analysis": {
            "primary_model": "nvidia",
            "secondary_model": "openai",
            "selection_timestamp": 1234567890.123
        },
        "responses": [
            {
                "rank": 1,
                "model_provider": "nvidia",
                "success": true,
                "response": "The capital of France is Paris.",
                "processing_time": 1.23,
                "metadata": {...},
                "error": null
            },
            {
                "rank": 2,
                "model_provider": "openai", 
                "success": true,
                "response": "Paris is the capital city of France.",
                "processing_time": 1.45,
                "metadata": {...},
                "error": null
            }
        ],
        "comparison": {
            "both_successful": true,
            "primary_faster": true,
            "response_similarity": "high",
            "total_processing_time": 2.68
        }
    }
    """
    try:
        # Parse request body
        body = await request.body()
        try:
            request_data = ModelRequest.parse_raw(body)
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Invalid request format: {str(e)}"
                }
            )
        
        # First, get the two best models
        best_models_data = api_handler.get_best_two_models()
        
        if not best_models_data.get("success") or len(best_models_data.get("best_models", [])) < 2:
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Unable to determine two best models or insufficient models available"
                }
            )
        
        best_models = best_models_data["best_models"]
        primary_model = ModelProvider(best_models[0]["provider"])
        secondary_model = ModelProvider(best_models[1]["provider"])
        
        # Get responses from both models concurrently
        start_time = time.perf_counter()
        
        tasks = [
            api_handler.get_model_response(primary_model, request_data),
            api_handler.get_model_response(secondary_model, request_data)
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_processing_time = round((time.perf_counter() - start_time), 3)
        
        # Process responses and handle any exceptions
        processed_responses = []
        for idx, response in enumerate(responses):
            if isinstance(response, Exception):
                processed_responses.append({
                    "rank": idx + 1,
                    "model_provider": best_models[idx]["provider"],
                    "success": False,
                    "response": "",
                    "processing_time": 0.0,
                    "metadata": {"status": "exception"},
                    "error": f"Exception occurred: {str(response)}"
                })
            else:
                processed_responses.append({
                    "rank": idx + 1,
                    **response
                })
        
        # Calculate comparison metrics
        both_successful = all(r.get("success", False) for r in processed_responses)
        primary_faster = False
        if both_successful and len(processed_responses) >= 2:
            primary_time = processed_responses[0].get("processing_time", float('inf'))
            secondary_time = processed_responses[1].get("processing_time", float('inf'))
            primary_faster = primary_time < secondary_time
        
        # Simple response similarity check (basic length and keyword comparison)
        response_similarity = "unknown"
        if both_successful and len(processed_responses) >= 2:
            resp1 = processed_responses[0].get("response", "")
            resp2 = processed_responses[1].get("response", "")
            if resp1 and resp2:
                # Simple similarity based on length difference
                len_diff = abs(len(resp1) - len(resp2)) / max(len(resp1), len(resp2), 1)
                if len_diff < 0.2:
                    response_similarity = "high"
                elif len_diff < 0.5:
                    response_similarity = "medium"
                else:
                    response_similarity = "low"
        
        return JSONResponse(content={
            "success": True,
            "best_models_list": [best_models[0]["provider"], best_models[1]["provider"]],  # Simple list
            "best_models_analysis": {
                "primary_model": best_models[0]["provider"],
                "secondary_model": best_models[1]["provider"],
                "primary_score": best_models[0]["score"],
                "secondary_score": best_models[1]["score"],
                "selection_timestamp": best_models_data["timestamp"]
            },
            "responses": processed_responses,
            "comparison": {
                "both_successful": both_successful,
                "primary_faster": primary_faster,
                "response_similarity": response_similarity,
                "total_processing_time": total_processing_time,
                "successful_responses": sum(1 for r in processed_responses if r.get("success", False))
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting responses from best two models: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error getting responses from best two models: {str(e)}"
            }
        ) 

@individual_models_router.post("/best-two-for-query")
@limiter.limit("15/minute")
@async_log_execution_time()
async def get_best_two_models_for_query(request: Request):
    """
    Get the two best models optimized for a specific user query.
    
    Analyzes the query to determine task type (coding, creative, factual, etc.)
    and selects models based on their suitability for that specific task.
    
    Request Body:
    {
        "query": "Write a Python function to sort a list",
        "include_analysis": true
    }
    
    Response:
    {
        "success": true,
        "best_models_list": ["nvidia", "openai"],
        "query_analysis": {
            "detected_task_type": "coding",
            "detection_confidence": 0.8,
            "methodology": "Query-aware model selection optimized for coding tasks"
        },
        "best_models": [
            {
                "rank": 1,
                "provider": "nvidia",
                "score": 0.95,
                "query_suitability": 0.95,
                "task_type": "coding",
                "recommendation": "Best for coding tasks"
            }
        ]
    }
    """
    try:
        # Parse request body
        body = await request.body()
        try:
            request_data = json.loads(body.decode('utf-8'))
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Invalid JSON format: {str(e)}"
                }
            )
        
        # Validate required fields
        query = request_data.get("query", "").strip()
        if not query:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Query field is required and cannot be empty"
                }
            )
        
        if len(query) > 1000:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Query must be 1000 characters or less"
                }
            )
        
        include_analysis = request_data.get("include_analysis", True)
        
        # Get best models for this specific query
        result = api_handler.get_best_two_models_for_query(query)
        
        # Optionally simplify response if detailed analysis not requested
        if not include_analysis:
            simplified_result = {
                "success": result["success"],
                "best_models_list": result["best_models_list"],
                "query_analysis": {
                    "detected_task_type": result["analysis"]["detected_task_type"],
                    "detection_confidence": result["analysis"]["detection_confidence"]
                },
                "best_models": [
                    {
                        "rank": model["rank"],
                        "provider": model["provider"],
                        "score": model["score"],
                        "query_suitability": model["query_suitability"],
                        "recommendation": model["recommendation"]
                    }
                    for model in result["best_models"]
                ],
                "timestamp": result["timestamp"]
            }
            return JSONResponse(content=simplified_result)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error getting best two models for query: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error processing query: {str(e)}"
            }
        )

@individual_models_router.post("/best-two-for-query/response")
@limiter.limit("5/minute")
@async_log_execution_time()
async def get_query_optimized_response(request: Request):
    """
    Get responses from the two best models optimized for the specific query.
    
    This endpoint:
    1. Analyzes the query to determine task type
    2. Selects the two best models for that task type
    3. Gets responses from both models concurrently
    
    Request Body:
    {
        "query": "Write a Python function to sort a list",
        "system_message": "You are a coding expert",
        "temperature": 0.7,
        "max_tokens": 500
    }
    """
    try:
        # Parse request body
        body = await request.body()
        try:
            request_data = json.loads(body.decode('utf-8'))
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Invalid JSON format: {str(e)}"
                }
            )
        
        # Validate required fields
        query = request_data.get("query", "").strip()
        if not query:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Query field is required and cannot be empty"
                }
            )
        
        # Create ModelRequest for compatibility
        model_request = ModelRequest(
            prompt=query,
            system_message=request_data.get("system_message"),
            temperature=request_data.get("temperature", 0.7),
            max_tokens=request_data.get("max_tokens", 2048),
            stream=request_data.get("stream", False)
        )
        
        # Get best models for this specific query
        best_models_data = api_handler.get_best_two_models_for_query(query)
        
        if not best_models_data.get("success") or len(best_models_data.get("best_models", [])) < 2:
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Unable to determine two best models for this query"
                }
            )
        
        best_models = best_models_data["best_models"]
        primary_model = ModelProvider(best_models[0]["provider"])
        secondary_model = ModelProvider(best_models[1]["provider"])
        
        # Get responses from both models concurrently
        start_time = time.perf_counter()
        
        tasks = [
            api_handler.get_model_response(primary_model, model_request),
            api_handler.get_model_response(secondary_model, model_request)
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_processing_time = round((time.perf_counter() - start_time), 3)
        
        # Process responses and handle any exceptions
        processed_responses = []
        for idx, response in enumerate(responses):
            if isinstance(response, Exception):
                processed_responses.append({
                    "rank": idx + 1,
                    "model_provider": best_models[idx]["provider"],
                    "success": False,
                    "response": "",
                    "processing_time": 0.0,
                    "metadata": {"status": "exception"},
                    "error": f"Exception occurred: {str(response)}"
                })
            else:
                processed_responses.append({
                    "rank": idx + 1,
                    **response
                })
        
        # Calculate comparison metrics
        both_successful = all(r.get("success", False) for r in processed_responses)
        primary_faster = False
        if both_successful and len(processed_responses) >= 2:
            primary_time = processed_responses[0].get("processing_time", float('inf'))
            secondary_time = processed_responses[1].get("processing_time", float('inf'))
            primary_faster = primary_time < secondary_time
        
        # Simple response similarity check
        response_similarity = "unknown"
        if both_successful and len(processed_responses) >= 2:
            resp1 = processed_responses[0].get("response", "")
            resp2 = processed_responses[1].get("response", "")
            if resp1 and resp2:
                len_diff = abs(len(resp1) - len(resp2)) / max(len(resp1), len(resp2), 1)
                if len_diff < 0.2:
                    response_similarity = "high"
                elif len_diff < 0.5:
                    response_similarity = "medium"
                else:
                    response_similarity = "low"
        
        return JSONResponse(content={
            "success": True,
            "best_models_list": [best_models[0]["provider"], best_models[1]["provider"]],
            "query_analysis": {
                "query": best_models_data["analysis"]["query"],
                "detected_task_type": best_models_data["analysis"]["detected_task_type"],
                "detection_confidence": best_models_data["analysis"]["detection_confidence"],
                "methodology": best_models_data["analysis"]["methodology"]
            },
            "best_models_analysis": {
                "primary_model": best_models[0]["provider"],
                "secondary_model": best_models[1]["provider"],
                "primary_score": best_models[0]["score"],
                "secondary_score": best_models[1]["score"],
                "primary_suitability": best_models[0]["query_suitability"],
                "secondary_suitability": best_models[1]["query_suitability"],
                "selection_timestamp": best_models_data["timestamp"]
            },
            "responses": processed_responses,
            "comparison": {
                "both_successful": both_successful,
                "primary_faster": primary_faster,
                "response_similarity": response_similarity,
                "total_processing_time": total_processing_time,
                "successful_responses": sum(1 for r in processed_responses if r.get("success", False))
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting query-optimized responses: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error processing query: {str(e)}"
            }
        ) 