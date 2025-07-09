"""
Intent Adoption Engine for Velocity Router

This module focuses specifically on improving intent adoption across the platform by:
1. Analyzing user intent patterns and suggesting better usage
2. Providing intent-driven onboarding and guidance
3. Tracking intent adoption metrics and success rates
4. Offering contextual intent recommendations
5. Improving intent discoverability and usage

This builds on the existing intent analysis system to focus on adoption and utilization.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import logging

# Import existing intent analysis components
from src.analysis.intent_analyzer import IntentAnalyzer, IntentAnalysis
from src.analysis.intent_classifier import IntentClassifier, IntentResult

logger = logging.getLogger(__name__)

class AdoptionStage(Enum):
    """User adoption stages for intent-driven features."""
    DISCOVERY = "discovery"          # User discovers intent features
    EXPLORATION = "exploration"      # User tries basic intent features
    ADOPTION = "adoption"           # User regularly uses intent features
    MASTERY = "mastery"            # User uses advanced intent patterns
    ADVOCACY = "advocacy"          # User shares/teaches intent features

class UsagePattern(Enum):
    """Common usage patterns for intent analysis."""
    SINGLE_SHOT = "single_shot"               # One-off queries
    ITERATIVE = "iterative"                   # Refining queries
    MULTI_INTENT = "multi_intent"             # Complex multi-part requests
    CONTEXTUAL = "contextual"                 # Building on previous context
    EXPLORATORY = "exploratory"               # Trying different approaches

@dataclass
class IntentAdoptionMetrics:
    """Metrics for tracking intent adoption success."""
    user_id: str
    intent_category: str
    usage_count: int
    success_rate: float
    avg_confidence: float
    improvement_trend: float
    preferred_patterns: List[str]
    stage: AdoptionStage
    last_usage: float
    first_usage: float
    
    def calculate_engagement_score(self) -> float:
        """Calculate engagement score based on usage patterns."""
        recency_factor = max(0.1, 1.0 - (time.time() - self.last_usage) / (7 * 24 * 3600))  # 7 days
        frequency_factor = min(1.0, self.usage_count / 50)  # Cap at 50 uses
        success_factor = self.success_rate
        confidence_factor = self.avg_confidence
        
        return (recency_factor * 0.3 + frequency_factor * 0.2 + 
                success_factor * 0.3 + confidence_factor * 0.2)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        # Convert enum to string value
        data['stage'] = self.stage.value
        return data

@dataclass
class IntentRecommendation:
    """Recommendation for improving intent usage."""
    intent_category: str
    recommendation_type: str
    title: str
    description: str
    example_prompt: str
    difficulty_level: str
    estimated_benefit: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
class IntentAdoptionEngine:
    """
    Engine for improving intent adoption across the platform.
    
    This engine focuses on helping users discover, adopt, and master
    intent-driven features for better platform utilization.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the Intent Adoption Engine."""
        self.config = config or {}
        
        # Initialize existing components
        self.intent_analyzer = IntentAnalyzer(config)
        self.intent_classifier = IntentClassifier()
        
        # User adoption tracking
        self.user_metrics: Dict[str, Dict[str, IntentAdoptionMetrics]] = defaultdict(dict)
        self.platform_patterns = defaultdict(list)
        
        # Adoption insights and recommendations
        self.adoption_insights = defaultdict(list)
        self.success_patterns = defaultdict(list)
        
        # Initialize adoption strategies
        self._init_adoption_strategies()
        self._init_success_patterns()
        
        logger.info("Intent Adoption Engine initialized")
    
    def _init_adoption_strategies(self):
        """Initialize strategies for improving intent adoption."""
        self.adoption_strategies = {
            AdoptionStage.DISCOVERY: {
                "tactics": [
                    "Show intent suggestions in UI",
                    "Highlight successful intent patterns",
                    "Provide intent examples in onboarding"
                ],
                "goals": ["Awareness", "Interest", "First try"]
            },
            AdoptionStage.EXPLORATION: {
                "tactics": [
                    "Guided intent tutorials",
                    "Progressive complexity examples",
                    "Success feedback and encouragement"
                ],
                "goals": ["Regular usage", "Understanding benefits", "Confidence building"]
            },
            AdoptionStage.ADOPTION: {
                "tactics": [
                    "Advanced pattern suggestions",
                    "Cross-intent combinations",
                    "Efficiency improvements"
                ],
                "goals": ["Consistent usage", "Pattern recognition", "Efficiency gains"]
            },
            AdoptionStage.MASTERY: {
                "tactics": [
                    "Expert pattern sharing",
                    "Custom intent combinations",
                    "Advanced optimization tips"
                ],
                "goals": ["Innovation", "Teaching others", "Platform advocacy"]
            }
        }
    
    def _init_success_patterns(self):
        """Initialize known successful intent patterns."""
        self.success_patterns_db = {
            "code_assistance": [
                {
                    "pattern": "specific_language_context",
                    "template": "I need help with {language} {specific_task} for {context}",
                    "success_rate": 0.89,
                    "example": "I need help with Python data visualization for a sales dashboard"
                },
                {
                    "pattern": "error_driven_debugging",
                    "template": "I'm getting {error_type} in {language} when {action}: {error_message}",
                    "success_rate": 0.92,
                    "example": "I'm getting IndexError in Python when accessing list: list index out of range"
                }
            ],
            "content_creation": [
                {
                    "pattern": "audience_tone_format",
                    "template": "Create {content_type} for {audience} in {tone} style, {format_requirements}",
                    "success_rate": 0.86,
                    "example": "Create blog post for developers in conversational style, 800 words with code examples"
                }
            ],
            "data_analysis": [
                {
                    "pattern": "context_goal_format",
                    "template": "Analyze {data_description} to {analysis_goal} for {business_context}",
                    "success_rate": 0.84,
                    "example": "Analyze monthly sales data to identify trends for quarterly planning"
                }
            ]
        }
    
    async def analyze_intent_for_adoption(self, 
                                        prompt: str, 
                                        user_id: Optional[str] = None,
                                        session_context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Analyze intent with focus on adoption improvement, including multi-intent handling.
        
        Args:
            prompt: User's prompt
            user_id: Optional user ID for personalization
            session_context: Optional session context
            
        Returns:
            Dict containing intent analysis plus adoption insights
        """
        # Get standard intent analysis
        intent_analysis = self.intent_analyzer.analyze_intent(prompt)
        intent_result = self.intent_classifier.classify_intent(prompt)
        
        # Detect and analyze multiple intents within the prompt
        multi_intent_analysis = await self._analyze_multiple_intents(prompt, intent_result)
        
        # Build adoption-focused analysis
        adoption_analysis = {
            "intent_analysis": intent_analysis.to_dict(),
            "intent_classification": {
                "main_intent": intent_result.main_intent,
                "sub_intents": intent_result.sub_intents,
                "confidence": intent_result.confidence,
                "needs_review": intent_result.needs_review
            },
            "multi_intent_analysis": multi_intent_analysis,
            "adoption_insights": await self._generate_adoption_insights(
                prompt, intent_analysis, intent_result, user_id, multi_intent_analysis
            ),
            "usage_recommendations": [
                rec.to_dict() for rec in await self._generate_usage_recommendations(
                    prompt, intent_analysis, user_id, multi_intent_analysis
                )
            ],
            "pattern_suggestions": self._suggest_better_patterns(
                intent_result.main_intent, prompt, multi_intent_analysis
            ),
            "success_probability": self._calculate_success_probability(
                prompt, intent_analysis, user_id, multi_intent_analysis
            )
        }
        
        # Track usage for all detected intents if user_id provided
        if user_id:
            # Track primary intent
            await self._track_intent_usage(user_id, intent_result.main_intent, prompt)
            
            # Track additional intents from multi-intent analysis
            for intent_info in multi_intent_analysis.get("detected_intents", []):
                if intent_info["intent"] != intent_result.main_intent:
                    await self._track_intent_usage(user_id, intent_info["intent"], prompt)
        
        return adoption_analysis
    
    async def _analyze_multiple_intents(self, prompt: str, intent_result) -> Dict[str, Any]:
        """
        Analyze and detect multiple intents within a single prompt.
        
        Args:
            prompt: The user's prompt
            intent_result: Primary intent classification result
            
        Returns:
            Dictionary containing multi-intent analysis
        """
        multi_intent_info = {
            "has_multiple_intents": False,
            "detected_intents": [],
            "intent_complexity": "single",
            "suggested_breakdown": [],
            "coordination_strategy": "sequential"
        }
        
        try:
            # Quick pattern-based detection for common multi-intent scenarios
            potential_intents = []
            
            # Look for conjunctions and separators that indicate multiple requests
            separators = ["and", "also", "then", "after that", "plus", "furthermore", "additionally", 
                         "next", "followed by", "as well as", "besides", "moreover"]
            
            # Split by common separators and analyze each part
            parts = []
            for sep in separators:
                if f" {sep} " in prompt.lower():
                    parts = [part.strip() for part in prompt.lower().split(f" {sep} ")]
                    break
            
            # Also check for sentence-based splits
            if not parts and len(prompt.split('.')) > 1:
                parts = [part.strip() for part in prompt.split('.') if len(part.strip()) > 10]
            
            # Also check for question-based splits
            if not parts and len(prompt.split('?')) > 1:
                parts = [part.strip() + '?' for part in prompt.split('?') if len(part.strip()) > 5]
            
            if len(parts) > 1:
                # Analyze each part for intent
                for i, part in enumerate(parts[:4]):  # Limit to 4 parts max
                    if len(part.split()) < 3:  # Skip very short parts
                        continue
                    
                    # Quick intent classification for each part
                    part_intent = self._classify_text_part_intent(part)
                    if part_intent != "unclear":
                        potential_intents.append({
                            "intent": part_intent,
                            "text": part,
                            "confidence": 0.7,
                            "sequence": i + 1
                        })
            
            # Add the primary intent
            if intent_result.main_intent not in [pi["intent"] for pi in potential_intents]:
                potential_intents.insert(0, {
                    "intent": intent_result.main_intent,
                    "text": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                    "confidence": intent_result.confidence,
                    "sequence": 0
                })
            
            # Determine if we have multiple distinct intents
            unique_intents = list(set(pi["intent"] for pi in potential_intents))
            
            if len(unique_intents) > 1:
                multi_intent_info.update({
                    "has_multiple_intents": True,
                    "detected_intents": potential_intents,
                    "intent_complexity": "complex" if len(unique_intents) > 2 else "moderate",
                    "suggested_breakdown": self._suggest_intent_breakdown(potential_intents),
                    "coordination_strategy": self._determine_coordination_strategy(prompt, potential_intents)
                })
            
            return multi_intent_info
            
        except Exception as e:
            logger.warning(f"Error in multi-intent analysis: {e}")
            return multi_intent_info
    
    def _classify_text_part_intent(self, text: str) -> str:
        """Quick intent classification for text parts."""
        text_lower = text.lower()
        
        # Code-related
        if any(word in text_lower for word in ["code", "function", "script", "programming", "debug", "syntax"]):
            return "code_assistance"
        
        # Analysis-related
        if any(word in text_lower for word in ["analyze", "analysis", "data", "statistics", "trends", "insights"]):
            return "data_analysis"
        
        # Content creation
        if any(word in text_lower for word in ["write", "create", "generate", "content", "article", "blog"]):
            return "content_creation"
        
        # Questions
        if any(word in text_lower for word in ["what", "how", "why", "when", "where", "explain"]):
            return "question"
        
        # Research
        if any(word in text_lower for word in ["research", "find", "search", "information", "study"]):
            return "research"
        
        # Problem solving
        if any(word in text_lower for word in ["solve", "fix", "problem", "issue", "troubleshoot"]):
            return "problem_solving"
        
        # Learning
        if any(word in text_lower for word in ["learn", "teach", "tutorial", "guide", "understand"]):
            return "educational_content"
        
        return "unclear"
    
    def _suggest_intent_breakdown(self, intents: List[Dict]) -> List[str]:
        """Suggest how to break down the multi-intent prompt."""
        suggestions = []
        
        for i, intent_info in enumerate(intents):
            intent_name = intent_info["intent"].replace("_", " ").title()
            suggestions.append(f"Step {i+1}: {intent_name} - {intent_info['text'][:50]}...")
        
        return suggestions
    
    def _determine_coordination_strategy(self, prompt: str, intents: List[Dict]) -> str:
        """Determine the best strategy for coordinating multiple intents."""
        prompt_lower = prompt.lower()
        
        # Sequential indicators
        if any(word in prompt_lower for word in ["then", "after", "next", "followed by", "step", "first"]):
            return "sequential"
        
        # Parallel indicators
        if any(word in prompt_lower for word in ["and", "also", "plus", "as well as", "simultaneously"]):
            return "parallel"
        
        # Conditional indicators
        if any(word in prompt_lower for word in ["if", "unless", "depending", "based on"]):
            return "conditional"
        
        # Default based on intent types
        intent_types = [intent_info["intent"] for intent_info in intents]
        if "code_assistance" in intent_types and "data_analysis" in intent_types:
            return "sequential"  # Usually code first, then analysis
        
        return "parallel"  # Default to parallel processing
    
    async def _generate_adoption_insights(self, 
                                        prompt: str, 
                                        intent_analysis: IntentAnalysis,
                                        intent_result: IntentResult,
                                        user_id: Optional[str],
                                        multi_intent_analysis: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Generate insights for improving intent adoption."""
        insights = []
        
        # Multi-intent specific insights
        if multi_intent_analysis and multi_intent_analysis.get("has_multiple_intents"):
            insights.append({
                "type": "multi_intent",
                "title": "Multiple Intents Detected",
                "description": f"Your prompt contains {len(multi_intent_analysis['detected_intents'])} different intents",
                "actionable_tip": f"Consider breaking this into {multi_intent_analysis['coordination_strategy']} steps for better results",
                "impact": "high",
                "suggested_breakdown": multi_intent_analysis.get("suggested_breakdown", []),
                "coordination_strategy": multi_intent_analysis.get("coordination_strategy", "sequential")
            })
        
        # Intent clarity insight
        if intent_analysis.confidence_score < 0.7:
            insights.append({
                "type": "clarity",
                "title": "Improve Intent Clarity",
                "description": "Your request could be more specific to get better results",
                "actionable_tip": "Try adding more context about what you want to achieve",
                "impact": "high"
            })
        
        # Pattern recognition insight
        if intent_result.main_intent in self.success_patterns_db:
            best_pattern = max(
                self.success_patterns_db[intent_result.main_intent],
                key=lambda x: x["success_rate"]
            )
            insights.append({
                "type": "pattern",
                "title": "Use High-Success Pattern",
                "description": f"Similar requests succeed {best_pattern['success_rate']:.0%} of the time when structured properly",
                "actionable_tip": f"Try this pattern: {best_pattern['template']}",
                "example": best_pattern['example'],
                "impact": "medium"
            })
        
        # User-specific insights
        if user_id and user_id in self.user_metrics:
            user_history = self.user_metrics[user_id]
            if intent_result.main_intent in user_history:
                metrics = user_history[intent_result.main_intent]
                if metrics.success_rate < 0.6:
                    insights.append({
                        "type": "personal_improvement",
                        "title": "Improve Your Success Rate",
                        "description": f"Your success rate with {intent_result.main_intent} requests is {metrics.success_rate:.0%}",
                        "actionable_tip": "Try being more specific about your requirements",
                        "impact": "high"
                    })
        
        # Complexity mismatch insight
        word_count = len(prompt.split())
        if word_count < 5 and intent_result.main_intent in ["data_analysis", "code_assistance"]:
            insights.append({
                "type": "complexity",
                "title": "Add More Detail",
                "description": "Complex tasks need more context for best results",
                "actionable_tip": "Include specific requirements, constraints, and expected outcomes",
                "impact": "high"
            })
        
        return insights
    
    async def _generate_usage_recommendations(self,
                                            prompt: str,
                                            intent_analysis: IntentAnalysis,
                                            user_id: Optional[str],
                                            multi_intent_analysis: Dict[str, Any] = None) -> List[IntentRecommendation]:
        """Generate recommendations for better intent usage."""
        recommendations = []
        primary_intent = intent_analysis.primary_intent
        
        # Multi-intent specific recommendations
        if multi_intent_analysis and multi_intent_analysis.get("has_multiple_intents"):
            detected_intents = multi_intent_analysis.get("detected_intents", [])
            
            # Recommend intent coordination
            recommendations.append(IntentRecommendation(
                intent_category="multi_intent",
                recommendation_type="coordination",
                title=f"Coordinate {len(detected_intents)} Intents Effectively",
                description=f"Your prompt has multiple intents that can be handled {multi_intent_analysis.get('coordination_strategy', 'sequentially')}",
                example_prompt=self._create_multi_intent_example(detected_intents, multi_intent_analysis.get('coordination_strategy')),
                difficulty_level="advanced",
                estimated_benefit=0.85
            ))
            
            # Recommend breaking down complex prompts
            if multi_intent_analysis.get("intent_complexity") == "complex":
                recommendations.append(IntentRecommendation(
                    intent_category="prompt_optimization",
                    recommendation_type="simplification",
                    title="Break Down Complex Request",
                    description="Consider splitting your complex request into separate, focused prompts",
                    example_prompt=self._create_simplified_prompt_example(detected_intents[0]),
                    difficulty_level="easy",
                    estimated_benefit=0.9
                ))
        
        # Recommend related intents
        related_intents = self._get_related_intents(primary_intent)
        for related_intent in related_intents[:2]:
            recommendations.append(IntentRecommendation(
                intent_category=related_intent,
                recommendation_type="related_intent",
                title=f"Try {related_intent.replace('_', ' ').title()}",
                description=f"Users often combine {primary_intent} with {related_intent} for better results",
                example_prompt=self._generate_example_prompt(related_intent),
                difficulty_level="medium",
                estimated_benefit=0.7
            ))
        
        # Recommend enhancement patterns
        if intent_analysis.confidence_score < 0.8:
            recommendations.append(IntentRecommendation(
                intent_category=primary_intent,
                recommendation_type="enhancement",
                title="Enhance Your Prompt",
                description="Add specific context and requirements for better results",
                example_prompt=self._enhance_prompt_example(prompt, primary_intent),
                difficulty_level="easy",
                estimated_benefit=0.8
            ))
        
        # User-specific recommendations
        if user_id:
            user_recs = await self._get_personalized_recommendations(user_id, primary_intent)
            recommendations.extend(user_recs)
        
        return recommendations
    
    def _suggest_better_patterns(self, intent_category: str, prompt: str, multi_intent_analysis: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Suggest better prompt patterns for the intent category."""
        suggestions = []
        
        # Multi-intent pattern suggestions
        if multi_intent_analysis and multi_intent_analysis.get("has_multiple_intents"):
            suggestions.append({
                "pattern_name": "Multi-Intent Coordination",
                "template": f"Step 1: [Primary Intent] | Step 2: [Secondary Intent] | Step 3: [Integration]",
                "success_rate": 0.88,
                "example": "Step 1: Analyze the sales data for trends | Step 2: Create visualization charts | Step 3: Present findings with recommendations",
                "improvement_potential": 0.15,
                "coordination_strategy": multi_intent_analysis.get("coordination_strategy", "sequential")
            })
        
        if intent_category in self.success_patterns_db:
            patterns = self.success_patterns_db[intent_category]
            for pattern in patterns:
                suggestions.append({
                    "pattern_name": pattern["pattern"],
                    "template": pattern["template"],
                    "success_rate": pattern["success_rate"],
                    "example": pattern["example"],
                    "improvement_potential": self._calculate_improvement_potential(
                        prompt, pattern["template"]
                    )
                })
        
        return suggestions
    
    def _calculate_success_probability(self,
                                     prompt: str,
                                     intent_analysis: IntentAnalysis,
                                     user_id: Optional[str],
                                     multi_intent_analysis: Dict[str, Any] = None) -> float:
        """Calculate probability of successful intent fulfillment."""
        base_probability = intent_analysis.confidence_score
        
        # Pattern matching bonus
        pattern_bonus = 0.0
        if intent_analysis.primary_intent in self.success_patterns_db:
            patterns = self.success_patterns_db[intent_analysis.primary_intent]
            best_match = max(patterns, key=lambda x: self._pattern_similarity(prompt, x["template"]))
            pattern_bonus = best_match["success_rate"] * 0.2
        
        # User history factor
        user_factor = 0.0
        if user_id and user_id in self.user_metrics:
            user_history = self.user_metrics[user_id]
            if intent_analysis.primary_intent in user_history:
                user_factor = user_history[intent_analysis.primary_intent].success_rate * 0.15
        
        # Multi-intent complexity factor
        multi_intent_factor = 0.0
        if multi_intent_analysis and multi_intent_analysis.get("has_multiple_intents"):
            num_intents = len(multi_intent_analysis.get("detected_intents", []))
            complexity = multi_intent_analysis.get("intent_complexity", "single")
            
            if complexity == "single":
                multi_intent_factor = 0.0
            elif complexity == "moderate":
                multi_intent_factor = 0.05  # Slight boost for well-structured multi-intent
            else:  # complex
                multi_intent_factor = -0.1  # Penalty for overly complex multi-intent
            
            # Coordination strategy factor
            strategy = multi_intent_analysis.get("coordination_strategy", "sequential")
            if strategy == "sequential":
                multi_intent_factor += 0.03  # Sequential is generally more successful
            elif strategy == "parallel":
                multi_intent_factor += 0.01  # Parallel is moderate
            # conditional gets no bonus/penalty
        
        # Prompt quality factor
        quality_factor = min(len(prompt.split()) / 20, 0.1)  # Longer prompts tend to be more successful
        
        success_probability = min(1.0, base_probability + pattern_bonus + user_factor + multi_intent_factor + quality_factor)
        return success_probability
    
    async def _track_intent_usage(self, user_id: str, intent_category: str, prompt: str):
        """Track user's intent usage for adoption analytics."""
        current_time = time.time()
        
        if intent_category not in self.user_metrics[user_id]:
            # First time using this intent
            self.user_metrics[user_id][intent_category] = IntentAdoptionMetrics(
                user_id=user_id,
                intent_category=intent_category,
                usage_count=1,
                success_rate=0.5,  # Neutral start
                avg_confidence=0.5,
                improvement_trend=0.0,
                preferred_patterns=[],
                stage=AdoptionStage.EXPLORATION,
                last_usage=current_time,
                first_usage=current_time
            )
        else:
            # Update existing metrics
            metrics = self.user_metrics[user_id][intent_category]
            metrics.usage_count += 1
            metrics.last_usage = current_time
            
            # Update adoption stage based on usage
            if metrics.usage_count >= 20 and metrics.success_rate >= 0.8:
                metrics.stage = AdoptionStage.MASTERY
            elif metrics.usage_count >= 10 and metrics.success_rate >= 0.7:
                metrics.stage = AdoptionStage.ADOPTION
            elif metrics.usage_count >= 5:
                metrics.stage = AdoptionStage.EXPLORATION
    
    def get_user_adoption_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user's intent adoption profile."""
        if user_id not in self.user_metrics:
            return {
                "user_id": user_id,
                "stage": AdoptionStage.DISCOVERY.value,
                "intents_used": 0,
                "total_interactions": 0,
                "avg_success_rate": 0.0,
                "strongest_intents": [],
                "improvement_areas": [],
                "recommendations": []
            }
        
        user_data = self.user_metrics[user_id]
        total_interactions = sum(metrics.usage_count for metrics in user_data.values())
        avg_success_rate = sum(metrics.success_rate for metrics in user_data.values()) / len(user_data)
        
        # Get strongest intents
        strongest_intents = sorted(
            user_data.items(),
            key=lambda x: x[1].calculate_engagement_score(),
            reverse=True
        )[:3]
        
        # Get improvement areas
        improvement_areas = [
            intent for intent, metrics in user_data.items()
            if metrics.success_rate < 0.6
        ]
        
        return {
            "user_id": user_id,
            "stage": self._determine_overall_stage(user_data).value,
            "intents_used": len(user_data),
            "total_interactions": total_interactions,
            "avg_success_rate": avg_success_rate,
            "strongest_intents": [
                {
                    "intent": intent,
                    "usage_count": metrics.usage_count,
                    "success_rate": metrics.success_rate,
                    "engagement_score": metrics.calculate_engagement_score()
                }
                for intent, metrics in strongest_intents
            ],
            "improvement_areas": improvement_areas,
            "recommendations": self._get_user_recommendations(user_id)
        }
    
    def get_platform_adoption_analytics(self) -> Dict[str, Any]:
        """Get platform-wide intent adoption analytics."""
        all_intents = defaultdict(list)
        user_stages = defaultdict(int)
        
        # Aggregate data
        for user_id, user_data in self.user_metrics.items():
            stage = self._determine_overall_stage(user_data)
            user_stages[stage.value] += 1
            
            for intent, metrics in user_data.items():
                all_intents[intent].append(metrics)
        
        # Calculate intent adoption rates
        intent_adoption = {}
        for intent, metrics_list in all_intents.items():
            intent_adoption[intent] = {
                "total_users": len(metrics_list),
                "avg_usage_count": sum(m.usage_count for m in metrics_list) / len(metrics_list),
                "avg_success_rate": sum(m.success_rate for m in metrics_list) / len(metrics_list),
                "adoption_rate": len([m for m in metrics_list if m.stage.value in ["adoption", "mastery"]]) / len(metrics_list)
            }
        
        return {
            "total_users": len(self.user_metrics),
            "user_stage_distribution": dict(user_stages),
            "intent_adoption_rates": intent_adoption,
            "top_adopted_intents": sorted(
                intent_adoption.items(),
                key=lambda x: x[1]["adoption_rate"],
                reverse=True
            )[:5],
            "improvement_opportunities": self._identify_improvement_opportunities(intent_adoption)
        }
    
    def _determine_overall_stage(self, user_data: Dict[str, IntentAdoptionMetrics]) -> AdoptionStage:
        """Determine user's overall adoption stage."""
        if not user_data:
            return AdoptionStage.DISCOVERY
        
        stages = [metrics.stage for metrics in user_data.values()]
        stage_counts = defaultdict(int)
        for stage in stages:
            stage_counts[stage] += 1
        
        # Return the most common stage, with bias toward higher stages
        stage_priority = {
            AdoptionStage.MASTERY: 5,
            AdoptionStage.ADOPTION: 4,
            AdoptionStage.EXPLORATION: 3,
            AdoptionStage.DISCOVERY: 2
        }
        
        return max(stages, key=lambda s: stage_priority[s])
    
    def _get_related_intents(self, intent: str) -> List[str]:
        """Get related intents that work well together."""
        intent_relationships = {
            "code_assistance": ["data_analysis", "problem_solving", "debugging"],
            "data_analysis": ["data_visualization", "code_assistance", "research"],
            "content_creation": ["creative_generation", "educational_content", "action_request"],
            "problem_solving": ["code_assistance", "analysis", "research"],
            "research": ["data_analysis", "summarization", "factual_verification"]
        }
        return intent_relationships.get(intent, [])
    
    def _generate_example_prompt(self, intent_category: str) -> str:
        """Generate example prompt for an intent category."""
        examples = {
            "code_assistance": "Help me write a Python function to calculate fibonacci numbers with error handling",
            "data_analysis": "Analyze this sales dataset to identify seasonal trends and top-performing products",
            "content_creation": "Write a technical blog post about API design best practices for developer audience",
            "research": "Research the latest trends in machine learning for natural language processing"
        }
        return examples.get(intent_category, "Example prompt for better results")
    
    def _enhance_prompt_example(self, prompt: str, intent: str) -> str:
        """Show how to enhance a prompt for better results."""
        enhancements = {
            "code_assistance": f"Enhanced: {prompt} - Please include error handling, comments, and example usage",
            "data_analysis": f"Enhanced: {prompt} - Include data format, analysis goals, and visualization preferences",
            "content_creation": f"Enhanced: {prompt} - Specify target audience, tone, length, and format requirements"
        }
        return enhancements.get(intent, f"Enhanced: {prompt} - Add more specific context and requirements")
    
    def _create_multi_intent_example(self, detected_intents: List[Dict], coordination_strategy: str) -> str:
        """Create example prompt showing how to coordinate multiple intents."""
        if coordination_strategy == "sequential":
            example_parts = []
            for i, intent_info in enumerate(detected_intents[:3]):  # Limit to 3 for clarity
                intent_name = intent_info["intent"].replace("_", " ")
                example_parts.append(f"Step {i+1}: {intent_name} - {intent_info.get('text', 'perform the task')[:30]}...")
            return f"Try this sequential approach: {' | '.join(example_parts)}"
        
        elif coordination_strategy == "parallel":
            intents_list = [intent_info["intent"].replace("_", " ") for intent_info in detected_intents[:3]]
            return f"Handle these together: {', '.join(intents_list)} - provide comprehensive analysis covering all aspects"
        
        else:  # conditional
            return "Use conditional structure: If X condition is met, then perform Y, otherwise handle Z scenario"
    
    def _create_simplified_prompt_example(self, primary_intent_info: Dict) -> str:
        """Create simplified prompt example focusing on single intent."""
        intent_name = primary_intent_info["intent"].replace("_", " ")
        original_text = primary_intent_info.get("text", "")
        
        simplified_examples = {
            "code_assistance": f"Focus on coding: Help me write clean, efficient code for {original_text[:30]}...",
            "data_analysis": f"Focus on analysis: Analyze this data to find {original_text[:30]}...",
            "content_creation": f"Focus on writing: Create engaging content about {original_text[:30]}...",
            "research": f"Focus on research: Find comprehensive information about {original_text[:30]}..."
        }
        
        return simplified_examples.get(
            primary_intent_info["intent"], 
            f"Focus on {intent_name}: {original_text[:50]}..."
        )
    
    def _pattern_similarity(self, prompt: str, template: str) -> float:
        """Calculate similarity between prompt and success pattern template."""
        # Simple keyword-based similarity
        prompt_words = set(prompt.lower().split())
        template_words = set(template.lower().split())
        
        if not template_words:
            return 0.0
        
        intersection = prompt_words & template_words
        return len(intersection) / len(template_words)
    
    def _calculate_improvement_potential(self, prompt: str, template: str) -> float:
        """Calculate potential improvement from using a pattern."""
        current_similarity = self._pattern_similarity(prompt, template)
        return max(0.0, 1.0 - current_similarity)
    
    async def _get_personalized_recommendations(self, user_id: str, intent: str) -> List[IntentRecommendation]:
        """Get personalized recommendations for a user."""
        recommendations = []
        
        if user_id in self.user_metrics and intent in self.user_metrics[user_id]:
            metrics = self.user_metrics[user_id][intent]
            
            if metrics.success_rate < 0.7:
                recommendations.append(IntentRecommendation(
                    intent_category=intent,
                    recommendation_type="improvement",
                    title="Improve Success Rate",
                    description=f"Your {intent} success rate is {metrics.success_rate:.0%}. Try these patterns:",
                    example_prompt=self._get_best_pattern_for_intent(intent),
                    difficulty_level="medium",
                    estimated_benefit=0.9
                ))
        
        return recommendations
    
    def _get_best_pattern_for_intent(self, intent: str) -> str:
        """Get the best success pattern for an intent."""
        if intent in self.success_patterns_db:
            best_pattern = max(
                self.success_patterns_db[intent],
                key=lambda x: x["success_rate"]
            )
            return best_pattern["example"]
        return "Use specific, detailed prompts with clear context"
    
    def _get_user_recommendations(self, user_id: str) -> List[str]:
        """Get general recommendations for a user."""
        if user_id not in self.user_metrics:
            return ["Start exploring intent-driven features to improve your results"]
        
        user_data = self.user_metrics[user_id]
        recommendations = []
        
        # Stage-based recommendations
        overall_stage = self._determine_overall_stage(user_data)
        stage_recs = self.adoption_strategies[overall_stage]["tactics"]
        recommendations.extend(stage_recs[:2])
        
        # Intent-specific recommendations
        low_performing_intents = [
            intent for intent, metrics in user_data.items()
            if metrics.success_rate < 0.6
        ]
        
        if low_performing_intents:
            recommendations.append(f"Focus on improving {low_performing_intents[0]} with more specific prompts")
        
        return recommendations
    
    def _identify_improvement_opportunities(self, intent_adoption: Dict) -> List[str]:
        """Identify platform-wide improvement opportunities."""
        opportunities = []
        
        # Low adoption intents
        low_adoption = [
            intent for intent, data in intent_adoption.items()
            if data["adoption_rate"] < 0.3
        ]
        
        if low_adoption:
            opportunities.append(f"Improve adoption for: {', '.join(low_adoption[:3])}")
        
        # Low success rate intents
        low_success = [
            intent for intent, data in intent_adoption.items()
            if data["avg_success_rate"] < 0.6
        ]
        
        if low_success:
            opportunities.append(f"Improve success patterns for: {', '.join(low_success[:3])}")
        
        return opportunities

# Singleton instance for easy access
_intent_adoption_engine = None

def get_intent_adoption_engine(config: Optional[Dict[str, Any]] = None) -> IntentAdoptionEngine:
    """Get the global Intent Adoption Engine instance."""
    global _intent_adoption_engine
    if _intent_adoption_engine is None:
        _intent_adoption_engine = IntentAdoptionEngine(config)
    return _intent_adoption_engine 