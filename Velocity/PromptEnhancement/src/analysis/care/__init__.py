"""
CARE Framework analysis package.

This package provides tools for analyzing content using the CARE
(Context, Action, Result, Example) framework.
"""

from src.analysis.care.care_analyzer import CAREAnalyzer, get_instance

__all__ = ["CAREAnalyzer", "get_instance"]