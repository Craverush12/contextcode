"""
ChatGroq API Key Manager

Manages rotation of ChatGroq API keys after a specified number of requests.
"""

import os
from typing import List, Dict
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

class ChatGroqKeyManager:
    def __init__(self, api_key: str = None, requests_per_key: int = 1):
        """
        Initialize the ChatGroq API key manager.
        
        Args:
            api_key (str, optional): Initial API key to use. If provided, it will be used as the first key.
            requests_per_key (int): Number of requests before rotating to the next key
        """
        self.requests_per_key = requests_per_key
        self.current_key_index = 0
        self.request_count = 0
        self.api_keys = self._load_api_keys(api_key)
        
        if not self.api_keys:
            raise ValueError("No ChatGroq API keys found in environment variables")
        
        logger.warning(f"🔑 INITIALIZED CHATGROQ KEY MANAGER: {len(self.api_keys)} API keys available")
        logger.warning(f"🔄 Key rotation set to every {requests_per_key} requests")
    
    def _load_api_keys(self, initial_key: str = None) -> List[str]:
        """
        Load ChatGroq API keys from environment variables.
        Keys should be named CHATGROQ_API_KEY_1, CHATGROQ_API_KEY_2, etc.
        
        Args:
            initial_key (str, optional): Initial API key to use as the first key
        """
        load_dotenv()
        api_keys = []
        
        # Add initial key if provided
        if initial_key:
            api_keys.append(initial_key)
            logger.info(f"Added initial API key from config")
        
        # Load additional keys from environment variables
        index = 1
        while True:
            key = os.getenv(f"CHATGROQ_API_KEY_{index}")
            if not key:
                break
            api_keys.append(key)
            logger.info(f"Loaded API key {index} from environment")
            index += 1
        
        return api_keys
    
    def get_current_key(self) -> str:
        """
        Get the current API key and increment the request counter.
        Rotates to the next key if the request limit is reached.
        
        Returns:
            str: The current API key to use
        """
        self.request_count += 1
        
        if self.request_count > self.requests_per_key:
            self._rotate_key()
            self.request_count = 1
        elif self.request_count == self.requests_per_key:
            logger.warning(f"⚠️ API key rotation imminent! {self.requests_per_key - self.request_count + 1} requests remaining before switch")
        
        return self.api_keys[self.current_key_index]
    
    def _rotate_key(self):
        """Rotate to the next API key in the list."""
        old_index = self.current_key_index
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        logger.warning(f"🔄 API KEY ROTATED: Switched from key {old_index + 1} to key {self.current_key_index + 1}")
        logger.info(f"Request count reset to 1")
    
    def get_key_count(self) -> int:
        """Get the total number of available API keys."""
        return len(self.api_keys)
    
    def get_status(self) -> Dict:
        """
        Get the current status of the API key manager.
        
        Returns:
            Dict containing:
            - current_key_index: Current key being used (1-based)
            - requests_remaining: Number of requests before next rotation
            - total_keys: Total number of available keys
        """
        return {
            "current_key_index": self.current_key_index + 1,  # Convert to 1-based for user-friendliness
            "requests_remaining": self.requests_per_key - self.request_count + 1,
            "total_keys": len(self.api_keys)
        } 