"""
Prompt Enhancement API Module

This module handles intelligent prompt enhancement using LLM providers
to improve user prompts with context, specificity, and clarity.
"""

import json
import re
import asyncio
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class PromptEnhancer:
    """
    Handles prompt enhancement with context and AI providers.
    
    Uses LLM providers to enhance user prompts by adding context,
    specificity, and clarity with configurable enhancement levels.
    """
    
    def __init__(self, model_provider):
        """Initialize with a model provider."""
        self.model_provider = model_provider
    
    async def enhance_prompt_with_llm(self, original_prompt: str, context: dict, 
                                    enhancement_level: str) -> dict:
        """Use LLM to enhance user prompts with context and specificity."""
        
        # Prepare context information
        selected_text = context.get("selected_text", "")
        content_analysis = context.get("content_analysis", {})
        website_type = context.get("website_type", "general")
        
        key_topics = content_analysis.get("key_topics", [])
        complexity = content_analysis.get("complexity", "intermediate")
        content_type = content_analysis.get("content_type", "informational")
        
        context_info = f"""
        Selected Text: {selected_text[:400] + '...' if len(selected_text) > 400 else selected_text}
        Key Topics: {', '.join(key_topics) if key_topics else 'Not specified'}
        Content Complexity: {complexity}
        Content Type: {content_type}
        Website Type: {website_type}
        """.strip()
        
        # Define enhancement level instructions
        level_instructions = {
            "light": "Make minimal improvements while preserving the original intent. Focus on clarity and basic context.",
            "moderate": "Add relevant context and specificity while maintaining natural language. Make the prompt more actionable and clear.",
            "aggressive": "Significantly expand the prompt with comprehensive context, specific requirements, and detailed instructions for optimal AI responses."
        }
        
        enhancement_instruction = level_instructions.get(enhancement_level, level_instructions["moderate"])
        
        # Create comprehensive system message for prompt enhancement
        system_message = f"""
        You are an expert prompt engineer. Your task is to enhance user prompts to make them more effective for AI responses.
        
        Enhancement Level: {enhancement_level.upper()}
        Enhancement Approach: {enhancement_instruction}
        
        Return your analysis in JSON format with these exact fields:
        {{
            "enhanced_prompt": "The improved version of the prompt",
            "improvements": ["array of specific improvements made"],
            "confidence": 0.0-1.0,
            "enhancement_type": "one of: context_expansion, specificity_boost, clarity_improvement, structure_optimization, comprehensive_rewrite",
            "reasoning": "brief explanation of the enhancement approach used"
        }}
        
        Guidelines for Enhancement:
        - Preserve the user's original intent and tone
        - Add relevant context from the provided information when helpful
        - Make the prompt more specific and actionable
        - Ensure the enhanced prompt will produce better AI responses
        - Don't over-complicate simple questions unless using aggressive enhancement
        - Focus on what will actually improve the AI's ability to help the user
        
        Enhancement Types:
        - context_expansion: Adding relevant background context and details
        - specificity_boost: Making vague requests more specific and targeted
        - clarity_improvement: Clarifying ambiguous or unclear language
        - structure_optimization: Improving the organization and flow of the prompt
        - comprehensive_rewrite: Significant restructuring for complex prompts
        
        Confidence Scoring:
        - 0.9-1.0: Significant improvement that will substantially help AI responses
        - 0.7-0.8: Good improvement with clear benefits
        - 0.5-0.6: Moderate improvement with some benefits
        - 0.3-0.4: Minor improvement or original was already good
        - 0.1-0.2: Minimal improvement possible or enhancement might not help
        """
        
        # Create enhancement prompt
        enhancement_prompt = f"""
        Enhance this user prompt using the provided context:
        
        ORIGINAL PROMPT:
        {original_prompt}
        
        AVAILABLE CONTEXT:
        {context_info}
        
        Apply {enhancement_level} enhancement level to improve this prompt. Focus on making it more effective for generating helpful AI responses while preserving the user's original intent.
        """
        
        try:
            # Get enhancement from LLM with timeout
            llm_response = await asyncio.wait_for(
                self.model_provider.get_response(enhancement_prompt, system_message=system_message),
                timeout=8.0  # 8 seconds timeout for consistency
            )
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
                if json_match:
                    llm_response = json_match.group(0)
                
                llm_enhancement = json.loads(llm_response)
                
                # Validate and clean the response
                validated_result = self.validate_enhancement_response(
                    llm_enhancement, original_prompt, enhancement_level
                )
                
                logger.info(f"LLM prompt enhancement successful: {validated_result.get('enhancement_type', 'unknown')} enhancement")
                return validated_result
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse LLM enhancement response: {str(e)}")
                logger.debug(f"Raw LLM response: {llm_response}")
                
                # Fallback to basic enhancement
                return self.fallback_prompt_enhancement(original_prompt, context, enhancement_level)
        
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"LLM prompt enhancement failed: {str(e)}")
            return self.fallback_prompt_enhancement(original_prompt, context, enhancement_level)

    def validate_enhancement_response(self, llm_result: dict, original_prompt: str, enhancement_level: str) -> dict:
        """Validate and clean LLM prompt enhancement results."""
        
        # Define valid values
        valid_enhancement_types = [
            "context_expansion", "specificity_boost", "clarity_improvement", 
            "structure_optimization", "comprehensive_rewrite"
        ]
        
        # Initialize result with defaults
        result = {
            "enhanced_prompt": original_prompt,
            "improvements": [],
            "confidence": 0.5,
            "enhancement_type": "clarity_improvement",
            "original_length": len(original_prompt),
            "enhanced_length": len(original_prompt),
            "reasoning": "Default enhancement applied"
        }
        
        # Validate enhanced prompt
        if "enhanced_prompt" in llm_result and isinstance(llm_result["enhanced_prompt"], str):
            enhanced = llm_result["enhanced_prompt"].strip()
            
            # Basic quality checks
            if enhanced and len(enhanced) >= len(original_prompt) * 0.5:  # Not too short
                # Ensure it's meaningfully different or improved
                if enhanced.lower() != original_prompt.lower() or len(enhanced) > len(original_prompt):
                    result["enhanced_prompt"] = enhanced
                    result["enhanced_length"] = len(enhanced)
        
        # Validate improvements array
        if "improvements" in llm_result and isinstance(llm_result["improvements"], list):
            valid_improvements = []
            for improvement in llm_result["improvements"]:
                if isinstance(improvement, str) and improvement.strip():
                    valid_improvements.append(improvement.strip())
            result["improvements"] = valid_improvements[:8]  # Limit to 8 improvements
        
        # Validate confidence
        if "confidence" in llm_result:
            try:
                confidence = float(llm_result["confidence"])
                result["confidence"] = max(0.0, min(1.0, confidence))
            except (ValueError, TypeError):
                result["confidence"] = self.calculate_enhancement_confidence(
                    original_prompt, result["enhanced_prompt"], result["improvements"]
                )
        
        # Validate enhancement type
        if "enhancement_type" in llm_result:
            enhancement_type = llm_result["enhancement_type"]
            if enhancement_type in valid_enhancement_types:
                result["enhancement_type"] = enhancement_type
        
        # Validate reasoning
        if "reasoning" in llm_result and isinstance(llm_result["reasoning"], str):
            result["reasoning"] = llm_result["reasoning"].strip()
        
        # Ensure we have some improvements listed if enhancement was successful
        if not result["improvements"] and result["enhanced_prompt"] != original_prompt:
            result["improvements"] = self.generate_basic_improvements(original_prompt, result["enhanced_prompt"])
        
        # Recalculate confidence if needed
        if result["confidence"] == 0.5:  # Default value, recalculate
            result["confidence"] = self.calculate_enhancement_confidence(
                original_prompt, result["enhanced_prompt"], result["improvements"]
            )
        
        return result

    def calculate_enhancement_confidence(self, original: str, enhanced: str, improvements: list) -> float:
        """Calculate confidence score for the enhancement."""
        
        confidence = 0.3  # Base confidence
        
        # Increase confidence based on meaningful changes
        length_ratio = len(enhanced) / len(original) if original else 1
        
        if length_ratio > 1.5:  # Significant expansion
            confidence += 0.25
        elif length_ratio > 1.2:  # Moderate expansion
            confidence += 0.15
        elif length_ratio > 1.05:  # Small expansion
            confidence += 0.05
        
        # Increase confidence based on number of improvements
        if len(improvements) >= 4:
            confidence += 0.20
        elif len(improvements) >= 2:
            confidence += 0.15
        elif len(improvements) >= 1:
            confidence += 0.10
        
        # Increase confidence if specific words suggest good enhancement
        enhanced_lower = enhanced.lower()
        quality_indicators = [
            "specific", "please provide", "including", "such as", "for example",
            "step-by-step", "detailed", "explain how", "what are the"
        ]
        
        indicator_count = sum(1 for indicator in quality_indicators if indicator in enhanced_lower)
        confidence += min(indicator_count * 0.05, 0.15)
        
        # Decrease confidence if enhancement seems minimal
        if enhanced.lower() == original.lower():
            confidence = 0.1
        
        return min(max(confidence, 0.0), 1.0)

    def generate_basic_improvements(self, original: str, enhanced: str) -> list:
        """Generate basic improvement descriptions when not provided."""
        
        improvements = []
        
        # Compare lengths
        if len(enhanced) > len(original) * 1.3:
            improvements.append("Significantly expanded prompt with additional context")
        elif len(enhanced) > len(original) * 1.1:
            improvements.append("Added relevant context and specificity")
        
        # Look for specific patterns in enhancement
        enhanced_lower = enhanced.lower()
        original_lower = original.lower()
        
        if "please" in enhanced_lower and "please" not in original_lower:
            improvements.append("Added polite language structure")
        
        if any(word in enhanced_lower for word in ["specific", "detailed", "step-by-step"]):
            improvements.append("Requested more specific and detailed information")
        
        if any(word in enhanced_lower for word in ["example", "such as", "including"]):
            improvements.append("Asked for examples and concrete details")
        
        if any(word in enhanced_lower for word in ["how", "what", "why", "when", "where"]):
            improvements.append("Added clarifying questions for better responses")
        
        if not improvements:
            improvements = ["Enhanced clarity and structure"]
        
        return improvements

    def fallback_prompt_enhancement(self, original_prompt: str, context: dict, enhancement_level: str) -> dict:
        """Fallback prompt enhancement when LLM fails."""
        
        # Basic enhancement based on context and level
        enhanced = original_prompt
        improvements = []
        
        # Get context elements
        selected_text = context.get("selected_text", "")
        key_topics = context.get("content_analysis", {}).get("key_topics", [])
        complexity = context.get("content_analysis", {}).get("complexity", "intermediate")
        
        # Apply basic enhancements based on level
        if enhancement_level == "light":
            # Minimal enhancement - just add context if very vague
            if len(original_prompt.split()) <= 3 and key_topics:
                enhanced = f"Regarding {key_topics[0]}, {original_prompt.lower()}"
                improvements.append("Added topic context for clarity")
        
        elif enhancement_level == "moderate":
            # Moderate enhancement - add context and make more specific
            if selected_text and len(original_prompt.split()) <= 5:
                enhanced = f"Based on the content about {', '.join(key_topics[:2]) if key_topics else 'this topic'}, {original_prompt.lower()}"
                improvements.append("Added context from selected content")
                improvements.append("Made the prompt more specific")
        
        elif enhancement_level == "aggressive":
            # Aggressive enhancement - comprehensive rewrite
            if key_topics:
                topic_context = f"about {', '.join(key_topics[:3])}"
            else:
                topic_context = "from the provided content"
            
            if len(original_prompt.split()) <= 5:
                enhanced = f"Based on the information {topic_context}, {original_prompt.lower()} Please provide specific details, examples, and actionable advice."
                improvements = [
                    "Added comprehensive context",
                    "Requested specific details and examples",
                    "Asked for actionable advice",
                    "Structured for better AI responses"
                ]
        
        # Calculate basic confidence
        confidence = 0.4 if enhanced != original_prompt else 0.2
        
        return {
            "enhanced_prompt": enhanced,
            "improvements": improvements,
            "confidence": confidence,
            "enhancement_type": "context_expansion" if enhanced != original_prompt else "clarity_improvement",
            "original_length": len(original_prompt),
            "enhanced_length": len(enhanced),
            "reasoning": f"Applied {enhancement_level} fallback enhancement"
        }

    @staticmethod
    def detect_explicit_provider_mention(prompt: str) -> Optional[str]:
        """
        Detect if the user explicitly mentions a specific AI provider in their prompt.
        
        Args:
            prompt: The user's input prompt
            
        Returns:
            The detected provider name (normalized) or None if no explicit mention found
        """
        prompt_lower = prompt.lower()
        
        # Define provider patterns - both exact names and common variations
        provider_patterns = {
            "gamma": ["gamma", "gamma ai", "using gamma", "with gamma", "via gamma"],
            "openai": ["openai", "open ai", "gpt", "chatgpt", "chat gpt", "using openai", "with openai", "via openai"],
            "anthropic": ["anthropic", "claude", "using anthropic", "with anthropic", "using claude", "with claude", "via anthropic", "via claude"],
            "google": ["google", "gemini", "bard", "using google", "with google", "using gemini", "with gemini", "via google", "via gemini"],
            "perplexity": ["perplexity", "using perplexity", "with perplexity", "via perplexity"],
            "grok": ["grok", "using grok", "with grok", "via grok"],
            "vercel": ["vercel", "using vercel", "with vercel", "via vercel"],
            "bolt": ["bolt", "using bolt", "with bolt", "via bolt"]
        }
        
        # Check for explicit mentions
        for provider, patterns in provider_patterns.items():
            for pattern in patterns:
                # Check for exact word matches to avoid false positives
                if f" {pattern} " in f" {prompt_lower} " or prompt_lower.startswith(pattern + " ") or prompt_lower.endswith(" " + pattern):
                    logger.info(f"Found explicit provider mention: '{pattern}' -> {provider}")
                    return provider
        
        # Check for common phrases that indicate provider preference
        provider_phrases = {
            "gamma": ["presentation using gamma", "slides with gamma", "deck using gamma", "create with gamma"],
            "openai": ["code with gpt", "write with gpt", "chatgpt to", "openai to"],
            "anthropic": ["claude to", "anthropic to", "claude for", "anthropic for"],
            "google": ["google to", "gemini to", "bard to", "google for", "gemini for"],
            "perplexity": ["perplexity to", "perplexity for", "search with perplexity"],
        }
        
        for provider, phrases in provider_phrases.items():
            for phrase in phrases:
                if phrase in prompt_lower:
                    logger.info(f"Found provider phrase: '{phrase}' -> {provider}")
                    return provider
        
        return None 