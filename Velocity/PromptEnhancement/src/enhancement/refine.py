"""
Refine module: Handles question generation and prompt refinement.
"""

from typing import List, Dict, Any
from src.core import container, ModelProvider, Analyzer
import re
import json

class Refine:
    def __init__(self, model_provider=None, analyzer=None):
        self.model_provider = model_provider or container.resolve(ModelProvider)
        self.analyzer = analyzer or container.resolve(Analyzer)

    async def ask_question(self, prompt: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate contextual questions based on the prompt."""
        if context is None:
            context = {}
        system_message = (
            "You are an expert at generating clarifying questions to improve prompts. "
            "make sure each lenght of the question is less than 17 words. "
            "Your task is to analyze the given prompt and generate 3-5 specific questions that would help clarify "
            "the user's intent and provide additional context for a better response. Focus on identifying ambiguities, "
            "missing information, and areas where more detail would be helpful."
        )
        analysis = self.analyzer.analyze(prompt)
        context["analysis"] = analysis
        direct_prompt = f"""Original prompt: {prompt}\n\nBased on this prompt, generate 2 specific questions that would help clarify the user's intent and provide additional context for a better response. The questions should address ambiguities, missing information, and areas where more detail would be helpful.\n\nReturn the questions in a JSON array format like this:\n[\"Question 1?\", \"Question 2?\", \"Question 3?\", ...]"""
        questions_response = await self.model_provider.get_response(direct_prompt, system_message=system_message)
        # Try to extract JSON array from the response
        json_match = re.search(r'\[.*\]', questions_response, re.DOTALL)
        if json_match:
            try:
                questions = json.loads(json_match.group(0))
                if isinstance(questions, list) and all(isinstance(q, str) for q in questions):
                    return {"questions": questions, "prompt": prompt, "analysis": analysis}
            except json.JSONDecodeError:
                pass
        # Fallback: extract questions using regex if JSON parsing fails
        questions = re.findall(r'"([^"]+\?)"', questions_response)
        if not questions:
            questions = re.findall(r'\d+\.\s*([^\n]+\?)', questions_response)
        if not questions:
            return {"error": "Failed to generate questions", "raw_response": questions_response}
        return {"questions": questions, "prompt": prompt, "analysis": analysis}

    async def refine_prompt(self, prompt: str, qa_pairs: List[Dict[str, str]], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Refine the prompt based on question-answer pairs."""
        if context is None:
            context = {}
        system_message = (
            "You are an expert at refining prompts based on clarifying questions and answers. "
            "Your task is to take the original prompt and integrate the question-answer information "
            "naturally within it. IMPORTANT: You must preserve ALL the original content and instructions "
            "from the prompt - do not remove or significantly alter ANY part of the original prompt. "
            "Only add the new information from Q&A pairs where appropriate, enhancing the prompt "
            "without changing its core requirements and specifications."
        )
        qa_formatted = "\n".join([f"Q: {qa.get('question')}\nA: {qa.get('answer')}" for qa in qa_pairs])
        direct_prompt = f"""Original prompt: {prompt}\n\nAdditional information from questions and answers:\n{qa_formatted}\n\nCreate a refined version of the prompt that preserves ALL of the original content and instructions while naturally integrating the Q&A information where appropriate. Do NOT remove or significantly alter ANY part of the original prompt - only enhance it with the additional information.\n\nReturn ONLY the refined prompt text, without any explanations or metadata."""
        refined_prompt = await self.model_provider.get_response(direct_prompt, system_message=system_message)
        refined_prompt = refined_prompt.strip()
        # Remove any markdown code blocks or formatting
        refined_prompt = re.sub(r'```.*?```', '', refined_prompt, flags=re.DOTALL)
        refined_prompt = re.sub(r'[*_`]', '', refined_prompt)
        refined_prompt = re.sub(r'^(Here is the refined prompt:|Refined prompt:|The refined prompt is:)\s*', '', refined_prompt, flags=re.IGNORECASE)
        refined_prompt = re.sub(r'\s*(I hope this helps!|Let me know if you need any further refinements\.|This refined prompt should help you get a better response\.)$', '', refined_prompt, flags=re.IGNORECASE)
        return {
            "original_prompt": prompt,
            "refined_prompt": refined_prompt,
            "qa_pairs": qa_pairs
        }
