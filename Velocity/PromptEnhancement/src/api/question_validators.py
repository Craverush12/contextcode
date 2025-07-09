"""
Question validation utilities for cleaning and validating LLM responses.
"""

from typing import Dict, Any, List
from ..logging.logger import get_logger

logger = get_logger(__name__)


def validate_questions_response(llm_result: Dict[str, Any], selected_text: str, 
                              content_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean LLM question generation results."""
    
    # Define valid values
    valid_models = ["openai", "anthropic", "perplexity", "google", "grok"]
    valid_categories = ["analysis", "guidance", "learning", "comparison", "creative", "technical", "business", "research"]
    valid_difficulties = ["beginner", "intermediate", "advanced"]
    valid_strategies = ["content_based", "topic_focused", "interest_driven", "balanced"]
    
    # Initialize result with defaults
    result = {
        "questions": [],
        "context_relevance": 0.5,
        "total_questions": 0,
        "generation_strategy": "content_based"
    }
    
    # Validate questions array
    if "questions" in llm_result and isinstance(llm_result["questions"], list):
        validated_questions = []
        
        for q in llm_result["questions"]:
            if isinstance(q, dict) and "text" in q:
                # Validate each question
                question = {
                    "text": q.get("text", "").strip(),
                    "model": q.get("model", "openai"),
                    "icon": q.get("icon", "❓"),
                    "category": q.get("category", "analysis"),
                    "difficulty": q.get("difficulty", "intermediate"),
                    "estimated_response_time": 30,
                    "reasoning": q.get("reasoning", "Default model selection")
                }
                
                # Validate and clean fields
                if question["text"] and len(question["text"]) > 5:
                    # Validate model
                    if question["model"] not in valid_models:
                        question["model"] = "openai"
                    
                    # Validate category
                    if question["category"] not in valid_categories:
                        question["category"] = "analysis"
                    
                    # Validate difficulty
                    if question["difficulty"] not in valid_difficulties:
                        question["difficulty"] = "intermediate"
                    
                    # Validate estimated response time
                    try:
                        response_time = int(q.get("estimated_response_time", 30))
                        question["estimated_response_time"] = max(15, min(120, response_time))
                    except (ValueError, TypeError):
                        question["estimated_response_time"] = 30
                    
                    # Validate icon (ensure it's a single character)
                    icon = question["icon"]
                    if not icon or len(icon) != 1:
                        question["icon"] = get_default_icon(question["category"])
                    
                    # Clean reasoning
                    if isinstance(question["reasoning"], str) and question["reasoning"].strip():
                        question["reasoning"] = question["reasoning"].strip()
                    else:
                        question["reasoning"] = f"Selected {question['model']} for {question['category']} task"
                    
                    validated_questions.append(question)
        
        result["questions"] = validated_questions[:5]  # Limit to 5 questions
    
    # Validate other fields
    if "context_relevance" in llm_result:
        try:
            relevance = float(llm_result["context_relevance"])
            result["context_relevance"] = max(0.0, min(1.0, relevance))
        except (ValueError, TypeError):
            result["context_relevance"] = calculate_basic_relevance(selected_text, content_analysis)
    
    if "generation_strategy" in llm_result:
        strategy = llm_result["generation_strategy"]
        if strategy in valid_strategies:
            result["generation_strategy"] = strategy
    
    # Set total questions count
    result["total_questions"] = len(result["questions"])
    
    # Ensure minimum quality
    if not result["questions"]:
        logger.warning("No valid questions found in LLM response")
        raise ValueError("No valid questions generated")
    
    return result


def validate_question_input(selected_text: str, **kwargs) -> None:
    """Validate input parameters for question generation."""
    
    if not selected_text or not selected_text.strip():
        raise ValueError("Selected text is required")
    
    # Validate text length
    if len(selected_text) < 10:
        raise ValueError("Selected text is too short for meaningful question generation")
    
    if len(selected_text) > 8000:
        raise ValueError("Selected text is too long. Maximum 8,000 characters allowed.")


def get_default_icon(category: str) -> str:
    """Get default icon for a category."""
    icon_mapping = {
        "analysis": "📊",
        "guidance": "🚀",
        "learning": "📚",
        "comparison": "⚖️",
        "creative": "🎨",
        "technical": "🔧",
        "business": "💼",
        "research": "🔍"
    }
    return icon_mapping.get(category, "❓")


def calculate_basic_relevance(selected_text: str, content_analysis: Dict[str, Any]) -> float:
    """Calculate basic relevance score."""
    # Simple relevance calculation based on content length and analysis
    text_length = len(selected_text)
    has_analysis = bool(content_analysis.get("key_topics"))
    
    base_score = 0.4
    if text_length > 100:
        base_score += 0.2
    if text_length > 500:
        base_score += 0.1
    if has_analysis:
        base_score += 0.2
    
    return min(base_score, 1.0) 