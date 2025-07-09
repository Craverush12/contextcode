"""
Website Intelligence Analysis API Module

Handles website content analysis using LLM to determine type, category, 
and optimal AI model recommendations with confidence scoring.
"""

import asyncio
import json
import re
import time
from typing import Dict, List
from fastapi import Request
from fastapi.responses import JSONResponse

from src.logging.logger import get_logger

# Get logger for this module
logger = get_logger(__name__)


class WebsiteIntelligenceAnalyzer:
    """Handles website intelligence analysis using LLM-based classification."""
    
    def __init__(self, model_provider):
        """Initialize with model provider for LLM calls."""
        self.model_provider = model_provider
    
    async def process_request(self, request: Request) -> JSONResponse:
        """
        Process website intelligence analysis request.
        
        Analyzes website metadata and provides intelligent classification
        for website type, content category, and optimal AI model recommendations.
        """
        try:
            # Parse request data
            data = await request.json()
            url = data.get("url", "")
            page_title = data.get("page_title", "")
            meta_description = data.get("meta_description", "")
            domain = data.get("domain", "")
            
            # Validate input - at least one field is required
            if not any([url, page_title, meta_description, domain]):
                return JSONResponse(
                    status_code=400,
                    content={"error": "At least one of url, page_title, meta_description, or domain is required"}
                )
            
            # Extract domain from URL if not provided
            if not domain and url:
                domain = self._extract_domain_from_url(url)
            
            # Analyze website using LLM
            analysis_result = await self._analyze_website_with_llm(
                url, page_title, meta_description, domain
            )
            
            logger.info(f"Website intelligence analysis completed for domain: {domain}")
            
            return JSONResponse(content={
                "success": True,
                "data": analysis_result
            })
            
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid JSON format in request body"}
            )
        except Exception as e:
            logger.exception("Error analyzing website intelligence", exception_type=type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to analyze website: {str(e)}"}
            )
    
    def _extract_domain_from_url(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(url)
            return parsed_url.netloc.lower().replace("www.", "")
        except Exception as e:
            logger.warning(f"Failed to parse domain from URL: {str(e)}")
            return ""
    
    async def _analyze_website_with_llm(self, url: str, page_title: str, meta_description: str, domain: str) -> dict:
        """Use LLM to analyze website content and provide intelligence recommendations."""
        
        # Prepare content for analysis
        content_to_analyze = f"""
        URL: {url if url else 'Not provided'}
        Domain: {domain if domain else 'Not provided'}
        Page Title: {page_title if page_title else 'Not provided'}
        Meta Description: {meta_description if meta_description else 'Not provided'}
        """.strip()
        
        # Create comprehensive system message for website intelligence analysis
        system_message = """
        You are an expert website intelligence analyst. Analyze the provided website information and classify it for optimal AI model routing.

        Return your analysis in JSON format with these exact fields:
        {
            "website_type": "one of: technical, business, education, news, entertainment, ecommerce, social, creative, research, reference, personal, government, nonprofit",
            "content_category": "one of: documentation, blog, tutorial, news, product, service, portfolio, forum, wiki, landing_page, application, tool, media, academic",
            "recommended_models": ["array of 1-3 models from: openai, anthropic, perplexity, google, grok"],
            "analysis_confidence": 0.0-1.0
        }

        Guidelines for Classification:

        Website Types:
        - technical: Programming, IT, software development, technical documentation
        - business: Corporate websites, B2B services, professional services
        - education: Schools, courses, learning platforms, educational content
        - news: News sites, journalism, current events, media outlets
        - entertainment: Gaming, movies, music, sports, leisure content
        - ecommerce: Online stores, marketplaces, shopping platforms
        - social: Social networks, community platforms, forums
        - creative: Art, design, photography, creative portfolios
        - research: Academic research, scientific publications, studies
        - reference: Wikis, databases, reference materials, libraries
        - personal: Personal blogs, portfolios, individual websites
        - government: Government websites, official agencies, public services
        - nonprofit: Charities, NGOs, community organizations

        Content Categories:
        - documentation: Technical docs, API references, manuals
        - blog: Blog posts, articles, opinion pieces
        - tutorial: How-to guides, educational content, step-by-step instructions
        - news: News articles, press releases, current events
        - product: Product pages, specifications, features
        - service: Service descriptions, professional offerings
        - portfolio: Personal/professional portfolios, showcases
        - forum: Discussion boards, Q&A platforms, community discussions
        - wiki: Collaborative knowledge bases, reference materials
        - landing_page: Marketing pages, promotional content
        - application: Web apps, tools, interactive platforms
        - tool: Utilities, calculators, online tools
        - media: Video, audio, image galleries
        - academic: Research papers, scholarly content, institutional pages

        Model Recommendations:
        - openai: Technical content, coding, structured analysis, business applications
        - anthropic: Creative content, writing, ethical discussions, nuanced analysis
        - perplexity: Research, current events, fact-checking, real-time information
        - google: General knowledge, educational content, broad topics
        - grok: Social content, trending topics, casual conversations

        Confidence Scoring:
        - 0.9-1.0: Very clear indicators, well-known domains, obvious classification
        - 0.7-0.8: Good indicators present, confident classification
        - 0.5-0.6: Some indicators present, reasonable classification
        - 0.3-0.4: Limited information, best guess classification
        - 0.1-0.2: Very little information, fallback classification
        """
        
        # Create analysis prompt
        analysis_prompt = f"""
        Analyze this website for intelligence routing and classification:
        
        {content_to_analyze}
        
        Based on the available information, classify this website's type and content category, then recommend the most suitable AI models for processing content from this site.
        """
        
        try:
            # Get analysis from LLM with timeout
            llm_response = await asyncio.wait_for(
                self.model_provider.get_response(analysis_prompt, system_message=system_message),
                timeout=8.0
            )
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
                if json_match:
                    llm_response = json_match.group(0)
                
                llm_analysis = json.loads(llm_response)
                
                # Validate and clean the response
                validated_result = self._validate_intelligence_response(llm_analysis, domain, page_title, meta_description)
                
                logger.info(f"LLM website intelligence analysis successful: {validated_result.get('website_type', 'unknown')} / {validated_result.get('content_category', 'unknown')}")
                return validated_result
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse LLM website intelligence response: {str(e)}")
                logger.debug(f"Raw LLM response: {llm_response}")
                
                # Fallback to rule-based analysis
                return self._fallback_intelligence_analysis(domain, page_title, meta_description)
        
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"LLM website intelligence analysis failed: {str(e)}")
            return self._fallback_intelligence_analysis(domain, page_title, meta_description)
    
    def _validate_intelligence_response(self, llm_result: dict, domain: str, page_title: str, meta_description: str) -> dict:
        """Validate and clean LLM website intelligence analysis results."""
        
        # Define valid values for each field
        valid_website_types = [
            "technical", "business", "education", "news", "entertainment", "ecommerce", 
            "social", "creative", "research", "reference", "personal", "government", "nonprofit"
        ]
        
        valid_content_categories = [
            "documentation", "blog", "tutorial", "news", "product", "service", "portfolio", 
            "forum", "wiki", "landing_page", "application", "tool", "media", "academic"
        ]
        
        valid_models = ["openai", "anthropic", "perplexity", "google", "grok"]
        
        # Initialize result with defaults
        result = {
            "website_type": "business",
            "content_category": "landing_page",
            "recommended_models": ["openai", "anthropic"],
            "analysis_confidence": 0.5
        }
        
        # Validate website_type
        if "website_type" in llm_result and llm_result["website_type"] in valid_website_types:
            result["website_type"] = llm_result["website_type"]
        
        # Validate content_category
        if "content_category" in llm_result and llm_result["content_category"] in valid_content_categories:
            result["content_category"] = llm_result["content_category"]
        
        # Validate recommended_models
        if "recommended_models" in llm_result and isinstance(llm_result["recommended_models"], list):
            valid_recommended_models = [model for model in llm_result["recommended_models"] if model in valid_models]
            if valid_recommended_models:
                result["recommended_models"] = valid_recommended_models[:3]  # Limit to 3 models
        
        # Validate analysis_confidence
        if "analysis_confidence" in llm_result:
            try:
                confidence = float(llm_result["analysis_confidence"])
                result["analysis_confidence"] = min(max(confidence, 0.0), 1.0)
            except (ValueError, TypeError):
                result["analysis_confidence"] = self._calculate_intelligence_confidence(domain, page_title, meta_description)
        
        # Post-processing: optimize model recommendations based on analysis
        result["recommended_models"] = self._optimize_model_recommendations(
            result["website_type"], 
            result["content_category"], 
            result["recommended_models"]
        )
        
        return result
    
    def _optimize_model_recommendations(self, website_type: str, content_category: str, current_models: list) -> list:
        """Optimize model recommendations based on website intelligence analysis."""
        
        # Enhanced model mapping based on website intelligence
        optimization_rules = {
            # Website type based optimizations
            "technical": ["openai", "anthropic"],           # Strong for technical content
            "business": ["openai", "anthropic"],            # Professional content analysis
            "education": ["openai", "google"],              # Educational content processing
            "news": ["perplexity", "google"],               # Current events and fact-checking
            "entertainment": ["anthropic", "grok"],         # Creative and social content
            "ecommerce": ["openai", "perplexity"],          # Product analysis and comparison
            "social": ["grok", "anthropic"],                # Social content understanding
            "creative": ["anthropic", "openai"],            # Creative content generation
            "research": ["perplexity", "google"],           # Research and academic content
            "reference": ["google", "perplexity"],          # Knowledge and fact-based content
            "personal": ["anthropic", "openai"],            # Personal content analysis
            "government": ["openai", "google"],             # Official content processing
            "nonprofit": ["anthropic", "google"],           # Mission-driven content
            
            # Content category based optimizations
            "documentation": ["openai", "anthropic"],       # Technical documentation
            "blog": ["anthropic", "openai"],                # Blog content analysis
            "tutorial": ["openai", "anthropic"],            # Educational step-by-step content
            "news": ["perplexity", "google"],               # News content analysis
            "product": ["openai", "perplexity"],            # Product information processing
            "service": ["openai", "anthropic"],             # Service description analysis
            "portfolio": ["anthropic", "openai"],           # Creative work evaluation
            "forum": ["grok", "anthropic"],                 # Discussion and community content
            "wiki": ["google", "perplexity"],               # Reference and factual content
            "landing_page": ["openai", "anthropic"],        # Marketing content analysis
            "application": ["openai", "anthropic"],         # App and tool analysis
            "tool": ["openai", "anthropic"],                # Utility and tool evaluation
            "media": ["anthropic", "openai"],               # Media content analysis
            "academic": ["google", "perplexity"]            # Academic content processing
        }
        
        # Check for specific optimizations (prioritize content category)
        for category in [content_category, website_type]:
            if category in optimization_rules:
                recommended = optimization_rules[category]
                # Merge with current models, prioritizing the optimized ones
                merged = recommended + [model for model in current_models if model not in recommended]
                return merged[:3]  # Return top 3
        
        # Return current models if no specific optimization found
        return current_models[:3]
    
    def _calculate_intelligence_confidence(self, domain: str, page_title: str, meta_description: str) -> float:
        """Calculate confidence score for website intelligence analysis."""
        
        confidence = 0.3  # Base confidence
        
        # Increase confidence based on available information
        if domain:
            confidence += 0.2
            
            # Higher confidence for well-known domains
            well_known_domains = [
                "github.com", "stackoverflow.com", "medium.com", "youtube.com", 
                "linkedin.com", "twitter.com", "facebook.com", "reddit.com",
                "wikipedia.org", "google.com", "microsoft.com", "apple.com"
            ]
            
            if any(known_domain in domain.lower() for known_domain in well_known_domains):
                confidence += 0.3
        
        if page_title and len(page_title.strip()) > 5:
            confidence += 0.2
        
        if meta_description and len(meta_description.strip()) > 10:
            confidence += 0.2
        
        # Additional confidence for content with clear indicators
        all_text = f"{page_title} {meta_description}".lower()
        
        # Technical indicators
        if any(word in all_text for word in ["api", "documentation", "github", "code", "programming"]):
            confidence += 0.1
        
        # Business indicators
        if any(word in all_text for word in ["company", "business", "service", "solutions", "enterprise"]):
            confidence += 0.1
        
        # News indicators
        if any(word in all_text for word in ["news", "breaking", "latest", "today", "headlines"]):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _fallback_intelligence_analysis(self, domain: str, page_title: str, meta_description: str) -> dict:
        """Fallback website intelligence analysis when LLM fails."""
        
        # Initialize with defaults
        result = {
            "website_type": "business",
            "content_category": "landing_page",
            "recommended_models": ["openai", "anthropic"],
            "analysis_confidence": 0.3  # Lower confidence for fallback
        }
        
        if not domain:
            return result
        
        domain_lower = domain.lower()
        text_content = f"{page_title} {meta_description}".lower()
        
        # Basic domain-based classification
        domain_mappings = {
            "github.com": {
                "website_type": "technical", 
                "content_category": "documentation", 
                "recommended_models": ["openai", "anthropic"]
            },
            "stackoverflow.com": {
                "website_type": "technical", 
                "content_category": "forum", 
                "recommended_models": ["openai", "anthropic"]
            },
            "medium.com": {
                "website_type": "creative", 
                "content_category": "blog", 
                "recommended_models": ["anthropic", "openai"]
            },
            "youtube.com": {
                "website_type": "entertainment", 
                "content_category": "media", 
                "recommended_models": ["anthropic", "openai"]
            },
            "reddit.com": {
                "website_type": "social", 
                "content_category": "forum", 
                "recommended_models": ["grok", "anthropic"]
            },
            "wikipedia.org": {
                "website_type": "reference", 
                "content_category": "wiki", 
                "recommended_models": ["google", "perplexity"]
            },
            "linkedin.com": {
                "website_type": "business", 
                "content_category": "portfolio", 
                "recommended_models": ["openai", "anthropic"]
            }
        }
        
        # Check for exact domain matches
        for known_domain, mapping in domain_mappings.items():
            if known_domain in domain_lower:
                result.update(mapping)
                result["analysis_confidence"] = 0.8  # Higher confidence for known domains
                return result
        
        # Basic content-based classification
        if any(keyword in text_content for keyword in ["tutorial", "guide", "how to", "learn"]):
            result.update({
                "website_type": "education",
                "content_category": "tutorial",
                "recommended_models": ["openai", "anthropic"]
            })
        elif any(keyword in text_content for keyword in ["news", "breaking", "latest", "headlines"]):
            result.update({
                "website_type": "news",
                "content_category": "news",
                "recommended_models": ["perplexity", "google"]
            })
        elif any(keyword in text_content for keyword in ["shop", "buy", "price", "cart", "store"]):
            result.update({
                "website_type": "ecommerce",
                "content_category": "product",
                "recommended_models": ["openai", "perplexity"]
            })
        elif any(keyword in text_content for keyword in ["blog", "post", "article", "write"]):
            result.update({
                "website_type": "creative",
                "content_category": "blog",
                "recommended_models": ["anthropic", "openai"]
            })
        
        return result 