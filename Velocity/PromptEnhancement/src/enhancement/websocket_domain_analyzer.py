"""
WebSocket Domain Analysis Service

Modular service for real-time domain and intent analysis via WebSocket connections.
Handles domain detection, intent classification, and provider selection for WebSocket clients.
"""

import json
import re
import asyncio
import time
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

from src.logging.logger import get_logger
from src.core.module_init import container
from src.core import ConfigProvider
from src.analysis.analyzer import Analyzer
from src.analysis.intent_classifier import IntentClassifier
from src.analysis.domain_classifier import DomainClassifier
from src.llm.selector_v4 import ModelSelector
from src.llm.models import SelectionResult

logger = get_logger(__name__)


class WebSocketDomainAnalyzer:
    """
    WebSocket service for real-time domain and intent analysis.
    
    Provides comprehensive analysis including domain detection, intent classification,
    provider selection, and prompt quality assessment for WebSocket clients.
    """
    
    def __init__(self):
        """Initialize the WebSocket domain analyzer with required dependencies."""
        self.analyzer = container.resolve(Analyzer)
        self.intent_classifier = container.resolve(IntentClassifier)
        self.domain_classifier = container.resolve(DomainClassifier)
        self.selector = container.resolve(ModelSelector)
        self.config_provider = container.resolve(ConfigProvider)
        
        # Initialize Intent Adoption Engine for enhanced analysis
        try:
            from src.analysis.intent_adoption_engine import get_intent_adoption_engine
            self.adoption_engine = get_intent_adoption_engine()
            logger.info("Intent Adoption Engine integrated with WebSocket analyzer")
        except Exception as e:
            logger.warning(f"Intent Adoption Engine not available: {e}")
            self.adoption_engine = None
        
        # Validate dependencies
        if not self.intent_classifier or not self.domain_classifier:
            raise ValueError("Required classifiers not found in application state")
    
    async def handle_websocket_connection(self, websocket: WebSocket) -> None:
        """
        Handle WebSocket connection for domain and intent analysis.
        
        Args:
            websocket: The WebSocket connection to handle
        """
        try:
            await websocket.accept()
            logger.info("WebSocket connection established for domain and intent analysis")
            
            while True:
                try:
                    # Receive prompt from the client
                    data = await websocket.receive_json()
                    prompt = data.get("prompt", "").strip()
                    user_id = data.get("user_id")
                    include_adoption = data.get("include_adoption", False)
                    
                    if not prompt:
                        await self._send_empty_response(websocket)
                        continue
                    
                    # Analyze the prompt and send results
                    analysis_result = await self._analyze_prompt(prompt, user_id, include_adoption)
                    await websocket.send_json(analysis_result)
                    
                except WebSocketDisconnect:
                    logger.info("WebSocket connection closed by client")
                    break
                except json.JSONDecodeError as e:
                    error_msg = f"Invalid JSON format: {str(e)}"
                    logger.error(error_msg)
                    await self._send_error_response(websocket, error_msg)
                except Exception as e:
                    error_msg = f"Error processing WebSocket message: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    await self._send_error_response(websocket, error_msg)
                    
        except Exception as e:
            error_msg = f"WebSocket error: {str(e)}"
            logger.error(error_msg, exc_info=True)
            try:
                await websocket.close(code=1011, reason=error_msg)
            except:
                pass
    
    async def _analyze_prompt(self, prompt: str, user_id: Optional[str] = None, include_adoption: bool = False) -> Dict:
        """
        Perform comprehensive prompt analysis with optional adoption insights.
        
        Args:
            prompt: The user's prompt to analyze
            user_id: Optional user ID for personalized adoption analysis
            include_adoption: Whether to include intent adoption insights
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Run parallel async operations for faster response
            enhanced_domain_task = self.selector.select_domain_and_provider(prompt)
            llm_intent_task = self._identify_intent_with_llm(prompt)
            
            # Quick synchronous operations
            domain_confidence = self.domain_classifier.get_domain_confidence(prompt)
            intent_result = self.intent_classifier.classify_intent(prompt)
            explicit_provider = self._detect_explicit_provider_mention(prompt)
            
            # Wait for async tasks to complete
            (enhanced_domain, _), llm_intent = await asyncio.gather(enhanced_domain_task, llm_intent_task)
            
            # Build comprehensive query analysis for provider selection
            query_analysis = {
                "original_prompt": prompt,
                "domain": enhanced_domain,
                "domain_confidence": domain_confidence.get(enhanced_domain, 0.0),
                "intent_category": llm_intent["intent_category"],
                "intent_description": llm_intent["intent_description"],
                "intent_confidence": llm_intent["confidence"],
                "primary_action": llm_intent["primary_action"],
                "complexity": llm_intent["complexity"],
                "main_intent": intent_result.main_intent,
                "sub_intents": intent_result.sub_intents,
                "needs_clarification": intent_result.needs_review,
                "prompt_length": len(prompt),
                "word_count": len(prompt.split())
            }
            
            # Add explicit provider if detected
            if explicit_provider:
                query_analysis["llm"] = explicit_provider
            
            # Run remaining operations in parallel for speed
            provider_task = self.selector.select_provider(query_analysis)
            quality_task = asyncio.create_task(asyncio.to_thread(
                self.domain_classifier.analyze_prompt_quality,
                prompt=prompt,
                domain=enhanced_domain,
                domain_confidence=domain_confidence.get(enhanced_domain, 0.0),
                intent_result=intent_result
            ))
            
            # Quick synchronous operation
            available_models = self._get_available_models()
            
            # Get adoption analysis if requested and available
            adoption_analysis = None
            if include_adoption and self.adoption_engine and user_id:
                try:
                    adoption_result = await self.adoption_engine.analyze_intent_for_adoption(
                        prompt=prompt,
                        user_id=user_id,
                        session_context={"websocket_session": True}
                    )
                    # Extract key adoption insights for WebSocket response (including multi-intent analysis)
                    adoption_analysis = {
                        "success_probability": adoption_result.get("success_probability", 0.0),
                        "adoption_tips": [
                            insight.get("actionable_tip", "")
                            for insight in adoption_result.get("adoption_insights", [])[:2]
                        ],
                        "pattern_suggestions": [
                            {
                                "pattern": pattern.get("pattern_name", ""),
                                "success_rate": pattern.get("success_rate", 0.0)
                            }
                            for pattern in adoption_result.get("pattern_suggestions", [])[:2]
                        ],
                        "multi_intent_analysis": adoption_result.get("multi_intent_analysis", {})
                    }
                    
                    # Add special handling for multi-intent scenarios
                    multi_intent_info = adoption_result.get("multi_intent_analysis", {})
                    if multi_intent_info.get("has_multiple_intents"):
                        adoption_analysis["multi_intent_detected"] = True
                        adoption_analysis["intent_count"] = len(multi_intent_info.get("detected_intents", []))
                        adoption_analysis["coordination_strategy"] = multi_intent_info.get("coordination_strategy", "sequential")
                        adoption_analysis["multi_intent_tip"] = f"🎯 Multiple intents detected! Consider breaking this into {multi_intent_info.get('coordination_strategy', 'sequential')} steps."
                    logger.info(f"Added adoption analysis for user {user_id}")
                except Exception as e:
                    logger.warning(f"Failed to get adoption analysis: {e}")
            
            # Wait for remaining async operations
            provider_selection, quality_analysis = await asyncio.gather(
                provider_task, 
                quality_task
            )
            
            # Build complete analysis response
            analysis_response = {
                "domain": enhanced_domain,
                "intent": {
                    "primary_intent": intent_result.main_intent,
                    "sub_intents": intent_result.sub_intents,
                    "confidence": intent_result.confidence,
                    "needs_clarification": intent_result.needs_review
                },
                "main_intent": {
                    "category": llm_intent["intent_category"],
                    "description": llm_intent["intent_description"],
                    "confidence": llm_intent["confidence"],
                    "primary_action": llm_intent["primary_action"],
                    "complexity": llm_intent["complexity"]
                },
                "provider_selection": {
                    "selected_provider": provider_selection.provider,
                    "is_from_cache": provider_selection.is_from_cache,
                    "cache_key": provider_selection.cache_key,
                    "timestamp": provider_selection.timestamp,
                    "original_provider": provider_selection.original_provider,
                    "is_fallback": getattr(provider_selection, 'is_fallback', False),
                    "fallback_reason": getattr(provider_selection, 'fallback_reason', None)
                },
                "quality": quality_analysis['quality'],
                "quality_score": quality_analysis['score'],
                "quality_reasons": quality_analysis['reasons'],
                "quality_metrics": quality_analysis['metrics']
            }
            
            # Add adoption analysis if available
            if adoption_analysis:
                analysis_response["adoption"] = adoption_analysis
            
            return analysis_response
            
        except Exception as e:
            error_msg = f"Error analyzing prompt: {str(e)}"
            logger.error(error_msg)
            return {
                "error": error_msg,
                "domains": [],
                "intent": None,
                "confidence": 0.0,
                "needs_clarification": False,
                "quality": "bad",
                "quality_score": 0.0,
                "quality_reasons": [f"Error: {error_msg}"]
            }
    
    async def _identify_intent_with_llm(self, prompt: str) -> Dict:
        """
        Identify user intent using LLM with fast response optimization.
        
        Args:
            prompt: The user's prompt
            
        Returns:
            Dictionary containing intent information with category, confidence, and description
        """
        # Initialize default response
        result = {
            "intent_category": "general",
            "intent_description": "General purpose request",
            "confidence": 0.5,
            "primary_action": "inform",
            "complexity": "medium"
        }
        
        try:
            # Get model provider for LLM-based intent identification
            from src.core import ModelProvider
            model_provider = container.resolve(ModelProvider)
            
            # Simplified system message for faster response
            system_message = """Analyze the prompt and respond with ONLY a JSON object:
{
  "intent_category": "question|code_assistance|create_content|analyze_data|solve_problem|learn_concept|compare_options|get_recommendations|brainstorm_ideas|explain_topic|summarize_content|translate|request_help|general",
  "intent_description": "brief description",
  "confidence": 0.8,
  "primary_action": "inform|code|create|analyze|solve|learn|compare|recommend|brainstorm|explain|summarize|translate|general",
  "complexity": "low|medium|high"
}

