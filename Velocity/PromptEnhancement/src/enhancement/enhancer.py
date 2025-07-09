"""Prompt enhancement module for the Dynamic LLM Router.

This module provides functionality for enhancing prompts using LLaMA via Groq and suggesting
the most appropriate LLM provider in parallel. The workflow consists of two
asynchronous tasks that run concurrently when the user clicks the Enhance button:
1. LLM Suggestion: Analyzes the prompt and determines the most appropriate LLM (without generating replies)
2. Prompt Enhancement: Enhances the original prompt for improved clarity and performance
   using LLaMA models via Groq as the LLM provider

Once both tasks complete, the enhanced prompt is provided along with the suggested LLM.
"""

import asyncio
from typing import Dict, Any, Tuple, Optional, List
import time
import os
import re
from concurrent.futures import ThreadPoolExecutor

from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_core.messages import HumanMessage, AIMessage
from langsmith import traceable, Client
from src.logging.logger import get_logger, log_execution_time
from src.llm.models import SelectionResult  # Import from the dedicated models module

# Import router components to avoid circular imports
from src.core import container, Analyzer, ModelSelector, ConfigProvider, ModelProvider
from src.llm.selector_v4 import SimpleSelector
from src.enhancement.prompt_strategy_retriever import fetch_prompt_strategies

# Set up logging
logger = get_logger(__name__)

class PromptEnhancer:
    """Handles prompt enhancement and LLM suggestion in parallel."""
    
    def __init__(self, 
                analyzer=None, 
                selector=None, 
                model_provider=None, 
                config_provider=None):
        """Initialize the prompt enhancer with injected dependencies."""
        # Use dependency injection to get components
        self.analyzer = analyzer or container.resolve(Analyzer)
        self.selector = selector or container.resolve(ModelSelector)
        self.model_provider = model_provider or container.resolve(ModelProvider)
        self.config_provider = config_provider or container.resolve(ConfigProvider)
        
        # Initialize batch processing semaphore
        self._batch_semaphore = asyncio.Semaphore(5)  # Limit concurrent batch operations
        
        # Add provider capabilities dictionary
        self.provider_capabilities = {
            "anthropic": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "complex reasoning", "technical writing",
                    "code", "architecture", "system design", "documentation"
                ],
                "description": "Best for analysis, planning, complex reasoning, and technical documentation"
            },
            "openai": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "image_generation", "creative writing",
                    "code", "documentation", "tutorials", "explanations"
                ],
                "description": "Best for general tasks, creative writing, and educational content"
            },
            "google": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "image_generation", "web search",
                    "code", "documentation", "research", "fact-checking"
                ],
                "description": "Best for general knowledge, web search, and research"
            },
            "perplexity": {
                "strengths": [
                    "analysis", "planning", "education", "general knowledge",
                    "chat", "qa", "research", "fact-checking",
                    "code", "documentation", "technical writing"
                ],
                "description": "Best for research, fact-checking, and technical documentation"
            },
            "gamma": {
                "strengths": [
                    "presentation", "planning", "education", "visual content",
                    "documentation", "tutorials", "explanations"
                ],
                "description": "Best for creating presentations and visual content"
            },
            "vercel": {
                "strengths": [
                    "fullstack", "frontend", "backend", "deployment", "app", 
                    "web development", "api", "database", "cloud",
                    "architecture", "system design", "devops", "scaling"
                ],
                "description": "Best for full-stack development, deployment, and cloud services, app devlopment"
            },
            "bolt": {
                "strengths": [
                    "fullstack", "frontend", "backend", "deployment", "app", "react", "reactjs", "reactnative",
                    "web development", "api", "database", "cloud",
                    "architecture", "system design", "devops", "scaling, app devlopment"
                ],
                "description": "Best for full-stack development, deployment, and cloud services, app devlopment"
            },
            "grok": {
                "strengths": [
                    "social", "chat", "general knowledge", "casual conversation",
                    "documentation", "tutorials", "explanations"
                ],
                "description": "Best for social interaction and casual conversation"
            }
        }
        
        # Centralized regex pattern registry for reuse
        self._regex_patterns = {
            # Boilerplate patterns
            'boilerplate': [
                r'Here\'s a (?:detailed|comprehensive|thorough) (?:response|answer|explanation):',
                r'I\'ll (?:help|assist) you with that.',
                r'Let me (?:help|assist) you with that.',
                r'Here\'s what I (?:think|believe|understand):',
                r'Based on your request,',
                r'To answer your question,',
                r'Here\'s a (?:step-by-step|detailed) guide:',
                r'I\'ve analyzed your query and',
                r'Let me break this down for you:',
                r'Here\'s a (?:simple|clear|concise) explanation:',
                r'To address your question,',
                r'Here\'s my (?:response|answer|explanation):',
                r'I\'ve prepared a (?:response|answer|explanation) for you:',
                r'Here\'s what you need to know:',
                r'Let me explain this to you:',
                r'Here\'s a (?:summary|overview) of what you need to know:',
                r'I\'ve researched this topic and',
                r'Here\'s a (?:comprehensive|detailed) answer to your question:',
                r'Let me provide you with a (?:detailed|comprehensive) answer:'
            ],
            
            # Formatting patterns - consolidated
            'formatting': [
                r'(?:Format|Tone|Target Audience|Key Points to Cover|Formatting Requirements'
                r'|SEO Considerations|Word Count|Research Requirements|Citation Requirements'
                r'|Enhanced Prompt|Original Prompt|Metadata|Suggested LLM|Domain):.*?(?=\n\n|\Z)',
                
                # Additional formatting patterns
                r'Format the article with.*?(?=\n\n|\Z)',
                r'Include at least.*?(?=\n\n|\Z)',
                r'Optimize the article for.*?(?=\n\n|\Z)',
                r'Cite at least.*?(?=\n\n|\Z)',
                r'The goal is to.*?(?=\n\n|\Z)',
                r'Here is the.*?(?=\n\n|\Z)',
                r'Original prompt:.*?(?=\n\n|\Z)',
                
                # Domain-specific patterns
                r'Domain:\s*[\w\s]+',
                r'Domain type:\s*[\w\s]+',
                r'This is a [\w\s]+ domain',
                r'For [\w\s]+ domain:',
                r'In the context of [\w\s]+ domain',
                r'From a [\w\s]+ perspective',
                r'As a [\w\s]+ task',
                r'For [\w\s]+ purposes',
                r'In [\w\s]+ context',
                r'This [\w\s]+ task requires',
                r'In the field of [\w\s]+',
                r'From the perspective of [\w\s]+',
                r'As part of [\w\s]+ writing',
                r'For a [\w\s]+ audience',
                r'Using [\w\s]+ terminology',
                r'Following [\w\s]+ conventions',
                r'In [\w\s]+ writing',
                r'For [\w\s]+ content',
                r'This is a [\w\s]+ related task',
                r'This falls under [\w\s]+ category'
            ]
        }
        
        # Precompile all regex patterns with appropriate flags
        self._compiled_patterns = {
            'boilerplate': [re.compile(pattern) for pattern in self._regex_patterns['boilerplate']],
            'formatting': [re.compile(pattern, re.DOTALL | re.IGNORECASE) for pattern in self._regex_patterns['formatting']]
        }
        
        logger.debug("PromptEnhancer initialized with dependency injection")
    
    async def _get_enhanced_prompt_safely(self, user_message: str, system_message: str) -> Optional[str]:
        """Safely get an enhanced prompt from the model provider."""
        try:
            return await asyncio.wait_for(
                self.model_provider.get_response(user_message, system_message=system_message),
                timeout=8.0
            )
        except Exception as e:
            logger.error(f"Error during enhancement attempt: {str(e)}")
            return None

    @traceable(run_type="chain", name="enhance_prompt")
    async def _enhance_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None, suggestion_result: Optional[SelectionResult] = None, web_context: Optional[str] = None) -> str:
        """Enhance a prompt using LLM with retries and format validation."""
        try:
            # Extract domain and writing style
            domain = context.get("domain", "general") if context else "general"
            writing_style = context.get("writing_style", "") if context else ""
            language = context.get("language", "") if context else ""
            
            # Extract settings constraints only if context and settings are explicitly provided
            settings = None
            settings_constraints = []
            format_validation = ""
            
            if context is not None:
                settings = context.get("settings")
            
            if settings is not None:  # Only process if settings were explicitly provided
                if "word_count" in settings:
                    settings_constraints.append(f"- Target word count: {settings['word_count']} words")
                if "language" in settings:
                    settings_constraints.append(f"- Output language: {settings['language']}")
                if "complexity_level" in settings:
                    settings_constraints.append(f"- Complexity level: {settings['complexity_level']}")
                if "output_format" in settings:
                    settings_constraints.append(f"- Output format: {settings['output_format']}")
                    if settings["output_format"] == "tabular":
                        format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST use tabular format with | and - characters
- Example format:
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
                if "custom_instructions" in settings:
                    settings_constraints.append(f"- Custom instructions: {settings['custom_instructions']}")
                if "template" in settings:
                    settings_constraints.append(f"- Template to follow: {settings['template']}")
                    
                # Language validation only if explicitly set
                if "language" in settings and settings["language"] == "hindi":
                    format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST be in Hindi script (Devanagari)
- Do not use transliteration or Roman script
"""
            
            # Build system message
            system_message = f"""You are an expert prompt enhancer. Your task is to enhance the given prompt to be more effective, clear, and aligned with the specified domain and requirements.

