"""
Prompt Quality Analyzer Module

This module provides functionality to analyze and classify the quality of user prompts
based on intent clarity, domain relevance, and structural characteristics.
"""

from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
from src.analysis.intent_classifier import IntentClassifier
from src.analysis.domain_classifier import DomainClassifier
from src.logging.logger import get_logger

# Set up logging
logger = get_logger(__name__)

class PromptQuality(Enum):
    """Enum representing the quality categories for prompts."""
    GOOD = "good"
    OK = "ok"
    BAD = "bad"

@dataclass
class PromptAnalysis:
    """Data class to hold prompt analysis results."""
    quality: PromptQuality
    score: float
    reasons: List[str]
    intent_analysis: Dict[str, Any]
    domain_analysis: Dict[str, Any]

class PromptQualityAnalyzer:
    """Analyzes and classifies the quality of user prompts."""
    
    def __init__(self):
        """Initialize the prompt quality analyzer with thresholds and classifiers."""
        # Quality thresholds
        self.THRESHOLDS = {
            'GOOD': {
                'min_intent_confidence': 0.7,
                'max_intents': 3,
                'min_domain_confidence': 0.6,
                'max_ambiguity': 0.2,
                'min_clarity': 0.7
            },
            'OK': {
                'min_intent_confidence': 0.5,
                'max_intents': 5,
                'min_domain_confidence': 0.4,
                'max_ambiguity': 0.4,
                'min_clarity': 0.5
            }
        }
        
        # Initialize classifiers
        self.intent_classifier = IntentClassifier()
        self.domain_classifier = DomainClassifier.get_instance()
        logger.info("PromptQualityAnalyzer initialized")
    
    def analyze_prompt(self, prompt: str) -> PromptAnalysis:
        """
        Analyze a prompt and classify its quality.
        
        Args:
            prompt: The user prompt to analyze
            
        Returns:
            PromptAnalysis object containing quality assessment and detailed analysis
        """
        logger.info(f"Analyzing prompt quality: {prompt[:50]}...")
        
        try:
            # Get intent analysis
            intent_result = self.intent_classifier.classify_intent(prompt)
            
            # Get domain analysis
            domain = self.domain_classifier.classify_domain(prompt)
            domain_confidence = self.domain_classifier.get_domain_confidence(prompt)
            
            # Calculate quality metrics
            metrics = self._calculate_quality_metrics(
                prompt=prompt,
                intent_result=intent_result,
                domain=domain,
                domain_confidence=domain_confidence
            )
            
            # Determine quality category
            quality, reasons = self._determine_quality_category(metrics)
            
            logger.info(f"Prompt classified as {quality.value} with score {metrics['overall_score']:.2f}")
            
            return PromptAnalysis(
                quality=quality,
                score=metrics['overall_score'],
                reasons=reasons,
                intent_analysis={
                    'main_intent': intent_result.main_intent,
                    'sub_intents': intent_result.sub_intents,
                    'confidence': intent_result.confidence,
                    'needs_review': intent_result.needs_review
                },
                domain_analysis={
                    'domain': domain,
                    'confidence': domain_confidence.get(domain, 0.0),
                    'all_confidence_scores': domain_confidence
                }
            )
            
        except Exception as e:
            logger.error(f"Error analyzing prompt quality: {str(e)}")
            return PromptAnalysis(
                quality=PromptQuality.BAD,
                score=0.0,
                reasons=["Error during analysis"],
                intent_analysis={},
                domain_analysis={}
            )
    
    def _calculate_quality_metrics(self, prompt: str, intent_result: Any, 
                                 domain: str, domain_confidence: Dict[str, float]) -> Dict[str, float]:
        """
        Calculate various quality metrics for the prompt.
        
        Args:
            prompt: The user prompt
            intent_result: Result from intent classification
            domain: Detected domain
            domain_confidence: Confidence scores for all domains
            
        Returns:
            Dictionary of quality metrics
        """
        # Intent clarity score
        intent_clarity = intent_result.confidence
        
        # Intent count score (fewer intents is better)
        intent_count = len(intent_result.sub_intents)
        intent_count_score = max(0, 1 - (intent_count / 10))  # Normalize to 0-1
        
        # Domain confidence score
        domain_score = domain_confidence.get(domain, 0.0)
        
        # Ambiguity score (based on needs_review and sub-intents)
        ambiguity_score = 1.0
        if intent_result.needs_review:
            ambiguity_score -= 0.3
        ambiguity_score -= (len(intent_result.sub_intents) * 0.1)
        ambiguity_score = max(0, ambiguity_score)
        
        # Clarity score (based on prompt structure)
        clarity_score = self._calculate_clarity_score(prompt)
        
        # Calculate overall score
        overall_score = (
            0.3 * intent_clarity +
            0.2 * intent_count_score +
            0.2 * domain_score +
            0.15 * ambiguity_score +
            0.15 * clarity_score
        )
        
        return {
            'intent_clarity': intent_clarity,
            'intent_count_score': intent_count_score,
            'domain_score': domain_score,
            'ambiguity_score': ambiguity_score,
            'clarity_score': clarity_score,
            'overall_score': overall_score
        }
    
    def _calculate_clarity_score(self, prompt: str) -> float:
        """
        Calculate clarity score based on prompt structure.
        
        Args:
            prompt: The user prompt
            
        Returns:
            Clarity score between 0 and 1
        """
        score = 1.0
        
        # Check for clear structure
        if len(prompt.split()) < 3:
            score -= 0.3  # Too short
        
        # Check for proper punctuation
        if not any(c in prompt for c in '.!?'):
            score -= 0.2  # Missing sentence ending
        
        # Check for proper capitalization
        if not prompt[0].isupper():
            score -= 0.1  # Missing capitalization
        
        return max(0, score)
    
    def _determine_quality_category(self, metrics: Dict[str, float]) -> Tuple[PromptQuality, List[str]]:
        """
        Determine the quality category and reasons.
        
        Args:
            metrics: Dictionary of quality metrics
            
        Returns:
            Tuple of (PromptQuality, List of reasons)
        """
        reasons = []
        
        # Check against GOOD criteria
        if (metrics['intent_clarity'] >= self.THRESHOLDS['GOOD']['min_intent_confidence'] and
            metrics['intent_count_score'] >= 0.7 and  # Fewer intents
            metrics['domain_score'] >= self.THRESHOLDS['GOOD']['min_domain_confidence'] and
            metrics['ambiguity_score'] >= self.THRESHOLDS['GOOD']['max_ambiguity'] and
            metrics['clarity_score'] >= self.THRESHOLDS['GOOD']['min_clarity']):
            return PromptQuality.GOOD, ["High intent clarity", "Clear domain focus", "Low ambiguity"]
        
        # Check against OK criteria
        if (metrics['intent_clarity'] >= self.THRESHOLDS['OK']['min_intent_confidence'] and
            metrics['intent_count_score'] >= 0.5 and
            metrics['domain_score'] >= self.THRESHOLDS['OK']['min_domain_confidence'] and
            metrics['ambiguity_score'] >= self.THRESHOLDS['OK']['max_ambiguity'] and
            metrics['clarity_score'] >= self.THRESHOLDS['OK']['min_clarity']):
            
            # Collect reasons for OK rating
            if metrics['intent_clarity'] < self.THRESHOLDS['GOOD']['min_intent_confidence']:
                reasons.append("Moderate intent clarity")
            if metrics['intent_count_score'] < 0.7:
                reasons.append("Multiple intents detected")
            if metrics['domain_score'] < self.THRESHOLDS['GOOD']['min_domain_confidence']:
                reasons.append("Unclear domain focus")
            if metrics['ambiguity_score'] < self.THRESHOLDS['GOOD']['max_ambiguity']:
                reasons.append("Some ambiguity present")
            if metrics['clarity_score'] < self.THRESHOLDS['GOOD']['min_clarity']:
                reasons.append("Could be more clear")
            
            return PromptQuality.OK, reasons
        
        # If neither GOOD nor OK, it's BAD
        reasons = []
        if metrics['intent_clarity'] < self.THRESHOLDS['OK']['min_intent_confidence']:
            reasons.append("Low intent clarity")
        if metrics['intent_count_score'] < 0.5:
            reasons.append("Too many intents")
        if metrics['domain_score'] < self.THRESHOLDS['OK']['min_domain_confidence']:
            reasons.append("Unclear domain")
        if metrics['ambiguity_score'] < self.THRESHOLDS['OK']['max_ambiguity']:
            reasons.append("High ambiguity")
        if metrics['clarity_score'] < self.THRESHOLDS['OK']['min_clarity']:
            reasons.append("Poor clarity")
        
        return PromptQuality.BAD, reasons 