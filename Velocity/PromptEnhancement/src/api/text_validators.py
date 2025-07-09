"""
Validation and utility functions for text analysis.
"""

from typing import Dict, Any, List


def validate_text_analysis_input(data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate input data for text analysis.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    selected_text = data.get("selected_text", "").strip()
    
    if not selected_text:
        return False, "Selected text is required"
    
    if len(selected_text) < 10:
        return False, "Selected text is too short for meaningful analysis"
    
    if len(selected_text) > 10000:
        return False, "Selected text is too long. Maximum 10,000 characters allowed."
    
    return True, ""


def validate_text_analysis(llm_result: Dict[str, Any], selected_text: str) -> Dict[str, Any]:
    """Validate and clean LLM text analysis results."""
    
    # Define valid values for each field
    valid_values = {
        "sentiment": ["positive", "negative", "neutral", "mixed"],
        "complexity": ["basic", "intermediate", "advanced"],
        "content_type": ["informational", "educational", "promotional", "opinion", "news", "technical", "creative", "analytical"],
        "reading_level": ["elementary", "middle_school", "high_school", "college", "graduate"],
        "emotional_tone": ["optimistic", "pessimistic", "neutral", "excited", "concerned", "analytical", "persuasive", "informative"],
        "intent": ["inform", "persuade", "educate", "entertain", "sell", "explain", "argue", "describe"]
    }
    
    # Initialize result with defaults
    result = {
        "summary": "Text analysis summary not available",
        "key_topics": [],
        "sentiment": "neutral",
        "complexity": "intermediate",
        "entities": [],
        "content_type": "informational",
        "key_concepts": [],
        "reading_level": "college",
        "emotional_tone": "neutral",
        "intent": "inform",
        "target_audience": "general audience",
        "actionable_insights": [],
        "credibility_indicators": [],
        "bias_assessment": "No significant bias detected"
    }
    
    # Validate and update each field
    for field, default_value in result.items():
        if field in llm_result:
            value = llm_result[field]
            
            if field in ["summary", "target_audience", "bias_assessment"]:
                # Text fields - keep as-is if string
                if isinstance(value, str) and value.strip():
                    result[field] = value.strip()
                    
            elif field in ["key_topics", "entities", "key_concepts", "actionable_insights", "credibility_indicators"]:
                # Array fields - validate and limit size
                if isinstance(value, list):
                    # Filter out empty strings and limit array size
                    filtered_array = [item for item in value if isinstance(item, str) and item.strip()]
                    max_items = 7 if field == "key_topics" else 6
                    result[field] = filtered_array[:max_items]
                    
            elif field in valid_values:
                # Validate against allowed values
                if value in valid_values[field]:
                    result[field] = value
                    
    # Post-processing: ensure we have some content
    if not result["summary"] or result["summary"] == "Text analysis summary not available":
        result["summary"] = generate_basic_summary(selected_text)
    
    if not result["key_topics"]:
        result["key_topics"] = extract_basic_topics(selected_text)
    
    return result


def generate_basic_summary(text: str) -> str:
    """Generate a basic summary when LLM fails."""
    # Simple extractive summary - take first sentence and key information
    sentences = text.split('.')
    if sentences:
        first_sentence = sentences[0].strip()
        if len(first_sentence) > 10:
            return f"{first_sentence}. This text discusses various topics and concepts."
    
    return "This text contains information on various topics and themes."


def extract_basic_topics(text: str) -> List[str]:
    """Extract basic topics using keyword analysis when LLM fails."""
    import re
    
    # Common topic indicators
    text_lower = text.lower()
    
    topics = []
    
    # Technology topics
    tech_keywords = ["ai", "artificial intelligence", "technology", "software", "digital", "automation"]
    if any(keyword in text_lower for keyword in tech_keywords):
        topics.append("technology")
    
    # Business topics
    business_keywords = ["business", "money", "profit", "income", "revenue", "marketing", "sales"]
    if any(keyword in text_lower for keyword in business_keywords):
        topics.append("business")
    
    # Education topics
    edu_keywords = ["learn", "education", "tutorial", "guide", "course", "training"]
    if any(keyword in text_lower for keyword in edu_keywords):
        topics.append("education")
    
    # Default topics if none found
    if not topics:
        topics = ["general", "information"]
    
    return topics[:5]  # Limit to 5 topics 