"""
Website Classification API handler.
"""

import json
from typing import Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

from .models import ClassificationRequest, ClassificationResponse, ClassificationData
from .validators import validate_classification_input, extract_domain_from_url
from .classifiers import WebsiteClassifier, estimate_reading_time
from ..core import ModelProvider
from ..logging.logger import get_logger

logger = get_logger(__name__)


class WebsiteClassificationAPI:
    """Handles website classification API requests."""
    
    def __init__(self, model_provider: ModelProvider):
        self.classifier = WebsiteClassifier(model_provider)
    
    async def classify_website(self, request: Request) -> JSONResponse:
        """
        Classify website content and determine optimal AI routing using LLMs.
        
        Uses AI models to analyze website metadata and provide intelligent classification
        for content type, platform, and optimal AI model recommendations.
        """
        try:
            # Parse request data
            data = await request.json()
            
            # Validate input
            is_valid, error_message = validate_classification_input(data)
            if not is_valid:
                return JSONResponse(
                    status_code=400,
                    content={"error": error_message}
                )
            
            # Extract and prepare data
            url = data.get("url", "")
            page_title = data.get("page_title", "")
            meta_description = data.get("meta_description", "")
            domain = data.get("domain", "")
            
            # Extract domain from URL if not provided
            if not domain and url:
                domain = extract_domain_from_url(url)
                if not domain:
                    logger.warning(f"Failed to parse domain from URL: {url}")
                    domain = ""
            
            # Perform classification
            classification_result = await self._perform_classification(
                domain, page_title, meta_description, url
            )
            
            logger.info(f"Website classified: {domain} -> {classification_result['classification']}")
            
            return JSONResponse(content={
                "success": True,
                "data": classification_result
            })
            
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid JSON format in request body"}
            )
        except Exception as e:
            logger.exception("Error classifying website", exception_type=type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to classify website: {str(e)}"}
            )
    
    async def _perform_classification(self, domain: str, page_title: str, meta_description: str, url: str) -> Dict[str, Any]:
        """Perform the actual classification and return results."""
        
        # Initialize classification result with defaults
        classification_result = {
            "classification": "unknown",
            "confidence": 0.0,
            "category": "unknown",
            "platform": domain.replace("www.", "") if domain else "unknown",
            "is_ai_platform": False,
            "content_type": "unknown",
            "language": "en",  # Default to English
            "reading_time": 0,
            "website_type": "unknown",
            "recommended_models": ["openai"],  # Default fallback
            "context_complexity": "unknown"
        }
        
        # Use classifier for comprehensive website classification
        llm_classification = await self.classifier.classify_website(
            domain, page_title, meta_description, url
        )
        
        # Update classification result with analysis
        classification_result.update(llm_classification)
        
        # Estimate reading time based on content length
        reading_time = estimate_reading_time(page_title, meta_description)
        classification_result["reading_time"] = reading_time
        
        return classification_result 