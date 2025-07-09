"""
Prompt Strategy Retriever using PGVector, NVIDIAEmbeddings, and hybrid search.
This module fetches top prompt strategies for a given LLM/provider using hybrid retrieval.
"""
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain.schema import Document
import os
from langchain_postgres import PGVector
from langchain.retrievers import ParentDocumentRetriever
from langchain.retrievers.ensemble import EnsembleRetriever
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import BM25Retriever
from dotenv import load_dotenv
from collections import OrderedDict

# Import logging
from src.logging.logger import get_logger

# Load environment variables from .env file
load_dotenv()

# Set up logging
logger = get_logger(__name__)

PG_CONNECTION = os.environ.get("PG_CONNECTION")

# Singleton for vector DB - now model-specific
_vectordb_cache = {}

# Cache for query results with LRU behavior
_query_cache = OrderedDict()
_cache_max_size = 60

# Initialize NVIDIA Embeddings and PGVector store
def get_vectordb(persist_directory="./chroma_db", model="openai"):
    global _vectordb_cache
    
    # Use model-specific cache key
    if model not in _vectordb_cache:
        # Get NVIDIA API key from config provider or environment
        nvidia_api_key = None
        
        # Use lazy import to avoid circular imports
        try:
            from src.core.module_init import container
            from src.core import ConfigProvider
            
            # Try to get config provider from container
            if container:
                try:
                    config_provider = container.resolve(ConfigProvider)
                    nvidia_api_key = config_provider.get_config("nvidia.api_key")
                except Exception as e:
                    print(f"Could not resolve ConfigProvider: {str(e)}")
        except ImportError:
            # If we can't import, just continue with environment variables
            pass
            
        # Fallback to environment variables if needed
        if not nvidia_api_key:
            nvidia_api_key = os.environ.get("NVIDIA_API_KEY")
            
        embedding = NVIDIAEmbeddings(
            model="nvidia/llama-3.2-nv-embedqa-1b-v2",
            api_key=nvidia_api_key,
            truncate="NONE",
            dimensions=1024
        )
        
        if model == 'openai':
            collection_name = "prompting_strategies_openai_models"
        elif model == 'anthropic':
            collection_name = "prompting_strategies_claude_models"
        elif model == 'perplexity':
            collection_name = "prompting_strategies_perplexity_models"
        elif model == 'bolt':
            collection_name = "prompting_strategies_bolt_models"
        elif model == 'vercel':
            collection_name = "prompting_strategies_vercel_models"
        elif model == 'gamma':
            collection_name = "prompting_strategies_gamma_models"
        elif model == 'grok':
            collection_name = "prompting_strategies_grok_models"
        elif model == 'google':
            collection_name = "prompting_strategies_google_models"
        else:
            # Default to openai if model is not recognized
            logger.warning(f"Unknown model '{model}', defaulting to openai strategies")
            collection_name = "prompting_strategies_openai_models"

        logger.info(f"Initializing vector database for collection: {collection_name}")

        _vectordb_cache[model] = PGVector(
            embeddings=embedding,
            collection_name=collection_name,
            connection=PG_CONNECTION,
            use_jsonb=True,
        )
        
    return _vectordb_cache[model]


def fetch_prompt_strategies(llm_name: str, top_k: int = 2, domain: str = None):
    """
    Fetch top prompt strategies for a given LLM/provider name using hybrid search.
    Combines vector-based similarity with keyword-based search for better results.
    Returns a list of Document objects (page_content contains the strategy text).
    Always returns exactly 2 documents by default.
    """
    # Force top_k to be 2 to ensure we always return 2 documents as requested
    top_k = 2
    
    vectordb = get_vectordb(model=llm_name)
    
    # Vector search retriever
    vector_retriever = vectordb.as_retriever(search_kwargs={"k": top_k})
    
    # Improved query construction with better domain handling
    if domain and domain.strip() and domain.lower() not in ['none', 'null', 'general']:
        # Use domain-specific query if valid domain is provided
        query = f'Effective {domain.strip()} prompting strategies and techniques for {llm_name} models'
        logger.info(f"Using domain-specific query: {query}")
    else:
        # Use general query for general domains or when domain is None/invalid
        query = f'General effective prompting strategies and techniques for {llm_name} models'
        logger.info(f"Using general query: {query}")
    
    # Check if the query result is cached
    global _query_cache
    cache_key = f"{query}_{top_k * 3}"
    if cache_key in _query_cache:
        all_docs = _query_cache[cache_key]
        # Move to end of OrderedDict to mark as recently used
        _query_cache.move_to_end(cache_key)
        logger.debug(f"Using cached results for query: {query}")
    else:
        # Perform the search
        all_docs = vectordb.similarity_search(query, k=max(top_k * 3, 20))
        logger.info(f"Retrieved {len(all_docs)} documents from vector search")
        
        # Add to cache
        _query_cache[cache_key] = all_docs
        
        # Clear cache if it exceeds max size
        if len(_query_cache) > _cache_max_size:
            _query_cache.popitem(last=False)  # Remove oldest item (first in)
    
    # Create keyword search retriever
    bm25_retriever = BM25Retriever.from_documents(all_docs)
    bm25_retriever.k = top_k
    
    # Create ensemble retriever with adjusted weights for better relevance
    ensemble_retriever = EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever],
        weights=[0.6, 0.4]  # Increased semantic weight: 60% vector, 40% keyword for better context matching
    )
    
    # Query for strategies
    results = ensemble_retriever.get_relevant_documents(query)
    
    # Log what we're returning for debugging
    logger.info(f"Final retrieval returned {len(results)} strategies for domain '{domain}' and model '{llm_name}'")
    for i, result in enumerate(results[:top_k]):
        content_preview = result.page_content[:150] + "..." if len(result.page_content) > 150 else result.page_content
        logger.debug(f"Strategy {i+1} preview: {content_preview}")
    
    return results[:top_k]  # Limit to top 2 results

def clear_cache():
    """Clear the query cache manually if needed."""
    global _query_cache
    _query_cache.clear()
