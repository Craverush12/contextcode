"""
Intent analysis module for the Dynamic LLM Router.

This module provides functionality for analyzing user intents using probabilistic
intent fields rather than discrete classification. It enables more nuanced understanding
of ambiguous queries and can generate clarification strategies when needed.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import re
from collections import defaultdict
import logging
from dataclasses import dataclass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class IntentAnalysis:
    """Result of intent analysis with probability distribution."""
    intent_distribution: Dict[str, float]
    confidence_regions: Dict[str, float]
    ambiguity_zones: List[str]
    primary_intent: str
    confidence_score: float
    clarification_needed: bool

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "intent_distribution": self.intent_distribution,
            "confidence_regions": self.confidence_regions,
            "ambiguity_zones": self.ambiguity_zones,
            "primary_intent": self.primary_intent,
            "confidence_score": self.confidence_score,
            "clarification_needed": self.clarification_needed
        }


class ProbabilisticIntentField:
    """
    Generates multi-dimensional probability fields of possible intents.

    Instead of discrete intent classification, this class represents user intent
    as a probability distribution across multiple possible intents, with confidence
    regions and ambiguity zones.
    """

    # Common intent categories
    INTENT_CATEGORIES = [
        # Information and Knowledge Intents
        "information_request",
        "factual_verification",
        "explanation",
        "educational_content",

        # Creation and Generation Intents
        "code_generation",
        "creative_generation",
        "action_request",

        # Analysis and Evaluation Intents
        "problem_solving",
        "comparison",
        "analysis",
        "opinion",

        # Synthesis and Organization Intents
        "summarization",
        "brainstorming",

        # Data and Visualization Intents
        "data_analysis",
        "data_visualization",

        # Additional Specialized Intents
        "translation",
        "debugging",
        "planning",
        "recommendation",
        "research",

        # Conversation Flow Intents
        "clarification",
        "elaboration"
    ]

    # Intent-specific keywords
    INTENT_KEYWORDS = {
        # Information and Knowledge Intents
        "information_request": [
            "what", "who", "where", "when", "why", "how", "tell me about",
            "information on", "details about", "explain", "describe",
            "learn about", "find out", "know more", "understand", "research"
        ],
        "factual_verification": [
            "is it true", "fact check", "verify", "confirmation", "accurate",
            "correct", "true or false", "validity", "debunk", "authenticate",
            "reliable", "credible", "proven", "evidence", "confirm"
        ],
        "explanation": [
            "explain", "explanation", "why", "how does", "how do", "what causes",
            "reason for", "mechanism", "process", "teach me", "help me understand",
            "elaborate on", "walk through", "clarify", "elucidate"
        ],

        # Creation and Generation Intents
        "code_generation": [
            "code", "function", "program", "script", "algorithm", "implement",
            "develop", "software", "application", "api", "module", "library",
            "framework", "syntax", "compile", "debug", "programming", "class"
        ],
        "creative_generation": [
            "story", "poem", "creative", "imagine", "fiction", "narrative",
            "invent", "design", "art", "music", "novel idea", "write a",
            "compose", "create", "generate", "craft", "design", "draft"
        ],
        "action_request": [
            "create", "generate", "make", "build", "write", "develop",
            "implement", "execute", "perform", "do", "help me", "provide",
            "prepare", "produce", "complete", "construct", "formulate"
        ],

        # Analysis and Evaluation Intents
        "problem_solving": [
            "solve", "solution", "fix", "resolve", "troubleshoot", "debug",
            "help with", "how to fix", "workaround", "handle", "approach",
            "tackle", "deal with", "strategy for", "method to", "overcome"
        ],
        "comparison": [
            "compare", "contrast", "difference between", "similarities between",
            "versus", "vs", "better", "worse", "pros and cons", "differentiate",
            "distinguish", "weigh", "evaluate against", "rank", "advantages"
        ],
        "analysis": [
            "analyze", "analysis", "examine", "investigate", "study",
            "evaluate", "assess", "review", "critique", "dissect", "explore",
            "inspect", "scrutinize", "diagnose", "appraise", "interpret"
        ],
        "opinion": [
            "what do you think", "opinion", "perspective", "viewpoint",
            "stance", "position", "feel about", "thoughts on", "impression",
            "sentiment", "attitude", "feeling about", "take on", "judgment"
        ],

        # Synthesis and Organization Intents
        "summarization": [
            "summarize", "summary", "brief", "overview", "key points",
            "main ideas", "tldr", "in short", "concise", "condense",
            "distill", "extract", "highlight", "synopsis", "digest"
        ],
        "brainstorming": [
            "ideas for", "brainstorm", "suggestions", "options", "alternatives",
            "possibilities", "ways to", "approaches", "strategies", "creative solutions",
            "thinking", "ideation", "generate ideas", "concepts", "proposals"
        ],

        # Additional Specialized Intents
        "translation": [
            "translate", "translation", "convert", "in spanish", "in french",
            "in german", "in japanese", "in chinese", "in russian", "localize",
            "interpret", "render", "paraphrase", "rephrase", "from english to"
        ],
        "data_analysis": [
            "data analysis", "analyze data", "dataset", "statistics", "metrics",
            "trends", "patterns", "correlations", "insights", "data science",
            "report", "findings", "data mining", "analyze the data", "statistical analysis"
        ],
        "data_visualization": [
            "data visualization", "visualize data", "chart", "graph", "plot",
            "dashboard", "diagram", "infographic", "visual representation", "display data",
            "show data", "create visualization", "data viz", "visualize", "visual analytics"
        ],
        "educational_content": [
            "teach", "lesson", "course", "curriculum", "educational", "learning",
            "instructional", "tutorial", "lecture", "study guide", "learning materials",
            "educational resources", "teaching", "academic", "classroom", "education"
        ],
        "research": [
            "research", "investigate", "study", "literature review", "academic research",
            "scientific inquiry", "scholarly", "in-depth investigation", "examine",
            "explore", "deep dive", "comprehensive analysis", "thorough examination"
        ],
        "debugging": [
            "debug", "fix", "error", "bug", "issue", "problem", "troubleshoot",
            "not working", "fails", "exception", "crash", "incorrect behavior",
            "unexpected result", "broken", "fault", "defect", "glitch"
        ],
        "planning": [
            "plan", "strategy", "roadmap", "timeline", "schedule", "milestones",
            "objectives", "goals", "steps", "process", "approach", "framework",
            "outline", "blueprint", "project plan", "action plan", "organize"
        ],
        "recommendation": [
            "recommend", "suggestion", "advice", "guidance", "best option",
            "should I", "what's the best", "preferred", "optimal", "ideal",
            "suggest", "propose", "advocate", "endorse", "favor"
        ],

        # Conversation Flow Intents
        "clarification": [
            "clarify", "explain", "what do you mean", "i don't understand",
            "could you elaborate", "what is", "define", "confused about",
            "unclear", "ambiguous", "specify", "be more specific", "rephrase"
        ],
        "elaboration": [
            "more details", "tell me more", "elaborate", "expand on",
            "additional information", "go deeper", "in depth", "further explanation",
            "more context", "examples", "instances", "cases", "illustrations"
        ]
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the ProbabilisticIntentField.

        Args:
            config: Optional configuration dictionary with parameters
        """
        self.config = config or {}

        # Get global thresholds
        self.ambiguity_threshold = self.config.get("ambiguity_threshold", 0.2)  # Lowered from 0.3 to detect more ambiguity
        self.confidence_threshold = self.config.get("confidence_threshold", 0.6)
        self.clarification_threshold = self.config.get("clarification_threshold", 0.4)  # Lowered from 0.5 to trigger more clarifications

        # Store domain-specific thresholds
        self.domain_thresholds = self.config.get("domain_thresholds", {})

        # Initialize state
        self.intent_distributions = {}
        self.confidence_regions = {}
        self.ambiguity_zones = []
        self.current_domain = None

        logger.debug("Initialized ProbabilisticIntentField")

    def get_thresholds_for_domain(self, domain: Optional[str] = None) -> Dict[str, float]:
        """
        Get thresholds for a specific domain.

        Args:
            domain: The domain to get thresholds for

        Returns:
            Dictionary with threshold values for the domain
        """
        if not domain or domain not in self.domain_thresholds:
            # Use default thresholds if domain is not specified or not found
            domain_config = self.domain_thresholds.get("default", {})
        else:
            domain_config = self.domain_thresholds.get(domain, {})

        # Return domain-specific thresholds, falling back to global thresholds
        return {
            "ambiguity_threshold": domain_config.get("ambiguity_threshold", self.ambiguity_threshold),
            "confidence_threshold": domain_config.get("confidence_threshold", self.confidence_threshold),
            "clarification_threshold": domain_config.get("clarification_threshold", self.clarification_threshold)
        }

    def generate_intent_field(self, user_input: str, domain: Optional[str] = None) -> IntentAnalysis:
        """
        Generate a multi-dimensional probability field of possible intents.

        Args:
            user_input: The user's query or prompt
            domain: Optional domain for domain-specific thresholds

        Returns:
            IntentAnalysis object with intent distribution and related information
        """
        logger.info(f"Generating intent field for input: {user_input[:50]}...")

        # Store current domain
        self.current_domain = domain

        # Get domain-specific thresholds
        thresholds = self.get_thresholds_for_domain(domain)
        domain_ambiguity_threshold = thresholds["ambiguity_threshold"]
        domain_confidence_threshold = thresholds["confidence_threshold"]
        domain_clarification_threshold = thresholds["clarification_threshold"]

        # Compute intent probabilities
        self.intent_distributions = self.compute_intent_probabilities(user_input)

        # Identify high certainty areas using domain-specific threshold
        self.confidence_regions = self.identify_high_certainty_areas(
            self.intent_distributions,
            confidence_threshold=domain_confidence_threshold
        )

        # Flag uncertain regions using domain-specific threshold
        self.ambiguity_zones = self.flag_uncertain_regions(
            self.intent_distributions,
            ambiguity_threshold=domain_ambiguity_threshold
        )

        # Get primary intent and confidence score
        primary_intent, confidence_score = self._get_primary_intent(self.intent_distributions)

        # Determine if clarification is needed using domain-specific threshold
        clarification_needed = confidence_score < domain_clarification_threshold or len(self.ambiguity_zones) > 0

        # Create intent analysis result
        intent_analysis = IntentAnalysis(
            intent_distribution=self.intent_distributions,
            confidence_regions=self.confidence_regions,
            ambiguity_zones=self.ambiguity_zones,
            primary_intent=primary_intent,
            confidence_score=confidence_score,
            clarification_needed=clarification_needed
        )

        logger.info(f"Generated intent field with primary intent: {primary_intent}, confidence: {confidence_score:.2f}")
        return intent_analysis

    def compute_intent_probabilities(self, user_input: str) -> Dict[str, float]:
        """
        Compute probability distribution across possible intents.

        Args:
            user_input: The user's query or prompt

        Returns:
            Dictionary mapping intent categories to probability scores
        """
        # Normalize input
        normalized_input = user_input.lower()

        # Initialize probabilities
        probabilities = defaultdict(float)

        # Adjust weights for different signals
        keyword_weight = 0.7  # Prioritize explicit keywords
        structure_weight = 0.3  # Complementary weight for sentence structure

        # Enhanced keyword matching with boosting for exact matches
        for intent, keywords in self.INTENT_KEYWORDS.items():
            # Count keyword matches with boosting for exact matches
            matches = 0
            exact_matches = 0

            # Check for exact phrase matches (higher weight)
            words = normalized_input.split()
            for keyword in keywords:
                if keyword in normalized_input:
                    matches += 1
                    # Check for exact matches (whole word or phrase)
                    if keyword in words or f" {keyword} " in f" {normalized_input} ":
                        exact_matches += 1

            # Calculate base probability with boosting for exact matches
            if matches > 0:
                # Base probability from keyword matches
                base_prob = matches / len(keywords)
                # Boost for exact matches
                exact_match_boost = 0.5 * (exact_matches / max(1, matches))
                # Apply weighted probability with boost
                probabilities[intent] += keyword_weight * (base_prob + exact_match_boost)

        # Analyze sentence structure for additional intent signals
        structure_probabilities = self._analyze_sentence_structure(normalized_input, defaultdict(float))

        # Combine keyword and structure probabilities with appropriate weights
        for intent, prob in structure_probabilities.items():
            probabilities[intent] += structure_weight * prob

        # Ensure all intent categories have a value
        for intent in self.INTENT_CATEGORIES:
            if intent not in probabilities:
                probabilities[intent] = 0.01  # Small baseline probability

        # Normalize probabilities to sum to 1
        total = sum(probabilities.values())
        if total > 0:
            normalized_probabilities = {intent: prob/total for intent, prob in probabilities.items()}
        else:
            # If no clear signals, assign equal probabilities
            normalized_probabilities = {intent: 1.0/len(self.INTENT_CATEGORIES) for intent in self.INTENT_CATEGORIES}

        return normalized_probabilities

    def _analyze_sentence_structure(self, text: str, probabilities: Dict[str, float]) -> Dict[str, float]:
        """
        Analyze sentence structure for additional intent signals.

        Args:
            text: Normalized user input
            probabilities: Current probability distribution

        Returns:
            Updated probability distribution
        """
        # Check for question structure - strong indicator of information request
        if text.endswith("?"):
            if any(word in text for word in ["what", "who", "where", "when", "why", "how"]):
                probabilities["information_request"] += 0.8  # Increased for stronger signal
            elif "is" in text.split() or "are" in text.split() or "am" in text.split():
                probabilities["factual_verification"] += 0.7  # Increased for stronger signal

        # Check for imperative structure (commands/requests)
        sentences = re.split(r'[.!?]', text)
        for sentence in sentences:
            words = sentence.strip().split()
            if words and words[0] in ["create", "generate", "write", "make", "build", "develop", "implement"]:
                probabilities["action_request"] += 0.6  # Increased for stronger signal

                # Check for code-related imperatives - very strong signal
                if any(word in sentence for word in ["code", "function", "program", "algorithm", "class", "module"]):
                    probabilities["code_generation"] += 0.9  # Increased for stronger signal

                # Check for creative imperatives - very strong signal
                if any(word in sentence for word in ["story", "poem", "creative", "imagine", "fiction", "narrative"]):
                    probabilities["creative_generation"] += 0.9  # Increased for stronger signal

                # Check for data visualization imperatives - new strong signal
                if any(word in sentence for word in ["visualization", "chart", "graph", "plot", "dashboard", "diagram"]):
                    probabilities["data_visualization"] += 0.9  # New strong signal

                # Check for educational content imperatives - new strong signal
                if any(word in sentence for word in ["lesson", "course", "tutorial", "educational", "teaching"]):
                    probabilities["educational_content"] += 0.9  # New strong signal

        # Check for comparison structure - very specific intent
        if any(phrase in text for phrase in ["compare", "difference between", "versus", "vs", "pros and cons", "similarities", "differences"]):
            probabilities["comparison"] += 0.9  # Increased for stronger signal

        # Check for problem-solving structure
        if any(phrase in text for phrase in ["how to", "how do i", "help me", "solve", "fix", "troubleshoot", "debug"]):
            probabilities["problem_solving"] += 0.8  # Increased for stronger signal

        # Check for explanation requests
        if any(phrase in text for phrase in ["explain", "clarify", "describe", "elaborate on", "tell me about"]):
            probabilities["explanation"] += 0.8  # Increased for stronger signal

        # Check for summarization requests
        if any(phrase in text for phrase in ["summarize", "summary", "overview", "tldr", "in brief"]):
            probabilities["summarization"] += 0.9  # Increased for stronger signal

        # Check for analysis requests
        if any(phrase in text for phrase in ["analyze", "analysis", "examine", "investigate", "evaluate"]):
            probabilities["analysis"] += 0.8  # Increased for stronger signal

        # Check for data analysis requests
        if any(phrase in text for phrase in ["analyze data", "data analysis", "statistics", "metrics", "trends", "patterns"]):
            probabilities["data_analysis"] += 0.9  # New strong signal

        # Check for data visualization requests
        if any(phrase in text for phrase in ["visualize data", "data visualization", "chart", "graph", "plot"]):
            probabilities["data_visualization"] += 0.9  # New strong signal

        # Check for research requests
        if any(phrase in text for phrase in ["research", "literature review", "academic research", "scientific inquiry"]):
            probabilities["research"] += 0.9  # New strong signal

        # Check for recommendation requests
        if any(phrase in text for phrase in ["recommend", "what's the best", "suggest", "advice", "should I"]):
            probabilities["recommendation"] += 0.9  # New strong signal

        return probabilities

    def identify_high_certainty_areas(self, intent_distribution: Dict[str, float], confidence_threshold: Optional[float] = None) -> Dict[str, float]:
        """
        Identify areas of high certainty in the intent distribution.

        Args:
            intent_distribution: Probability distribution across intents
            confidence_threshold: Optional threshold to override the default

        Returns:
            Dictionary mapping high-certainty intents to confidence scores
        """
        # Use provided threshold or fall back to instance default
        threshold = confidence_threshold if confidence_threshold is not None else self.confidence_threshold

        # Filter for intents with probability above confidence threshold
        high_certainty = {
            intent: prob
            for intent, prob in intent_distribution.items()
            if prob >= threshold
        }

        return high_certainty

    def flag_uncertain_regions(self, intent_distribution: Dict[str, float], ambiguity_threshold: Optional[float] = None) -> List[str]:
        """
        Flag regions of uncertainty or ambiguity in the intent distribution.

        Args:
            intent_distribution: Probability distribution across intents
            ambiguity_threshold: Optional threshold to override the default

        Returns:
            List of intent categories with ambiguous signals
        """
        # Use provided threshold or fall back to instance default
        threshold = ambiguity_threshold if ambiguity_threshold is not None else self.ambiguity_threshold

        # Sort intents by probability (descending)
        sorted_intents = sorted(intent_distribution.items(), key=lambda x: x[1], reverse=True)

        # Check for ambiguity (multiple intents with similar probabilities)
        ambiguity_zones = []

        # If we have at least 2 intents
        if len(sorted_intents) >= 2:
            # Check if top two intents have similar probabilities
            top_intent, top_prob = sorted_intents[0]
            second_intent, second_prob = sorted_intents[1]

            # If the difference is less than the threshold, or if the top probability is low
            if top_prob - second_prob < threshold or top_prob < 0.4:
                # Create a new ambiguity zone with sorted intents to avoid duplicates
                new_zone = "_".join(sorted([top_intent, second_intent]))
                ambiguity_zones.append(new_zone)

                # Also check if there's a third intent close to the second
                if len(sorted_intents) >= 3:
                    third_intent, third_prob = sorted_intents[2]
                    if second_prob - third_prob < threshold:
                        # Create a new ambiguity zone with sorted intents to avoid duplicates
                        new_zone = "_".join(sorted([second_intent, third_intent]))
                        if new_zone not in ambiguity_zones:
                            ambiguity_zones.append(new_zone)

            # Check for additional ambiguity with other high-probability intents
            # This helps catch cases where multiple intents have similar probabilities
            for i in range(1, min(4, len(sorted_intents))):
                intent_i, prob_i = sorted_intents[i]
                if prob_i > 0.15:  # Only consider intents with reasonable probability
                    for j in range(i+1, min(5, len(sorted_intents))):
                        intent_j, prob_j = sorted_intents[j]
                        if prob_j > 0.1 and prob_i - prob_j < threshold:
                            # Create a new ambiguity zone with sorted intents to avoid duplicates
                            new_zone = "_".join(sorted([intent_i, intent_j]))
                            if new_zone not in ambiguity_zones:
                                ambiguity_zones.append(new_zone)

        return ambiguity_zones

    def generate_clarification_strategy(self, ambiguity_zones: List[str]) -> Dict[str, Any]:
        """
        Generate a strategy to clarify ambiguous intents.

        Args:
            ambiguity_zones: List of ambiguous intent pairs

        Returns:
            Dictionary with clarification strategy
        """
        clarification_strategy = {
            "needs_clarification": len(ambiguity_zones) > 0,
            "ambiguity_zones": ambiguity_zones,
            "clarification_questions": []
        }

        # Generate specific clarification questions for each ambiguity zone
        # Use a set to track which ambiguity pairs we've already processed
        processed_pairs = set()

        for zone in ambiguity_zones:
            intents = zone.split("_")

            if len(intents) == 2:
                intent1, intent2 = intents

                # Create a sorted tuple of intents to use as a key
                intent_key = tuple(sorted([intent1, intent2]))

                # Skip if we've already processed this pair
                if intent_key in processed_pairs:
                    continue

                # Mark this pair as processed
                processed_pairs.add(intent_key)

                # Create a sorted pair of intents to handle them regardless of order
                intent_pair = tuple(sorted([intent1, intent2]))

                # Generate appropriate clarification question based on the ambiguous intents
                if intent_pair == ("action_request", "information_request"):
                    clarification_strategy["clarification_questions"].append(
                        "Are you looking for information about this topic, or do you want me to create something specific?"
                    )
                elif intent_pair == ("code_generation", "creative_generation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to write creative content, or are you looking for code implementation?"
                    )
                elif intent_pair == ("factual_verification", "opinion"):
                    clarification_strategy["clarification_questions"].append(
                        "Are you asking for my opinion on this matter, or would you like me to verify factual information?"
                    )
                elif intent_pair == ("explanation", "problem_solving"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to help solve this problem, or would you prefer an explanation of how it works?"
                    )
                elif intent_pair == ("analysis", "comparison"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to compare these items directly, or provide a deeper analysis of each one?"
                    )
                elif intent_pair == ("explanation", "summarization"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like a concise summary, or a more detailed explanation with context and reasoning?"
                    )
                elif intent_pair == ("data_analysis", "visualization"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to analyze the data and provide insights, or create visualizations of the data?"
                    )
                elif intent_pair == ("comparison", "recommendation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to recommend the best option for you, or provide a detailed comparison of all options?"
                    )
                elif intent_pair == ("debugging", "explanation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to help debug this issue and find a solution, or explain why this issue might be occurring?"
                    )
                elif intent_pair == ("brainstorming", "planning"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to help create a structured plan, or generate creative ideas and possibilities?"
                    )
                elif intent_pair == ("data_analysis", "data_visualization"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to analyze the data to find insights, or create visual representations of the data?"
                    )
                elif intent_pair == ("educational_content", "explanation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to create structured educational materials, or provide an explanation of this topic?"
                    )
                elif intent_pair == ("analysis", "research"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to conduct research on this topic, or analyze existing information?"
                    )
                elif intent_pair == ("action_request", "data_visualization"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to create a visualization of data, or are you asking me to perform a different action?"
                    )
                elif intent_pair == ("action_request", "creative_generation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to perform a specific action, or create something creative for you?"
                    )
                elif intent_pair == ("information_request", "recommendation"):
                    clarification_strategy["clarification_questions"].append(
                        "Are you looking for factual information, or would you like me to provide a recommendation?"
                    )
                elif intent_pair == ("code_generation", "problem_solving"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to write code for you, or help you solve a problem without necessarily writing code?"
                    )
                elif intent_pair == ("educational_content", "information_request"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to create structured educational content, or just provide specific information?"
                    )
                elif intent_pair == ("action_request", "code_generation"):
                    clarification_strategy["clarification_questions"].append(
                        "Would you like me to write code for you, or perform some other action?"
                    )
                else:
                    # Generic clarification for other ambiguity pairs
                    clarification_strategy["clarification_questions"].append(
                        f"I'm not sure if you're looking for {intent1.replace('_', ' ')} or {intent2.replace('_', ' ')}. Could you clarify?"
                    )

        # Log the clarification strategy for debugging
        logger.info(f"Generated clarification strategy: needs_clarification={clarification_strategy['needs_clarification']}, "
                   f"questions={clarification_strategy['clarification_questions']}, "
                   f"ambiguity_zones={clarification_strategy['ambiguity_zones']}")

        return clarification_strategy

    def _get_primary_intent(self, intent_distribution: Dict[str, float]) -> Tuple[str, float]:
        """
        Get the primary intent and its confidence score.

        Args:
            intent_distribution: Probability distribution across intents

        Returns:
            Tuple of (primary_intent, confidence_score)
        """
        if not intent_distribution:
            return "unknown", 0.0

        # Get intent with highest probability
        primary_intent = max(intent_distribution.items(), key=lambda x: x[1])
        return primary_intent[0], primary_intent[1]


