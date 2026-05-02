"""
Database Connection and Management
Handles IBM Cloudant database operations
"""

from typing import Optional, Dict, Any, List
from cloudant.client import Cloudant
from cloudant.database import CloudantDatabase
from cloudant.document import Document
from cloudant.error import CloudantException

from app.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


class DatabaseManager:
    """Manages IBM Cloudant database connections and operations"""
    
    def __init__(self):
        self.client: Optional[Cloudant] = None
        self.db: Optional[CloudantDatabase] = None
    
    async def connect(self) -> None:
        """Establish connection to Cloudant database"""
        try:
            logger.info("Connecting to Cloudant database")
            
            # Create Cloudant client
            self.client = Cloudant(
                settings.cloudant_username,
                settings.cloudant_password,
                url=settings.cloudant_url,
                connect=True,
                auto_renew=True,
            )
            
            # Get or create database
            if settings.cloudant_database in self.client:
                self.db = self.client[settings.cloudant_database]
                logger.info(
                    "Connected to existing database",
                    database=settings.cloudant_database
                )
            else:
                self.db = self.client.create_database(settings.cloudant_database)
                logger.info(
                    "Created new database",
                    database=settings.cloudant_database
                )
            
            # Create indexes if needed
            await self._create_indexes()
            
        except CloudantException as e:
            logger.error("Failed to connect to Cloudant", error=str(e))
            raise
    
    async def disconnect(self) -> None:
        """Close connection to Cloudant database"""
        try:
            if self.client:
                self.client.disconnect()
                logger.info("Disconnected from Cloudant database")
        except CloudantException as e:
            logger.error("Error disconnecting from Cloudant", error=str(e))
    
    async def _create_indexes(self) -> None:
        """Create necessary indexes for efficient queries"""
        if not self.db:
            return
        
        try:
            # Index for projects by user_id
            self.db.create_query_index(
                index_name="idx_user_projects",
                fields=["user_id", "created_at"]
            )
            
            # Index for projects by status
            self.db.create_query_index(
                index_name="idx_project_status",
                fields=["status", "updated_at"]
            )
            
            # Index for API keys by user_id
            self.db.create_query_index(
                index_name="idx_user_api_keys",
                fields=["user_id", "provider"]
            )
            
            logger.info("Database indexes created successfully")
            
        except CloudantException as e:
            logger.warning("Error creating indexes", error=str(e))
    
    async def create_document(self, doc_data: Dict[str, Any]) -> Document:
        """
        Create a new document in the database
        
        Args:
            doc_data: Document data to store
            
        Returns:
            Created document
        """
        if not self.db:
            raise RuntimeError("Database not connected")
        
        try:
            doc = self.db.create_document(doc_data)
            logger.debug("Document created", doc_id=doc.get("_id"))
            return doc
        except CloudantException as e:
            logger.error("Failed to create document", error=str(e))
            raise
    
    async def get_document(self, doc_id: str) -> Optional[Document]:
        """
        Retrieve a document by ID
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document if found, None otherwise
        """
        if not self.db:
            raise RuntimeError("Database not connected")
        
        try:
            if doc_id in self.db:
                return self.db[doc_id]
            return None
        except CloudantException as e:
            logger.error("Failed to get document", doc_id=doc_id, error=str(e))
            raise
    
    async def update_document(self, doc_id: str, updates: Dict[str, Any]) -> Document:
        """
        Update an existing document
        
        Args:
            doc_id: Document ID
            updates: Fields to update
            
        Returns:
            Updated document
        """
        if not self.db:
            raise RuntimeError("Database not connected")
        
        try:
            doc = self.db[doc_id]
            doc.update(updates)
            doc.save()
            logger.debug("Document updated", doc_id=doc_id)
            return doc
        except CloudantException as e:
            logger.error("Failed to update document", doc_id=doc_id, error=str(e))
            raise
    
    async def delete_document(self, doc_id: str) -> bool:
        """
        Delete a document
        
        Args:
            doc_id: Document ID
            
        Returns:
            True if deleted successfully
        """
        if not self.db:
            raise RuntimeError("Database not connected")
        
        try:
            doc = self.db[doc_id]
            doc.delete()
            logger.debug("Document deleted", doc_id=doc_id)
            return True
        except CloudantException as e:
            logger.error("Failed to delete document", doc_id=doc_id, error=str(e))
            raise
    
    async def query(
        self,
        selector: Dict[str, Any],
        fields: Optional[List[str]] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Query documents using Cloudant Query
        
        Args:
            selector: Query selector
            fields: Fields to return
            limit: Maximum number of results
            skip: Number of results to skip
            
        Returns:
            List of matching documents
        """
        if not self.db:
            raise RuntimeError("Database not connected")
        
        try:
            query_result = self.db.get_query_result(
                selector=selector,
                fields=fields,
                limit=limit,
                skip=skip,
            )
            
            results = list(query_result)
            logger.debug(
                "Query executed",
                selector=selector,
                result_count=len(results)
            )
            return results
            
        except CloudantException as e:
            logger.error("Query failed", selector=selector, error=str(e))
            raise


# Global database manager instance
db_manager = DatabaseManager()


async def init_database() -> None:
    """Initialize database connection"""
    await db_manager.connect()


async def close_database() -> None:
    """Close database connection"""
    await db_manager.disconnect()


def get_db() -> DatabaseManager:
    """Get database manager instance"""
    return db_manager

# Made with Bob
