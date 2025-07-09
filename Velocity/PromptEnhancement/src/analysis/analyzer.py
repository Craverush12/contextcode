"""
Analyzer module that provides a common interface for analyzing prompts.

This module acts as an adapter between the domain classifier and other components
that need to analyze prompts.
"""

import asyncio
from typing import Dict, Any, List
from src.analysis.domain_classifier import DomainClassifier
from src.logging.logger import get_logger

# Set up logging
logger = get_logger(__name__)

class Analyzer:
    """Adapter class that provides a unified interface for prompt analysis."""
    
    def __init__(self, domain_classifier=None):
        """Initialize the analyzer with a domain classifier instance."""
        self.domain_classifier = domain_classifier or DomainClassifier.get_instance()
        logger.debug("Analyzer initialized with domain classifier")
    
    async def detect_domains(self, prompt: str) -> List[str]:
        """
        Async wrapper to detect domains from a prompt.
        
        Args:
            prompt: The prompt text to analyze
            
        Returns:
            List of detected domains (usually just one primary domain)
        """
        try:
            # Run the synchronous classify_domain in an executor to make it async
            loop = asyncio.get_event_loop()
            domain = await loop.run_in_executor(None, self.domain_classifier.classify_domain, prompt)
            return [domain]
        except Exception as e:
            logger.error(f"Error detecting domains: {str(e)}")
            return ["general"]
    
    def analyze(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze a prompt to determine its domain and other characteristics.
        
        Args:
            prompt: The prompt text to analyze
            
        Returns:
            Dictionary with analysis results including domain
        """
        logger.debug(f"Analyzing prompt: {prompt[:50]}...")
        
        try:
            # First check if the prompt is a prompt engineering/injection attempt
            is_prompt_engineering = self.domain_classifier.is_prompt_engineering_attempt(prompt)
            
            if is_prompt_engineering:
                logger.warning("Prompt classified as potential prompt engineering/injection attempt")
                return {
                    "domain": "security_policy",
                    "is_prompt_engineering": True,
                    "confidence": 0.95,
                    "original_prompt": prompt
                }
            
            # Check if the prompt is NSFW
            is_nsfw = self.domain_classifier.is_nsfw(prompt)
            
            # If it's NSFW, return that as the domain
            if is_nsfw:
                logger.info("Prompt classified as NSFW")
                return {
                    "domain": "nsfw",
                    "is_nsfw": True,
                    "confidence": 1.0
                }
            
            # Classify the domain of the prompt
            domain = self.domain_classifier.classify_domain(prompt)
            
            # Get confidence scores for additional context
            confidence_scores = self.domain_classifier.get_domain_confidence(prompt)
            
            # Get the confidence score for the classified domain
            confidence = confidence_scores.get(domain, 0.0)
            
            # Additional check for prompt engineering - if domain was classified as prompt_engineering
            # but the specific prompt_engineering check missed it, still use the security policy
            if domain == "prompt_engineering" and confidence > 0.6:
                suspicious_keywords = ["bypass", "override", "system", "access", "core", "directives", 
                                      "reveal", "admin", "command", "disclose", "rules"]
                
                # Count how many suspicious keywords are in the prompt
                keyword_count = sum(1 for keyword in suspicious_keywords if keyword in prompt.lower())
                
                # If there are multiple suspicious keywords, treat it as a prompt engineering attempt
                if keyword_count >= 2:
                    logger.warning("Prompt reclassified as potential prompt engineering attempt based on keywords")
                    return {
                        "domain": "security_policy",
                        "is_prompt_engineering": True,
                        "confidence": confidence,
                        "original_prompt": prompt
                    }
            
            logger.info(f"Prompt classified as {domain} with confidence {confidence:.2f}")
            
            # Return analysis results
            return {
                "domain": domain,
                "is_nsfw": False,
                "is_prompt_engineering": False,
                "confidence": confidence,
                "confidence_scores": confidence_scores
            }
        
        except Exception as e:
            logger.error(f"Error analyzing prompt: {str(e)}")
            # Return default domain on error
            return {
                "domain": "general",
                "is_nsfw": False,
                "is_prompt_engineering": False,
                "confidence": 0.0,
                "error": str(e)
            }

# Create a singleton instance
_instance = None

def get_instance():
    """Get the singleton instance of the Analyzer."""
    global _instance
    if _instance is None:
        _instance = Analyzer()
    return _instance