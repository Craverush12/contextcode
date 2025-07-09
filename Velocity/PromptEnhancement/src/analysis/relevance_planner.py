"""
RelevancePlanner module for intelligent context source relevance analysis.

This module provides functionality for determining which context sources are relevant
for prompt enhancement using LLM analysis and fallback heuristics.
"""

import asyncio
import json
import re
from typing import Dict, Any
from src.logging.logger import get_logger

logger = get_logger(__name__)

class RelevancePlanner:
    """
    Intelligent planner that determines which context sources are relevant for prompt enhancement.
    """
    
    def __init__(self, model_provider):
        """Initialize the RelevancePlanner with a model provider."""
        self.model_provider = model_provider
        logger.debug("RelevancePlanner initialized")
        
    async def determine_relevance(self, prompt: str, available_sources: dict) -> dict:
        """
        Analyze prompt and determine relevance scores for each available context source.
        
        Args:
            prompt: The user's prompt to analyze
            available_sources: Dict of available context sources and their metadata
            
        Returns:
            Dict with relevance scores and reasoning for each source
        """
        
        # Prepare sources information for analysis
        sources_info = []
        for source_name, source_data in available_sources.items():
            sources_info.append({
                "name": source_name,
                "description": source_data.get("description", ""),
                "metadata": source_data.get("metadata", {})
            })
        
        # Create system message for relevance analysis
        system_message = """
        You are an expert at determining which context sources are relevant for enhancing prompts. 
        Analyze the given prompt and rate the relevance of each available context source.

        Return your analysis in JSON format with these exact fields:
        {
            "relevance_scores": {
                "source_name": 0.0-1.0
            },
            "reasoning": {
                "source_name": "brief explanation for the score"
            },
            "overall_strategy": "one of: minimal, selective, comprehensive",
            "enhancement_needed": true/false
        }

        Relevance Guidelines:
        - chat_history: Rate high (0.7-1.0) if prompt references previous conversation, mentions "earlier", "before", or builds on context
        - web_context: Rate high (0.7-1.0) if prompt needs current information, research, comparisons, or real-world data
        - rag_strategies: Rate high (0.7-1.0) if prompt is complex, domain-specific, or would benefit from specialized approaches
        - Rate low (0.0-0.3) if source would add noise or isn't relevant
        - Rate medium (0.4-0.6) if source might be somewhat helpful but not essential

        Enhancement Strategy:
        - minimal: Simple prompt, needs little to no enhancement
        - selective: Use only highly relevant sources (score > 0.6)
        - comprehensive: Complex prompt benefiting from multiple sources
        """
        
        # Create analysis prompt
        analysis_prompt = f"""
        Analyze this prompt and determine relevance of available context sources:
        
        PROMPT TO ANALYZE:
        {prompt}
        
        AVAILABLE CONTEXT SOURCES:
        {chr(10).join([f"- {s['name']}: {s['description']}" for s in sources_info])}
        
        Rate the relevance (0.0-1.0) of each source for enhancing this specific prompt.
        Consider whether each source would genuinely improve the response quality or just add unnecessary context.
        """
        
        try:
            # Get relevance analysis from LLM
            llm_response = await asyncio.wait_for(
                self.model_provider.get_response(analysis_prompt, system_message=system_message),
                timeout=5.0
            )
            
            # Parse JSON response
            try:
                json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
                if json_match:
                    llm_response = json_match.group(0)
                
                relevance_result = json.loads(llm_response)
                
                # Validate and clean the response
                validated_result = self._validate_relevance_result(relevance_result, available_sources)
                
                logger.info(f"Relevance analysis completed: {validated_result.get('overall_strategy', 'unknown')} strategy")
                return validated_result
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse relevance response: {str(e)}")
                return self._fallback_relevance_analysis(prompt, available_sources)
        
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"Relevance analysis failed: {str(e)}")
            return self._fallback_relevance_analysis(prompt, available_sources)
    
    def _validate_relevance_result(self, result: dict, available_sources: dict) -> dict:
        """Validate and clean relevance analysis results."""
        
        validated = {
            "relevance_scores": {},
            "reasoning": {},
            "overall_strategy": "selective",
            "enhancement_needed": True
        }
        
        # Validate relevance scores
        if "relevance_scores" in result and isinstance(result["relevance_scores"], dict):
            for source_name in available_sources.keys():
                score = result["relevance_scores"].get(source_name, 0.5)
                try:
                    validated["relevance_scores"][source_name] = max(0.0, min(1.0, float(score)))
                except (ValueError, TypeError):
                    validated["relevance_scores"][source_name] = 0.5
        else:
            # Default scores if not provided
            for source_name in available_sources.keys():
                validated["relevance_scores"][source_name] = 0.5
        
        # Validate reasoning and adjust scores based on reasoning content
        if "reasoning" in result and isinstance(result["reasoning"], dict):
            for source_name in available_sources.keys():
                reasoning = result["reasoning"].get(source_name, "Default reasoning")
                validated["reasoning"][source_name] = str(reasoning)
                
                # IMPORTANT FIX: Analyze reasoning to ensure scores match the content
                reasoning_lower = reasoning.lower()
                current_score = validated["relevance_scores"][source_name]
                
                # If reasoning indicates high value but score is low, adjust the score
                high_value_indicators = [
                    "would benefit", "beneficial", "valuable", "helpful", "important",
                    "should use", "recommended", "essential", "significant", "useful",
                    "provide insights", "improve", "enhance", "complex topic"
                ]
                
                low_value_indicators = [
                    "not relevant", "wouldn't help", "unnecessary", "noise", "not needed",
                    "doesn't require", "limited need", "minimal benefit"
                ]
                
                high_value_count = sum(1 for indicator in high_value_indicators if indicator in reasoning_lower)
                low_value_count = sum(1 for indicator in low_value_indicators if indicator in reasoning_lower)
                
                # Adjust score based on reasoning content
                if high_value_count > 0 and current_score < 0.7:
                    # Reasoning indicates high value, boost the score
                    adjusted_score = max(current_score, 0.8)
                    validated["relevance_scores"][source_name] = adjusted_score
                    logger.info(f"Boosted {source_name} score from {current_score:.2f} to {adjusted_score:.2f} based on reasoning")
                elif low_value_count > 0 and current_score > 0.4:
                    # Reasoning indicates low value, reduce the score
                    adjusted_score = min(current_score, 0.3)
                    validated["relevance_scores"][source_name] = adjusted_score
                    logger.info(f"Reduced {source_name} score from {current_score:.2f} to {adjusted_score:.2f} based on reasoning")
        else:
            for source_name in available_sources.keys():
                validated["reasoning"][source_name] = "Default relevance assessment"
        
        # Validate strategy based on actual scores
        valid_strategies = ["minimal", "selective", "comprehensive"]
        if result.get("overall_strategy") in valid_strategies:
            validated["overall_strategy"] = result["overall_strategy"]
        
        # Recalculate strategy based on actual relevance scores with special handling for document context
        high_relevance_sources = [k for k, v in validated["relevance_scores"].items() if v > 0.6]
        
        # Special handling: If document_context is available and relevant, prioritize it
        has_document_context = "document_context" in validated["relevance_scores"] and validated["relevance_scores"]["document_context"] > 0.7
        
        if has_document_context:
            # Document context is highly valuable - force at least selective strategy
            if len(high_relevance_sources) >= 2:
                validated["overall_strategy"] = "comprehensive"
            else:
                validated["overall_strategy"] = "selective"  # Force selective when document context is available
            logger.info(f"Document context detected - using {validated['overall_strategy']} strategy to ensure effective utilization")
        else:
            # Standard strategy calculation
            if len(high_relevance_sources) >= 2:
                validated["overall_strategy"] = "comprehensive"
            elif len(high_relevance_sources) == 1:
                validated["overall_strategy"] = "selective"
            else:
                validated["overall_strategy"] = "minimal"
        
        # Validate enhancement needed
        if isinstance(result.get("enhancement_needed"), bool):
            validated["enhancement_needed"] = result["enhancement_needed"]
        
        return validated
    
    def _fallback_relevance_analysis(self, prompt: str, available_sources: dict) -> dict:
        """Fallback relevance analysis using improved heuristics."""
        
        prompt_lower = prompt.lower()
        scores = {}
        reasoning = {}
        
        for source_name in available_sources.keys():
            if source_name == "chat_history":
                # Check for conversation references
                if any(word in prompt_lower for word in ["earlier", "before", "previous", "we discussed", "you said", "mentioned", "talked about"]):
                    scores[source_name] = 0.8
                    reasoning[source_name] = "Prompt references previous conversation"
                else:
                    scores[source_name] = 0.2
                    reasoning[source_name] = "No clear reference to conversation history"
            
            elif source_name == "web_context":
                # Check for research/current info needs
                research_keywords = [
                    "latest", "current", "recent", "news", "research", "compare", "vs", "market",
                    "trending", "update", "today", "this year", "modern", "contemporary"
                ]
                if any(word in prompt_lower for word in research_keywords):
                    scores[source_name] = 0.9
                    reasoning[source_name] = "Prompt needs current/research information"
                else:
                    scores[source_name] = 0.3
                    reasoning[source_name] = "Limited need for external web context"
            
            elif source_name == "document_context":
                # Document context is always highly relevant when provided
                scores[source_name] = 1.0
                reasoning[source_name] = "Document context from uploaded content is highly relevant and should be used to create context-aware enhancements"
            
            elif source_name == "rag_strategies":
                # Enhanced detection for complex technical prompts
                complex_indicators = [
                    # Algorithm and data structure terms
                    "algorithm", "implementation", "data structure", "sorting", "searching",
                    "tree", "graph", "hash", "optimization", "complexity", "big o",
                    
                    # Programming concepts
                    "class", "function", "method", "object-oriented", "design pattern",
                    "inheritance", "polymorphism", "encapsulation", "abstraction",
                    
                    # Technical explanation requests
                    "detailed explanation", "step-by-step", "how does", "why does",
                    "parameters", "example", "tutorial", "guide", "documentation",
                    
                    # Complex topics
                    "machine learning", "artificial intelligence", "neural network",
                    "database", "sql", "api", "framework", "library", "architecture",
                    
                    # Math and science
                    "mathematical", "formula", "equation", "theorem", "proof",
                    "statistical", "probability", "calculus", "linear algebra"
                ]
                
                domain_specific_terms = [
                    # Specific algorithms
                    "dijkstra", "a*", "breadth-first", "depth-first", "quicksort", "mergesort",
                    "binary search", "linear search", "heap", "stack", "queue", "linked list",
                    
                    # Advanced programming
                    "recursive", "dynamic programming", "greedy", "backtracking",
                    "time complexity", "space complexity", "optimization",
                    
                    # Technical domains
                    "computer vision", "natural language processing", "blockchain",
                    "cryptography", "cybersecurity", "distributed systems"
                ]
                
                # Count indicators
                complex_count = sum(1 for indicator in complex_indicators if indicator in prompt_lower)
                domain_count = sum(1 for term in domain_specific_terms if term in prompt_lower)
                
                # Check for technical implementation requests
                implementation_requests = [
                    "write", "implement", "create", "build", "develop", "code", "program"
                ]
                is_implementation = any(word in prompt_lower for word in implementation_requests)
                
                # Check prompt length and complexity
                word_count = len(prompt.split())
                has_technical_terms = complex_count > 0 or domain_count > 0
                
                # Scoring logic
                if domain_count > 0:  # Specific technical terms
                    scores[source_name] = 0.9
                    reasoning[source_name] = f"Prompt contains domain-specific technical terms ({domain_count} found). RAG strategies would provide specialized approaches and best practices."
                elif complex_count >= 2 or (complex_count >= 1 and is_implementation):
                    scores[source_name] = 0.8
                    reasoning[source_name] = f"Complex technical prompt ({complex_count} complexity indicators) that would benefit from specialized strategies and optimization techniques."
                elif (word_count > 15 and has_technical_terms) or (is_implementation and has_technical_terms):
                    scores[source_name] = 0.7
                    reasoning[source_name] = "Technical implementation request that would benefit from domain-specific strategies and approaches."
                elif word_count > 20 or any(word in prompt_lower for word in ["detailed", "comprehensive", "thorough", "complete"]):
                    scores[source_name] = 0.6
                    reasoning[source_name] = "Detailed request that could benefit from specialized strategies."
                else:
                    scores[source_name] = 0.4
                    reasoning[source_name] = "Simple prompt with basic strategy needs"
            
            else:
                # Default scoring for unknown sources
                scores[source_name] = 0.5
                reasoning[source_name] = "Fallback relevance assessment"
        
        # Determine overall strategy based on scores with special handling for document context
        high_relevance_count = sum(1 for score in scores.values() if score > 0.6)
        has_document_context = "document_context" in scores and scores["document_context"] > 0.7
        
        if has_document_context:
            # Document context is highly valuable - force at least selective strategy
            if high_relevance_count >= 2:
                overall_strategy = "comprehensive"
            else:
                overall_strategy = "selective"  # Force selective when document context is available
            logger.info(f"Document context detected in fallback - using {overall_strategy} strategy")
        else:
            # Standard strategy calculation
            if high_relevance_count >= 2:
                overall_strategy = "comprehensive"
            elif high_relevance_count == 1:
                overall_strategy = "selective"
            else:
                overall_strategy = "minimal"
        
        return {
            "relevance_scores": scores,
            "reasoning": reasoning,
            "overall_strategy": overall_strategy,
            "enhancement_needed": True
        }
