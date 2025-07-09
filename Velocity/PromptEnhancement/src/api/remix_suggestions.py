"""
Remix suggestions generation functionality for creating personalized prompt suggestions based on user onboarding data.
"""

import asyncio
import json
import re
import requests
import time
import os
from typing import Dict, Any, List, Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from ..core import ModelProvider
from ..logging.logger import get_logger
import httpx
import random

logger = get_logger(__name__)


class RemixSuggestionsGenerator:
    """Handles personalized prompt suggestion generation using user onboarding data and LLM."""
    
    def __init__(self, model_provider: ModelProvider):
        """Initialize RemixSuggestionsGenerator with model provider."""
        self.model_provider = model_provider
        self.onboarding_api_base = os.getenv("ONBOARDING_API_BASE", "http://localhost:3000")
        self.question_history = {}
        self.onboarding_cache = {}  # Cache for onboarding data
        self.cache_ttl = 300  # 5 minutes TTL for cache
        self.last_cleanup = time.time()
        self.cleanup_interval = 3600  # Cleanup every hour instead of random
        # Track previously generated questions per user
        self.user_question_history = {}
        # Track when users last made requests (for cleanup)
        self.user_last_request = {}
        # Maximum questions to remember per user
        self.max_history_per_user = 2
    
    def cleanup_old_history(self):
        """Clean up old history entries (older than 24 hours)."""
        current_time = time.time()
        
        # Only run cleanup if enough time has passed
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
            
        self.last_cleanup = current_time
        cutoff_time = current_time - 86400  # 24 hours
        
        # Clean up question history
        self.question_history = {
            user_id: data for user_id, data in self.question_history.items()
            if data["timestamp"] > cutoff_time
        }
        
        # Clean up onboarding cache
        self.onboarding_cache = {
            user_id: data for user_id, data in self.onboarding_cache.items()
            if data["timestamp"] > current_time - self.cache_ttl
        }
        
        # Clean up user question history
        users_to_remove = []
        for user_id, last_request_time in self.user_last_request.items():
            if last_request_time < cutoff_time:
                users_to_remove.append(user_id)
        
        for user_id in users_to_remove:
            if user_id in self.user_question_history:
                del self.user_question_history[user_id]
            del self.user_last_request[user_id]
        
        if users_to_remove:
            logger.info(f"Cleaned up question history for {len(users_to_remove)} inactive users")
    
    def get_user_previous_questions(self, user_id: str) -> List[str]:
        """Get previously generated questions for a user."""
        return self.user_question_history.get(user_id, [])
    
    def add_questions_to_history(self, user_id: str, questions: List[str]):
        """Add new questions to user's history."""
        if user_id not in self.user_question_history:
            self.user_question_history[user_id] = []
        
        # Add new questions to history
        self.user_question_history[user_id].extend(questions)
        
        # Keep only the most recent questions (limit memory usage)
        if len(self.user_question_history[user_id]) > self.max_history_per_user:
            self.user_question_history[user_id] = self.user_question_history[user_id][-self.max_history_per_user:]
        
        # Update last request time
        self.user_last_request[user_id] = time.time()
        
        logger.info(f"Added {len(questions)} questions to history for user {user_id}. Total history: {len(self.user_question_history[user_id])}")
    
    def ensure_unique_questions(self, questions: List[str]) -> List[str]:
        """
        Ensure all questions are unique by removing duplicates and similar questions.
        
        Args:
            questions: List of question strings
            
        Returns:
            List[str]: Unique questions with duplicates removed
        """
        if not questions:
            return []
        
        unique_questions = []
        seen_questions = set()
        
        for question in questions:
            if not question or not question.strip():
                continue
                
            # Clean and normalize the question for comparison
            cleaned_question = question.strip().lower()
            
            # Remove common punctuation and normalize spacing for comparison
            normalized = re.sub(r'[^\w\s]', '', cleaned_question)
            normalized = re.sub(r'\s+', ' ', normalized).strip()
            
            # Check if we've seen this question or a very similar one
            is_duplicate = False
            for seen in seen_questions:
                # Calculate similarity (simple word overlap check)
                seen_words = set(seen.split())
                current_words = set(normalized.split())
                
                # If more than 70% of words are the same, consider it a duplicate
                if len(seen_words) > 0 and len(current_words) > 0:
                    overlap = len(seen_words.intersection(current_words))
                    similarity = overlap / max(len(seen_words), len(current_words))
                    
                    if similarity > 0.7:  # 70% similarity threshold
                        is_duplicate = True
                        break
            
            if not is_duplicate:
                unique_questions.append(question.strip())
                seen_questions.add(normalized)
        
        return unique_questions
    
    def ensure_different_from_previous(self, new_questions: List[str], previous_questions: List[str]) -> List[str]:
        """
        Ensure new questions are different from previously generated questions.
        
        Args:
            new_questions: List of newly generated questions
            previous_questions: List of previously generated questions for this user
            
        Returns:
            List[str]: Questions that are different from previous ones
        """
        if not previous_questions:
            return new_questions
        
        filtered_questions = []
        
        for new_question in new_questions:
            if not new_question or not new_question.strip():
                continue
                
            # Normalize new question for comparison
            new_normalized = re.sub(r'[^\w\s]', '', new_question.strip().lower())
            new_normalized = re.sub(r'\s+', ' ', new_normalized).strip()
            new_words = set(new_normalized.split())
            
            # Check against all previous questions
            is_too_similar = False
            for prev_question in previous_questions:
                prev_normalized = re.sub(r'[^\w\s]', '', prev_question.strip().lower())
                prev_normalized = re.sub(r'\s+', ' ', prev_normalized).strip()
                prev_words = set(prev_normalized.split())
                
                # Calculate similarity
                if len(new_words) > 0 and len(prev_words) > 0:
                    overlap = len(new_words.intersection(prev_words))
                    similarity = overlap / max(len(new_words), len(prev_words))
                    
                    # Use stricter threshold for previous questions (60% vs 70% for within-request duplicates)
                    if similarity > 0.6:
                        is_too_similar = True
                        logger.debug(f"Filtering question similar to previous: '{new_question[:50]}...' (similarity: {similarity:.2f})")
                        break
            
            if not is_too_similar:
                filtered_questions.append(new_question.strip())
        
        return filtered_questions
    
    async def process_request(self, request: Request, user_id: str) -> JSONResponse:
        """
        Process remix suggestions generation request from FastAPI endpoint.
        
        Args:
            request: FastAPI request object
            user_id: User ID to fetch onboarding data for
            
        Returns:
            JSONResponse: Personalized prompt suggestions based on onboarding data
        """
        try:
            # Clean up old history periodically (every request has small chance)
            if random.random() < 0.1:  # 10% chance to cleanup on each request
                self.cleanup_old_history()
            
            # Validate user_id
            if not user_id or not user_id.strip():
                return JSONResponse(
                    status_code=400,
                    content={"error": "user_id is required"}
                )
            
            user_id = user_id.strip()
            
            # Get user's previous questions
            previous_questions = self.get_user_previous_questions(user_id)
            logger.info(f"User {user_id} has {len(previous_questions)} questions in history")
            
            # Get onboarding data from request state or fetch from API
            onboarding_data = getattr(request.state, "onboarding_data", None)
            if not onboarding_data:
                onboarding_data = await self.fetch_onboarding_data(user_id)
            
            if not onboarding_data:
                # If onboarding data is not present, set occupation as 'general' and provide random suggestions
                onboarding_data = {"occupation": "general", "use_case": "general", "problems_faced": "", "llm_platform": "", "source": ""}
                random_suggestions = [
                    "What are effective ways to improve productivity?",
                    "How can I learn a new skill quickly?",
                    "What are best practices for problem-solving?",
                    "How do I stay motivated during challenges?",
                    "What strategies help with time management?",
                    "How can I communicate ideas clearly?",
                    "What are creative brainstorming techniques?",
                    "How do I set and achieve goals?",
                    "What are latest trends in technology?",
                    "How can I collaborate better with team?"
                ]
                # Pick 3 random suggestions and ensure they are under 14 words
                new_questions = random.sample(random_suggestions, 3)
                
                # Validate word count for random suggestions
                validated_questions = []
                for question in new_questions:
                    word_count = len(question.split())
                    if word_count < 14:
                        validated_questions.append(question)
                    else:
                        logger.warning(f"Random suggestion exceeded 14 words ({word_count}): {question[:50]}...")
                
                new_questions = validated_questions[:3]  # Ensure we still have max 3 questions
                logger.info(f"No onboarding data for user {user_id}. Returning random suggestions with occupation 'general'.")
                # Optionally, still call the suggestion-prompt API
                suggestion_api_response = None
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        payload = {"prompt": new_questions, "occupation": "general"}
                        api_resp = await client.post(
                            f"{self.onboarding_api_base}/prompt/suggestion-prompt",
                            json=payload
                        )
                        suggestion_api_response = api_resp.json() if api_resp.status_code == 200 else {"error": f"Status {api_resp.status_code}"}
                        logger.info(f"Suggestion prompt API response (no onboarding): {suggestion_api_response}")
                except Exception as e:
                    logger.warning(f"Failed to POST suggestion prompt (no onboarding): {str(e)}")
                    suggestion_api_response = {"error": str(e)}
                return JSONResponse(content={
                    "success": True,
                    "user_id": user_id,
                    "suggested_questions": new_questions,
                    "is_repeat_request": False,
                    "suggestion_prompt_api_response": suggestion_api_response
                })
            
            # Generate 3 suggested questions using LLM (avoiding previous ones)
            questions_result = await self.generate_suggested_questions(onboarding_data, previous_questions)
            
            # Add new questions to user's history
            new_questions = questions_result.get('suggested_questions', [])
            if new_questions:
                self.add_questions_to_history(user_id, new_questions)
            
            # === Integrate suggestion-prompt API call ===
            occupation = onboarding_data.get('occupation', None)
            suggestion_api_response = None
            if occupation and new_questions:
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        payload = {"prompt": new_questions, "occupation": occupation}
                        api_resp = await client.post(
                            f"{self.onboarding_api_base}/prompt/suggestion-prompt",
                            json=payload
                        )
                        suggestion_api_response = api_resp.json() if api_resp.status_code == 200 else {"error": f"Status {api_resp.status_code}"}
                        logger.info(f"Suggestion prompt API response: {suggestion_api_response}")
                except Exception as e:
                    logger.warning(f"Failed to POST suggestion prompt: {str(e)}")
                    suggestion_api_response = {"error": str(e)}
            
            logger.info(f"Generated {len(new_questions)} new unique questions for user {user_id}")
            
            return JSONResponse(content={
                "success": True,
                "user_id": user_id,
                "suggested_questions": new_questions,
                "is_repeat_request": len(previous_questions) > 0,
                "suggestion_prompt_api_response": suggestion_api_response  # Optional: for trace/debug
            })
            
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch onboarding data for user {user_id}: {str(e)}. Falling back to random suggestions.")
            onboarding_data = None
            # This will trigger the fallback above
            if not onboarding_data:
                onboarding_data = {"occupation": "general", "use_case": "general", "problems_faced": "", "llm_platform": "", "source": ""}
                random_suggestions = [
                    "What are effective ways to improve productivity?",
                    "How can I learn a new skill quickly?",
                    "What are best practices for problem-solving?",
                    "How do I stay motivated during challenges?",
                    "What strategies help with time management?",
                    "How can I communicate ideas clearly?",
                    "What are creative brainstorming techniques?",
                    "How do I set and achieve goals?",
                    "What are latest trends in technology?",
                    "How can I collaborate better with team?"
                ]
                new_questions = random.sample(random_suggestions, 3)
                
                # Validate word count for random suggestions
                validated_questions = []
                for question in new_questions:
                    word_count = len(question.split())
                    if word_count < 14:
                        validated_questions.append(question)
                    else:
                        logger.warning(f"Random suggestion exceeded 14 words ({word_count}): {question[:50]}...")
                
                new_questions = validated_questions[:3]  # Ensure we still have max 3 questions
                logger.info(f"No onboarding data for user {user_id} (RequestException). Returning random suggestions with occupation 'general'.")
                suggestion_api_response = None
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        payload = {"prompt": new_questions, "occupation": "general"}
                        api_resp = await client.post(
                            f"{self.onboarding_api_base}/prompt/suggestion-prompt",
                            json=payload
                        )
                        suggestion_api_response = api_resp.json() if api_resp.status_code == 200 else {"error": f"Status {api_resp.status_code}"}
                        logger.info(f"Suggestion prompt API response (no onboarding, RequestException): {suggestion_api_response}")
                except Exception as e:
                    logger.warning(f"Failed to POST suggestion prompt (no onboarding, RequestException): {str(e)}")
                    suggestion_api_response = {"error": str(e)}
                return JSONResponse(content={
                    "success": True,
                    "user_id": user_id,
                    "suggested_questions": new_questions,
                    "is_repeat_request": False,
                    "suggestion_prompt_api_response": suggestion_api_response
                })
        except Exception as e:
            logger.exception("Error generating remix suggestions", exception_type=type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to generate remix suggestions: {str(e)}"}
            )
    
    async def fetch_onboarding_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch onboarding data with caching."""
        current_time = time.time()
        
        # Check cache first
        if user_id in self.onboarding_cache:
            cache_data = self.onboarding_cache[user_id]
            if current_time - cache_data["timestamp"] < self.cache_ttl:
                return cache_data["data"]
            
        try:
            url = f"{self.onboarding_api_base}/fetchOnboardingData/{user_id}"
            
            # Use httpx for async HTTP requests
            async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced timeout
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("success"):
                    logger.warning(f"API returned unsuccessful response for user {user_id}: {data}")
                    return None
                
                onboarding_data = data.get("fetchedOnboardingData")
                if not onboarding_data:
                    return None
                
                # Cache the result
                self.onboarding_cache[user_id] = {
                    "data": onboarding_data,
                    "timestamp": current_time
                }
                
                return onboarding_data
                
        except Exception as e:
            logger.error(f"Error fetching onboarding data for user {user_id}: {str(e)}")
            return None
    
    async def fetch_predefined_prompts(self, occupation: str) -> Optional[List[str]]:
        """Fetch predefined prompts from API based on occupation."""
        try:
            # Clean occupation string
            clean_occupation = occupation.lower().replace(" ", "_")
            
            # Use httpx for async HTTP requests
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"{self.onboarding_api_base}/prompt/suggestion-prompt/{clean_occupation}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                if not data.get("success"):
                    return None
                    
                prompts = data.get("data", {}).get("prompt", [])
                if not prompts:
                    return None
                    
                return prompts
                
        except Exception as e:
            logger.warning(f"Failed to fetch predefined prompts for occupation {occupation}: {str(e)}")
            return None

    async def generate_suggested_questions(self, onboarding_data: Dict[str, Any], previous_questions: List[str] = None) -> Dict[str, Any]:
        """Generate suggested questions using three-tier approach:
        1. Try predefined prompts from API
        2. Generate using LLM
        3. Use general fallback
        """
        if previous_questions is None:
            previous_questions = []
        
        occupation = onboarding_data.get("occupation", "Unknown")
        problems_faced = onboarding_data.get("problems_faced", "Unknown")
        use_case = onboarding_data.get("use_case", "Unknown")
        
        # 1. Try to fetch predefined prompts first
        predefined_prompts = await self.fetch_predefined_prompts(occupation)
        if predefined_prompts:
            logger.info(f"Using predefined prompts for occupation: {occupation}")
            # Ensure we have exactly 3 questions
            if len(predefined_prompts) > 3:
                predefined_prompts = random.sample(predefined_prompts, 3)
            elif len(predefined_prompts) < 3:
                # Generate additional questions using LLM to make up the difference
                additional_needed = 3 - len(predefined_prompts)
                llm_questions = await self.generate_llm_questions(
                    occupation, problems_faced, use_case, 
                    previous_questions + predefined_prompts,  # Avoid duplicates
                    count=additional_needed
                )
                predefined_prompts.extend(llm_questions)
            
            return {"suggested_questions": predefined_prompts[:3]}
        
        # 2. If no predefined prompts, try LLM generation
        try:
            llm_questions = await self.generate_llm_questions(
                occupation, problems_faced, use_case, 
                previous_questions
            )
            if llm_questions:
                return {"suggested_questions": llm_questions[:3]}
        except Exception as e:
            logger.warning(f"LLM generation failed: {str(e)}")
        
        # 3. If both above methods fail, use general fallback
        return self.fallback_questions_generation(onboarding_data, previous_questions)

    async def generate_llm_questions(
        self, 
        occupation: str, 
        problems_faced: str, 
        use_case: str, 
        previous_questions: List[str],
        count: int = 3
    ) -> List[str]:
        """Generate questions using LLM."""
        # Optimized system message with word limit requirement
        system_message = f"""You are an expert AI prompt consultant. Generate exactly {count} unique, high-quality questions for the user's LLM.
        CRITICAL: Each question MUST be less than 14 words long.
        Return in JSON format: {{"suggested_questions": ["Question 1", "Question 2", "Question 3"]}}
        Make questions specific to their profile, practical, and completely different from each other.
        Keep each question concise and impactful while staying under the 14-word limit."""
        
        # Optimized generation prompt
        generation_prompt = f"""Generate {count} unique questions for:
        Occupation: {occupation}
        Problems: {problems_faced}
        Use Case: {use_case}
        
        REQUIREMENT: Each question must be less than 14 words.
        
        {f"Avoid similar to: {', '.join([q[:30] + '...' for q in previous_questions[-3:]])}" if previous_questions else ""}"""
        
        try:
            # Get suggestions from LLM with timeout
            llm_response = await asyncio.wait_for(
                self.model_provider.get_response(generation_prompt, system_message=system_message),
                timeout=10.0
            )
            
            # Extract and validate JSON response
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if not json_match:
                return []
                
            try:
                llm_suggestions = json.loads(json_match.group(0))
                questions = llm_suggestions.get("suggested_questions", [])
                
                # Filter questions to ensure they are under 14 words
                filtered_questions = []
                for question in questions:
                    word_count = len(question.split())
                    if word_count < 14:
                        filtered_questions.append(question)
                    else:
                        logger.warning(f"Question exceeded 14 words ({word_count}): {question[:50]}...")
                
                return filtered_questions[:count]
            except json.JSONDecodeError:
                return []
                
        except Exception as e:
            logger.warning(f"LLM question generation failed: {str(e)}")
            return []
    
    def fallback_questions_generation(self, onboarding_data: Dict[str, Any], previous_questions: List[str] = None) -> Dict[str, Any]:
        """
        Generate fallback questions when LLM fails.
        
        Args:
            onboarding_data: User's onboarding information
            previous_questions: Previously generated questions to avoid
            
        Returns:
            Dict: Basic personalized unique questions
        """
        if previous_questions is None:
            previous_questions = []
            
        logger.info("Using fallback question generation")
        questions = self.generate_fallback_questions(onboarding_data)
        
        # Ensure all questions are under 14 words
        filtered_questions = []
        for question in questions:
            word_count = len(question.split())
            if word_count < 14:
                filtered_questions.append(question)
            else:
                logger.warning(f"Fallback question exceeded 14 words ({word_count}): {question[:50]}...")
        
        unique_questions = self.ensure_unique_questions(filtered_questions)
        final_questions = self.ensure_different_from_previous(unique_questions, previous_questions)
        return {"suggested_questions": final_questions[:3]}
    
    def generate_fallback_questions(self, onboarding_data: Dict[str, Any], variation: int = 1) -> List[str]:
        """
        Generate 3 basic personalized questions based on onboarding data.
        
        Args:
            onboarding_data: User's onboarding information
            variation: Variation number to generate different sets of questions
            
        Returns:
            List[str]: 3 unique questions tailored to user profile
        """
        
        # Handle None onboarding_data
        if not onboarding_data:
            logger.warning("No onboarding data available, using default questions")
            return [
                "How can I improve my productivity?",
                "What are best practices for communication?",
                "How can I better manage my time?"
            ]
        
        # Safely get values with defaults
        occupation = (onboarding_data.get("occupation") or "").lower()
        use_case = (onboarding_data.get("use_case") or "").lower()
        problems_faced = (onboarding_data.get("problems_faced") or "").lower()
        
        # Different sets of base questions based on variation (all under 14 words)
        if variation == 1:
            questions = [
                "Break down this task into smaller steps: [TASK]",
                "Rewrite this message clearly and professionally: [MESSAGE]",
                "Analyze this problem and suggest solutions: [PROBLEM]"
            ]
        elif variation == 2:
            questions = [
                "Create a plan with timeline for this goal: [GOAL]",
                "Review and improve this draft for clarity: [DRAFT]",
                "What risks exist and how to mitigate them: [SITUATION]"
            ]
        else:
            questions = [
                "Generate creative alternatives for this challenge: [CHALLENGE]",
                "Optimize this process for better efficiency: [PROCESS]",
                "Provide expert advice on this decision: [DECISION]"
            ]
        
        # Add occupation-specific questions (all under 14 words)
        if "developer" in occupation or "programmer" in occupation or "development" in use_case:
            if variation == 1:
                questions = [
                    "Review this code for best practices: [CODE]",
                    "Help me debug this issue: [ISSUE]",
                    "Create documentation for this feature: [FEATURE]"
                ]
            elif variation == 2:
                questions = [
                    "Optimize this algorithm for performance: [ALGORITHM]",
                    "Design testing strategy for this feature: [FEATURE]",
                    "Refactor this code for maintainability: [CODE]"
                ]
            else:
                questions = [
                    "Plan architecture for this system: [REQUIREMENTS]",
                    "Identify security vulnerabilities in code: [CODE]",
                    "Create deployment strategy for this app: [APP]"
                ]
        
        elif "writer" in occupation or "content" in occupation or "creative" in use_case:
            if variation == 1:
                questions = [
                    "Generate creative ideas for this topic: [TOPIC]",
                    "Structure this content for engagement: [CONTENT]",
                    "Improve flow and readability: [TEXT]"
                ]
            elif variation == 2:
                questions = [
                    "Create compelling headlines: [CONTENT]",
                    "Adapt content for different audiences: [CONTENT]",
                    "Develop content strategy for campaign: [CAMPAIGN]"
                ]
            else:
                questions = [
                    "Research and fact-check this topic: [TOPIC]",
                    "Create editorial calendar for publication: [PUBLICATION]",
                    "Optimize content for SEO: [CONTENT]"
                ]
        
        # Add problem-specific questions
        if "hallucination" in problems_faced or "accuracy" in problems_faced:
            questions[2] = "Verify accuracy and fact-check this information: [INFORMATION]"
        
        return questions
    
    def generate_additional_fallback_questions(self, onboarding_data: Dict[str, Any], current_count: int) -> List[str]:
        """
        Generate additional fallback questions when we need more unique questions.
        
        Args:
            onboarding_data: User's onboarding information
            current_count: Number of questions we already have
            
        Returns:
            List[str]: Additional unique questions
        """
        
        occupation = onboarding_data.get("occupation", "").lower()
        use_case = onboarding_data.get("use_case", "").lower()
        
        # Additional generic questions that are useful for most users (all under 14 words)
        additional_questions = [
            "Explain this concept in simple terms: [CONCEPT]",
            "Create checklist for achieving this goal: [GOAL]",
            "What are pros and cons of this decision: [DECISION]",
            "Summarize key points from this information: [CONTENT]",
            "Generate alternative solutions for this challenge: [CHALLENGE]",
            "Prioritize tasks by importance and urgency: [TASKS]",
            "Design step-by-step tutorial for this process: [PROCESS]",
            "Create comparison table for these options: [OPTIONS]",
            "Develop troubleshooting guide for this issue: [ISSUE]",
            "Generate questions before making this decision: [DECISION]",
            "Create template for this task: [TASK]",
            "Identify improvements for this workflow: [WORKFLOW]"
        ]
        
        # Return additional questions starting from the current count
        return additional_questions[current_count:current_count + 3] 