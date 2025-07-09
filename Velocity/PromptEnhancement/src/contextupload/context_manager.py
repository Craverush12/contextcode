"""
Context Manager Module

Handles storage, persistence, and retrieval of context data including
in-memory storage with file persistence using pickle.
"""

import pickle
import os
import time
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np

from src.logging.logger import get_logger

logger = get_logger(__name__)

# Context storage directory
CONTEXT_STORAGE_DIR = Path("context_storage")
CONTEXT_STORAGE_DIR.mkdir(exist_ok=True)

# In-memory storage for contexts (with file persistence)
context_store = {}
context_embeddings = {}

def load_contexts_from_disk():
    """Load existing contexts from disk on startup."""
    global context_store, context_embeddings
    
    context_file = CONTEXT_STORAGE_DIR / "context_store.pkl"
    embeddings_file = CONTEXT_STORAGE_DIR / "context_embeddings.pkl"
    
    try:
        if context_file.exists():
            with open(context_file, 'rb') as f:
                context_store = pickle.load(f)
            logger.info(f"Loaded {len(context_store)} contexts from disk")
        
        if embeddings_file.exists():
            with open(embeddings_file, 'rb') as f:
                context_embeddings = pickle.load(f)
            logger.info(f"Loaded embeddings for {len(context_embeddings)} contexts from disk")
    except Exception as e:
        logger.error(f"Error loading contexts from disk: {e}")
        context_store = {}
        context_embeddings = {}

def save_contexts_to_disk():
    """Save contexts to disk for persistence."""
    try:
        context_file = CONTEXT_STORAGE_DIR / "context_store.pkl"
        embeddings_file = CONTEXT_STORAGE_DIR / "context_embeddings.pkl"
        
        with open(context_file, 'wb') as f:
            pickle.dump(context_store, f)
        
        with open(embeddings_file, 'wb') as f:
            pickle.dump(context_embeddings, f)
        
        logger.debug(f"Saved {len(context_store)} contexts to disk")
    except Exception as e:
        logger.error(f"Error saving contexts to disk: {e}")

def store_context(context_id: str, chunks: List[str], embeddings: np.ndarray, metadata: Dict) -> None:
    """Store context chunks and embeddings."""
    context_store[context_id] = {
        "chunks": chunks,
        "metadata": metadata,
        "created_at": time.time()
    }
    context_embeddings[context_id] = embeddings
    
    # Log storage
    logger.info(f"Stored context {context_id} with {len(chunks)} chunks")
    
    # Save contexts to disk for persistence
    save_contexts_to_disk()

def get_stored_context(context_id: str) -> Optional[Dict]:
    """Retrieve stored context."""
    if context_id in context_store:
        return {
            "chunks": context_store[context_id]["chunks"],
            "embeddings": context_embeddings.get(context_id),
            "metadata": context_store[context_id]["metadata"]
        }
    return None

def delete_stored_context(context_id: str) -> bool:
    """Delete a stored context and its associated data."""
    try:
        if context_id not in context_store:
            return False
        
        # Remove from storage
        del context_store[context_id]
        if context_id in context_embeddings:
            del context_embeddings[context_id]
        
        logger.info(f"Deleted context {context_id}")
        
        # Save updated contexts to disk
        save_contexts_to_disk()
        return True
        
    except Exception as e:
        logger.error(f"Error deleting context {context_id}: {e}")
        return False

def get_context_list() -> List[Dict]:
    """Get a list of all stored contexts with metadata."""
    contexts = []
    for context_id, data in context_store.items():
        contexts.append({
            "context_id": context_id,
            "metadata": data["metadata"],
            "created_at": data["created_at"]
        })
    return contexts

# Note: load_contexts_from_disk() should be called explicitly when the application starts 