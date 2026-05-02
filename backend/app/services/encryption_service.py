"""
Encryption Service
Handles encryption and decryption of sensitive data (API keys)
"""

from typing import Optional
from cryptography.fernet import Fernet
import base64

from app.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        """Initialize encryption service with Fernet cipher"""
        try:
            # Ensure encryption key is properly formatted for Fernet
            key = settings.encryption_key.encode()
            
            # If key is not 32 bytes, derive it properly
            if len(key) != 32:
                # Use first 32 bytes or pad if shorter
                key = key[:32].ljust(32, b'0')
            
            # Fernet requires base64-encoded 32-byte key
            self.cipher = Fernet(base64.urlsafe_b64encode(key))
            logger.info("Encryption service initialized")
            
        except Exception as e:
            logger.error("Failed to initialize encryption service", error=str(e))
            raise
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Encrypted string (base64 encoded)
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            if not plaintext:
                raise ValueError("Cannot encrypt empty string")
            
            # Encrypt and return as string
            encrypted_bytes = self.cipher.encrypt(plaintext.encode())
            encrypted_str = encrypted_bytes.decode()
            
            logger.debug("Data encrypted successfully")
            return encrypted_str
            
        except Exception as e:
            logger.error("Encryption failed", error=str(e))
            raise ValueError(f"Encryption failed: {str(e)}")
    
    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt encrypted string
        
        Args:
            encrypted: Encrypted string (base64 encoded)
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            if not encrypted:
                raise ValueError("Cannot decrypt empty string")
            
            # Decrypt and return as string
            decrypted_bytes = self.cipher.decrypt(encrypted.encode())
            decrypted_str = decrypted_bytes.decode()
            
            logger.debug("Data decrypted successfully")
            return decrypted_str
            
        except Exception as e:
            logger.error("Decryption failed", error=str(e))
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def encrypt_api_key(self, api_key: str) -> str:
        """
        Encrypt API key for storage
        
        Args:
            api_key: Plain API key
            
        Returns:
            Encrypted API key
        """
        return self.encrypt(api_key)
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """
        Decrypt API key from storage
        
        Args:
            encrypted_key: Encrypted API key
            
        Returns:
            Plain API key
        """
        return self.decrypt(encrypted_key)
    
    def is_encrypted(self, value: str) -> bool:
        """
        Check if a value appears to be encrypted
        
        Args:
            value: String to check
            
        Returns:
            True if value appears to be encrypted
        """
        try:
            # Try to decrypt - if it works, it's encrypted
            self.decrypt(value)
            return True
        except Exception:
            return False


# Global encryption service instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """
    Get or create encryption service instance
    
    Returns:
        EncryptionService instance
    """
    global _encryption_service
    
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    
    return _encryption_service


# Made with Bob