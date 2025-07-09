"""
Shared data models for the router package.

This module contains data structures that are shared across multiple modules
to help avoid circular import issues.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import time

@dataclass
class SelectionResult:
    """Result of provider selection with cache status and fallback information."""
    provider: str
    is_from_cache: bool
    cache_key: str
    timestamp: float = time.time()
    original_provider: Optional[str] = None  # The original provider before any fallback
    is_fallback: bool = False  # Whether this is a fallback provider
    fallback_reason: Optional[str] = None  # Reason for fallback if applicable