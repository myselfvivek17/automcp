"""
Encryption Service
Handles encryption and decryption of sensitive data (API keys)
"""

import base64
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from app.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)

_SALT = b"automcp-static-salt-v1"


def _derive_fernet_key(raw_key: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(raw_key.encode()))


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""

    def __init__(self):
        try:
            self.cipher = Fernet(_derive_fernet_key(settings.encryption_key))
            logger.info("Encryption service initialized")
        except Exception as e:
            logger.error("Failed to initialize encryption service", error=str(e))
            raise

    def encrypt(self, plaintext: str) -> str:
        try:
            if not plaintext:
                raise ValueError("Cannot encrypt empty string")
            encrypted_bytes = self.cipher.encrypt(plaintext.encode())
            logger.debug("Data encrypted successfully")
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error("Encryption failed", error=str(e))
            raise ValueError(f"Encryption failed: {str(e)}")

    def decrypt(self, encrypted: str) -> str:
        try:
            if not encrypted:
                raise ValueError("Cannot decrypt empty string")
            decrypted_bytes = self.cipher.decrypt(encrypted.encode())
            logger.debug("Data decrypted successfully")
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error("Decryption failed", error=str(e))
            raise ValueError(f"Decryption failed: {str(e)}")

    def encrypt_api_key(self, api_key: str) -> str:
        return self.encrypt(api_key)

    def decrypt_api_key(self, encrypted_key: str) -> str:
        return self.decrypt(encrypted_key)

    def is_encrypted(self, value: str) -> bool:
        if not value:
            return False
        try:
            decoded = base64.urlsafe_b64decode(value.encode())
            # Fernet tokens: version byte 0x80 + 8-byte timestamp + ... minimum 57 bytes
            return len(decoded) >= 57 and decoded[0] == 0x80
        except Exception:
            return False


_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