class IntentAnalyzer:
    """
    Analyzes user intents using probabilistic intent fields.

    This class provides methods for analyzing user intents, verifying alignment
    between original intents and responses, and calculating confidence scores.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the IntentAnalyzer.

        Args:
            config: Optional configuration dictionary
        """
        self.config = config or {}
        self.min_confidence_threshold = self.config.get("min_confidence_threshold", 0.85)
        self.intent_field_generator = ProbabilisticIntentField(config)

        # Initialize cache
        self.cache_size = self.config.get("cache_size", 1000)
        self.cache_enabled = self.config.get("cache_enabled", True)
        self.cache = {}
        self.cache_hits = 0
        self.cache_misses = 0

        logger.debug(f"Initialized IntentAnalyzer with cache {'enabled' if self.cache_enabled else 'disabled'}, size: {self.cache_size}")

    def _get_cache_key(self, prompt: str, domain: Optional[str] = None) -> str:
        """
        Generate a cache key for a prompt and domain.

        Args:
            prompt: The user's query or prompt
            domain: Optional domain for domain-specific thresholds

        Returns:
            A string cache key
        """
        # Normalize the prompt for better cache hits
        normalized_prompt = prompt.lower().strip()

        # Create a cache key that includes the domain if provided
        if domain:
            return f"{normalized_prompt}::{domain}"
        else:
            return normalized_prompt

    def _manage_cache_size(self):
        """Ensure the cache doesn't exceed the maximum size."""
        if len(self.cache) > self.cache_size:
            # Remove 20% of the oldest entries
            entries_to_remove = int(self.cache_size * 0.2)
            keys_to_remove = list(self.cache.keys())[:entries_to_remove]
            for key in keys_to_remove:
                del self.cache[key]
            logger.info(f"Cache pruned, removed {entries_to_remove} entries")

    def clear_cache(self):
        """Clear the intent analysis cache."""
        cache_size = len(self.cache)
        self.cache = {}
        logger.info(f"Intent analysis cache cleared, removed {cache_size} entries")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the cache usage."""
        return {
            "cache_size": len(self.cache),
            "max_cache_size": self.cache_size,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "hit_ratio": self.cache_hits / (self.cache_hits + self.cache_misses) if (self.cache_hits + self.cache_misses) > 0 else 0
        }

    def analyze_intent(self, prompt: str, domain: Optional[str] = None) -> IntentAnalysis:
        """
        Analyze the intent of a user prompt.

        Args:
            prompt: The user's query or prompt
            domain: Optional domain for domain-specific thresholds

        Returns:
            IntentAnalysis object with intent information
        """
        # Check cache first if enabled
        if self.cache_enabled:
            cache_key = self._get_cache_key(prompt, domain)
            if cache_key in self.cache:
                self.cache_hits += 1
                logger.info(f"Intent analysis cache hit ({self.cache_hits} hits, {self.cache_misses} misses)")
                return self.cache[cache_key]

            # Cache miss, increment counter
            self.cache_misses += 1
            logger.info(f"Analyzing intent for prompt: {prompt[:50]}... (cache miss, {self.cache_hits} hits, {self.cache_misses} misses)")
        else:
            logger.info(f"Analyzing intent for prompt: {prompt[:50]}... (caching disabled)")

        # Generate intent field with domain-specific thresholds
        intent_analysis = self.intent_field_generator.generate_intent_field(prompt, domain)

        # Calculate confidence score
        confidence_score = self.calculate_confidence_score(intent_analysis)

        # Update confidence score in the analysis
        intent_analysis.confidence_score = confidence_score

        # Cache the result if enabled
        if self.cache_enabled:
            cache_key = self._get_cache_key(prompt, domain)
            self.cache[cache_key] = intent_analysis
            self._manage_cache_size()

        logger.info(f"Intent analysis complete. Primary intent: {intent_analysis.primary_intent}, Confidence: {confidence_score:.2f}")
        return intent_analysis

    def verify_alignment(self, original_intent: IntentAnalysis, response: str) -> bool:
        """
        Verify alignment between original intent and response.

        Args:
            original_intent: Original intent analysis
            response: Response to check against original intent

        Returns:
            Boolean indicating whether the response aligns with the original intent
        """
        logger.info("Verifying intent alignment...")

        # Analyze the response as if it were a prompt
        response_intent = self.intent_field_generator.generate_intent_field(response)

        # Calculate similarity between original intent distribution and response intent distribution
        similarity_score = self._calculate_intent_similarity(
            original_intent.intent_distribution,
            response_intent.intent_distribution
        )

        # Check if primary intents match
        primary_intent_match = original_intent.primary_intent == response_intent.primary_intent

        # Calculate overall alignment score
        alignment_score = 0.7 * similarity_score + 0.3 * (1.0 if primary_intent_match else 0.0)

        # Determine if alignment is sufficient
        is_aligned = alignment_score >= self.min_confidence_threshold

        logger.info(f"Intent alignment verification: {is_aligned} (score: {alignment_score:.2f})")
        return is_aligned

    def calculate_confidence_score(self, intent: IntentAnalysis) -> float:
        """
        Calculate a confidence score for the intent analysis.

        Args:
            intent: Intent analysis object

        Returns:
            Confidence score between 0 and 1
        """
        # Get the probability of the primary intent
        primary_intent_prob = intent.intent_distribution.get(intent.primary_intent, 0.0)

        # Factor in the presence of ambiguity zones (reduces confidence)
        ambiguity_penalty = len(intent.ambiguity_zones) * 0.1

        # Apply intent-specific boosting for certain intents that tend to have lower scores
        intent_boost = 0.0
        if intent.primary_intent in ["comparison", "brainstorming", "code_generation",
                                    "educational_content", "explanation", "action_request"]:
            # These intents typically get lower scores, so boost them
            intent_boost = 0.15
        elif intent.primary_intent in ["data_visualization", "data_analysis", "research",
                                      "recommendation", "problem_solving"]:
            # These intents get moderate scores, so boost them slightly
            intent_boost = 0.1

        # Calculate final confidence score with boosting
        confidence_score = primary_intent_prob - ambiguity_penalty + intent_boost

        # Ensure score is between 0 and 1
        confidence_score = max(0.0, min(1.0, confidence_score))

        return confidence_score

    def _calculate_intent_similarity(self, dist1: Dict[str, float], dist2: Dict[str, float]) -> float:
        """
        Calculate similarity between two intent distributions.

        Args:
            dist1: First intent distribution
            dist2: Second intent distribution

        Returns:
            Similarity score between 0 and 1
        """
        # Ensure all intents are in both distributions
        all_intents = set(dist1.keys()) | set(dist2.keys())

        # Convert to vectors
        vec1 = np.array([dist1.get(intent, 0.0) for intent in all_intents])
        vec2 = np.array([dist2.get(intent, 0.0) for intent in all_intents])

        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)

        return float(similarity)
