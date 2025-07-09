"""
Data models for API requests and responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ClassificationRequest(BaseModel):
    """Request model for website classification."""
    url: Optional[str] = None
    page_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    domain: Optional[str] = None


class ClassificationData(BaseModel):
    """Classification result data."""
    classification: str = "unknown"
    confidence: float = 0.0
    category: str = "unknown"
    platform: str = "unknown"
    is_ai_platform: bool = False
    content_type: str = "unknown"
    language: str = "en"
    reading_time: int = 0
    website_type: str = "unknown"
    recommended_models: List[str] = ["openai"]
    context_complexity: str = "unknown"
    reasoning: Optional[str] = None


class ClassificationResponse(BaseModel):
    """Response model for website classification."""
    success: bool = True
    data: ClassificationData
    error: Optional[str] = None


class FollowUpRequest(BaseModel):
    """Request model for follow-up question generation."""
    ai_response: str
    original_question: str
    selected_text: Optional[str] = ""
    conversation_context: Optional[Dict[str, Any]] = {}


class FollowUpData(BaseModel):
    """Follow-up generation result data."""
    recommendations: List[str] = []
    context_score: float = 0.5
    generation_strategy: str = "response_based"
    categories: Dict[str, List[str]] = {
        "practical": [],
        "guidance": [],
        "timeline": [],
        "comparison": [],
        "deep_dive": [],
        "next_steps": [],
        "challenges": []
    }


class FollowUpResponse(BaseModel):
    """Response model for follow-up question generation."""
    success: bool = True
    data: FollowUpData
    error: Optional[str] = None


class PromptEnhancementRequest(BaseModel):
    """Request model for prompt enhancement."""
    original_prompt: str = Field(..., description="The original prompt to enhance")
    context: Dict[str, Any] = Field(default_factory=dict, description="Context information for enhancement")
    enhancement_level: str = Field(default="moderate", description="Enhancement level: light, moderate, or aggressive")


class PromptEnhancementResponse(BaseModel):
    """Response model for prompt enhancement."""
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    enhanced_prompt: Optional[str] = None
    improvements: List[str] = Field(default_factory=list)
    confidence: float = 0.0
    enhancement_type: str = ""
    original_length: int = 0
    enhanced_length: int = 0
    reasoning: str = "" 