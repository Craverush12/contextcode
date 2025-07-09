"""
Follow-up suggestions generation functionality for creating contextual follow-up suggestions.
"""

import asyncio
import json
import re
from typing import Dict, Any, List
from fastapi import Request
from fastapi.responses import JSONResponse
from ..core import ModelProvider
from ..logging.logger import get_logger

logger = get_logger(__name__)


class FollowUpSuggestionsGenerator:
    """Handles contextual follow-up suggestion generation using LLM and fallback methods."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def process_request(self, request: Request) -> JSONResponse:
        """
        Process follow-up suggestions generation request from FastAPI endpoint.
        
        Args:
            request: FastAPI request object
            
        Returns:
            JSONResponse: Follow-up suggestions generation results
        """
        try:
            # Parse request data
            data = await request.json()
            ai_response = data.get("ai_response", "").strip()
            original_question = data.get("original_question", "").strip()
            conversation_context = data.get("conversation_context", {})
            
            # Validate input
            if not ai_response:
                return JSONResponse(
                    status_code=400,
                    content={"error": "ai_response is required"}
                )
            
            if not original_question:
                return JSONResponse(
                    status_code=400,
                    content={"error": "original_question is required"}
                )
            
            # Validate response length
            if len(ai_response) > 10000:
                return JSONResponse(
                    status_code=400,
                    content={"error": "ai_response is too long. Maximum 10,000 characters allowed."}
                )
            
            # Generate follow-up suggestions using LLM
            suggestions_result = await self.generate_suggestions_with_llm(
                ai_response, original_question, conversation_context
            )
            
            logger.info(f"Generated {len(suggestions_result['recommendations'])} follow-up suggestions")
            
            return JSONResponse(content={
                "success": True,
                "data": suggestions_result
            })
            
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid JSON format in request body"}
            )
        except Exception as e:
            logger.exception("Error generating follow-up suggestions", exception_type=type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to generate suggestions: {str(e)}"}
            )
    
    async def generate_suggestions_with_llm(self, ai_response: str, original_question: str, conversation_context: dict) -> dict:
        """Use LLM to generate categorized follow-up suggestions."""
        
        # Prepare context information
        previous_questions = conversation_context.get("previous_questions", [])
        conversation_history = conversation_context.get("conversation_history", [])
        user_preferences = conversation_context.get("user_preferences", {})
        
        context_info = f"""
        Original Question: {original_question}
        Previous Questions: {', '.join(previous_questions[-3:]) if previous_questions else 'None'}
        Conversation Length: {len(conversation_history)} exchanges
        User Preferences: {user_preferences if user_preferences else 'Not specified'}
        """.strip()
        
        # Create system message for suggestion generation
        system_message = """
        You are an expert at generating contextual follow-up suggestions. Analyze the AI response and conversation context to generate relevant follow-up questions categorized by type.
        
        Return your analysis in JSON format with these exact fields:
        {
            "recommendations": ["array of 4-6 follow-up questions"],
            "categories": {
                "practical": ["questions about implementation, how-to steps, tools, actionable advice"],
                "guidance": ["questions seeking recommendations, best practices, expert advice, decision-making help"],
                "deep_dive": ["questions seeking more detailed explanations, technical details, examples, comprehensive analysis"]
            }
        }
        
        Guidelines for Suggestion Generation:
        - Generate 4-6 high-quality, specific follow-up questions
        - Make questions natural progressions from the AI response
        - Avoid repeating previous questions or very similar ones
        - Focus on valuable next steps and deeper exploration
        - Categorize each question appropriately:
          * practical: Implementation-focused, actionable, tool-oriented
          * guidance: Advisory, strategic, recommendation-seeking
          * deep_dive: Analytical, detailed, exploratory
        - Ensure questions are clear, specific, and engaging
        - Consider gaps in the AI response that users might want filled
        
        Quality Criteria:
        - Each question should add value to the conversation
        - Questions should feel like natural follow-ups a human would ask
        - Avoid generic or overly broad questions
        - Make questions specific to the content of the AI response
        """
        
        # Create suggestion generation prompt
        generation_prompt = f"""
        Generate contextual follow-up suggestions based on this AI response:
        
        AI RESPONSE:
        {ai_response}
        
        CONTEXT:
        {context_info}
        
        Generate follow-up questions that would help the user get more value from this conversation. Focus on practical next steps, additional guidance, and deeper exploration of relevant topics mentioned in the response.
        """
        
        try:
            # Get suggestions from LLM with timeout
            llm_response = await asyncio.wait_for(
                self.model_provider.get_response(generation_prompt, system_message=system_message),
                timeout=12.0
            )
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
                if json_match:
                    llm_response = json_match.group(0)
                
                llm_suggestions = json.loads(llm_response)
                
                # Validate and clean the response
                validated_result = self.validate_suggestions_response(
                    llm_suggestions, ai_response, original_question, previous_questions
                )
                
                logger.info(f"LLM suggestion generation successful: {len(validated_result['recommendations'])} suggestions")
                return validated_result
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse LLM suggestions response: {str(e)}")
                logger.debug(f"Raw LLM response: {llm_response}")
                
                # Fallback to basic suggestion generation
                return self.fallback_suggestions_generation(ai_response, original_question, conversation_context)
        
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"LLM suggestion generation failed: {str(e)}")
            return self.fallback_suggestions_generation(ai_response, original_question, conversation_context)

    def validate_suggestions_response(self, llm_result: dict, ai_response: str, original_question: str, previous_questions: list) -> dict:
        """Validate and clean LLM suggestion generation results."""
        
        # Initialize result with defaults
        result = {
            "recommendations": [],
            "categories": {
                "practical": [],
                "guidance": [],
                "deep_dive": []
            }
        }
        
        # Validate recommendations array
        if "recommendations" in llm_result and isinstance(llm_result["recommendations"], list):
            validated_questions = []
            
            for question in llm_result["recommendations"]:
                if isinstance(question, str) and question.strip():
                    clean_question = question.strip()
                    
                    # Ensure it's a proper question
                    if not clean_question.endswith('?'):
                        clean_question += '?'
                    
                    # Check for duplicates and similarity to previous questions
                    if not self.is_duplicate_question(clean_question, validated_questions + previous_questions):
                        # Basic quality check
                        if len(clean_question) > 10 and len(clean_question.split()) >= 3:
                            validated_questions.append(clean_question)
            
            result["recommendations"] = validated_questions[:6]  # Limit to 6 questions
        
        # Validate categories
        if "categories" in llm_result and isinstance(llm_result["categories"], dict):
            for category in ["practical", "guidance", "deep_dive"]:
                if category in llm_result["categories"] and isinstance(llm_result["categories"][category], list):
                    category_questions = []
                    for q in llm_result["categories"][category]:
                        if isinstance(q, str) and q.strip():
                            clean_q = q.strip()
                            if not clean_q.endswith('?'):
                                clean_q += '?'
                            # Check if this question is in our validated recommendations
                            if any(self.is_similar_question(clean_q, rec) for rec in result["recommendations"]):
                                category_questions.append(clean_q)
                    
                    result["categories"][category] = category_questions
        
        # Ensure we have at least some questions
        if not result["recommendations"]:
            result["recommendations"] = self.generate_basic_suggestions(ai_response, original_question)
            
            # Distribute basic questions into categories
            basic_questions = result["recommendations"]
            if len(basic_questions) >= 3:
                result["categories"]["practical"] = [basic_questions[0]] if basic_questions else []
                result["categories"]["guidance"] = [basic_questions[1]] if len(basic_questions) > 1 else []
                result["categories"]["deep_dive"] = [basic_questions[2]] if len(basic_questions) > 2 else []
        
        return result

    def generate_basic_suggestions(self, ai_response: str, original_question: str) -> list:
        """Generate basic follow-up suggestions when LLM fails."""
        
        suggestions = []
        response_lower = ai_response.lower()
        
        # Template-based suggestion generation
        if any(word in response_lower for word in ["step", "process", "method", "approach"]):
            suggestions.append("Can you walk me through the specific steps in more detail?")
        
        if any(word in response_lower for word in ["tool", "software", "platform", "service"]):
            suggestions.append("What tools would you recommend for implementing this?")
        
        if any(word in response_lower for word in ["example", "instance", "case"]):
            suggestions.append("Could you provide more concrete examples?")
        
        if any(word in response_lower for word in ["benefit", "advantage", "good", "positive"]):
            suggestions.append("What are the potential challenges or drawbacks I should consider?")
        
        if any(word in response_lower for word in ["cost", "price", "budget", "expensive"]):
            suggestions.append("What would be a realistic budget for this?")
        
        if any(word in response_lower for word in ["time", "duration", "long", "quick"]):
            suggestions.append("What's a realistic timeline for getting results?")
        
        # Generic fallbacks if no specific patterns found
        if not suggestions:
            suggestions = [
                "What would be the best first step to get started?",
                "Are there any common mistakes I should avoid?",
                "How can I measure success with this approach?",
                "What additional resources would you recommend?"
            ]
        
        return suggestions[:6]  # Limit to 6 questions

    def fallback_suggestions_generation(self, ai_response: str, original_question: str, conversation_context: dict) -> dict:
        """Fallback suggestion generation when LLM fails."""
        
        # Generate basic suggestions
        questions = self.generate_basic_suggestions(ai_response, original_question)
        
        # Basic categorization
        categories = {
            "practical": [],
            "guidance": [],
            "deep_dive": []
        }
        
        # Simple categorization based on keywords
        for question in questions:
            question_lower = question.lower()
            
            if any(word in question_lower for word in ["step", "implement", "tool", "how", "what", "start"]):
                categories["practical"].append(question)
            elif any(word in question_lower for word in ["recommend", "best", "should", "advice", "avoid"]):
                categories["guidance"].append(question)
            elif any(word in question_lower for word in ["detail", "example", "explain", "why", "measure"]):
                categories["deep_dive"].append(question)
            else:
                # Default to practical if no clear category
                categories["practical"].append(question)
        
        return {
            "recommendations": questions,
            "categories": categories
        }

    def is_duplicate_question(self, question: str, existing_questions: list) -> bool:
        """Check if a question is a duplicate of existing questions."""
        if not existing_questions:
            return False
        
        question_lower = question.lower().strip()
        question_words = set(question_lower.split())
        
        for existing in existing_questions:
            existing_lower = existing.lower().strip()
            existing_words = set(existing_lower.split())
            
            # Exact match
            if question_lower == existing_lower:
                return True
            
            # High word overlap (80% or more)
            if question_words and existing_words:
                overlap = len(question_words.intersection(existing_words))
                similarity = overlap / len(question_words.union(existing_words))
                if similarity > 0.8:
                    return True
        
        return False

    def is_similar_question(self, question1: str, question2: str, threshold: float = 0.7) -> bool:
        """Check if two questions are similar enough to be considered the same."""
        q1_lower = question1.lower().strip()
        q2_lower = question2.lower().strip()
        
        # Exact match
        if q1_lower == q2_lower:
            return True
        
        # Word overlap similarity
        q1_words = set(q1_lower.split())
        q2_words = set(q2_lower.split())
        
        if q1_words and q2_words:
            overlap = len(q1_words.intersection(q2_words))
            similarity = overlap / len(q1_words.union(q2_words))
            return similarity >= threshold
        
        return False 