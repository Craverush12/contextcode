"""
CARE Framework Analyzer Module

This module implements the CARE (Context, Action, Result, Example) framework analyzer
for evaluating and scoring instructional content.
"""

import os
from typing import Dict, Any, Optional
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_groq import ChatGroq
from langchain_nvidia_ai_endpoints import ChatNVIDIA

from src.logging.logger import get_logger, async_log_execution_time
from src.core.module_init import container
from src.core import ConfigProvider

# Configure logger
logger = get_logger(__name__)

class CAREAnalyzer:
    """
    Analyzer for evaluating instructional content using the CARE framework.
    
    CARE stands for:
    - Context: Setting the stage with background information, purpose, and relevance
    - Action: Clear steps or instructions for what to do
    - Result: What the expected outcome should be
    - Example: A clear demonstration or illustration
    """
    
    def __init__(self):
        """Initialize the CARE analyzer with API keys from config provider or environment."""
        # Try to get config provider from container
        self.config_provider = None
        if container:
            try:
                self.config_provider = container.resolve(ConfigProvider)
            except Exception as e:
                logger.warning(f"Could not resolve ConfigProvider: {str(e)}")
        
        # Get API keys from config provider or environment
        self.groq_api_key = None
        self.nvidia_api_key = None
        
        if self.config_provider:
            self.groq_api_key = self.config_provider.get_config("groq.api_key")
            self.nvidia_api_key = self.config_provider.get_config("nvidia.api_key")
        
        # Fallback to environment variables if needed
        if not self.groq_api_key:
            self.groq_api_key = os.environ.get("GROQ_API_KEY")
        if not self.nvidia_api_key:
            self.nvidia_api_key = os.environ.get("NVIDIA_API_KEY")
        
        # CARE framework system prompt for flat dictionary output
        self.system_prompt = """
        You are an expert at analyzing and improving instructional content using the CARE framework.
        
        CARE stands for:
        - Context: Setting the stage with background information, purpose, and relevance
        - Action: Clear steps or instructions for what to do
        - Result: What the expected outcome should be
        - Example: A clear demonstration or illustration
        
        Analyze the given query as an instructional prompt and evaluate how well it follows the CARE framework.
        
        Provide a score from 1-10 for each CARE component, where:
        - 1-3: Poor - Missing or unclear
        - 4-6: Fair - Present but needs improvement
        - 7-8: Good - Clear and well-defined
        - 9-10: Excellent - Comprehensive and exemplary
        
        Your response MUST follow this exact format:
        
        CONTEXT: [score from 1-10]
        ACTION: [score from 1-10]
        RESULT: [score from 1-10]
        EXAMPLE: [score from 1-10]
        
        FRAMEWORK: [name of the most appropriate framework for this prompt]
        FRAMEWORK_DESCRIPTION: [detailed explanation of why this framework fits best]
        
        RECOMMENDATIONS:
        ACTION_IMPROVEMENT: [specific suggestion to improve the action component]
        CONTEXT_IMPROVEMENT: [specific suggestion to improve the context component]
        EXAMPLE_IMPROVEMENT: [specific suggestion to improve the example component]
        RESULT_IMPROVEMENT: [specific suggestion to improve the result component]
        
        Do not include anything else in your response. Each line must start with the exact label specified above.
        """
        
        # Create prompt template
        self.prompt_template = PromptTemplate(
            input_variables=["query"],
            template=self.system_prompt + "\n\nContent to Analyze: {query}\n\nAnalysis:"
        )
    
    @async_log_execution_time()
    async def analyze_prompt(self, query: str) -> Dict[str, Any]:
        """
        Analyze a prompt using the CARE framework.
        
        Args:
            query: The prompt text to analyze
            
        Returns:
            Dictionary with CARE framework scores and the average score
        """
        try:
            # Validate input
            if not query or len(query.strip()) < 1:
                logger.warning("Empty query received")
                return {"error": "Query is required"}
                
            logger.debug("Analyzing query with CARE framework", query_length=len(query))
            
            # Try to use Groq first, fall back to NVIDIA if needed
            try:
                llm = self._get_llm_client()
                
                if not llm:
                    logger.error("No API keys available for Groq or NVIDIA")
                    return {"error": "No LLM providers available. Please configure API keys."}
                    
                # Create and run the chain
                chain = LLMChain(llm=llm, prompt=self.prompt_template)
                analysis_result = await chain.arun(query=query)
                
                # Parse the response into a flat dictionary
                return self._parse_analysis_result(query, analysis_result)
                
            except Exception as e:
                logger.exception("Error in LLM processing", exception_type=type(e).__name__)
                return {"error": f"LLM processing error: {str(e)}"}
          
        except Exception as e:
            logger.exception("Error analyzing prompt", exception_type=type(e).__name__)
            return {"error": f"Failed to analyze prompt: {str(e)}"}
    
    def _get_llm_client(self):
        """
        Get the appropriate LLM client based on available API keys.
        
        Returns:
            An initialized LLM client (Groq or NVIDIA) or None if no keys available
        """
        if self.groq_api_key:
            # Initialize Groq LLM
            llm = ChatGroq(
                model="llama-3.1-8b-instant",
                groq_api_key=self.groq_api_key,
                temperature=0.7,
                max_tokens=2048
            )
            logger.info("Using Groq LLaMA model for CARE framework analysis")
            return llm
        elif self.nvidia_api_key:
            # Fall back to NVIDIA if Groq is not available
            llm = ChatNVIDIA(
                model="meta/llama3-70b-instruct",
                nvidia_api_key=self.nvidia_api_key,
                temperature=0.7,
                max_tokens=2048
            )
            logger.info("Using NVIDIA model as fallback for CARE framework analysis")
            return llm
        
        return None
    
    def _parse_analysis_result(self, query: str, analysis_result: str) -> Dict[str, Any]:
        """
        Parse the LLM response into a structured dictionary.
        
        Args:
            query: The original query that was analyzed
            analysis_result: The raw text result from the LLM
            
        Returns:
            Dictionary with framework analysis, metrics, and recommendations
        """
        # Initialize the response structure
        response = {
            "framework_analysis": {
                "description": "",
                "framework": ""
            },
            "metrics": {
                "Action": 0,
                "Context": 0,
                "Example": 0,
                "Result": 0
            },
            "recommendations": {
                "action_improvement": "",
                "context_improvement": "",
                "example_improvement": "",
                "result_improvement": ""
            },
            "success": True
        }
        
        # Extract each component score and other information
        lines = analysis_result.strip().split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().upper()  # Convert to uppercase for consistency
                value = value.strip()
                
                # Handle metrics
                if key in ['CONTEXT', 'ACTION', 'RESULT', 'EXAMPLE']:
                    try:
                        score = float(value)
                        response["metrics"][key.capitalize()] = int(score)
                    except ValueError:
                        logger.warning(f"Invalid score value for {key}: {value}")
                
                # Handle framework analysis
                elif key == 'FRAMEWORK':
                    response["framework_analysis"]["framework"] = value
                elif key == 'FRAMEWORK_DESCRIPTION':
                    response["framework_analysis"]["description"] = value
                
                # Handle recommendations
                elif key == 'ACTION_IMPROVEMENT':
                    response["recommendations"]["action_improvement"] = value
                elif key == 'CONTEXT_IMPROVEMENT':
                    response["recommendations"]["context_improvement"] = value
                elif key == 'EXAMPLE_IMPROVEMENT':
                    response["recommendations"]["example_improvement"] = value
                elif key == 'RESULT_IMPROVEMENT':
                    response["recommendations"]["result_improvement"] = value
        
        # Validate that we got all required components
        required_metrics = ['Action', 'Context', 'Example', 'Result']
        missing_metrics = [m for m in required_metrics if response["metrics"][m] == 0]
        if missing_metrics:
            logger.warning(f"Missing metrics in LLM response: {missing_metrics}")
            response["success"] = False
        
        # Validate framework analysis
        if not response["framework_analysis"]["framework"] or not response["framework_analysis"]["description"]:
            logger.warning("Missing framework analysis in LLM response")
            response["success"] = False
        
        # Validate recommendations
        required_recommendations = ['action_improvement', 'context_improvement', 'example_improvement', 'result_improvement']
        missing_recommendations = [r for r in required_recommendations if not response["recommendations"][r]]
        if missing_recommendations:
            logger.warning(f"Missing recommendations in LLM response: {missing_recommendations}")
            response["success"] = False
        
        logger.info(f"CARE analysis complete: metrics={response['metrics']}")
        
        return response

# Create a singleton instance for easy access
_instance = None

def get_instance() -> CAREAnalyzer:
    """
    Get the singleton instance of the CAREAnalyzer.
    
    Returns:
        The singleton CAREAnalyzer instance
    """
    global _instance
    if _instance is None:
        _instance = CAREAnalyzer()
    return _instance