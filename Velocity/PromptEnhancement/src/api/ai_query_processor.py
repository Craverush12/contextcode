"""
AI query processing functionality for intelligent question handling and model routing.
"""

import asyncio
import time
from typing import Dict, Any, List
from ..core import ModelProvider
from .ai_query_validators import validate_ai_query_input
from ..logging.logger import get_logger

logger = get_logger(__name__)


class AIQueryProcessor:
    """Handles intelligent AI query processing with enhancement and model routing."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def process_query(self, question: str, selected_text: str, context: Dict[str, Any], 
                           model: str, enhance_prompt: bool, conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process user query with LLM enhancement and optimal routing.
        
        Args:
            question: The user's question
            selected_text: Selected text from the page
            context: Page context information
            model: Preferred model or "auto" for automatic selection
            enhance_prompt: Whether to enhance the prompt
            conversation_history: Previous conversation history
            
        Returns:
            dict: Query processing results
        """
        # Initialize result structure
        result = {
            "response": "",
            "model_used": model if model != "auto" else "openai",
            "enhanced": False,
            "confidence": 0.5,
            "sources": [],
            "token_usage": {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0
            },
            "enhancement_applied": None
        }
        
        try:
            # Step 1: Determine optimal model if auto-routing requested
            if model == "auto":
                optimal_model = await self._determine_optimal_model(question, context)
                result["model_used"] = optimal_model
            else:
                result["model_used"] = model if model in ["openai", "anthropic", "perplexity", "google", "grok"] else "openai"
            
            # Step 2: Enhance prompt if requested
            enhanced_question = question
            if enhance_prompt:
                enhancement_result = await self._enhance_query_with_context(
                    question, selected_text, context, conversation_history
                )
                enhanced_question = enhancement_result["enhanced_query"]
                result["enhanced"] = enhancement_result["was_enhanced"]
                result["enhancement_applied"] = enhancement_result["enhancement_description"]
            
            # Step 3: Prepare context and sources
            sources = []
            context_parts = []
            
            if selected_text:
                context_parts.append(f"Selected Content:\n{selected_text}")
                sources.append("selected_content")
            
            if context.get("content_analysis", {}).get("key_topics"):
                topics = context["content_analysis"]["key_topics"]
                context_parts.append(f"Key Topics: {', '.join(topics)}")
                sources.append("content_analysis")
            
            if conversation_history:
                # Add recent conversation context (last 3 exchanges)
                recent_history = conversation_history[-6:]  # Last 3 Q&A pairs
                if recent_history:
                    history_text = "\n".join([
                        f"Previous: {item.get('question', '')}" if item.get('type') == 'question' 
                        else f"Response: {item.get('response', '')[:200]}..." 
                        for item in recent_history
                    ])
                    context_parts.append(f"Recent Conversation:\n{history_text}")
                    sources.append("conversation_history")
            
            # Step 4: Build comprehensive prompt
            system_message = self._build_system_message(context, result["model_used"])
            
            if context_parts:
                full_prompt = f"""Context Information:
{chr(10).join(context_parts)}

Question: {enhanced_question}

Please provide a comprehensive, helpful response based on the context provided."""
            else:
                full_prompt = enhanced_question
            
            # Step 5: Get response from selected model
            response = await self._get_model_response(
                full_prompt, system_message, result["model_used"]
            )
            
            # Step 6: Process and validate response
            result["response"] = response
            result["sources"] = sources
            
            # Step 7: Calculate confidence score
            result["confidence"] = self._calculate_response_confidence(
                question, enhanced_question, response, selected_text, context
            )
            
            # Step 8: Estimate token usage (approximate)
            result["token_usage"] = self._estimate_token_usage(full_prompt, response)
            
            logger.info(f"Query processed successfully with {result['model_used']} model")
            return result
            
        except Exception as e:
            logger.error(f"Error in query processing: {str(e)}")
            # Return fallback response
            result["response"] = "I apologize, but I encountered an error processing your question. Please try again."
            result["confidence"] = 0.1
            result["sources"] = ["error_fallback"]
            return result
    
    async def _determine_optimal_model(self, question: str, context: Dict[str, Any]) -> str:
        """Use LLM to determine the optimal model for the question."""
        
        # Quick analysis prompt for model selection
        analysis_prompt = f"""
        Question: {question}
        Context Type: {context.get('website_type', 'general')}
        Content Topics: {', '.join(context.get('content_analysis', {}).get('key_topics', []))}
        
        Based on this question and context, which AI model would be most suitable?
        - openai: Technical analysis, coding, structured reasoning, business analysis
        - anthropic: Creative writing, ethical discussions, nuanced explanations, writing assistance
        - perplexity: Research, current events, fact-checking, real-time information
        - google: General knowledge, educational content, broad topics
        - grok: Casual conversations, trending topics, social insights
        
        Respond with just the model name.
        """
        
        try:
            model_response = await asyncio.wait_for(
                self.model_provider.get_response(analysis_prompt),
                timeout=3.0
            )
            
            # Extract model name from response
            model_response = model_response.lower().strip()
            valid_models = ["openai", "anthropic", "perplexity", "google", "grok"]
            
            for model in valid_models:
                if model in model_response:
                    return model
            
            # Default fallback
            return "openai"
            
        except Exception as e:
            logger.warning(f"Model selection failed: {str(e)}, using default")
            return "openai"
    
    async def _enhance_query_with_context(self, question: str, selected_text: str, 
                                        context: Dict[str, Any], conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhance the user query with context and conversation history."""
        
        # Prepare context for enhancement
        context_info = []
        
        if selected_text:
            context_info.append(f"Selected Text: {selected_text[:500]}...")
        
        content_analysis = context.get("content_analysis", {})
        if content_analysis.get("key_topics"):
            context_info.append(f"Key Topics: {', '.join(content_analysis['key_topics'])}")
        
        if content_analysis.get("complexity"):
            context_info.append(f"Content Complexity: {content_analysis['complexity']}")
        
        context_text = "\n".join(context_info) if context_info else "No additional context available"
        
        # Create enhancement prompt
        enhancement_prompt = f"""
        Original Question: {question}
        
        Available Context:
        {context_text}
        
        Enhance this question to be more specific, clear, and contextually relevant. The enhanced question should:
        1. Incorporate relevant context when helpful
        2. Be more specific and actionable
        3. Maintain the user's original intent
        4. Be clear and well-structured
        
        If the original question is already clear and specific, you may return it unchanged.
        
        Return only the enhanced question, no explanation.
        """
        
        try:
            enhanced = await asyncio.wait_for(
                self.model_provider.get_response(enhancement_prompt),
                timeout=5.0
            )
            
            enhanced = enhanced.strip()
            
            # Check if enhancement was actually applied
            was_enhanced = enhanced.lower() != question.lower() and len(enhanced) > len(question) * 0.8
            
            if was_enhanced:
                return {
                    "enhanced_query": enhanced,
                    "was_enhanced": True,
                    "enhancement_description": "Enhanced with context and specificity improvements"
                }
            else:
                return {
                    "enhanced_query": question,
                    "was_enhanced": False,
                    "enhancement_description": None
                }
                
        except Exception as e:
            logger.warning(f"Query enhancement failed: {str(e)}")
            return {
                "enhanced_query": question,
                "was_enhanced": False,
                "enhancement_description": None
            }
    
    def _build_system_message(self, context: Dict[str, Any], model_used: str) -> str:
        """Build an appropriate system message based on context and model."""
        
        base_message = "You are a helpful AI assistant. Provide accurate, informative, and actionable responses."
        
        # Customize based on model strengths
        model_customizations = {
            "openai": "Focus on structured, logical analysis and provide clear, step-by-step explanations.",
            "anthropic": "Provide thoughtful, nuanced responses with careful consideration of different perspectives.",
            "perplexity": "Emphasize current, factual information and cite relevant sources when possible.",
            "google": "Provide comprehensive, educational responses covering multiple aspects of the topic.",
            "grok": "Respond in a conversational, accessible tone while maintaining accuracy."
        }
        
        model_addition = model_customizations.get(model_used, "")
        
        # Add context-specific instructions
        website_type = context.get("website_type", "general")
        content_analysis = context.get("content_analysis", {})
        
        context_additions = []
        
        if website_type == "technical":
            context_additions.append("The user is reading technical content, so provide detailed, technical responses when appropriate.")
        elif website_type == "business":
            context_additions.append("Focus on practical business implications and actionable insights.")
        
        if content_analysis.get("complexity") == "advanced":
            context_additions.append("The user is engaging with advanced content, so you can use technical terminology.")
        elif content_analysis.get("complexity") == "basic":
            context_additions.append("Keep explanations simple and accessible for beginners.")
        
        # Combine all parts
        full_message = base_message
        if model_addition:
            full_message += f" {model_addition}"
        if context_additions:
            full_message += f" {' '.join(context_additions)}"
        
        return full_message
    
    async def _get_model_response(self, prompt: str, system_message: str, model_used: str) -> str:
        """Get response from the specified model with improved performance."""
        
        try:
            # Dynamic timeout based on prompt length and complexity
            base_timeout = 10.0
            if len(prompt) > 1000:
                base_timeout = 15.0
            if len(prompt) > 2000:
                base_timeout = 20.0
                
            # Add streaming support for long responses
            if len(prompt) > 500:
                try:
                    response_chunks = []
                    start_time = time.time()
                    async for chunk in self.model_provider.get_streaming_response(prompt, system_message=system_message):
                        response_chunks.append(chunk)
                        # Check timeout periodically
                        if time.time() - start_time > base_timeout:
                            logger.warning(f"Model {model_used} streaming response timed out")
                            return "".join(response_chunks) + "\n[Response truncated due to timeout]"
                    return "".join(response_chunks)
                except AttributeError:
                    # Fallback to regular response if streaming not available
                    pass
            
            # For shorter prompts or when streaming unavailable, use regular response
            response = await asyncio.wait_for(
                self.model_provider.get_response(prompt, system_message=system_message),
                timeout=base_timeout
            )
            
            return response.strip()
            
        except asyncio.TimeoutError:
            logger.warning(f"Model {model_used} response timed out after {base_timeout}s")
            return "I apologize, but the response is taking longer than expected. Please try again with a simpler question."
        except Exception as e:
            logger.error(f"Error getting response from {model_used}: {str(e)}")
            return "I encountered an error while processing your question. Please try again."
    
    def _calculate_response_confidence(self, question: str, enhanced_question: str, response: str, 
                                     selected_text: str, context: Dict[str, Any]) -> float:
        """Calculate confidence score for the response."""
        
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on available context
        if selected_text:
            confidence += 0.15
        
        if context.get("content_analysis", {}).get("key_topics"):
            confidence += 0.10
        
        # Increase confidence if question was enhanced
        if enhanced_question != question:
            confidence += 0.10
        
        # Increase confidence based on response quality indicators
        if len(response) > 100:  # Substantial response
            confidence += 0.10
        
        if len(response) > 300:  # Detailed response
            confidence += 0.05
        
        # Check for structured response (bullet points, numbers, etc.)
        if any(indicator in response for indicator in ["•", "1.", "2.", "-", "\n\n"]):
            confidence += 0.05
        
        # Decrease confidence for very short responses
        if len(response) < 50:
            confidence -= 0.15
        
        # Decrease confidence for error messages
        if any(error_phrase in response.lower() for error_phrase in ["error", "apologize", "try again"]):
            confidence -= 0.20
        
        return min(max(confidence, 0.0), 1.0)
    
    def _estimate_token_usage(self, prompt: str, response: str) -> Dict[str, int]:
        """Estimate token usage for the query."""
        
        # Rough estimation: ~4 characters per token for English text
        input_tokens = len(prompt) // 4
        output_tokens = len(response) // 4
        
        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens
        } 