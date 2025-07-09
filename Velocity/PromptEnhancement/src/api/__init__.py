"""
API module for Velocity application.

This module contains all API-related functionality including:
- Website classification endpoints
- Follow-up question generation
- Request/response handling
- API route definitions
"""

from .website_classifier import WebsiteClassificationAPI
from .follow_up_generator import FollowUpGenerator
from .prompt_enhancer import PromptEnhancer
from .models import (
    ClassificationRequest, 
    ClassificationResponse,
    FollowUpRequest,
    FollowUpResponse,
    PromptEnhancementRequest,
    PromptEnhancementResponse
)

__all__ = [
    'WebsiteClassificationAPI',
    'FollowUpGenerator',
    'PromptEnhancer',
    'ClassificationRequest', 
    'ClassificationResponse',
    'FollowUpRequest',
    'FollowUpResponse',
    'PromptEnhancementRequest',
    'PromptEnhancementResponse'
] 