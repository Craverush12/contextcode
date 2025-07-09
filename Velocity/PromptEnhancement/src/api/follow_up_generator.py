"""
Follow-up question generation functionality for creating contextual follow-up questions.
"""

import asyncio
import json
import re
from typing import Dict, Any, List
from fastapi import Request
from fastapi.responses import JSONResponse
from ..core import ModelProvider
from ..logging.logger import get_logger
from .models import FollowUpRequest, FollowUpResponse, FollowUpData

logger = get_logger(__name__)


class FollowUpGenerator:
    """Handles contextual follow-up question generation using LLM and fallback methods."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def process_request(self, request: Request) -> JSONResponse:
        """
        Process follow-up generation request from FastAPI endpoint.
        
        Args:
            request: FastAPI request object
            
        Returns:
            JSONResponse: Follow-up generation results
        """
        try:
            # Parse request data
            data = await request.json()
            ai_response = data.get("ai_response", "").strip()
            original_question = data.get("original_question", "").strip()
            selected_text = data.get("selected_text", "")
            conversation_context = data.get("conversation_context", {})
            
            # Validate input
            if not ai_response:
                return JSONResponse(
                    status_code=400,
                    content={"error": "AI response is required"}
                )
            
            if not original_question:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Original question is required"}
                )
            
            # Validate response length
            if len(ai_response) > 8000:
                return JSONResponse(
                    status_code=400,
                    content={"error": "AI response is too long. Maximum 8,000 characters allowed."}
                )
            
            # Generate follow-up questions
            followup_result = await self.generate_follow_ups(
                ai_response, original_question, selected_text, conversation_context
            )
            
            logger.info(f"Generated {len(followup_result['recommendations'])} follow-up questions")
            
            return JSONResponse(content={
                "success": True,
                "data": followup_result
            })
            
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid JSON format in request body"}
            )
        except Exception as e:
            logger.exception("Error generating follow-up questions", exception_type=type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to generate follow-ups: {str(e)}"}
            )
    
    async def generate_follow_ups(self, ai_response: str, original_question: str, 
                                selected_text: str, conversation_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate contextual follow-up questions using LLM with fallback to basic generation."""
        try:
            # Try LLM generation first
            llm_result = await self._generate_with_llm(ai_response, original_question, selected_text, conversation_context)
            logger.info(f"LLM follow-up generation successful: {len(llm_result['recommendations'])} questions")
            return llm_result
        except Exception as e:
            logger.warning(f"LLM follow-up generation failed: {str(e)}")
            # Fallback to basic generation
            return self._fallback_generation(ai_response, original_question, conversation_context)
    
    async def _generate_with_llm(self, ai_response: str, original_question: str, 
                               selected_text: str, conversation_context: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to generate contextual follow-up questions."""
        
        # Prepare context information
        previous_questions = conversation_context.get("previous_questions", [])
        user_interests = conversation_context.get("user_interests", [])
        
        context_info = f"""
        Original Question: {original_question}
        Selected Text: {selected_text[:500] + '...' if len(selected_text) > 500 else selected_text}
        Previous Questions: {', '.join(previous_questions[-3:]) if previous_questions else 'None'}
        User Interests: {', '.join(user_interests) if user_interests else 'Not specified'}
        """.strip()
        
        # Create comprehensive system message for follow-up generation
        system_message = """
        You are an expert at generating contextual follow-up questions. Analyze the AI response and conversation context to generate relevant, engaging follow-up questions.
        
        Return your analysis in JSON format with these exact fields:
        {
            "recommendations": ["array of 4-6 follow-up questions"],
            "context_score": 0.0-1.0,
            "generation_strategy": "one of: response_based, interest_driven, conversation_flow, comprehensive",
            "categories": {
                "practical": ["questions about implementation/how-to"],
                "guidance": ["questions seeking advice/recommendations"], 
                "timeline": ["questions about timing/duration"],
                "comparison": ["questions comparing options/alternatives"],
                "deep_dive": ["questions seeking more detail on specific aspects"],
                "next_steps": ["questions about what to do next"],
                "challenges": ["questions about potential problems/obstacles"]
            }
        }
        
        Guidelines for Follow-up Generation:
        - Generate 4-6 high-quality, specific follow-up questions
        - Make questions natural progressions from the AI response
        - Avoid repeating previous questions or very similar ones
        - Focus on gaps in information or logical next steps
        - Consider user interests when mentioned
        - Make questions actionable and specific
        - Distribute questions across different categories when possible
        """
        
        # Create follow-up generation prompt
        generation_prompt = f"""
        Generate contextual follow-up questions based on this AI response and context:
        
        AI RESPONSE:
        {ai_response}
        
        CONTEXT:
        {context_info}
        
        Generate follow-up questions that would be valuable and natural next questions someone would ask after receiving this response.
        """
        
        # Get follow-ups from LLM with timeout
        llm_response = await asyncio.wait_for(
            self.model_provider.get_response(generation_prompt, system_message=system_message),
            timeout=12.0
        )
        
        # Parse JSON response
        try:
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                llm_response = json_match.group(0)
            
            llm_followups = json.loads(llm_response)
            
            # Validate and clean the response
            validated_result = self._validate_response(llm_followups, ai_response, original_question, 
                                                     conversation_context.get("previous_questions", []))
            
            return validated_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse LLM follow-up response: {str(e)}")
            raise ValueError("Failed to parse LLM response")
    
    def _validate_response(self, llm_result: dict, ai_response: str, original_question: str, 
                         previous_questions: list) -> dict:
        """Validate and clean LLM follow-up generation results."""
        
        valid_strategies = ["response_based", "interest_driven", "conversation_flow", "comprehensive"]
        valid_categories = ["practical", "guidance", "timeline", "comparison", "deep_dive", "next_steps", "challenges"]
        
        result = {
            "recommendations": [],
            "context_score": 0.5,
            "generation_strategy": "response_based",
            "categories": {category: [] for category in valid_categories}
        }
        
        # Validate recommendations array
        if "recommendations" in llm_result and isinstance(llm_result["recommendations"], list):
            validated_questions = []
            
            for question in llm_result["recommendations"]:
                if isinstance(question, str) and question.strip():
                    clean_question = question.strip()
                    
                    if not clean_question.endswith('?'):
                        clean_question += '?'
                    
                    if not self._is_duplicate_question(clean_question, validated_questions + previous_questions):
                        if len(clean_question) > 10 and len(clean_question.split()) >= 3:
                            validated_questions.append(clean_question)
            
            result["recommendations"] = validated_questions[:6]
        
        # Validate other fields
        if "context_score" in llm_result:
            try:
                score = float(llm_result["context_score"])
                result["context_score"] = max(0.0, min(1.0, score))
            except (ValueError, TypeError):
                result["context_score"] = self._calculate_basic_context_score(ai_response, result["recommendations"])
        
        if "generation_strategy" in llm_result and llm_result["generation_strategy"] in valid_strategies:
            result["generation_strategy"] = llm_result["generation_strategy"]
        
        # Ensure we have at least some questions
        if not result["recommendations"]:
            result["recommendations"] = self._generate_basic_followups(ai_response, original_question)
            result["context_score"] = 0.3
            result["generation_strategy"] = "fallback"
        
        return result
    
    def _is_duplicate_question(self, question: str, existing_questions: list) -> bool:
        """Check if a question is too similar to existing questions."""
        question_lower = question.lower()
        question_words = set(question_lower.split())
        
        for existing in existing_questions:
            existing_lower = existing.lower()
            existing_words = set(existing_lower.split())
            
            overlap = len(question_words.intersection(existing_words))
            total_unique = len(question_words.union(existing_words))
            
            if total_unique > 0:
                similarity = overlap / total_unique
                if similarity > 0.7:
                    return True
        
        return False

    def _calculate_basic_context_score(self, ai_response: str, questions: list) -> float:
        """Calculate basic context score based on response and questions."""
        if not questions:
            return 0.3
        
        response_words = set(ai_response.lower().split())
        relevance_scores = []
        
        for question in questions:
            question_words = set(question.lower().split())
            if response_words and question_words:
                overlap = len(response_words.intersection(question_words))
                relevance = overlap / len(question_words) if question_words else 0
                relevance_scores.append(relevance)
        
        if relevance_scores:
            avg_relevance = sum(relevance_scores) / len(relevance_scores)
            return 0.4 + (avg_relevance * 0.5)
        
        return 0.5

    def _generate_basic_followups(self, ai_response: str, original_question: str) -> list:
        """Generate basic follow-up questions when LLM fails."""
        
        followups = []
        response_lower = ai_response.lower()
        
        if any(word in response_lower for word in ["cost", "price", "money", "dollar", "budget"]):
            followups.append("What are the typical costs involved?")
        
        if any(word in response_lower for word in ["time", "duration", "quick", "long"]):
            followups.append("How long does this typically take?")
        
        if any(word in response_lower for word in ["tool", "software", "platform", "app"]):
            followups.append("What tools would you recommend for beginners?")
        
        if any(word in response_lower for word in ["risk", "challenge", "difficult", "problem"]):
            followups.append("What are the main challenges to watch out for?")
        
        if any(word in response_lower for word in ["step", "start", "begin", "first"]):
            followups.append("What should be my first step?")
        
        if not followups:
            followups = [
                "Can you provide more specific examples?",
                "What would you recommend as the next step?",
                "Are there any important considerations I should know?",
            ]
        
        return followups[:5]

    def _fallback_generation(self, ai_response: str, original_question: str, conversation_context: dict) -> dict:
        """Fallback follow-up generation when LLM fails."""
        
        questions = self._generate_basic_followups(ai_response, original_question)
        context_score = self._calculate_basic_context_score(ai_response, questions)
        
        categories = {
            "practical": [],
            "guidance": [],
            "timeline": [],
            "comparison": [],
            "deep_dive": [],
            "next_steps": [],
            "challenges": []
        }
        
        for question in questions:
            question_lower = question.lower()
            
            if any(word in question_lower for word in ["cost", "tool", "how", "what"]):
                categories["practical"].append(question)
            elif any(word in question_lower for word in ["recommend", "best", "should"]):
                categories["guidance"].append(question)
            elif any(word in question_lower for word in ["time", "long", "when", "first"]):
                categories["timeline"].append(question)
            elif any(word in question_lower for word in ["challenge", "problem", "risk"]):
                categories["challenges"].append(question)
            else:
                categories["next_steps"].append(question)
        
        return {
            "recommendations": questions,
            "context_score": context_score,
            "generation_strategy": "fallback",
            "categories": categories
        } 