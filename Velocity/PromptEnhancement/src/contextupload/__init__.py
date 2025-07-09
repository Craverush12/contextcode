"""
Context Upload Module

This module provides document and image processing capabilities for context upload,
including text extraction, embedding generation, and similarity search.
"""

from .context_manager import (
    load_contexts_from_disk,
    save_contexts_to_disk,
    store_context,
    get_stored_context,
    delete_stored_context,
    get_context_list
)

from .document_processor import (
    extract_text_from_pdf,
    extract_text_from_pptx,
    extract_text_from_docx,
    extract_text_from_txt,
    chunk_text,
    get_document_extractor,
    is_supported_document
)

from .image_processor import (
    validate_image,
    resize_image_if_needed,
    generate_image_caption,
    generate_fallback_image_description,
    get_image_metadata,
    is_supported_image,
    get_supported_image_formats
)

from .embedding_manager import (
    get_nvidia_embeddings,
    generate_embeddings,
    cosine_similarity_custom,
    find_similar_chunks,
    calculate_embedding_similarity_matrix,
    batch_similarity_search,
    reset_embeddings_cache
)

__all__ = [
    # Context management
    'load_contexts_from_disk',
    'save_contexts_to_disk',
    'store_context',
    'get_stored_context',
    'delete_stored_context',
    'get_context_list',
    
    # Document processing
    'extract_text_from_pdf',
    'extract_text_from_pptx',
    'extract_text_from_docx',
    'extract_text_from_txt',
    'chunk_text',
    'get_document_extractor',
    'is_supported_document',
    
    # Image processing
    'validate_image',
    'resize_image_if_needed',
    'generate_image_caption',
    'generate_fallback_image_description',
    'get_image_metadata',
    'is_supported_image',
    'get_supported_image_formats',
    
    # Embedding management
    'get_nvidia_embeddings',
    'generate_embeddings',
    'cosine_similarity_custom',
    'find_similar_chunks',
    'calculate_embedding_similarity_matrix',
    'batch_similarity_search',
    'reset_embeddings_cache'
] 