"""
AI query validation utilities for input validation and data checking.
"""

from typing import Dict, Any, List, Optional
from ..logging.logger import get_logger

logger = get_logger(__name__)


def validate_ai_query_input(user_question: Optional[str] = None, predefined_prompt: Optional[str] = None, 
                           base_question: Optional[str] = None, **kwargs) -> None:
    """
    Validate input parameters for AI query processing.
    
    Args:
        user_question: The user's question
        predefined_prompt: Predefined prompt to use
        base_question: The final question to validate
        **kwargs: Additional parameters (ignored)
        
    Raises:
        ValueError: If validation fails
    """
    # Check that at least one question source is provided
    if not user_question and not predefined_prompt:
        raise ValueError("Either user_question or predefined_prompt is required")
    
    # Determine the base question for length validation
    question_to_validate = base_question or predefined_prompt or user_question
    
    if not question_to_validate:
        raise ValueError("No valid question found for processing")
    
    # Validate question length
    if len(question_to_validate) > 5000:
        raise ValueError("Question is too long. Maximum 5,000 characters allowed.")
    
    if len(question_to_validate.strip()) < 1:
        raise ValueError("Question cannot be empty")


def validate_context_data(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and clean context data.
    
    Args:
        context: Context dictionary to validate
        
    Returns:
        dict: Cleaned context data
    """
    if not isinstance(context, dict):
        logger.warning("Context data is not a dictionary, using empty context")
        return {}
    
    # Ensure nested dictionaries exist
    if "content_analysis" not in context:
        context["content_analysis"] = {}
    
    # Validate content_analysis structure
    content_analysis = context["content_analysis"]
    if not isinstance(content_analysis, dict):
        context["content_analysis"] = {}
        content_analysis = context["content_analysis"]
    
    # Ensure key_topics is a list
    if "key_topics" in content_analysis and not isinstance(content_analysis["key_topics"], list):
        content_analysis["key_topics"] = []
    
    # Validate website_type
    valid_website_types = ["technical", "business", "educational", "news", "social", "entertainment", "general"]
    if "website_type" not in context or context["website_type"] not in valid_website_types:
        context["website_type"] = "general"
    
    return context


def validate_conversation_history(conversation_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validate and clean conversation history data.
    
    Args:
        conversation_history: List of conversation items
        
    Returns:
        list: Cleaned conversation history
    """
    if not isinstance(conversation_history, list):
        logger.warning("Conversation history is not a list, using empty history")
        return []
    
    cleaned_history = []
    
    for item in conversation_history:
        if isinstance(item, dict):
            # Ensure required fields exist
            if "type" in item and item["type"] in ["question", "response"]:
                cleaned_item = {
                    "type": item["type"],
                    "question": item.get("question", ""),
                    "response": item.get("response", ""),
                    "timestamp": item.get("timestamp")
                }
                cleaned_history.append(cleaned_item)
    
    # Limit to recent history to avoid token limits
    return cleaned_history[-20:]  # Keep last 20 items


def validate_model_selection(model: str) -> str:
    """
    Validate and normalize model selection.
    
    Args:
        model: Model name to validate
        
    Returns:
        str: Validated model name
    """
    valid_models = ["openai", "anthropic", "perplexity", "google", "grok", "auto"]
    
    if not isinstance(model, str):
        logger.warning("Model selection is not a string, using auto")
        return "auto"
    
    model = model.lower().strip()
    
    if model not in valid_models:
        logger.warning(f"Invalid model '{model}', using auto")
        return "auto"
    
    return model


def validate_selected_text(selected_text: str) -> str:
    """
    Validate and clean selected text.
    
    Args:
        selected_text: Text selected by user
        
    Returns:
        str: Cleaned selected text
    """
    if not isinstance(selected_text, str):
        return ""
    
    # Clean and limit selected text
    cleaned_text = selected_text.strip()
    
    # Limit to reasonable length to avoid token issues
    if len(cleaned_text) > 10000:
        cleaned_text = cleaned_text[:10000] + "... [text truncated]"
        logger.info("Selected text was truncated due to length")
    
    return cleaned_text


def sanitize_query_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize and validate all query data at once.
    
    Args:
        data: Raw request data
        
    Returns:
        dict: Sanitized data
    """
    sanitized = {}
    
    # Basic string fields
    sanitized["user_question"] = data.get("user_question", "").strip()
    sanitized["predefined_prompt"] = data.get("predefined_prompt")
    sanitized["selected_text"] = validate_selected_text(data.get("selected_text", ""))
    
    # Complex fields
    sanitized["context"] = validate_context_data(data.get("context", {}))
    sanitized["conversation_history"] = validate_conversation_history(data.get("conversation_history", []))
    sanitized["model"] = validate_model_selection(data.get("model", "auto"))
    
    # Boolean fields
    sanitized["enhance_prompt"] = bool(data.get("enhance_prompt", True))
    
    return sanitized 