"""
Redis Client for Caching and Rate Limiting
"""

from typing import Optional, Any
import json
import redis.asyncio as redis
from redis.asyncio import Redis

from app.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


class RedisManager:
    """Manages Redis connections and operations"""
    
    def __init__(self):
        self.client: Optional[Redis] = None
    
    async def connect(self) -> None:
        """Establish connection to Redis"""
        try:
            logger.info("Connecting to Redis")
            
            self.client = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            
            # Test connection
            await self.client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            raise
    
    async def disconnect(self) -> None:
        """Close connection to Redis"""
        try:
            if self.client:
                await self.client.close()
                logger.info("Disconnected from Redis")
        except Exception as e:
            logger.error("Error disconnecting from Redis", error=str(e))
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value from Redis
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            value = await self.client.get(key)
            return value
        except Exception as e:
            logger.error("Failed to get from Redis", key=key, error=str(e))
            return None
    
    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None
    ) -> bool:
        """
        Set value in Redis
        
        Args:
            key: Cache key
            value: Value to cache
            expire: Expiration time in seconds
            
        Returns:
            True if successful
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            await self.client.set(key, value, ex=expire)
            return True
        except Exception as e:
            logger.error("Failed to set in Redis", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from Redis
        
        Args:
            key: Cache key
            
        Returns:
            True if deleted
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.error("Failed to delete from Redis", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in Redis
        
        Args:
            key: Cache key
            
        Returns:
            True if exists
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.error("Failed to check existence in Redis", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment counter in Redis
        
        Args:
            key: Counter key
            amount: Amount to increment
            
        Returns:
            New counter value
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            return await self.client.incrby(key, amount)
        except Exception as e:
            logger.error("Failed to increment in Redis", key=key, error=str(e))
            return 0
    
    async def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration on key
        
        Args:
            key: Cache key
            seconds: Expiration time in seconds
            
        Returns:
            True if successful
        """
        if not self.client:
            raise RuntimeError("Redis not connected")
        
        try:
            await self.client.expire(key, seconds)
            return True
        except Exception as e:
            logger.error("Failed to set expiration in Redis", key=key, error=str(e))
            return False
    
    async def get_json(self, key: str) -> Optional[Any]:
        """
        Get JSON value from Redis
        
        Args:
            key: Cache key
            
        Returns:
            Parsed JSON value or None
        """
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error("Failed to parse JSON from Redis", key=key)
        return None
    
    async def set_json(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """
        Set JSON value in Redis
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            expire: Expiration time in seconds
            
        Returns:
            True if successful
        """
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, expire)
        except (TypeError, ValueError) as e:
            logger.error("Failed to serialize JSON for Redis", key=key, error=str(e))
            return False


# Global Redis manager instance
redis_manager = RedisManager()


async def init_redis() -> None:
    """Initialize Redis connection"""
    await redis_manager.connect()


async def close_redis() -> None:
    """Close Redis connection"""
    await redis_manager.disconnect()


def get_redis() -> RedisManager:
    """Get Redis manager instance"""
    return redis_manager

# Made with Bob