Domain: {domain}
Writing Style: {writing_style}"""

            if settings_constraints:
                system_message += "\n\nREQUIREMENTS:\n" + "\n".join(settings_constraints)
            
            if format_validation:
                system_message += "\n\n" + format_validation

            user_message = f"Please enhance this prompt:\n\n{prompt}"
            
            # Enhancement with retries for format validation
            max_retries = 3
            current_try = 0
            
            while current_try < max_retries:
                enhanced_prompt = None
                try:
                    enhanced_prompt = await asyncio.wait_for(
                        self.model_provider.get_response(user_message, system_message=system_message),
                        timeout=8.0
                    )
                except Exception as e:
                    logger.error(f"Error during enhancement attempt: {str(e)}")
                    current_try += 1
                    continue
                
                if enhanced_prompt is None:
                    current_try += 1
                    continue
                
                # Validate format requirements
                constraints_met = True
                
                if settings is not None:
                    # Check word count
                    if "word_count" in settings:
                        word_count = settings["word_count"]
                        actual_words = len(enhanced_prompt.split())
                        margin = word_count * 0.1  # 10% margin
                        if not (word_count - margin <= actual_words <= word_count + margin):
                            logger.warning(f"Word count mismatch: got {actual_words}, expected {word_count}")
                            constraints_met = False
                    
                    # Check language
                    if "language" in settings and settings["language"].lower() == "hindi":
                        if not any(ord('\u0900') <= ord(c) <= ord('\u097F') for c in enhanced_prompt):
                            logger.warning("Hindi script validation failed")
                            constraints_met = False
                    
                    # Check tabular format
                    if "output_format" in settings and settings["output_format"] == "tabular":
                        if not ("|" in enhanced_prompt and "-" in enhanced_prompt):
                            logger.warning("Tabular format validation failed")
                            constraints_met = False
                
                if constraints_met:
                    return enhanced_prompt
                
                # If constraints not met, try again with stronger emphasis
                current_try += 1
                if current_try < max_retries:
                    logger.info(f"Retrying enhancement (attempt {current_try + 1}) due to unmet constraints")
                    system_message += "\n\nCRITICAL: Previous response did not meet format requirements. Strictly follow ALL format requirements."
            
            # If we've exhausted retries or hit an error, use fallback
            return self._create_fallback_enhancement(prompt, domain, writing_style, language, settings)
            
        except Exception as e:
            logger.error(f"Error in LLM enhancement: {str(e)}")
            return self._create_fallback_enhancement(prompt, domain, writing_style, language, settings)

    async def _do_enhance_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None, suggestion_result: Optional[SelectionResult] = None, web_context: Optional[str] = None) -> str:
        """Internal method to handle the actual enhancement logic."""
        # Extract domain and writing style
        domain = context.get("domain", "general") if context else "general"
        writing_style = context.get("writing_style", "") if context else ""
        language = context.get("language", "") if context else ""
        
        # Extract settings constraints only if context and settings are explicitly provided
        settings = None
        settings_constraints = []
        format_validation = ""
        
        if context is not None:
            settings = context.get("settings")
        
        if settings is not None:  # Only process if settings were explicitly provided
            if "word_count" in settings:
                settings_constraints.append(f"- Target word count: {settings['word_count']} words")
            if "language" in settings:
                settings_constraints.append(f"- Output language: {settings['language']}")
            if "complexity_level" in settings:
                settings_constraints.append(f"- Complexity level: {settings['complexity_level']}")
            if "output_format" in settings:
                settings_constraints.append(f"- Output format: {settings['output_format']}")
                if settings["output_format"] == "tabular":
                    format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST use tabular format with | and - characters
- Example format:
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
            if "custom_instructions" in settings:
                settings_constraints.append(f"- Custom instructions: {settings['custom_instructions']}")
            if "template" in settings:
                settings_constraints.append(f"- Template to follow: {settings['template']}")
                
            # Language validation only if explicitly set
            if "language" in settings and settings["language"] == "hindi":
                format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST be in Hindi script (Devanagari)
- Do not use transliteration or Roman script
"""
        
        # Build system message
        system_message = f"""You are an expert prompt enhancer. Your task is to enhance the given prompt to be more effective, clear, and aligned with the specified domain and requirements.

Domain: {domain}
Writing Style: {writing_style}"""

        if settings_constraints:
            system_message += "\n\nREQUIREMENTS:\n" + "\n".join(settings_constraints)
        
        if format_validation:
            system_message += "\n\n" + format_validation

        user_message = f"Please enhance this prompt:\n\n{prompt}"
        
        # Enhancement with retries for format validation
        max_retries = 3
        current_try = 0
        enhanced_prompt = None
        
        while current_try < max_retries:
            try:
                enhanced_prompt = await asyncio.wait_for(
                    self.model_provider.get_response(user_message, system_message=system_message),
                    timeout=8.0
                )
                
                # Validate format requirements
                constraints_met = True
                
                if settings is not None:
                    # Check word count
                    if "word_count" in settings:
                        word_count = settings["word_count"]
                        actual_words = len(enhanced_prompt.split())
                        margin = word_count * 0.1  # 10% margin
                        if not (word_count - margin <= actual_words <= word_count + margin):
                            logger.warning(f"Word count mismatch: got {actual_words}, expected {word_count}")
                            constraints_met = False
                    
                    # Check language
                    if "language" in settings and settings["language"].lower() == "hindi":
                        if not any(ord('\u0900') <= ord(c) <= ord('\u097F') for c in enhanced_prompt):
                            logger.warning("Hindi script validation failed")
                            constraints_met = False
                    
                    # Check tabular format
                    if "output_format" in settings and settings["output_format"] == "tabular":
                        if not ("|" in enhanced_prompt and "-" in enhanced_prompt):
                            logger.warning("Tabular format validation failed")
                            constraints_met = False
                
                if constraints_met:
                    return enhanced_prompt
                
                # If constraints not met, try again with stronger emphasis
                current_try += 1
                if current_try < max_retries:
                    logger.info(f"Retrying enhancement (attempt {current_try + 1}) due to unmet constraints")
                    system_message += "\n\nCRITICAL: Previous response did not meet format requirements. Strictly follow ALL format requirements."
            
            except (asyncio.TimeoutError, Exception) as e:
                logger.error(f"Error during enhancement attempt: {str(e)}")
                current_try += 1
        
        # If we've exhausted retries or hit an error, use fallback
        return self._create_fallback_enhancement(prompt, domain, writing_style, language, settings)

    async def _enhance_single_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None, suggestion_result: Optional[SelectionResult] = None) -> str:
        """Internal method to enhance a single prompt without special handling."""
        # Move the original _enhance_prompt logic here
        # Ensure context is a dictionary - handle empty string explicitly
        if context == "":
            logger.warning("Context is an empty string in _enhance_prompt, converting to empty dict")
            context = {}
        elif context is not None and not isinstance(context, dict):
            logger.warning(f"Context is not a dictionary in _enhance_prompt, converting: {type(context)}")
            context = {"raw_context": context}
        
        # Identify which LLM will be used (user-provided or suggested)
        target_llm = None
        if context and "llm" in context and context["llm"]:
            # User explicitly provided an LLM
            target_llm = context["llm"]
            logger.info(f"Using user-provided LLM for enhancement strategy: {target_llm}")
        elif suggestion_result and suggestion_result.provider:
            # Use the suggested LLM from selector
            target_llm = suggestion_result.provider
            logger.info(f"Using suggested LLM for enhancement strategy: {target_llm}")
        else:
            # Fallback to a generic strategy
            target_llm = "general"
            logger.info("No LLM specified, using general enhancement strategy")
            
        try:
            # First check if this is a prompt engineering related query
            prompt_engineering_keywords = ["prompt engineer", "prompt engineering", "prompting", "chatgpt", "gpt", "llm", 
                                        "large language model", "prompt design", "chain of thought", "claude"]
            if any(keyword in prompt.lower() for keyword in prompt_engineering_keywords):
                logger.info("Detected prompt engineering query, using prompt_engineering domain")
                domain = "prompt_engineering"
            else:
                # Get domain from context or analyze
                domain = context.get("domain") if context else None
                if not domain:
                    domains = await self.analyzer.detect_domains(prompt)
                    domain = domains[0] if domains else "general"
            
            # Get LLM-specific strategy
            llm_strategy = context.get("llm_prompt_strategy") if context else None
            
            # Create analysis dict for the LLM strategy
            analysis_dict = {
                "domain": domain,
                "original_prompt": prompt
            }
            
            # Get writing style from context if available
            writing_style = context.get("writing_style", "") if context else ""
            writing_style_instruction = f"\n Apply the writing style: '{writing_style}'" if writing_style else ""
            
            # Create a strict system message tailored to the LLM
            system_message = f"""You are a prompt enhancement expert. Follow these guidelines:

1. Use the provided prompt strategy for enhancement
2. Incorporate relevant information from web search results
3. Maintain clarity and structure in the enhanced prompt
4. Follow the specific LLM's best practices
5. IMPORTANT: If the prompt contains multiple paragraphs separated by blank lines:
   - Only enhance the first part (the instruction/request)
   - Keep all paragraphs after the first part exactly as they are
   - Do not modify, remove, or enhance the actual paragraph content
   - Preserve the exact spacing and line breaks between paragraphs

Prompt Strategy:
{context.get("llm_prompt_strategy", "")}

Web Search Context:
{context.get("web_context", "No web context available")}"""
            
            # Create a direct prompt for the LLM
            writing_style_prompt = f"\nApply the writing style: '{writing_style}'" if writing_style else ""
            
            direct_prompt = f"""Original prompt: {prompt}
            
            Enhance the original prompt by incorporating the most relevant information from the web search results. The enhanced prompt should be comprehensive, factual, and well-structured.{writing_style_prompt}

            IMPORTANT: 
            1. Return ONLY the enhanced prompt text, not the template itself
            2. Do not include meta-instructions or references to the search results
            3. If the prompt contains multiple paragraphs separated by blank lines:
               - Only enhance the first part (the instruction/request)
               - Keep all paragraphs after the first part exactly as they are
               - Do not modify, remove, or enhance the actual paragraph content
               - Preserve the exact spacing and line breaks between paragraphs"""

            # Use injected model provider to get enhanced prompt
            enhanced_prompt = await self.model_provider.get_response(direct_prompt, system_message=system_message)
            
            # Final validation and formatting
            if not enhanced_prompt or len(enhanced_prompt.strip()) < 10 or "Original prompt:" in enhanced_prompt:
                # If enhancement failed, return a basic enhanced version
                logger.warning("Enhancement failed validation checks, using fallback enhancement")
                enhanced_prompt = f"Please provide a detailed response about {prompt}"
            
            return enhanced_prompt
            
        except Exception as e:
            # Check if this is a NVIDIA function ID error
            error_str = str(e).lower()
            if "function" in error_str and "not found" in error_str and "account" in error_str:
                logger.error(f"NVIDIA AI Endpoints function ID error: {str(e)}")
                logger.info("Attempting to use fallback model for enhancement")
                try:
                    # Try to use a different model via the model provider's fallback mechanism
                    enhanced_prompt = await self.model_provider.get_response_with_fallback(direct_prompt, system_message=system_message)
                    if enhanced_prompt:
                        return self._clean_response(enhanced_prompt)
                except Exception as fallback_error:
                    logger.error(f"Fallback enhancement also failed: {str(fallback_error)}")
            # Log the error and return the original prompt
            logger.error(f"Error enhancing prompt: {str(e)}")
            return prompt
    

    
    def _remove_boilerplate(self, prompt: str) -> str:
        """Remove common boilerplate phrases from the prompt."""
        # Use precompiled regex patterns for faster processing
        for pattern in self._compiled_patterns['boilerplate']:
            prompt = pattern.sub('', prompt)
        
        # Remove any leading/trailing whitespace
        prompt = prompt.strip()
        
        return prompt
    
    
    
    @traceable(run_type="chain", name="process_batch")
    async def process_batch(self, prompts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple prompts in parallel with rate limiting.
        
        Args:
            prompts: List of dictionaries with 'prompt' and optional 'context' keys
            
        Returns:
            List of enhanced prompts with metadata
        """
        async with self._batch_semaphore:
            # Process prompts in parallel with rate limiting
            tasks = []
            for prompt_data in prompts:
                prompt = prompt_data.get('prompt', '')
                context = prompt_data.get('context', {})
                
                # Ensure context is a dictionary - handle empty string explicitly
                if context == "":
                    # Empty string case
                    logger.warning("Context is an empty string in process_batch, converting to empty dict")
                    context = {}
                elif context is not None and not isinstance(context, dict):
                    # Other non-dict types
                    logger.warning(f"Context is not a dictionary in process_batch, converting: {type(context)}")
                    context = {"raw_context": context}
                    
                tasks.append(self._enhance_prompt(prompt, context))
            
            return await asyncio.gather(*tasks)
    
    def enhance_sync(self, prompt: str) -> str:
        """Synchronous version of prompt enhancement for compatibility."""
        # Create an event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Run the async process method
            result = loop.run_until_complete(self._enhance_prompt(prompt))
            return result
        finally:
            # Close the event loop
            loop.close()
    
    @traceable(run_type="chain", name="process_with_web_search")
    async def process_with_web_search(self, original_prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process a prompt with web search enhancement before regular enhancement.
        
        This method adds an additional step to search for relevant content from the web before
        enhancing the prompt using the LLM.
        
        Args:
            original_prompt: The original prompt to enhance
            context: Optional context including user-provided parameters
            
        Returns:
            Dictionary with enhanced prompt, suggested LLM, and web search results
        """
        # Ensure context is a dictionary
        if context == "":
            # Empty string case
            logger.warning("Context is an empty string in process_with_web_search, converting to empty dict")
            context = {}
        elif context is not None and not isinstance(context, dict):
            # Other non-dict types
            logger.warning(f"Context is not a dictionary in process_with_web_search, converting: {type(context)}")
            context = {"raw_context": context}
        
        # Get search related parameters from context
        search_type = context.get("search_type", "web")
        top_k = context.get("top_k", 3)
        
        try:
            # Import web search module
            from src.analysis.web_search import get_instance as get_search_instance
            
            # Get web search instance
            web_search = get_search_instance()
            
            # Search for relevant content
            search_result = await web_search.search_and_enhance(original_prompt, search_type, top_k)
            
            # If no relevant content found, just use the original prompt
            web_enhanced_prompt = search_result.get("enhanced_query", original_prompt)
            
            # Add search results to context for further enhancement
            if context is None:
                context = {}
            
            context["search_results"] = search_result.get("search_results", [])
            context["has_relevant_content"] = search_result.get("has_relevant_content", False)
            context["search_type"] = search_type
            
            # Process the web-enhanced prompt with the regular enhancer
            enhancement_result = await self.process(web_enhanced_prompt, context)
            
            # Add search information to the result
            enhancement_result["search_info"] = {
                "original_prompt": original_prompt,
                "web_enhanced_prompt": web_enhanced_prompt,
                "search_results": search_result.get("search_results", []),
                "search_result_count": len(search_result.get("search_results", [])),
                "search_type": search_type,
                "has_relevant_content": search_result.get("has_relevant_content", False)
            }
            
            return enhancement_result
            
        except Exception as e:
            logger.error(f"Error in web search-enhanced processing: {str(e)}")
            # Fall back to regular processing if web search fails
            logger.info("Falling back to regular enhancement without web search")
            return await self.process(original_prompt, context)
    
    @traceable(run_type="chain", name="enhance_and_suggest")
    async def enhance_and_suggest(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Enhance the prompt and suggest an LLM provider in parallel with fallback support.
        
        This method runs prompt enhancement and LLM suggestion in parallel
        to minimize latency. It also supports fallback to alternative providers
        if the primary provider fails.
        
        Args:
            prompt: The original prompt to enhance
            context: Optional context including user-provided LLM
            
        Returns:
            Dictionary with enhanced prompt and suggested LLM provider
        """
        # Start the suggestion task
        suggestion_task = asyncio.create_task(self.selector.select_provider({"original_prompt": prompt, **context} if context else {"original_prompt": prompt}))
        
        # Wait for suggestion to complete first
        suggestion_result = await suggestion_task
        
        try:
            # Then enhance the prompt with the suggestion result
            enhanced_prompt = await self._enhance_prompt(prompt, context, suggestion_result)
            
            # Return both results with fallback information
            return {
                "enhanced_prompt": enhanced_prompt,
                "suggested_provider": suggestion_result.provider,
                "timestamp": suggestion_result.timestamp,
                "original_provider": suggestion_result.original_provider,
                "is_fallback": suggestion_result.is_fallback,
                "fallback_reason": suggestion_result.fallback_reason
            }
        except Exception as e:
            # If enhancement fails, try to get a fallback provider
            logger.error(f"Error in prompt enhancement: {str(e)}")
            
            # Get a fallback provider using the selector's fallback mechanism
            fallback_result = await self.selector.handle_provider_failure(suggestion_result, prompt)
            
            # Try again with the fallback provider
            try:
                enhanced_prompt = await self._enhance_prompt(prompt, context, fallback_result)
            except Exception as fallback_error:
                # If fallback enhancement also fails, return the original prompt
                logger.error(f"Fallback enhancement also failed: {str(fallback_error)}")
                enhanced_prompt = prompt
            
            # Return results with fallback information
            return {
                "enhanced_prompt": enhanced_prompt,
                "suggested_provider": fallback_result.provider,
                "timestamp": time.time(),
                "original_provider": fallback_result.original_provider,
                "is_fallback": True,
                "fallback_reason": f"Original provider failed: {str(e)}"
            }

    @traceable(run_type="chain", name="process_prompt")
    async def process(self, original_prompt: str, context: Optional[Dict[str, Any]] = None, web_context: Optional[str] = None) -> Dict[str, Any]:
        """Process a prompt by enhancing it using the model provider."""
        # Ensure context is a dictionary - handle empty string explicitly
        if context == "":
            # Empty string case
            logger.warning("Context is an empty string in process, converting to empty dict")
            context = {}
        
        # Use SimpleSelector to determine both domain and provider in a single LLM call
        selector = SimpleSelector.get_instance()
        domain, llm_suggestion_result = await selector.select_domain_and_provider(original_prompt, self.provider_capabilities)
        if llm_suggestion_result == "vercel or bolt":
            llm_suggestion_result = "bolt"
            
        logger.info(f"LLM Selector determined domain: {domain}, provider: {llm_suggestion_result.provider}")
        if context is None:
            context = {}
            
        context["domain"] = domain
        context["llm"] = llm_suggestion_result.provider
        
        # Get LLM suggestion with improved error handling
        user_provided_llm = None
        # If user provided an LLM, override the LLM suggestion
        if context and "llm" in context and context["llm"]:
            user_provided_llm = context["llm"]
            logger.info(f"Using user-provided LLM: {user_provided_llm}")
            llm_suggestion_result.provider = user_provided_llm
            llm_suggestion_result.original_provider = user_provided_llm
            llm_suggestion_result.is_fallback = False
            llm_suggestion_result.fallback_reason = ""
        else:
            try:
                # Use selector for LLM selection
                logger.info(f"Getting LLM suggestion for prompt: {original_prompt[:100]}...")
                analysis = {
                    "original_prompt": original_prompt,
                    "domain": domain,
                    "context": context or {}
                }
                llm_suggestion_result = await self.selector.select_provider(analysis)
                logger.info(f"LLM suggestion result: {llm_suggestion_result.provider}")
                
                # Validate suggestion result
                if not llm_suggestion_result or not llm_suggestion_result.provider:
                    raise ValueError("Invalid LLM suggestion result")
                    
            except Exception as e:
                logger.error(f"Error in LLM suggestion: {str(e)}")
                # Use domain-specific fallback providers
                if domain in ["development", "code", "technical"]:
                    llm_suggestion_result = SelectionResult(
                        provider="claude-3-opus",
                        is_from_cache=False,
                        cache_key="",
                        timestamp=time.time(),
                        original_provider="",
                        is_fallback=True,
                        fallback_reason=f"Error in LLM suggestion: {str(e)}"
                    )
                    logger.info("Using fallback provider: claude-3-opus (development domain)")
                else:
                    llm_suggestion_result = SelectionResult(
                        provider="gpt-4",
                        is_from_cache=False,
                        cache_key="",
                        timestamp=time.time(),
                        original_provider="",
                        is_fallback=True,
                        fallback_reason=f"Error in LLM suggestion: {str(e)}"
                    )
                    logger.info("Using fallback provider: gpt-4 (default domain)")
        
        # Get the effective LLM to use
        effective_llm = user_provided_llm if user_provided_llm else llm_suggestion_result.provider

        # Get prompt strategy using RAG-enhanced retrieval if not already in context
        top_strategy = None
        if not context.get("llm_prompt_strategy"):
            try:
                # Import the new RAG-enhanced strategy retrieval function
                from .prompt_strategy_retriever import rag_enhanced_strategy_retrieval_async
                
                # Use the RAG-enhanced retrieval to get a strategy tailored to this prompt and LLM
                logger.info(f"Retrieving RAG-enhanced prompt strategy for {effective_llm} with domain {domain}")
                top_strategy = await rag_enhanced_strategy_retrieval_async(
                    effective_llm, 
                    original_prompt, 
                    domain
                )
                
                if top_strategy:
                    logger.info(f"Successfully retrieved RAG-enhanced prompt strategy")
                    context["llm_prompt_strategy"] = top_strategy
                    context["strategy_source"] = "rag_enhanced"
                else:
                    logger.warning("RAG-enhanced strategy retrieval returned empty result, falling back to simple retrieval")
                    # Fall back to simple retrieval if RAG enhancement fails
                    from .prompt_strategy_retriever import fetch_prompt_strategies_async
                    strategies = await fetch_prompt_strategies_async(effective_llm, top_k=1, domain=domain)
                    top_strategy = strategies[0].page_content if strategies else None
                    if top_strategy:
                        context["llm_prompt_strategy"] = top_strategy
                        context["strategy_source"] = "simple_retrieval"
            except Exception as e:
                logger.error(f"Error retrieving prompt strategy: {str(e)}")
                top_strategy = None
        else:
            top_strategy = context["llm_prompt_strategy"]
            logger.info("Using prompt strategy from context")
        
        # Enhance prompt with the selected provider
        try:
            enhanced_prompt = await self._enhance_prompt(original_prompt, context, llm_suggestion_result)
            if not enhanced_prompt:
                raise ValueError("Invalid enhanced prompt result")
        except Exception as e:
            logger.error(f"Error in prompt enhancement: {str(e)}")
            enhanced_prompt = original_prompt
            logger.info("Using original prompt due to enhancement failure")
        
        # Extract writing style from context if available
        writing_style = context.get("writing_style", "") if context else ""
        
        # Get settings from context
        word_count = context.get("word_count")
        custom_instructions = context.get("custom_instructions", "")
        template = context.get("template", "")
        language = context.get("language", "")
        complexity_level = context.get("complexity_level", "")
        output_format = context.get("output_format", "")
        
        # Prepare the result
        result = {
            "original_prompt": original_prompt,
            "enhanced_prompt": enhanced_prompt,
            "suggested_llm": effective_llm,
            "metadata": {
                "enhancement_applied": enhanced_prompt != original_prompt,
                "timestamp": time.time(),
                "enhancement_method": "rag_enhanced_strategy" if context.get("strategy_source") == "rag_enhanced" else "dependency_injection",
                "domain": domain,
                "user_provided_llm": user_provided_llm is not None,
                "writing_style": writing_style,
                "is_fallback": getattr(llm_suggestion_result, 'is_fallback', False),
                "fallback_reason": getattr(llm_suggestion_result, 'fallback_reason', ""),
                "original_provider": getattr(llm_suggestion_result, 'original_provider', ""),
                "llm_prompt_strategy": top_strategy,
                "strategy_source": context.get("strategy_source", "unknown"),
                "settings": {
                    "word_count": word_count,
                    "custom_instructions": custom_instructions if custom_instructions else None,
                    "template": template if template else None,
                    "language": language if language else None,
                    "complexity_level": complexity_level if complexity_level else None,
                    "output_format": output_format if output_format else None
                }
            }
        }
        
        return result

    @traceable(run_type="chain", name="enhance_with_web_context")
    async def _enhance_prompt_with_web_context(self, prompt: str, context: Optional[Dict[str, Any]] = None, suggestion_result: Optional[SelectionResult] = None) -> str:
        try:
            # Get settings from context
            word_count = context.get("word_count")
            custom_instructions = context.get("custom_instructions", "")
            template = context.get("template", "")
            language = context.get("language", "")
            complexity_level = context.get("complexity_level", "")
            output_format = context.get("output_format", "")

            # Build settings constraints with stronger enforcement
            settings_constraints = []
            if word_count is not None:
                settings_constraints.append(f"- CRITICAL: The enhanced prompt MUST be EXACTLY {word_count} words long")
            if language:
                settings_constraints.append(f"- CRITICAL: The enhanced prompt MUST be written in {language} language ONLY")
            if complexity_level:
                settings_constraints.append(f"- CRITICAL: Use {complexity_level} complexity level in the response")
            if output_format == "tabular":
                settings_constraints.append("""- CRITICAL: Format the response in a table structure using markdown:
| Column1 | Column2 | ... |
|---------|---------|-----|
| Data    | Data    | ... |""")
            elif output_format:
                settings_constraints.append(f"- CRITICAL: Format the response according to: {output_format}")

            # Build format validation instruction
            format_validation = """
CRITICAL FORMAT REQUIREMENTS:
1. If language is specified, the ENTIRE response must be in that language only
2. If word count is specified, count words carefully and match exactly
3. If tabular format is specified, use proper markdown table syntax
4. DO NOT include any explanations or notes - return ONLY the enhanced prompt
5. DO NOT mention these requirements in the output"""

            # Get other context parameters
            domain = context.get("domain", "general")
            intent = context.get("intent", "")
            intent_description = context.get("intent_description", "")
            selected_llm = context.get("llm", "")
            web_context = context.get("web_context", "")
            document_context = context.get("document_context", "")
            prompt_strategy = context.get("llm_prompt_strategy", "")
            writing_style = context.get("writing_style", "")
            has_intent = bool(intent or intent_description)
            has_strategy = bool(prompt_strategy)
            has_web_context = bool(web_context)

            # Handle Suno character limit
            suno_instruction = ""
            if selected_llm and selected_llm.lower() == "suno":
                suno_instruction = "\n- CRITICAL: The enhanced prompt MUST be under 195 characters total (Suno requirement)"
                settings_constraints.append("- CRITICAL: Keep total length under 195 characters")

            # Build the system message
            if has_strategy:
                # Strategy-based enhancement
                intent_instruction = self._build_intent_instruction(intent, intent_description) if has_intent else ""
                
                system_message = f"""You are an expert prompt enhancer. Follow these specific guidelines:

1. Use the provided prompt strategy as your primary enhancement framework
2. Apply domain-specific best practices for {domain}
3. Optimize for the target LLM: {selected_llm}
4. Incorporate relevant web context if available
5. Maintain the original intent while dramatically improving clarity and effectiveness
6. NEVER mention specific LLM models or providers in your enhanced prompt
7. CRITICAL: If document context is provided, incorporate relevant information from it

ENHANCEMENT CONSTRAINTS:
{chr(10).join(settings_constraints)}

{format_validation}

{intent_instruction}{suno_instruction}

PROMPT STRATEGY TO FOLLOW:
{prompt_strategy}

Domain: {domain}"""

            else:
                # Standard enhancement
                intent_instruction = self._build_intent_instruction(intent, intent_description) if has_intent else ""
                
                system_message = f"""You are an expert prompt enhancer. Improve the user's prompt by making it more specific, actionable, and well-structured while maintaining the original intent.

Apply best practices for {domain} domain and optimize for {selected_llm}.

ENHANCEMENT CONSTRAINTS:
{chr(10).join(settings_constraints)}

{format_validation}

{intent_instruction}{suno_instruction}

Domain: {domain}
Target LLM: {selected_llm}"""

            # Build user message with settings
            settings = context.get("settings", {})
            template = settings.get("template", "")
            custom_instructions = settings.get("custom_instructions", "")
            writing_style = settings.get("writing_style", "")
            
            # Build format instructions based on settings
            format_instructions = []
            if settings.get("output_format") == "tabular":
                format_instructions.append("""Format the response as a markdown table with headers and data rows:
| Column1 | Column2 | ... |
|---------|---------|-----|
| Data    | Data    | ... |""")
            if settings.get("language"):
                format_instructions.append(f"Write the entire response in {settings['language']} language")
            if settings.get("complexity_level"):
                format_instructions.append(f"Use {settings['complexity_level']} complexity level")
            if settings.get("word_count"):
                format_instructions.append(f"The response must be exactly {settings['word_count']} words")
                
            # Build user message
            message_parts = ["Original prompt: " + prompt]
            
            if template:
                message_parts.append(f"Use this template to structure the enhanced prompt:\n{template}")
            if custom_instructions:
                message_parts.append(f"Additional instructions: {custom_instructions}")
            if writing_style:
                message_parts.append(f"Writing style: {writing_style}")
            if format_instructions:
                message_parts.append("\n".join(format_instructions))
                
            message_parts.append("Enhanced prompt:")
            user_message = "\n\n".join(message_parts)

            # Add web context if available
            if has_web_context:
                user_message += f"\n\nRelevant web context to incorporate:\n{web_context}"

            # Add document context if available
            if document_context:
                user_message += f"\n\n🔥 CRITICAL DOCUMENT CONTEXT to incorporate:\n{document_context}"

            # Get enhanced prompt from LLM with longer timeout
            enhanced_prompt = await asyncio.wait_for(
                self.model_provider.get_response(user_message, system_message=system_message),
                timeout=15.0  # 15 seconds timeout to allow for model fallback
            )

            # Validate and potentially retry if constraints not met
            max_retries = 2
            current_try = 0
            
            while current_try < max_retries:
                # Clean the response
                enhanced_prompt = self._clean_response(enhanced_prompt)
                
                # Validate constraints
                constraints_met = True
                
                # Get settings from context
                settings = context.get("settings", {})
                
                # Check word count if specified
                word_count = settings.get("word_count")
                if word_count is not None:
                    actual_words = len(enhanced_prompt.split())
                    # Allow 10% margin
                    if not (word_count * 0.9 <= actual_words <= word_count * 1.1):
                        constraints_met = False
                        logger.warning(f"Word count mismatch: got {actual_words}, expected {word_count}")
                
                # Check language if specified
                language = settings.get("language")
                if language and language.lower() == "hindi":
                    # Basic check for Devanagari script
                    if not any(ord('\u0900') <= ord(c) <= ord('\u097F') for c in enhanced_prompt):
                        constraints_met = False
                        logger.warning("Response not in Hindi script")
                
                # Check output format if specified
                output_format = settings.get("output_format")
                if output_format == "tabular":
                    # Check for proper table structure
                    lines = enhanced_prompt.split("\n")
                    has_header = any("|" in line for line in lines)
                    has_separator = any("-" in line for line in lines)
                    has_data = len([line for line in lines if "|" in line]) > 1
                    
                    if not (has_header and has_separator and has_data):
                        constraints_met = False
                        logger.warning("Response not in proper tabular format")
                
                # Check complexity level if specified
                complexity_level = settings.get("complexity_level")
                if complexity_level:
                    # Basic complexity check based on sentence structure and word length
                    sentences = enhanced_prompt.split(".")
                    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
                    avg_word_length = sum(len(word) for word in enhanced_prompt.split()) / len(enhanced_prompt.split())
                    
                    if complexity_level == "simple" and (avg_sentence_length > 15 or avg_word_length > 6):
                        constraints_met = False
                        logger.warning("Response too complex for simple level")
                    elif complexity_level == "good" and (avg_sentence_length < 10 or avg_word_length < 4):
                        constraints_met = False
                        logger.warning("Response too simple for good level")
                
                if constraints_met:
                    break
                
                # If constraints not met and retries left, try again with stronger emphasis
                current_try += 1
                if current_try < max_retries:
                    logger.info(f"Retrying enhancement (attempt {current_try + 1}) due to unmet constraints")
                    system_message += "\n\nCRITICAL: Previous response did not meet format requirements. Strictly follow ALL format requirements."
                    enhanced_prompt = await asyncio.wait_for(
                        self.model_provider.get_response(user_message, system_message=system_message),
                        timeout=8.0
                    )
            
            return enhanced_prompt

        except Exception as e:
            logger.error(f"Error in LLM enhancement: {str(e)}")
            return self._create_fallback_enhancement(prompt, domain, writing_style, language, settings)

    def _create_fallback_enhancement(self, prompt: str, domain: str, writing_style: str, language: str = "", settings: Optional[Dict[str, Any]] = None) -> str:
        """Create a fallback enhancement when the main enhancement fails."""
        if not settings:
            settings = {}
            
        # Handle language setting
        language = settings.get("language", language)
        if language and language.lower() == "hindi":
            # Basic Hindi fallback using transliteration
            base_prompt = f"कृपया इस विषय पर विस्तृत जानकारी प्रदान करें: {prompt}"
        else:
            base_prompt = f"Please provide a detailed response about: {prompt}"
            
        # Handle output format
        output_format = settings.get("output_format")
        if output_format == "tabular":
            return f"""| Topic | Details |
|--------|----------|
| {prompt} | {base_prompt} |"""
            
        return base_prompt

    def _build_intent_instruction(self, intent: str, intent_description: str) -> str:
        """Build the intent instruction part of the system message."""
        if not intent and not intent_description:
            return ""
            
        instruction = "\nINTENT CONTEXT:"
        if intent:
            instruction += f"\n- User Intent: {intent}"
        if intent_description:
            instruction += f"\n- Intent Description: {intent_description}"
        instruction += "\n\nTailor the enhancement to effectively support this specific intent."
        return instruction

    def _clean_response(self, response: str) -> str:
        """Clean up the LLM response to extract just the enhanced prompt."""
        # Remove common prefixes
        prefixes = ["Enhanced prompt:", "Here's the enhanced prompt:", "Enhanced version:"]
        response = response.strip()
        
        for prefix in prefixes:
            if response.lower().startswith(prefix.lower()):
                response = response[len(prefix):].strip()
                
        return response
    
    @traceable(run_type="chain", name="process_with_web_context_optimized")
    async def process_with_web_context(self, original_prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Optimized processing with web context integration, prompt strategies, and efficient enhancement flow.
        
        Args:
            original_prompt: The original prompt to enhance
            context: Context including web context, LLM preferences, prompt strategies, and other parameters
            
        Returns:
            Dictionary with enhanced prompt and metadata
        """
        start_time = time.perf_counter()
        
        # Normalize context efficiently
        if not context or context == "":
            context = {}
        elif not isinstance(context, dict):
            context = {"raw_context": context}
        
        try:
            # Step 1: Quick domain detection (only if not provided)
            domain = context.get("domain")
            if not domain:
                # Use a simple keyword-based domain detection for speed
                prompt_lower = original_prompt.lower()
                if any(kw in prompt_lower for kw in ["code", "programming", "api", "function", "class", "method"]):
                    domain = "development"
                elif any(kw in prompt_lower for kw in ["analyze", "data", "statistics", "research"]):
                    domain = "analysis"
                elif any(kw in prompt_lower for kw in ["write", "content", "article", "blog"]):
                    domain = "writing"
                else:
                    domain = "general"
                context["domain"] = domain
            
            # Step 2: LLM selection (prefer user choice or use fast fallback)
            selected_llm = context.get("llm")
            if not selected_llm:
                # Quick LLM selection based on domain
                llm_mapping = {
                    "development": "anthropic",
                    "analysis": "openai",
                    "writing": "openai",
                    "general": "openai"
                }
                selected_llm = llm_mapping.get(domain, "gpt-4")
                context["llm"] = selected_llm
            
            # Step 3: Prepare enhancement context with type checking
            web_context = context.get("web_context", "")
            if not isinstance(web_context, str):
                logger.warning(f"web_context is not a string: {type(web_context)}, converting to string")
                web_context = str(web_context) if web_context else ""
            has_web_content = bool(web_context and len(web_context.strip()) > 20)
            
            document_context = context.get("document_context", "")
            if not isinstance(document_context, str):
                logger.warning(f"document_context is not a string: {type(document_context)}, converting to string")
                document_context = str(document_context) if document_context else ""
            has_document_content = bool(document_context and len(document_context.strip()) > 20)
            
            writing_style = context.get("writing_style", "")
            if writing_style and not isinstance(writing_style, str):
                logger.warning(f"writing_style is not a string: {type(writing_style)}, converting to string")
                writing_style = str(writing_style)
            
            # Extract language from settings for fallback enhancement
            language = ""
            if context and context.get("settings") and isinstance(context.get("settings"), dict):
                language = context["settings"].get("language", "")
                if language and not isinstance(language, str):
                    logger.warning(f"language is not a string: {type(language)}, converting to string")
                    language = str(language)
            
            prompt_strategy = context.get("llm_prompt_strategy", "")
            if not isinstance(prompt_strategy, str):
                logger.warning(f"prompt_strategy is not a string: {type(prompt_strategy)}, converting to string")
                prompt_strategy = str(prompt_strategy) if prompt_strategy else ""
            has_strategy = bool(prompt_strategy and len(prompt_strategy.strip()) > 10)
            
            # Extract intent information for enhancement customization
            intent = context.get("intent", "")
            if intent and not isinstance(intent, str):
                logger.warning(f"intent is not a string: {type(intent)}, converting to string")
                intent = str(intent)
            
            intent_description = context.get("intent_description", "")
            if intent_description and not isinstance(intent_description, str):
                logger.warning(f"intent_description is not a string: {type(intent_description)}, converting to string")
                intent_description = str(intent_description)
                
            has_intent = bool(intent and intent.strip())
            
            # Extract settings constraints only if context and settings are explicitly provided
            settings = None
            settings_constraints = []
            format_validation = ""
            
            if context is not None:
                settings = context.get("settings")
            
            if settings is not None:  # Only process if settings were explicitly provided
                if "word_count" in settings:
                    settings_constraints.append(f"- Target word count: {settings['word_count']} words")
                if "language" in settings:
                    settings_constraints.append(f"- Output language: {settings['language']}")
                if "complexity_level" in settings:
                    settings_constraints.append(f"- Complexity level: {settings['complexity_level']}")
                if "output_format" in settings:
                    settings_constraints.append(f"- Output format: {settings['output_format']}")
                    if settings["output_format"] == "tabular":
                        format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST use tabular format with | and - characters
- Example format:
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
                if "custom_instructions" in settings:
                    settings_constraints.append(f"- Custom instructions: {settings['custom_instructions']}")
                if "template" in settings:
                    settings_constraints.append(f"- Template to follow: {settings['template']}")
                    
                # Language validation only if explicitly set
                if "language" in settings and settings["language"] == "hindi":
                    format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST be in Hindi script (Devanagari)
- Do not use transliteration or Roman script
"""
            
            # Check for Suno character limit requirement
            suno_char_limit = context.get("suno_char_limit", False)
            max_characters = context.get("max_characters", 194)
            
            # DEBUG: Add detailed logging for all context types
            logger.info(f"Non-streaming Enhancement preparation: domain={domain}, llm={selected_llm}, "
                       f"web_context={has_web_content}, document_context={has_document_content}, strategy={has_strategy}, intent={intent}, suno_limit={suno_char_limit}")
            logger.info(f"DEBUG - Web context details: length={len(web_context)}, "
                       f"content_preview={repr(web_context[:200]) if web_context else 'None'}, "
                       f"has_web_content={has_web_content}")
            logger.info(f"DEBUG - Document context details: length={len(document_context)}, "
                       f"content_preview={repr(document_context[:200]) if document_context else 'None'}, "
                       f"has_document_content={has_document_content}")
            logger.info(f"DEBUG - Strategy details: length={len(prompt_strategy)}, "
                       f"strategy_preview={repr(prompt_strategy[:100]) if prompt_strategy else 'None'}, "
                       f"has_strategy={has_strategy}")
            
            # Prepare Suno character limit instruction if needed
            suno_instruction = ""
            if suno_char_limit:
                suno_instruction = f"""
CRITICAL SUNO REQUIREMENT: The enhanced prompt MUST be under {max_characters} characters total. This is a hard requirement for Suno compatibility. Keep the enhanced prompt concise while maintaining quality and clarity."""
                logger.info(f"Adding Suno character limit instruction: max {max_characters} characters")
            
            # Step 4: Create comprehensive enhancement prompt using all available context
            if has_strategy:
                logger.info("DEBUG - Using STRATEGY enhancement path")
                # Use prompt strategy as the primary enhancement guide
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""
INTENT CONTEXT:
- User Intent: {intent}
- Intent Description: {intent_description}

Consider this intent when applying the enhancement strategy to ensure the enhanced prompt aligns with the user's specific goal."""

                system_message = f"""You are an expert prompt enhancer. Follow these specific guidelines:

1. Use the provided prompt strategy as your primary enhancement framework
2. Apply domain-specific best practices for {domain}
3. Optimize for the target LLM: {selected_llm}
4. Incorporate relevant web context if available
5. Maintain the original intent while dramatically improving clarity and effectiveness
6. NEVER mention specific LLM models or providers in your enhanced prompt
7. CRITICAL: If document context is provided, incorporate relevant information from it

ENHANCEMENT CONSTRAINTS:
{chr(10).join(settings_constraints)}

{format_validation}

{intent_instruction}{suno_instruction}

PROMPT STRATEGY TO FOLLOW:
{prompt_strategy}

Domain: {domain}"""
                
                if has_web_content or has_document_content:
                    logger.info(f"DEBUG - Strategy path WITH context (web: {has_web_content}, document: {has_document_content})")
                    intent_note = f" (specifically for {intent}: {intent_description})" if has_intent else ""
                    
                    context_sections = []
                    if has_web_content:
                        context_sections.append(f"Web search context (incorporate relevant information):\n{web_context[:2000]}")
                    if has_document_content:
                        context_sections.append(f"🔥 CRITICAL DOCUMENT CONTEXT - This uploaded content MUST be used to create highly specific, contextual enhancements:\n{document_context[:2500]}")
                    
                    context_text = "\n\n".join(context_sections)
                    logger.info(f"Using context sections: {len(context_sections)} sections, document context: {has_document_content}")
                    
                    # Build format instructions based on settings
                    format_instructions = []
                    if settings.get("output_format") == "tabular":
                        format_instructions.append("""Format the response as a markdown table with headers and data rows:
| Column1 | Column2 | ... |
|---------|---------|-----|
| Data    | Data    | ... |""")
                    if settings.get("language"):
                        format_instructions.append(f"Write the entire response in {settings['language']} language")
                    if settings.get("complexity_level"):
                        format_instructions.append(f"Use {settings['complexity_level']} complexity level")
                    if settings.get("word_count"):
                        format_instructions.append(f"The response must be exactly {settings['word_count']} words")
                    
                    user_message = f"""Original prompt: {original_prompt}

{context_text}

Following the prompt strategy above, create an enhanced version of the original prompt that:
- CRITICALLY IMPORTANT: If document context is provided, use the specific details from it to make the enhancement highly relevant and context-aware
- Incorporates relevant information from the provided context (web and/or document)
- Applies the specific prompt strategy techniques
- Is optimized for {selected_llm}
- Maintains clarity and actionability{intent_note}

{chr(10).join(format_instructions) if format_instructions else ''}

Enhanced prompt (return only the enhanced prompt, no explanations):"""
                else:
                    logger.info("DEBUG - Strategy path WITHOUT web context")
                    intent_note = f" for the specific intent: {intent} ({intent_description})" if has_intent else ""
                    user_message = f"""Original prompt: {original_prompt}

Following the prompt strategy above, create an enhanced version that:
- Applies the specific prompt strategy techniques
- Is optimized for {domain} domain
- Maintains clarity and actionability
- Improves specificity and structure{intent_note}

Enhanced prompt (return only the enhanced prompt, no explanations):"""
            
            elif has_web_content or has_document_content:
                logger.info(f"DEBUG - Using CONTEXT enhancement path (web: {has_web_content}, document: {has_document_content})")
                # Use available context for enhancement when no strategy is available
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""
4. Tailor the enhancement for the user's specific intent: {intent} - {intent_description}
5. Ensure the enhanced prompt effectively supports this intent"""

                context_type = "web" if has_web_content else "document"
                if has_web_content and has_document_content:
                    context_type = "web and document"

                system_message = f"""You are an expert prompt enhancer. Create an improved version of the user's prompt by:
1. Making it more specific and actionable
2. Incorporating relevant information from the provided {context_type} context
3. Maintaining the original intent while improving clarity{intent_instruction}{suno_instruction}

Domain: {domain}
Target LLM: {selected_llm}"""
                
                intent_note = f" to achieve the intent: {intent} ({intent_description})" if has_intent else ""
                
                context_sections = []
                if has_web_content:
                    context_sections.append(f"Web search context:\n{web_context[:2000]}")
                if has_document_content:
                    context_sections.append(f"🔥 CRITICAL DOCUMENT CONTEXT - This uploaded content MUST be used to create highly specific, contextual enhancements:\n{document_context[:2500]}")
                
                context_text = "\n\n".join(context_sections)
                logger.info(f"Using context sections: {len(context_sections)} sections, document context: {has_document_content}")
                
                user_message = f"""Original prompt: {original_prompt}

{context_text}

IMPORTANT INSTRUCTION: Use the specific details from the provided context to create a highly enhanced, context-aware prompt that incorporates the actual content details.

Enhanced prompt (return only the enhanced prompt{intent_note}, no explanations):"""
            
            else:
                logger.info("DEBUG - Using STANDARD enhancement path (no strategy, no web context)")
                # Standard enhancement without web context or strategy
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""

User Intent: {intent}
Intent Description: {intent_description}

Tailor the enhancement to effectively support this specific intent."""

                system_message = f"""You are an expert prompt enhancer. Improve the user's prompt by making it more specific, actionable, and well-structured while maintaining the original intent.

Apply best practices for {domain} domain and optimize for {selected_llm}.{intent_instruction}{suno_instruction}

Domain: {domain}
Target LLM: {selected_llm}

Enhancement Settings:{settings_instruction}"""
                
                intent_note = f" for the intent: {intent}" if has_intent else ""
                user_message = f"""Original prompt: {original_prompt}

Enhanced prompt (return only the enhanced prompt{intent_note}, no explanations):"""
            
            # Add writing style if specified
            if writing_style:
                user_message += f"\nWriting style: {writing_style}"
            
            # Step 5: Get enhanced prompt with timeout
            try:
                enhanced_prompt = await asyncio.wait_for(
                    self.model_provider.get_response(user_message, system_message=system_message),
                    timeout=15.0  # 15 seconds timeout to allow for model fallback
                )
                
                # Clean the response
                enhanced_prompt = self._clean_enhancement_response(enhanced_prompt, original_prompt)
                
                # Validate settings constraints only if explicitly provided
                if settings is not None:
                    # Check word count only if explicitly set
                    if "word_count" in settings:
                        word_count = settings["word_count"]
                        actual_words = len(enhanced_prompt.split())
                        margin = word_count * 0.1  # 10% margin
                        if not (word_count - margin <= actual_words <= word_count + margin):
                            logger.warning(f"Word count mismatch: got {actual_words}, expected {word_count}")
                            enhanced_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language, settings)
                    
                    # Check language only if explicitly set
                    if "language" in settings and settings["language"].lower() == "hindi":
                        if not any(ord('\u0900') <= ord(c) <= ord('\u097F') for c in enhanced_prompt):
                            logger.warning("Response not in Hindi script")
                            enhanced_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language, settings)
                    
                    # Check output format only if explicitly set
                    if "output_format" in settings and settings["output_format"] == "tabular":
                        if not ("| " in enhanced_prompt and " |" in enhanced_prompt and "-" in enhanced_prompt):
                            logger.warning("Response not in tabular format")
                            enhanced_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language, settings)
                
            except asyncio.TimeoutError:
                logger.warning("Enhancement timed out, using improved original prompt")
                enhanced_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language, settings)
            except Exception as e:
                logger.warning(f"Enhancement failed: {str(e)}, using fallback")
                enhanced_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language, settings)
            
            # Step 6: Build comprehensive response
            processing_time = time.perf_counter() - start_time
            
            response = {
                "enhanced_prompt": enhanced_prompt,
                "suggested_llm": selected_llm,
                "domain": domain,
                "has_web_context": has_web_content,
                "has_document_context": has_document_content,
                "strategy_used": has_strategy,
                "intent_aware": has_intent,
                "processing_time_ms": round(processing_time * 1000, 2),
                "timestamp": time.time()
            }
            
            # Add detailed metadata
            if writing_style:
                response["writing_style"] = writing_style
            if has_web_content:
                response["web_sources"] = len([s for s in web_context.split("--- Source:") if s.strip()])
            if has_strategy:
                response["enhancement_method"] = "strategy_guided"
                response["strategy_preview"] = prompt_strategy[:100] + "..." if len(prompt_strategy) > 100 else prompt_strategy
            else:
                response["enhancement_method"] = "standard"
            
            # Add intent information to response
            if has_intent:
                response["intent"] = intent
                response["intent_description"] = intent_description
                
            # Add settings information to response
            if settings:
                response["settings"] = {
                    "word_count": settings.get("word_count"),
                    "language": settings.get("language"),
                    "complexity_level": settings.get("complexity_level"),
                    "output_format": settings.get("output_format"),
                    "custom_instructions": settings.get("custom_instructions"),
                    "template": settings.get("template")
                }
            
            # Quality indicators
            response["enhancement_quality"] = {
                "used_strategy": has_strategy,
                "used_web_context": has_web_content,
                "used_document_context": has_document_content,
                "used_intent": has_intent,
                "domain_optimized": True,
                "llm_optimized": True,
                "settings_applied": bool(settings)
            }
            
            logger.info(f"Enhanced prompt in {processing_time:.3f}s - domain: {domain}, LLM: {selected_llm}, "
                       f"strategy: {has_strategy}, web: {has_web_content}, document: {has_document_content}, intent: {has_intent}")
            return response
            
        except Exception as e:
            logger.error(f"Error in optimized web context processing: {str(e)}")
            processing_time = time.perf_counter() - start_time
            
            # Return minimal successful response with settings
            response = {
                "enhanced_prompt": original_prompt,
                "suggested_llm": context.get("llm", "gpt-4"),
                "domain": context.get("domain", "general"),
                "has_web_context": False,
                "strategy_used": False,
                "processing_time_ms": round(processing_time * 1000, 2),
                "timestamp": time.time(),
                "error": str(e),
                "enhancement_method": "fallback"
            }
            
            # Add settings if available
            settings = context.get("settings")
            if settings:
                response["settings"] = {
                    "word_count": settings.get("word_count"),
                    "language": settings.get("language"),
                    "complexity_level": settings.get("complexity_level"),
                    "output_format": settings.get("output_format"),
                    "custom_instructions": settings.get("custom_instructions"),
                    "template": settings.get("template")
                }
                
            return response

    def _clean_enhancement_response(self, response: str, original_prompt: str) -> str:
        """Clean the enhancement response to remove any unwanted patterns."""
        try:
            # Try to find and remove the most common patterns from LLM responses
            if response.strip().startswith('"') and response.strip().endswith('"'):
                response = response.strip()[1:-1].strip()

            # Remove common prefixes
            prefixes_to_remove = [
                "Here's an enhanced version of your prompt:",
                "Here is the enhanced prompt:",
                "Here is the enhanced prompt:",
                "Enhanced prompt:",
                "Here is the enhanced prompt:",
                "Enhanced version:",
                "Enhanced:",
                "Here's the enhanced prompt:",
            ]
            for prefix in prefixes_to_remove:
                if response.startswith(prefix):
                    response = response[len(prefix):].strip()

            return response
        except Exception as e:
            logger.warning(f"Error in cleaning enhancement response: {str(e)}")
            return response
            
    def _remove_model_references(self, response: str) -> str:
        """Remove any references to specific LLM models in the enhanced prompt."""
        try:
            # Remove references to specific LLMs that might have leaked from the strategy
            model_references = [
                "for Claude", "for claude", "Claude model", "claude model",
                "for GPT", "for gpt", "GPT model", "gpt model",
                "using Claude", "using GPT", "using Anthropic", "using OpenAI",
                "for Anthropic", "for anthropic", "Anthropic model", "anthropic model",
                "for OpenAI", "for openai", "OpenAI model", "openai model"
            ]
            
            result = response
            for ref in model_references:
                result = result.replace(ref, "")
            
            # Remove any sentences mentioning LLM models
            sentences = re.split(r'(?<=[.!?])\s+', result)
            filtered_sentences = [
                s for s in sentences 
                if not any(model in s.lower() for model in ["claude", "gpt", "anthropic", "openai", "llm"])
            ]
            
            # Only use the filtered version if we didn't remove too much content
            if len(filtered_sentences) >= len(sentences) - 2:  # Allow at most 2 sentences to be removed
                result = " ".join(filtered_sentences)
            
            return result
        except Exception as e:
            logger.warning(f"Error removing model references: {str(e)}")
            return response

    def _create_fallback_enhancement(self, prompt: str, domain: str, writing_style: str, language: str = "", settings: Optional[Dict[str, Any]] = None) -> str:
        """Create a fallback enhancement when the main enhancement fails."""
        # Only use settings if explicitly provided
        if settings is not None:
            # Handle language setting only if explicitly set
            if "language" in settings and settings["language"].lower() == "hindi":
                # Basic Hindi fallback using transliteration
                return f"कृपया इस विषय पर विस्तृत जानकारी प्रदान करें: {prompt}"
            
            # Handle output format setting only if explicitly set
            if "output_format" in settings and settings["output_format"] == "tabular":
                return f"""| Topic | Details |
|--------|----------|
| Query | {prompt} |
| Response | Please provide a detailed response |"""
            
        # Default fallback
        return f"Please provide a detailed response about: {prompt}"

    @traceable(run_type="chain", name="process_with_web_context_streaming")
    async def process_with_web_context_streaming(self, original_prompt: str, context: Optional[Dict[str, Any]] = None):
        """Streaming version of process_with_web_context that yields chunks in real-time.
        
        Args:
            original_prompt: The original prompt to enhance
            context: Context including web context, LLM preferences, prompt strategies, and other parameters
            
        Yields:
            String chunks of the enhanced prompt as they are generated
        """
        start_time = time.perf_counter()
        
        # Normalize context efficiently
        if not context or context == "":
            context = {}
        elif not isinstance(context, dict):
            context = {"raw_context": context}
            
        # Extract settings constraints
        settings = context.get("settings", {})
        settings_constraints = []
        if settings:
            if settings.get("word_count"):
                settings_constraints.append(f"- Target word count: {settings['word_count']} words")
            if settings.get("language"):
                settings_constraints.append(f"- Output language: {settings['language']}")
            if settings.get("complexity_level"):
                settings_constraints.append(f"- Complexity level: {settings['complexity_level']}")
            if settings.get("output_format"):
                settings_constraints.append(f"- Output format: {settings['output_format']}")
            if settings.get("custom_instructions"):
                settings_constraints.append(f"- Custom instructions: {settings['custom_instructions']}")
            if settings.get("template"):
                settings_constraints.append(f"- Template to follow: {settings['template']}")
                
        # Add format validation based on settings
        format_validation = ""
        if settings.get("output_format") == "tabular":
            format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST use tabular format with | and - characters
