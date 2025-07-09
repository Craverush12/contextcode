"""
Text analysis functionality for analyzing selected text content.
"""

import asyncio
import json
import re
from typing import Dict, Any
from ..core import ModelProvider
from .text_validators import validate_text_analysis, generate_basic_summary, extract_basic_topics
from ..logging.logger import get_logger

logger = get_logger(__name__)


class TextAnalyzer:
    """Handles text analysis using LLM and fallback methods."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def analyze_text(self, selected_text: str, page_title: str, page_url: str, context: dict) -> Dict[str, Any]:
        """
        Analyze selected text using LLM with fallback to basic analysis.
        
        Args:
            selected_text: The text to analyze
            page_title: Title of the page containing the text
            page_url: URL of the page
            context: Additional context information
            
        Returns:
            dict: Analysis results
        """
        try:
            # Try LLM analysis first
            llm_result = await self._analyze_with_llm(selected_text, page_title, page_url, context)
            logger.info(f"LLM text analysis successful: {llm_result.get('content_type', 'unknown')} content")
            return llm_result
        except Exception as e:
            logger.warning(f"LLM text analysis failed: {str(e)}")
            # Fallback to basic analysis
            return self._fallback_analysis(selected_text, page_title, context)
    
    async def _analyze_with_llm(self, selected_text: str, page_title: str, page_url: str, context: dict) -> Dict[str, Any]:
        """Use LLM to comprehensively analyze selected text content."""
        
        # Prepare context information
        context_info = f"""
        Page Title: {page_title}
        Page URL: {page_url}
        Website Type: {context.get('website_type', 'unknown')}
        Content Type: {context.get('content_type', 'unknown')}
        """.strip()
        
        # Create comprehensive system message for text analysis
        system_message = """
        You are an expert content analyst. Analyze the provided text and return a comprehensive analysis in JSON format.
        
        Return your analysis with these exact fields:
        {
            "summary": "A clear, concise 2-3 sentence summary of the main content and purpose",
            "key_topics": ["array of 3-7 main topics/themes identified in the text"],
            "sentiment": "one of: positive, negative, neutral, mixed",
            "complexity": "one of: basic, intermediate, advanced",
            "entities": ["array of important entities, names, organizations, technologies mentioned"],
            "content_type": "one of: informational, educational, promotional, opinion, news, technical, creative, analytical",
            "key_concepts": ["array of 3-6 main concepts or ideas discussed"],
            "reading_level": "one of: elementary, middle_school, high_school, college, graduate",
            "emotional_tone": "one of: optimistic, pessimistic, neutral, excited, concerned, analytical, persuasive, informative",
            "intent": "one of: inform, persuade, educate, entertain, sell, explain, argue, describe",
            "target_audience": "description of the intended audience",
            "actionable_insights": ["array of 2-4 practical takeaways or insights"],
            "credibility_indicators": ["array of elements that suggest credibility or lack thereof"],
            "bias_assessment": "assessment of any potential bias in the content"
        }
        
        Guidelines:
        - Keep summaries focused and informative
        - Extract only the most relevant topics and concepts
        - Be accurate with sentiment and emotional tone assessment
        - Consider the context (page title, URL, website type) in your analysis
        - Provide practical, actionable insights where possible
        - Assess credibility based on evidence, sources, and writing quality
        - Identify any potential bias objectively
        """
        
        # Create analysis prompt
        analysis_prompt = f"""
        Analyze this selected text and provide comprehensive insights:
        
        CONTEXT:
        {context_info}
        
        SELECTED TEXT:
        {selected_text}
        
        Provide a thorough analysis considering the context and content. Focus on extracting meaningful insights that would be valuable for understanding and processing this content.
        """
        
        # Get analysis from LLM with timeout
        llm_response = await asyncio.wait_for(
            self.model_provider.get_response(analysis_prompt, system_message=system_message),
            timeout=8.0  # Longer timeout for comprehensive analysis
        )
        
        # Parse JSON response
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                llm_response = json_match.group(0)
            
            llm_analysis = json.loads(llm_response)
            
            # Validate and clean the response
            validated_result = validate_text_analysis(llm_analysis, selected_text)
            
            return validated_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse LLM analysis response: {str(e)}")
            logger.debug(f"Raw LLM response: {llm_response}")
            
            # Fallback to basic analysis
            raise ValueError("Failed to parse LLM response")
    
    def _fallback_analysis(self, selected_text: str, page_title: str, context: dict) -> Dict[str, Any]:
        """Fallback analysis when LLM fails."""
        
        # Basic sentiment analysis
        positive_words = ["good", "great", "excellent", "amazing", "wonderful", "fantastic", "best", "love", "successful"]
        negative_words = ["bad", "terrible", "awful", "worst", "hate", "fail", "problem", "issue", "concern"]
        
        text_lower = selected_text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = "positive"
        elif negative_count > positive_count:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        # Basic complexity assessment
        avg_word_length = sum(len(word) for word in selected_text.split()) / len(selected_text.split()) if selected_text.split() else 0
        complexity = "advanced" if avg_word_length > 6 else "intermediate" if avg_word_length > 4 else "basic"
        
        return {
            "summary": generate_basic_summary(selected_text),
            "key_topics": extract_basic_topics(selected_text),
            "sentiment": sentiment,
            "complexity": complexity,
            "entities": [],
            "content_type": "informational",
            "key_concepts": extract_basic_topics(selected_text),
            "reading_level": "college",
            "emotional_tone": "neutral",
            "intent": "inform",
            "target_audience": "general audience",
            "actionable_insights": ["Review the content for key information"],
            "credibility_indicators": ["Content analysis completed with basic methods"],
            "bias_assessment": "Unable to assess bias with fallback analysis"
        } 