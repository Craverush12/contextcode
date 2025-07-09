"""
API route definitions for website classification and follow-up generation.
"""

from fastapi import Request, APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
import asyncio

from .website_classifier import WebsiteClassificationAPI
from .follow_up_generator import FollowUpGenerator
from ..core.module_init import container
from ..core import ModelProvider
from ..logging.logger import async_log_execution_time

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create router
api_router = APIRouter(prefix="/api/v1", tags=["intelligence"])

# Initialize API handlers
def get_website_classifier_api():
    """Get website classifier API instance."""
    model_provider = container.resolve(ModelProvider)
    return WebsiteClassificationAPI(model_provider)

def get_follow_up_generator():
    """Get follow-up generator instance."""
    model_provider = container.resolve(ModelProvider)
    return FollowUpGenerator(model_provider)


@api_router.post("/classify-website")
@limiter.limit("50/minute")  # 50 requests per minute for website classification
@async_log_execution_time()
async def classify_website_endpoint(request: Request):
    """
    Classify website content and determine optimal AI routing using LLMs.
    
    Uses AI models to analyze website metadata and provide intelligent classification
    for content type, platform, and optimal AI model recommendations.
    
    Request Body:
    {
        "url": "https://example.com/page",
        "page_title": "Example Page Title",
        "meta_description": "Example meta description",
        "domain": "example.com"  // Optional, extracted from URL if not provided
    }
    
    Response:
    {
        "success": true,
        "data": {
            "classification": "content",
            "confidence": 0.85,
            "category": "blog_post",
            "platform": "example.com",
            "is_ai_platform": false,
            "content_type": "blog_post",
            "language": "en",
            "reading_time": 5,
            "website_type": "blogging",
            "recommended_models": ["anthropic", "openai"],
            "context_complexity": "intermediate",
            "reasoning": "Classification explanation"
        }
    }
    """
    api_handler = get_website_classifier_api()
    return await api_handler.classify_website(request)


@api_router.post("/generate-follow-ups")
@limiter.limit("20/minute")  # 20 requests per minute for follow-up generation
@async_log_execution_time()
async def generate_follow_up_questions_endpoint(request: Request):
    """
    Generate contextual follow-up questions based on AI responses.
    
    Analyzes AI responses and conversation context to generate relevant
    follow-up questions categorized by type with relevance scoring.
    
    Request Body:
    {
        "ai_response": "The AI response text to generate follow-ups from",
        "original_question": "The original question that was asked",
        "selected_text": "Optional selected text context",
        "conversation_context": {
            "previous_questions": ["list", "of", "previous", "questions"],
            "user_interests": ["topic1", "topic2"]
        }
    }
    
    Response:
    {
        "success": true,
        "data": {
            "recommendations": ["follow-up question 1?", "follow-up question 2?"],
            "context_score": 0.85,
            "generation_strategy": "response_based",
            "categories": {
                "practical": ["implementation questions"],
                "guidance": ["advice questions"],
                "timeline": ["timing questions"],
                "comparison": ["comparison questions"],
                "deep_dive": ["detailed questions"],
                "next_steps": ["action questions"],
                "challenges": ["challenge questions"]
            }
        }
    }
    """
    generator = get_follow_up_generator()
    return await generator.process_request(request)


# --- New Multiple Response Endpoint ---
class MultipleResponseRequest(BaseModel):
    prompt: str
    llms: List[str]

@api_router.post("/multiple-response")
@limiter.limit("20/minute")
@async_log_execution_time()
async def multiple_response_endpoint(request: Request):
    """
    Get responses from multiple LLMs in parallel using LangChain.
    Input: { "prompt": "...", "llms": ["openai", "nvidia", ...] }
    Output: {
      "success": true,
      "data": {
        "responses": { "response1": "...", "response2": "..." },
        "model_map": { "response1": "OPENAI", "response2": "NVIDIA" }
      }
    }
    """
    body = await request.json()
    try:
        req = MultipleResponseRequest(**body)
    except Exception as e:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid input: {str(e)}"})

    # Map string names to ModelProvider enums
    provider_map = {
        "openai": "OPENAI",
        "nvidia": "NVIDIA",
        "groq": "GROQ",
        "google": "GEMINI",
        "gemini": "GEMINI"
    }
    # Remove duplicates and normalize, then sort by preferred order
    preferred_order = ["NVIDIA", "GROQ", "GEMINI", "OPENAI"]
    llms_set = {provider_map.get(llm.lower(), None) for llm in req.llms if provider_map.get(llm.lower(), None)}
    llms = [llm for llm in preferred_order if llm in llms_set]
    if not llms:
        return JSONResponse(status_code=400, content={"success": False, "error": "No valid LLMs specified."})

    # Get the LLMProvider instance
    from src.llm.llm_provider import LLMProvider
    provider = LLMProvider.get_instance()
    model_fallback = provider.model_fallback

    async def call_llm(llm_enum_name):
        from src.llm.model_fallback import ModelProvider
        provider_enum = getattr(ModelProvider, llm_enum_name, None)
        if not provider_enum:
            return (llm_enum_name, f"Provider {llm_enum_name} not supported.")
        try:
            response = await model_fallback._try_model(provider_enum, req.prompt)
            if response is None:
                return (llm_enum_name, f"No response from {llm_enum_name} (may be in cooldown or not configured).")
            return (llm_enum_name, response)
        except Exception as e:
            return (llm_enum_name, f"Error: {str(e)}")

    # Run all LLM calls in parallel
    results = await asyncio.gather(*(call_llm(llm) for llm in llms))
    responses = {}
    model_map = {}
    for idx, (model_name, resp) in enumerate(results, 1):
        resp_key = f"response{idx}"
        responses[resp_key] = resp
        model_map[resp_key] = model_name
    return {"success": True, "data": {"responses": responses, "model_map": model_map}} 