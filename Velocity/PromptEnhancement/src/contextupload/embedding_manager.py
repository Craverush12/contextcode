"""
Embedding Manager Module

Handles embedding generation using NVIDIA models, similarity calculations,
and semantic search functionality for context retrieval.
"""

import os
import numpy as np
from typing import List, Dict
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings

from src.logging.logger import get_logger

logger = get_logger(__name__)

# Global variable to store the embeddings model instance
_nvidia_embeddings = None

def get_nvidia_embeddings():
    """Get initialized NVIDIA embeddings model."""
    global _nvidia_embeddings
    
    if _nvidia_embeddings is None:
        # Get NVIDIA API key from config provider or environment
        nvidia_api_key = None
        
        try:
            from src.core.module_init import container
            from src.core import ConfigProvider
            
            if container:
                try:
                    config_provider = container.resolve(ConfigProvider)
                    nvidia_api_key = config_provider.get_config("nvidia.api_key")
                except Exception as e:
                    logger.warning(f"Could not resolve ConfigProvider: {str(e)}")
        except ImportError:
            pass
            
        # Fallback to environment variables if needed
        if not nvidia_api_key:
            nvidia_api_key = os.environ.get("NVIDIA_API_KEY")
            
        if not nvidia_api_key:
            raise Exception("NVIDIA API key not found. Please set NVIDIA_API_KEY environment variable or configure in settings.")
            
        _nvidia_embeddings = NVIDIAEmbeddings(
            model="nvidia/llama-3.2-nv-embedqa-1b-v2",
            api_key=nvidia_api_key,
            truncate="NONE",
            dimensions=1024
        )
        logger.info("Initialized NVIDIA embeddings model")
    
    return _nvidia_embeddings

async def generate_embeddings(texts: List[str]) -> np.ndarray:
    """Generate embeddings for text chunks using NVIDIA model."""
    try:
        nvidia_embeddings = get_nvidia_embeddings()
        
        # Generate embeddings using NVIDIA model
        embeddings = []
        batch_size = 20  # Process in batches to avoid API limits
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await nvidia_embeddings.aembed_documents(batch)
            embeddings.extend(batch_embeddings)
        
        return np.array(embeddings)
        
    except Exception as e:
        logger.error(f"Failed to generate NVIDIA embeddings: {str(e)}")
        # Fallback to a simple TF-IDF based approach
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(max_features=1024, stop_words='english')
            embeddings = vectorizer.fit_transform(texts).toarray()
            return embeddings
        except ImportError:
            logger.error("sklearn not available for fallback embeddings")
            # Return simple random embeddings as last resort
            return np.random.rand(len(texts), 1024)

def cosine_similarity_custom(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Custom cosine similarity calculation."""
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)

async def find_similar_chunks(query: str, chunks: List[str], embeddings: np.ndarray, top_k: int = 3) -> List[Dict]:
    """Find the most similar chunks to the query using custom similarity search."""
    try:
        # Generate query embedding using NVIDIA model
        nvidia_embeddings = get_nvidia_embeddings()
        query_embedding = await nvidia_embeddings.aembed_query(query)
        query_embedding = np.array(query_embedding)
        
        # Calculate similarities using custom cosine similarity
        similarities = []
        for chunk_embedding in embeddings:
            similarity = cosine_similarity_custom(query_embedding, chunk_embedding)
            similarities.append(similarity)
        
        similarities = np.array(similarities)
        
        # Get top-k most similar chunks
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.1:  # Minimum similarity threshold
                results.append({
                    "text": chunks[idx],
                    "score": float(similarities[idx]),
                    "index": int(idx)
                })
        
        # Enhanced hybrid search: combine semantic similarity with keyword matching
        if len(results) < top_k:
            # Add keyword-based results for better coverage
            keyword_results = []
            query_lower = query.lower()
            query_words = set(query_lower.split())
            
            for i, chunk in enumerate(chunks):
                if i not in [r["index"] for r in results]:  # Don't duplicate
                    chunk_lower = chunk.lower()
                    chunk_words = set(chunk_lower.split())
                    
                    # Calculate word overlap score
                    overlap = len(query_words.intersection(chunk_words))
                    if overlap > 0:
                        keyword_score = overlap / len(query_words)
                        if keyword_score > 0.2:  # Minimum keyword threshold
                            keyword_results.append({
                                "text": chunk,
                                "score": float(keyword_score * 0.7),  # Scale down keyword scores
                                "index": i,
                                "type": "keyword"
                            })
            
            # Sort keyword results and add to fill up to top_k
            keyword_results.sort(key=lambda x: x["score"], reverse=True)
            needed = top_k - len(results)
            results.extend(keyword_results[:needed])
        
        return results
        
    except Exception as e:
        logger.error(f"Error in similarity search: {str(e)}")
        # Fallback to enhanced keyword search
        results = []
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        chunk_scores = []
        for i, chunk in enumerate(chunks):
            chunk_lower = chunk.lower()
            chunk_words = set(chunk_lower.split())
            
            # Calculate multiple relevance signals
            exact_match = query_lower in chunk_lower
            word_overlap = len(query_words.intersection(chunk_words))
            word_ratio = word_overlap / len(query_words) if query_words else 0
            
            # Combine signals into a score
            score = 0
            if exact_match:
                score += 0.8
            score += word_ratio * 0.6
            
            if score > 0.1:
                chunk_scores.append((i, chunk, score))
        
        # Sort by score and return top_k
        chunk_scores.sort(key=lambda x: x[2], reverse=True)
        
        for i, chunk, score in chunk_scores[:top_k]:
            results.append({
                "text": chunk,
                "score": float(score),
                "index": i,
                "type": "fallback"
            })
        
        return results

def calculate_embedding_similarity_matrix(embeddings: np.ndarray) -> np.ndarray:
    """Calculate pairwise similarity matrix for embeddings."""
    try:
        # Normalize embeddings for cosine similarity
        normalized_embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        # Calculate cosine similarity matrix
        similarity_matrix = np.dot(normalized_embeddings, normalized_embeddings.T)
        
        return similarity_matrix
    except Exception as e:
        logger.error(f"Error calculating similarity matrix: {str(e)}")
        return np.zeros((len(embeddings), len(embeddings)))

async def batch_similarity_search(queries: List[str], chunks: List[str], embeddings: np.ndarray, top_k: int = 3) -> List[List[Dict]]:
    """Perform similarity search for multiple queries efficiently."""
    try:
        nvidia_embeddings = get_nvidia_embeddings()
        
        # Generate embeddings for all queries at once
        query_embeddings = await nvidia_embeddings.aembed_documents(queries)
        query_embeddings = np.array(query_embeddings)
        
        results = []
        for i, query_embedding in enumerate(query_embeddings):
            # Calculate similarities for this query
            similarities = []
            for chunk_embedding in embeddings:
                similarity = cosine_similarity_custom(query_embedding, chunk_embedding)
                similarities.append(similarity)
            
            similarities = np.array(similarities)
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            query_results = []
            for idx in top_indices:
                if similarities[idx] > 0.1:
                    query_results.append({
                        "text": chunks[idx],
                        "score": float(similarities[idx]),
                        "index": int(idx),
                        "query": queries[i]
                    })
            
            results.append(query_results)
        
        return results
        
    except Exception as e:
        logger.error(f"Error in batch similarity search: {str(e)}")
        return [[] for _ in queries]

def reset_embeddings_cache():
    """Reset the global embeddings model cache."""
    global _nvidia_embeddings
    _nvidia_embeddings = None
    logger.info("Reset NVIDIA embeddings cache") 