- Example format:
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
        elif settings.get("language") == "hindi":
            format_validation = """
FORMAT VALIDATION:
- The enhanced prompt MUST be in Hindi script (Devanagari)
- Do not use transliteration or Roman script
"""
        
        try:
            # CRITICAL: Check for context_id first - if present, force document context usage
            if context.get("context_id") and not context.get("has_document_context"):
                logger.warning(f"Context ID {context.get('context_id')} provided but has_document_context not set - forcing document context usage")
                context["has_document_context"] = True
            
            # Step 1: Quick domain detection (only if not provided)
            domain = context.get("domain")
            if not domain:
                # Use a simple keyword-based domain detection for speed
                prompt_lower = original_prompt.lower()
                if any(kw in prompt_lower for kw in ["code", "programming", "api", "function", "class", "method"]):
                    domain = "development"
                elif any(kw in prompt_lower for kw in ["analyze", "data", "statistics", "research"]):
                    domain = "analysis"
                elif any(kw in prompt_lower for kw in ["write", "content", "article", "blog"]):
                    domain = "writing"
                else:
                    domain = "general"
                context["domain"] = domain
            
            # Step 2: LLM selection (prefer user choice or use fast fallback)
            selected_llm = context.get("llm")
            if not selected_llm:
                # Quick LLM selection based on domain
                llm_mapping = {
                    "development": "anthropic",
                    "analysis": "openai",
                    "writing": "openai",
                    "general": "openai"
                }
                selected_llm = llm_mapping.get(domain, "gpt-4")
                context["llm"] = selected_llm
            
            # Step 3: Prepare enhancement context with type checking
            web_context = context.get("web_context", "")
            if not isinstance(web_context, str):
                logger.warning(f"Streaming: web_context is not a string: {type(web_context)}, converting to string")
                web_context = str(web_context) if web_context else ""
            has_web_content = bool(web_context and len(web_context.strip()) > 20)
            
            document_context = context.get("document_context", "")
            if not isinstance(document_context, str):
                logger.warning(f"Streaming: document_context is not a string: {type(document_context)}, converting to string")
                document_context = str(document_context) if document_context else ""
            has_document_content = bool(document_context and len(document_context.strip()) > 20)
            
            # Force the document context flag if it's provided but somehow not detected as having content
            if context.get("document_context") and not has_document_content:
                logger.warning(f"Document context was provided but detected as empty or too short: {len(document_context)} characters")
                if document_context:
                    logger.info("Forcing has_document_content to True since context_id was provided")
                    has_document_content = True
            
            writing_style = context.get("writing_style", "")
            if writing_style and not isinstance(writing_style, str):
                logger.warning(f"Streaming: writing_style is not a string: {type(writing_style)}, converting to string")
                writing_style = str(writing_style)
            
            prompt_strategy = context.get("llm_prompt_strategy", "")
            if not isinstance(prompt_strategy, str):
                logger.warning(f"Streaming: prompt_strategy is not a string: {type(prompt_strategy)}, converting to string")
                prompt_strategy = str(prompt_strategy) if prompt_strategy else ""
            has_strategy = bool(prompt_strategy and len(prompt_strategy.strip()) > 10)
            
            # Extract intent information for enhancement customization
            intent = context.get("intent", "")
            if intent and not isinstance(intent, str):
                logger.warning(f"Streaming: intent is not a string: {type(intent)}, converting to string")
                intent = str(intent)
            
            intent_description = context.get("intent_description", "")
            if intent_description and not isinstance(intent_description, str):
                logger.warning(f"Streaming: intent_description is not a string: {type(intent_description)}, converting to string")
                intent_description = str(intent_description)
                
            has_intent = bool(intent and intent.strip())
            
            # Check for Suno character limit requirement
            suno_char_limit = context.get("suno_char_limit", False)
            max_characters = context.get("max_characters", 194)
            
            # DEBUG: Add detailed logging for all context types
            logger.info(f"Streaming Enhancement preparation: domain={domain}, llm={selected_llm}, "
                       f"web_context={has_web_content}, document_context={has_document_content}, strategy={has_strategy}, intent={intent}, suno_limit={suno_char_limit}")
            logger.info(f"DEBUG - Web context details: length={len(web_context)}, "
                       f"content_preview={repr(web_context[:200]) if web_context else 'None'}, "
                       f"has_web_content={has_web_content}")
            logger.info(f"DEBUG - Document context details: length={len(document_context)}, "
                       f"content_preview={repr(document_context[:200]) if document_context else 'None'}, "
                       f"has_document_content={has_document_content}, "
                       f"context_id={context.get('context_id', 'not_provided')}")
            logger.info(f"DEBUG - Strategy details: length={len(prompt_strategy)}, "
                       f"strategy_preview={repr(prompt_strategy[:100]) if prompt_strategy else 'None'}, "
                       f"has_strategy={has_strategy}")
            
            # Prepare Suno character limit instruction if needed
            suno_instruction = ""
            if suno_char_limit:
                suno_instruction = f"""
CRITICAL SUNO REQUIREMENT: The enhanced prompt MUST be under {max_characters} characters total. This is a hard requirement for Suno compatibility. Keep the enhanced prompt concise while maintaining quality and clarity."""
                logger.info(f"Adding Suno character limit instruction for streaming: max {max_characters} characters")
            
            # Step 4: Create comprehensive enhancement prompt using all available context
            if has_strategy:
                logger.info("DEBUG - Using STRATEGY enhancement path")
                # Use prompt strategy as the primary enhancement guide
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""
INTENT CONTEXT:
- User Intent: {intent}
- Intent Description: {intent_description}

