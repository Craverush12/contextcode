"""
Question generation functionality for creating contextual questions from content.
"""

import asyncio
import json
import re
from typing import Dict, Any, List
from ..core import ModelProvider
from .question_validators import validate_questions_response
from ..logging.logger import get_logger

logger = get_logger(__name__)


class QuestionGenerator:
    """Handles contextual question generation using LLM and fallback methods."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def generate_questions(self, selected_text: str, website_type: str, 
                               content_analysis: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate contextual questions using LLM with fallback to basic generation.
        
        Args:
            selected_text: The text to generate questions from
            website_type: Type of website (technical, business, etc.)
            content_analysis: Analysis results of the content
            user_context: User preferences and previous questions
            
        Returns:
            dict: Question generation results
        """
        try:
            # Try LLM generation first
            llm_result = await self._generate_with_llm(selected_text, website_type, content_analysis, user_context)
            logger.info(f"LLM question generation successful: {len(llm_result['questions'])} questions")
            return llm_result
        except Exception as e:
            logger.warning(f"LLM question generation failed: {str(e)}")
            # Fallback to basic generation
            return self._fallback_generation(selected_text, website_type, content_analysis, user_context)
    
    async def _generate_with_llm(self, selected_text: str, website_type: str, 
                               content_analysis: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to generate contextual questions with optimal model routing."""
        
        # Prepare context information
        key_topics = content_analysis.get("key_topics", [])
        complexity = content_analysis.get("complexity", "intermediate")
        content_type = content_analysis.get("content_type", "informational")
        previous_questions = user_context.get("previous_questions", [])
        interests = user_context.get("interests", [])
        
        context_info = f"""
        Website Type: {website_type}
        Content Complexity: {complexity}
        Content Type: {content_type}
        Key Topics: {', '.join(key_topics) if key_topics else 'Not specified'}
        User Interests: {', '.join(interests) if interests else 'Not specified'}
        Previous Questions: {len(previous_questions)} questions already generated
        """.strip()
        
        # Create comprehensive system message for question generation
        system_message = """
        You are an expert question generator and AI model router. Generate contextual questions based on the provided content and suggest the optimal AI model for each question.
        
        Return your analysis in JSON format with these exact fields:
        {
            "questions": [
                {
                    "text": "Clear, engaging question text",
                    "model": "one of: openai, anthropic, perplexity, google, grok",
                    "icon": "relevant emoji (single character)",
                    "category": "one of: analysis, guidance, learning, comparison, creative, technical, business, research",
                    "difficulty": "one of: beginner, intermediate, advanced",
                    "estimated_response_time": 15-120 (seconds),
                    "reasoning": "brief explanation for model choice"
                }
            ],
            "context_relevance": 0.0-1.0,
            "total_questions": number_of_questions,
            "generation_strategy": "one of: content_based, topic_focused, interest_driven, balanced"
        }
        
        Guidelines for Question Generation:
        - Generate 3-5 high-quality, relevant questions
        - Make questions specific and actionable
        - Avoid duplicate or very similar questions
        - Consider user interests and content complexity
        - Vary question types (analysis, guidance, learning, etc.)
        
        Guidelines for Model Selection:
        - openai: Technical analysis, coding, structured thinking, complex reasoning
        - anthropic: Creative writing, ethical discussions, nuanced analysis, explanations
        - perplexity: Research, current events, fact-checking, data gathering
        - google: General knowledge, educational content, broad topics
        - grok: Casual conversations, trending topics, social insights
        
        Guidelines for Metadata:
        - Icons should be relevant and engaging (💰🚀🎯📊💡🔍📈🎨🔧📚)
        - Difficulty based on question complexity and required knowledge
        - Response time: beginner (15-30s), intermediate (30-60s), advanced (60-120s)
        - Categories should match question intent
        """
        
        # Create question generation prompt
        generation_prompt = f"""
        Generate contextual questions based on this content and context:
        
        CONTENT:
        {selected_text}
        
        CONTEXT:
        {context_info}
        
        Generate questions that would be valuable for someone reading this content. Consider the user's interests and the content's complexity level. Ensure questions are diverse, engaging, and match the content's purpose.
        """
        
        # Get questions from LLM with timeout
        llm_response = await asyncio.wait_for(
            self.model_provider.get_response(generation_prompt, system_message=system_message),
            timeout=10.0  # Longer timeout for question generation
        )
        
        # Parse JSON response
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                llm_response = json_match.group(0)
            
            llm_questions = json.loads(llm_response)
            
            # Validate and clean the response
            validated_result = validate_questions_response(llm_questions, selected_text, content_analysis)
            
            return validated_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse LLM questions response: {str(e)}")
            logger.debug(f"Raw LLM response: {llm_response}")
            
            # Fallback to basic question generation
            raise ValueError("Failed to parse LLM response")
    
    def _fallback_generation(self, selected_text: str, website_type: str, 
                           content_analysis: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback question generation when LLM fails."""
        
        # Generate basic questions
        questions = self._generate_basic_questions(selected_text, content_analysis)
        
        # Calculate basic relevance
        relevance = self._calculate_basic_relevance(selected_text, content_analysis)
        
        return {
            "questions": questions,
            "context_relevance": relevance,
            "total_questions": len(questions),
            "generation_strategy": "fallback"
        }
    
    def _generate_basic_questions(self, selected_text: str, content_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate basic questions when LLM fails."""
        key_topics = content_analysis.get("key_topics", [])
        complexity = content_analysis.get("complexity", "intermediate")
        
        questions = []
        
        # Basic question templates based on content
        if key_topics:
            questions.append({
                "text": f"What are the key insights about {key_topics[0] if key_topics else 'this topic'}?",
                "model": "openai",
                "icon": "💡",
                "category": "analysis",
                "difficulty": complexity,
                "estimated_response_time": 30,
                "reasoning": "General analysis question"
            })
        
        questions.append({
            "text": "How can this information be applied practically?",
            "model": "anthropic",
            "icon": "🎯",
            "category": "guidance",
            "difficulty": complexity,
            "estimated_response_time": 45,
            "reasoning": "Practical application question"
        })
        
        if "business" in ' '.join(key_topics).lower():
            questions.append({
                "text": "What are the potential business implications?",
                "model": "openai",
                "icon": "💼",
                "category": "business",
                "difficulty": "intermediate",
                "estimated_response_time": 40,
                "reasoning": "Business-focused analysis"
            })
        
        return questions
    
    def _calculate_basic_relevance(self, selected_text: str, content_analysis: Dict[str, Any]) -> float:
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