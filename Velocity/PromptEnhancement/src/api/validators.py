"""
Validation utilities for website classification API.
"""

import json
import re
from typing import Dict, List, Any
from urllib.parse import urlparse


def validate_classification_input(data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate input data for website classification.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    url = data.get("url", "")
    domain = data.get("domain", "")
    
    if not url and not domain:
        return False, "Either URL or domain is required"
    
    return True, ""


def extract_domain_from_url(url: str) -> str:
    """
    Extract domain from URL safely.
    
    Args:
        url: The URL to extract domain from
        
    Returns:
        str: The extracted domain or empty string if extraction fails
    """
    try:
        parsed_url = urlparse(url)
        return parsed_url.netloc.lower()
    except Exception:
        return ""


def validate_llm_classification(llm_result: Dict[str, Any], domain: str) -> Dict[str, Any]:
    """Validate and clean LLM classification results."""
    
    # Define valid values for each field
    valid_values = {
        "classification": ["content", "ai_service", "ecommerce", "news", "social", "video", "reference", "product", "tool"],
        "category": ["article", "tutorial", "documentation", "blog_post", "newsletter", "video", "product", "qa", "discussion", "repository", "encyclopedia", "news", "review", "tool"],
        "content_type": ["blog_post", "tutorial", "documentation", "news", "review", "research", "opinion", "product", "video", "qa", "newsletter", "code", "reference"],
        "website_type": ["technical", "blogging", "social", "video", "news", "ecommerce", "ai", "professional", "reference", "entertainment", "educational"],
        "context_complexity": ["basic", "intermediate", "advanced"],
        "recommended_models": ["openai", "anthropic", "perplexity", "google", "grok"]
    }
    
    # Initialize result with defaults
    result = {
        "classification": "content",
        "confidence": 0.5,
        "category": "article",
        "is_ai_platform": False,
        "content_type": "blog_post",
        "website_type": "technical",
        "context_complexity": "intermediate",
        "language": "en",
        "recommended_models": ["openai", "anthropic"],
        "reasoning": "Default classification"
    }
    
    # Validate and update each field
    for field, default_value in result.items():
        if field in llm_result:
            value = llm_result[field]
            
            if field == "confidence":
                # Ensure confidence is between 0 and 1
                try:
                    confidence = float(value)
                    result[field] = min(max(confidence, 0.0), 1.0)
                except (ValueError, TypeError):
                    result[field] = 0.5
                    
            elif field == "is_ai_platform":
                # Ensure boolean value
                result[field] = bool(value)
                    
            elif field == "recommended_models":
                # Validate model list
                if isinstance(value, list):
                    valid_models = [model for model in value if model in valid_values[field]]
                    result[field] = valid_models[:3] if valid_models else ["openai", "anthropic"]
                else:
                    result[field] = ["openai", "anthropic"]
                    
            elif field == "reasoning":
                # Keep reasoning as-is if it's a string
                if isinstance(value, str):
                    result[field] = value
                    
            elif field in valid_values:
                # Validate against allowed values
                if value in valid_values[field]:
                    result[field] = value
                    
    return result


def parse_llm_response(llm_response: str) -> Dict[str, Any]:
    """
    Parse LLM response and extract JSON data.
    
    Args:
        llm_response: Raw response from LLM
        
    Returns:
        dict: Parsed JSON data or empty dict if parsing fails
    """
    try:
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
        if json_match:
            llm_response = json_match.group(0)
        
        return json.loads(llm_response)
    except (json.JSONDecodeError, ValueError):
        return {} 