Consider this intent when applying the enhancement strategy to ensure the enhanced prompt aligns with the user's specific goal."""

                system_message = f"""You are an expert prompt enhancer. Follow these specific guidelines:

1. Use the provided prompt strategy as your primary enhancement framework
2. Apply domain-specific best practices for {domain}
3. Optimize for the target LLM: {selected_llm}
4. Incorporate relevant web context if available
5. Maintain the original intent while dramatically improving clarity and effectiveness
6. NEVER mention specific LLM models or providers in your enhanced prompt
7. CRITICAL: If document context is provided, incorporate relevant information from it

ENHANCEMENT CONSTRAINTS:
{chr(10).join(settings_constraints)}

{format_validation}

{intent_instruction}{suno_instruction}

PROMPT STRATEGY TO FOLLOW:
{prompt_strategy}

Domain: {domain}"""
                
                if has_web_content or has_document_content:
                    logger.info(f"DEBUG - Strategy path WITH context (web: {has_web_content}, document: {has_document_content})")
                    intent_note = f" (specifically for {intent}: {intent_description})" if has_intent else ""
                    
                    context_sections = []
                    if has_web_content:
                        context_sections.append(f"Web search context (incorporate relevant information):\n{web_context[:2000]}")
                    if has_document_content:
                        context_sections.append(f"🔥 CRITICAL DOCUMENT CONTEXT - This uploaded content MUST be used to create highly specific, contextual enhancements:\n{document_context[:2500]}")
                    
                    context_text = "\n\n".join(context_sections)
                    logger.info(f"Using context sections: {len(context_sections)} sections, document context: {has_document_content}")
                    
                    user_message = f"""Original prompt: {original_prompt}

{context_text}

Following the prompt strategy above, create an enhanced version of the original prompt that:
- CRITICALLY IMPORTANT: If document context is provided, use the specific details from it to make the enhancement highly relevant and context-aware
- Incorporates relevant information from the provided context (web and/or document)
- Applies the specific prompt strategy techniques
- Is optimized for best results
- Maintains clarity and actionability{intent_note}

Enhanced prompt (return only the enhanced prompt, no explanations or mentions of specific LLM models):"""
                else:
                    logger.info("DEBUG - Strategy path WITHOUT web context")
                    intent_note = f" for the specific intent: {intent} ({intent_description})" if has_intent else ""
                    user_message = f"""Original prompt: {original_prompt}

Following the prompt strategy above, create an enhanced version that:
- Applies the specific prompt strategy techniques
- Is optimized for {domain} domain
- Maintains clarity and actionability
- Improves specificity and structure{intent_note}

Enhanced prompt (return only the enhanced prompt, no explanations or mentions of specific LLM models):"""
            
            elif has_web_content or has_document_content:
                logger.info(f"DEBUG - Using CONTEXT enhancement path (web: {has_web_content}, document: {has_document_content})")
                # Use available context for enhancement when no strategy is available
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""
4. Tailor the enhancement for the user's specific intent: {intent} - {intent_description}
5. Ensure the enhanced prompt effectively supports this intent"""

                context_type = "web" if has_web_content else "document"
                if has_web_content and has_document_content:
                    context_type = "web and document"

                system_message = f"""You are an expert prompt enhancer. Create an improved version of the user's prompt by:
1. Making it more specific and actionable
2. Incorporating relevant information from the provided {context_type} context
3. Maintaining the original intent while improving clarity{intent_instruction}{suno_instruction}
4. Never mentioning specific LLM models or providers in the enhanced prompt

Domain: {domain}"""
                
                intent_note = f" to achieve the intent: {intent} ({intent_description})" if has_intent else ""
                
                context_sections = []
                if has_web_content:
                    context_sections.append(f"Web search context:\n{web_context[:2000]}")
                if has_document_content:
                    context_sections.append(f"🔥 CRITICAL DOCUMENT CONTEXT - This uploaded content MUST be used to create highly specific, contextual enhancements:\n{document_context[:2500]}")
                
                context_text = "\n\n".join(context_sections)
                logger.info(f"Using context sections: {len(context_sections)} sections, document context: {has_document_content}")
                
                user_message = f"""Original prompt: {original_prompt}

{context_text}

IMPORTANT INSTRUCTION: Use the specific details from the provided context to create a highly enhanced, context-aware prompt that incorporates the actual content details.

Enhanced prompt (return only the enhanced prompt{intent_note}, no explanations or mentions of specific LLM models):"""
            
            else:
                logger.info("DEBUG - Using STANDARD enhancement path (no strategy, no web context)")
                # Standard enhancement without web context or strategy
                intent_instruction = ""
                if has_intent:
                    intent_instruction = f"""

