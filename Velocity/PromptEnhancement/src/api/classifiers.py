"""
Website classification logic and algorithms.
"""

import asyncio
import json
from typing import Dict, Any
from ..core import ModelProvider
from .validators import validate_llm_classification, parse_llm_response
from ..logging.logger import get_logger

logger = get_logger(__name__)


class WebsiteClassifier:
    """Handles website classification using LLM and fallback methods."""
    
    def __init__(self, model_provider: ModelProvider):
        self.model_provider = model_provider
    
    async def classify_website(self, domain: str, page_title: str, meta_description: str, url: str) -> Dict[str, Any]:
        """
        Classify website using LLM with fallback to rule-based classification.
        
        Args:
            domain: Website domain
            page_title: Page title
            meta_description: Meta description
            url: Full URL
            
        Returns:
            dict: Classification results
        """
        try:
            # Try LLM classification first
            llm_result = await self._classify_with_llm(domain, page_title, meta_description, url)
            logger.info(f"LLM classification successful: {llm_result.get('classification', 'unknown')}")
            return llm_result
        except Exception as e:
            logger.warning(f"LLM classification failed: {str(e)}")
            # Fallback to rule-based classification
            return self._fallback_classification(domain, page_title, meta_description)
    
    async def _classify_with_llm(self, domain: str, page_title: str, meta_description: str, url: str) -> Dict[str, Any]:
        """Use LLM to intelligently classify website content and determine optimal routing."""
        
        # Prepare content for analysis
        content_to_analyze = f"""
        URL: {url}
        Domain: {domain}
        Page Title: {page_title}
        Meta Description: {meta_description}
        """.strip()
        
        # Create comprehensive system message for classification
        system_message = """
        You are an expert website content classifier. Analyze the provided website information and classify it according to the following categories.

        Return your analysis in JSON format with these exact fields:
        {
            "classification": "one of: content, ai_service, ecommerce, news, social, video, reference, product, tool",
            "confidence": 0.0-1.0,
            "category": "one of: article, tutorial, documentation, blog_post, newsletter, video, product, qa, discussion, repository, encyclopedia, news, review, tool",
            "is_ai_platform": true/false,
            "content_type": "one of: blog_post, tutorial, documentation, news, review, research, opinion, product, video, qa, newsletter, code, reference",
            "website_type": "one of: technical, blogging, social, video, news, ecommerce, ai, professional, reference, entertainment, educational",
            "context_complexity": "one of: basic, intermediate, advanced",
            "language": "detected language code (e.g., en, es, fr)",
            "recommended_models": ["list of 1-3 models from: openai, anthropic, perplexity, google, grok"],
            "reasoning": "brief explanation of your classification decisions"
        }

        Guidelines:
        - For AI platforms (OpenAI, Anthropic, Hugging Face, etc.), set is_ai_platform: true
        - For technical content (GitHub, Stack Overflow, Dev.to), use technical website_type
        - For research/news content, prioritize perplexity in recommended_models
        - For creative/writing content, prioritize anthropic
        - For code/technical content, prioritize openai
        - Use context clues from title and description to determine complexity
        - Be conservative with confidence scores unless very certain
        """
        
        # Create analysis prompt
        analysis_prompt = f"""
        Analyze this website and provide a comprehensive classification:
        
        {content_to_analyze}
        
        Based on the domain, title, and description, classify this website according to the JSON schema provided.
        """
        
        # Get classification from LLM with timeout
        llm_response = await asyncio.wait_for(
            self.model_provider.get_response(analysis_prompt, system_message=system_message),
            timeout=5.0
        )
        
        # Parse JSON response
        llm_classification = parse_llm_response(llm_response)
        
        if not llm_classification:
            raise ValueError("Failed to parse LLM response")
        
        # Validate and clean the response
        validated_result = validate_llm_classification(llm_classification, domain)
        
        # Optimize model recommendations
        validated_result["recommended_models"] = self._optimize_model_recommendations(
            validated_result["classification"], 
            validated_result["content_type"], 
            validated_result["website_type"],
            validated_result["recommended_models"]
        )
        
        return validated_result
    
    def _fallback_classification(self, domain: str, page_title: str, meta_description: str) -> Dict[str, Any]:
        """Fallback rule-based classification when LLM fails."""
        
        result = {
            "classification": "content",
            "confidence": 0.3,  # Lower confidence for fallback
            "category": "article",
            "is_ai_platform": False,
            "content_type": "blog_post",
            "website_type": "technical",
            "context_complexity": "intermediate",
            "language": "en",
            "recommended_models": ["openai", "anthropic"],
            "reasoning": "Fallback rule-based classification"
        }
        
        if not domain:
            return result
        
        domain_lower = domain.lower()
        text_content = f"{page_title} {meta_description}".lower()
        
        # Basic AI platform detection
        ai_platforms = ["openai.com", "anthropic.com", "huggingface.co", "chatgpt.com", "claude.ai"]
        if any(ai_platform in domain_lower for ai_platform in ai_platforms):
            result.update({
                "is_ai_platform": True,
                "classification": "ai_service",
                "website_type": "ai",
                "recommended_models": ["openai", "anthropic"]
            })
        
        # Basic platform detection
        platform_mappings = {
            "medium.com": {"website_type": "blogging", "content_type": "blog_post", "recommended_models": ["anthropic", "openai"]},
            "github.com": {"website_type": "technical", "content_type": "code", "recommended_models": ["openai", "anthropic"]},
            "stackoverflow.com": {"website_type": "technical", "content_type": "qa", "recommended_models": ["openai", "anthropic"]},
            "youtube.com": {"classification": "video", "content_type": "video", "recommended_models": ["openai", "anthropic"]},
            "reddit.com": {"classification": "social", "website_type": "social", "recommended_models": ["anthropic", "openai"]},
        }
        
        for platform, updates in platform_mappings.items():
            if platform in domain_lower:
                result.update(updates)
                result["confidence"] = 0.6  # Higher confidence for known platforms
                break
        
        # Basic content type detection
        if any(keyword in text_content for keyword in ["tutorial", "how to", "guide"]):
            result["content_type"] = "tutorial"
            result["recommended_models"] = ["anthropic", "openai"]
        elif any(keyword in text_content for keyword in ["news", "breaking", "latest"]):
            result["content_type"] = "news"
            result["recommended_models"] = ["perplexity", "openai"]
        
        return result
    
    def _optimize_model_recommendations(self, classification: str, content_type: str, website_type: str, current_models: list) -> list:
        """Optimize model recommendations based on classification."""
        
        # Enhanced model mapping based on content analysis
        optimization_rules = {
            # AI platforms benefit from versatile models
            "ai_service": ["openai", "anthropic"],
            
            # Technical content benefits from code-strong models
            "technical": ["openai", "anthropic"],
            
            # Research and news benefit from search-enabled models
            "research": ["perplexity", "openai"],
            "news": ["perplexity", "anthropic"],
            
            # Creative content benefits from Claude's writing abilities
            "blogging": ["anthropic", "openai"],
            "opinion": ["anthropic", "openai"],
            
            # Code content benefits from GPT models
            "code": ["openai", "anthropic"],
            "repository": ["openai", "anthropic"],
            
            # Video content analysis
            "video": ["openai", "anthropic"],
            
            # Social content
            "social": ["anthropic", "openai"],
            
            # E-commerce and products
            "ecommerce": ["openai", "perplexity"],
            "product": ["openai", "perplexity"]
        }
        
        # Check for specific optimizations
        for category in [classification, content_type, website_type]:
            if category in optimization_rules:
                recommended = optimization_rules[category]
                # Merge with current models, prioritizing the optimized ones
                merged = recommended + [model for model in current_models if model not in recommended]
                return merged[:3]  # Return top 3
        
        # Return current models if no specific optimization found
        return current_models[:3]


def estimate_reading_time(page_title: str, meta_description: str) -> int:
    """Estimate reading time in minutes based on content length."""
    # Average reading speed: 200-250 words per minute
    # Use 225 as average
    words_per_minute = 225
    
    # Count words in title and description
    total_words = len((page_title + " " + meta_description).split())
    
    # Estimate total content based on metadata
    # This is a rough estimation - actual content would be longer
    estimated_total_words = total_words * 20  # Multiply by factor
    
    # Calculate reading time
    reading_time = max(1, round(estimated_total_words / words_per_minute))
    
    # Cap at reasonable maximum
    return min(reading_time, 30) 