Rules:
- Programming/coding = "code_assistance"
- Image generation = "create_content" 
- Questions = "question"
- Default = "general"
"""
            
            # Simple prompt for faster processing
            intent_prompt = f'Intent for: "{prompt}"'
            
            # Shorter timeout for faster WebSocket response
            llm_response = await asyncio.wait_for(
                model_provider.get_response(intent_prompt, system_message=system_message),
                timeout=1.5  # Reduced from 3.0 to 1.5 seconds
            )
            
            # Fast JSON parsing
            try:
                # Quick JSON extraction
                json_match = re.search(r'\{[^{}]*\}', llm_response)
                if json_match:
                    analysis = json.loads(json_match.group(0))
                    
                    # Quick validation and update
                    if "intent_category" in analysis:
                        result["intent_category"] = analysis["intent_category"]
                    if "intent_description" in analysis:
                        result["intent_description"] = analysis["intent_description"]
                    if "confidence" in analysis:
                        result["confidence"] = min(max(float(analysis["confidence"]), 0.0), 1.0)
                    if "primary_action" in analysis:
                        result["primary_action"] = analysis["primary_action"]
                    if "complexity" in analysis:
                        result["complexity"] = analysis["complexity"]
                        
            except (json.JSONDecodeError, ValueError, KeyError):
                # Fast fallback on JSON parse error
                result = self._fast_fallback_intent_detection(prompt, result)
        
        except asyncio.TimeoutError:
            # Fast fallback on timeout
            result = self._fast_fallback_intent_detection(prompt, result)
        except Exception:
            # Fast fallback on any error
            result = self._fast_fallback_intent_detection(prompt, result)
        
        return result

    def _fast_fallback_intent_detection(self, prompt: str, result: Dict) -> Dict:
        """
        Ultra-fast keyword-based intent detection optimized for speed.
        
        Args:
            prompt: The user's prompt
            result: The current result dictionary to update
            
        Returns:
            Updated result dictionary
        """
        prompt_lower = prompt.lower()
        
        # Fast keyword checks (most common first)
        if any(word in prompt_lower for word in ["code", "python", "javascript", "function", "script", "programming"]):
            result.update({"intent_category": "code_assistance", "primary_action": "code", "intent_description": "Programming assistance"})
        elif any(word in prompt_lower for word in ["image", "picture", "visual", "create", "generate", "make", "cat", "flying"]):
            result.update({"intent_category": "create_content", "primary_action": "create", "intent_description": "Content creation"})
        elif any(word in prompt_lower for word in ["what", "how", "why", "when", "where", "question"]):
            result.update({"intent_category": "question", "primary_action": "inform", "intent_description": "Information request"})
        elif any(word in prompt_lower for word in ["help", "assist", "support"]):
            result.update({"intent_category": "request_help", "primary_action": "general", "intent_description": "Assistance request"})
        elif any(word in prompt_lower for word in ["analyze", "study", "examine"]):
            result.update({"intent_category": "analyze_data", "primary_action": "analyze", "intent_description": "Data analysis"})
        
        result["confidence"] = 0.75  # Higher confidence for faster processing
        return result
    
    def _detect_explicit_provider_mention(self, prompt: str) -> Optional[str]:
        """
        Detect if the user explicitly mentions a specific AI provider in their prompt.
        
        Args:
            prompt: The user's input prompt
            
        Returns:
            The detected provider name (normalized) or None if no explicit mention found
        """
        # Import here to avoid circular imports
        from src.api.prompt_enhancer import PromptEnhancer
        return PromptEnhancer.detect_explicit_provider_mention(prompt)
    
    def _get_available_models(self) -> list:
        """
        Get list of available AI models based on configured API keys.
        
        Returns:
            List of available model names
        """
        available_models = []
        
        groq_api_key = self.config_provider.get_config("groq.api_key")
        nvidia_api_key = self.config_provider.get_config("nvidia.api_key")
        
        if groq_api_key:
            available_models.append("Groq")
        if nvidia_api_key:
            available_models.append("NVIDIA")
            
        return available_models
    
    async def _send_empty_response(self, websocket: WebSocket) -> None:
        """Send response for empty prompt."""
        await websocket.send_json({
            "domains": [],
            "intent": None,
            "confidence": 0.0,
            "needs_clarification": False,
            "quality": "bad",
            "quality_score": 0.0,
            "quality_reasons": ["Empty prompt"]
        })
    
    async def _send_error_response(self, websocket: WebSocket, error_msg: str) -> None:
        """Send error response to WebSocket client."""
        await websocket.send_json({
            "error": error_msg,
            "domains": [],
            "intent": None,
            "confidence": 0.0,
            "needs_clarification": False,
            "quality": "bad",
            "quality_score": 0.0,
            "quality_reasons": [f"Error: {error_msg}"]
        })
    
    def get_real_time_adoption_tips(self, prompt: str, user_id: Optional[str] = None) -> Dict:
        """
        Get quick adoption tips for real-time display as user types.
        
        Args:
            prompt: Current prompt text
            user_id: Optional user ID for personalization
            
        Returns:
            Dictionary with quick adoption insights
        """
        if not self.adoption_engine:
            return {"tips": [], "success_probability": 0.5}
        
        tips = []
        success_probability = 0.5
        
        try:
            # Quick analysis without full LLM calls
            word_count = len(prompt.split())
            
            # Length-based tips
            if word_count < 5:
                tips.append("💡 Add more specific details for better results")
                success_probability = 0.4
            elif word_count > 50:
                tips.append("📝 Consider breaking this into smaller, focused requests")
                success_probability = 0.6
            else:
                success_probability = min(0.85, 0.5 + (word_count / 40))
            
            # Pattern-based tips
            if "help" in prompt.lower() and word_count < 8:
                tips.append("🎯 Specify what kind of help you need and the context")
            
            if any(word in prompt.lower() for word in ["code", "programming", "python", "javascript"]):
                if "error" not in prompt.lower() and "example" not in prompt.lower():
                    tips.append("🔧 Include specific requirements or examples for better code assistance")
            
            # User-specific tips if available
            if user_id and user_id in self.adoption_engine.user_metrics:
                user_data = self.adoption_engine.user_metrics[user_id]
                if user_data:
                    avg_success = sum(m.success_rate for m in user_data.values()) / len(user_data)
                    if avg_success < 0.7:
                        tips.append("⭐ Try being more specific - your success rate will improve!")
            
            return {
                "tips": tips[:2],  # Limit to 2 tips for real-time display
                "success_probability": success_probability,
                "word_count": word_count
            }
            
        except Exception as e:
            logger.warning(f"Error generating real-time adoption tips: {e}")
            return {"tips": [], "success_probability": 0.5, "word_count": len(prompt.split())}
        