User Intent: {intent}
Intent Description: {intent_description}

Tailor the enhancement to effectively support this specific intent."""

                system_message = f"""You are an expert prompt enhancer. Improve the user's prompt by making it more specific, actionable, and well-structured while maintaining the original intent.

Apply best practices for {domain} domain and optimize for {selected_llm}.{intent_instruction}{suno_instruction}

IMPORTANT: Never mention specific LLM models or providers in your enhanced prompt."""
                
                intent_note = f" for the intent: {intent}" if has_intent else ""
                user_message = f"""Original prompt: {original_prompt}

Enhanced prompt (return only the enhanced prompt{intent_note}, no explanations or mentions of specific LLM models):"""
            
            # Add writing style if specified
            if writing_style:
                user_message += f"\nWriting style: {writing_style}"
            
            # Step 5: Stream enhanced prompt using model provider's streaming capability
            try:
                accumulated_response = ""
                chunk_count = 0
                logger.info(f"Starting to stream enhancement for prompt: {original_prompt[:50]}...")
                logger.info(f"User message length: {len(user_message)}")
                logger.info(f"System message length: {len(system_message) if system_message else 0}")
                
                # CRITICAL: If document context is available but not being used in the prompt, add it directly
                if has_document_content and context.get("context_id") and "document context" not in user_message.lower():
                    logger.warning("Document context available but not included in prompt - adding it directly")
                    doc_context_preview = document_context[:500] + ("..." if len(document_context) > 500 else "")
                    forced_prefix = f"Using the provided document context below:\n\n{doc_context_preview}\n\n"
                    yield forced_prefix
                    accumulated_response += forced_prefix
                
                async for chunk in self.model_provider.get_streaming_response(user_message, system_message=system_message):
                    if chunk is not None:  # Allow all chunks including spaces and punctuation
                        chunk_count += 1
                        accumulated_response += chunk
                        
                        # Clean chunk of any model references before yielding
                        cleaned_chunk = self._remove_model_references(chunk)
                        logger.debug(f"Chunk {chunk_count}: {repr(cleaned_chunk)}")
                        yield cleaned_chunk
                        
                        # Add a safety break to prevent infinite streaming during debugging
                        if chunk_count > 2000:  # Increased from 200 to 1000 for longer responses
                            logger.warning("Streaming stopped after 1000 chunks for safety")
                            break
                
                logger.info(f"Streaming completed with {chunk_count} chunks, total length: {len(accumulated_response)}")
                
                # Clean the final response for logging
                enhanced_prompt = self._clean_enhancement_response(accumulated_response, original_prompt)
                enhanced_prompt = self._remove_model_references(enhanced_prompt)
                logger.info(f"Cleaned response preview: {repr(enhanced_prompt[:200])}")
                
            except Exception as e:
                logger.warning(f"Streaming enhancement failed: {str(e)}, using fallback")
                fallback_prompt = self._create_fallback_enhancement(original_prompt, domain, writing_style, language)
                # Stream the fallback response in chunks
                chunk_size = 20
                for i in range(0, len(fallback_prompt), chunk_size):
                    chunk = fallback_prompt[i:i+chunk_size]
                    yield chunk
                    await asyncio.sleep(0.05)  # Small delay for natural streaming feel
            
            # Log completion
            processing_time = time.perf_counter() - start_time
            logger.info(f"Streaming enhanced prompt completed in {processing_time:.3f}s - domain: {domain}, LLM: {selected_llm}, "
                       f"strategy: {has_strategy}, web: {has_web_content}, intent: {has_intent}")
                
        except Exception as e:
            logger.error(f"Error in streaming web context processing: {str(e)}")
            # Yield error fallback
            fallback = f"I apologize, but I'm having trouble processing your request. Here's an improved version: Please provide a detailed response about {original_prompt}"
            chunk_size = 20
            for i in range(0, len(fallback), chunk_size):
                chunk = fallback[i:i+chunk_size]
                yield chunk
                await asyncio.sleep(0.05)


# Don't automatically instantiate the enhancer during import
# enhancer = container.resolve(PromptEnhancer)

# Instead, register the class with the container for later instantiation
# This avoids instantiation during import time
if hasattr(container, 'register'):
    container.register(PromptEnhancer)