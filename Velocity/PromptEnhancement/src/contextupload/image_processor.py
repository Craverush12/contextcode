"""
Image Processor Module

Handles image validation, processing, resizing, and caption generation
using NVIDIA vision models for context upload functionality.
"""

import io
import os
import base64
from PIL import Image
from typing import Tuple

from src.logging.logger import get_logger

logger = get_logger(__name__)

def validate_image(file_content: bytes, filename: str) -> bool:
    """Validate if the file is a supported image format."""
    try:
        with Image.open(io.BytesIO(file_content)) as img:
            # Check if it's a valid image and get format
            supported_formats = ['JPEG', 'JPG', 'PNG', 'WEBP', 'BMP', 'TIFF']
            return img.format and img.format.upper() in supported_formats
    except Exception:
        return False

def resize_image_if_needed(file_content: bytes, max_size: Tuple[int, int] = (1024, 1024)) -> bytes:
    """Resize image if it's too large for processing."""
    try:
        with Image.open(io.BytesIO(file_content)) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize if needed
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85)
            return output.getvalue()
    except Exception as e:
        raise Exception(f"Failed to process image: {str(e)}")

async def generate_image_caption(file_content: bytes, filename: str) -> str:
    """Generate a detailed caption for an image using NVIDIA vision model."""
    try:
        # Get NVIDIA API key
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
            raise Exception("NVIDIA API key not found for image processing")
        
        # Resize image if needed
        processed_image = resize_image_if_needed(file_content)
        
        # Convert image to base64
        image_base64 = base64.b64encode(processed_image).decode('utf-8')
        
        # Use NVIDIA's vision model to generate caption
        try:
            from langchain_nvidia_ai_endpoints import ChatNVIDIA
            
            # Initialize the vision-capable model
            vision_model = ChatNVIDIA(
                model="microsoft/kosmos-2",  # NVIDIA's vision model
                api_key=nvidia_api_key,
                temperature=0.1,
                max_tokens=500
            )
            
            # Create a detailed prompt for image captioning
            prompt = f"""Analyze this image and provide a comprehensive description. Include:

1. Main subjects and objects in the image
2. Setting, background, and environment
3. Colors, lighting, and visual style
4. Actions or activities taking place
5. Text visible in the image (if any)
6. Overall mood or atmosphere
7. Any notable details or interesting elements

Provide a detailed, descriptive caption that would help someone understand the image content for search and retrieval purposes.

Image filename: {filename}"""

            # Create message with image
            from langchain_core.messages import HumanMessage
            
            message = HumanMessage(content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ])
            
            response = await vision_model.ainvoke([message])
            caption = response.content
            
            logger.info(f"Generated caption for image {filename}: {caption[:100]}...")
            return caption
            
        except ImportError:
            raise Exception("NVIDIA vision model not available. Please install langchain-nvidia-ai-endpoints")
        except Exception as e:
            logger.error(f"Failed to generate caption with NVIDIA model: {str(e)}")
            # Fallback to basic description
            return generate_fallback_image_description(filename, processed_image)
            
    except Exception as e:
        logger.error(f"Image caption generation failed: {str(e)}")
        # Return a basic fallback description
        return generate_fallback_image_description(filename, file_content)

def generate_fallback_image_description(filename: str, file_content: bytes) -> str:
    """Generate a basic fallback description when vision model fails."""
    try:
        with Image.open(io.BytesIO(file_content)) as img:
            width, height = img.size
            format_name = img.format or "Unknown"
            mode = img.mode
            
            # Generate basic description
            description = f"""Image Analysis - {filename}

File Information:
- Format: {format_name}
- Dimensions: {width} x {height} pixels
- Color Mode: {mode}
- Filename: {filename}

This is an image file that has been uploaded to the system. The image contains visual content that may include objects, people, scenes, text, or other visual elements. For detailed content analysis, please ensure the vision model is properly configured.

Visual Content: This image may contain various visual elements such as objects, people, scenery, text, graphics, or other content depending on the image type and subject matter."""

            return description
            
    except Exception as e:
        return f"Image file: {filename}. Unable to analyze image content due to processing error: {str(e)}"

def get_image_metadata(file_content: bytes) -> dict:
    """Extract metadata from image file."""
    try:
        with Image.open(io.BytesIO(file_content)) as img:
            metadata = {
                "format": img.format,
                "mode": img.mode,
                "size": img.size,
                "width": img.size[0],
                "height": img.size[1]
            }
            
            # Add EXIF data if available
            if hasattr(img, '_getexif') and img._getexif():
                metadata["has_exif"] = True
            else:
                metadata["has_exif"] = False
                
            return metadata
    except Exception as e:
        logger.error(f"Failed to extract image metadata: {str(e)}")
        return {}

def is_supported_image(file_extension: str) -> bool:
    """Check if a file extension is supported for image processing."""
    supported_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']
    return file_extension.lower() in supported_extensions

def get_supported_image_formats() -> list:
    """Get list of supported image formats."""
    return ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'] 