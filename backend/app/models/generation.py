"""
Generation Model
Pydantic models for code generation data validation and serialization
"""

from typing import Optional, Literal, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import uuid


# Generation status types
GenerationStatus = Literal["pending", "processing", "completed", "failed"]

# Output language types
OutputLanguage = Literal["python", "typescript", "javascript"]


class GenerationBase(BaseModel):
    """Base generation model with common fields"""
    
    output_language: OutputLanguage = Field(..., description="Target programming language")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "output_language": "python"
            }
        }


class GenerationCreate(GenerationBase):
    """Model for creating a new generation"""
    
    project_id: str = Field(..., description="ID of the project to generate code for")
    
    # Optional generation parameters
    include_tests: bool = Field(default=True, description="Include test files")
    include_docs: bool = Field(default=True, description="Include documentation")
    use_async: bool = Field(default=True, description="Use async/await patterns")
    
    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        """
        Validate project ID
        
        Args:
            v: Project ID
            
        Returns:
            Validated project ID
            
        Raises:
            ValueError: If project ID is invalid
        """
        if not v or not v.strip():
            raise ValueError("Project ID cannot be empty")
        return v.strip()
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "output_language": "python",
                "include_tests": True,
                "include_docs": True,
                "use_async": True
            }
        }


class GenerationUpdate(BaseModel):
    """Model for updating generation information"""
    
    status: Optional[GenerationStatus] = Field(None, description="Updated status")
    code: Optional[str] = Field(None, description="Generated code")
    logs: Optional[str] = Field(None, description="Generation logs")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "status": "completed",
                "code": "# Generated MCP server code\n...",
                "logs": "Generation completed successfully"
            }
        }


class Generation(GenerationBase):
    """
    Complete generation model with all fields
    
    This model represents a code generation stored in the database.
    Compatible with Cloudant NoSQL database.
    """
    
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique generation identifier"
    )
    project_id: str = Field(..., description="ID of the associated project")
    user_id: str = Field(..., description="ID of the user who requested generation")
    status: GenerationStatus = Field(default="pending", description="Generation status")
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Generation creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp"
    )
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    # Generation parameters
    include_tests: bool = Field(default=True, description="Include test files")
    include_docs: bool = Field(default=True, description="Include documentation")
    use_async: bool = Field(default=True, description="Use async/await patterns")
    
    # Generation output
    code: Optional[str] = Field(None, description="Generated code")
    logs: Optional[str] = Field(None, description="Generation logs")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    # Metadata
    ai_provider: Optional[str] = Field(None, description="AI provider used for generation")
    model_name: Optional[str] = Field(None, description="AI model used")
    tokens_used: Optional[int] = Field(None, description="Number of tokens used")
    generation_time_seconds: Optional[float] = Field(None, description="Time taken to generate")
    
    # File structure
    files: Optional[dict[str, str]] = Field(
        None,
        description="Generated files (filename -> content mapping)"
    )
    
    # Cloudant-specific fields (using aliases to avoid underscore prefix)
    cloudant_id: Optional[str] = Field(None, alias="_id", description="Cloudant document ID")
    cloudant_rev: Optional[str] = Field(None, alias="_rev", description="Cloudant revision ID")
    doc_type: str = Field(default="generation", description="Document type for Cloudant")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "project_id": "project-123",
                "user_id": "user-123",
                "status": "completed",
                "output_language": "python",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:05:00Z",
                "completed_at": "2024-01-01T00:05:00Z",
                "include_tests": True,
                "include_docs": True,
                "use_async": True,
                "ai_provider": "watsonx",
                "model_name": "ibm/granite-13b-chat-v2",
                "tokens_used": 1500,
                "generation_time_seconds": 12.5,
                "doc_type": "generation"
            }
        }
    
    def to_dict(self) -> dict:
        """
        Convert model to dictionary for database storage
        
        Returns:
            Dictionary representation
        """
        data = self.model_dump(by_alias=True, exclude_none=True)
        
        # Convert datetime to ISO format strings
        if isinstance(data.get("created_at"), datetime):
            data["created_at"] = data["created_at"].isoformat()
        if isinstance(data.get("updated_at"), datetime):
            data["updated_at"] = data["updated_at"].isoformat()
        if isinstance(data.get("completed_at"), datetime):
            data["completed_at"] = data["completed_at"].isoformat()
        
        return data
    
    @classmethod
    def from_dict(cls, data: dict) -> "Generation":
        """
        Create model from dictionary (database document)
        
        Args:
            data: Dictionary data
            
        Returns:
            Generation model instance
        """
        # Convert ISO format strings to datetime
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
        if isinstance(data.get("completed_at"), str):
            data["completed_at"] = datetime.fromisoformat(data["completed_at"].replace("Z", "+00:00"))
        
        return cls(**data)


class GenerationResponse(BaseModel):
    """Model for generation API responses"""
    
    id: str = Field(..., description="Generation ID")
    project_id: str = Field(..., description="Project ID")
    user_id: str = Field(..., description="User ID")
    status: GenerationStatus = Field(..., description="Generation status")
    output_language: OutputLanguage = Field(..., description="Output language")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    # Generation parameters
    include_tests: bool = Field(..., description="Include tests")
    include_docs: bool = Field(..., description="Include docs")
    use_async: bool = Field(..., description="Use async")
    
    # Metadata
    ai_provider: Optional[str] = Field(None, description="AI provider")
    model_name: Optional[str] = Field(None, description="Model name")
    tokens_used: Optional[int] = Field(None, description="Tokens used")
    generation_time_seconds: Optional[float] = Field(None, description="Generation time")
    
    # Error info (if failed)
    error_message: Optional[str] = Field(None, description="Error message")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "project_id": "project-123",
                "user_id": "user-123",
                "status": "completed",
                "output_language": "python",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:05:00Z",
                "completed_at": "2024-01-01T00:05:00Z",
                "include_tests": True,
                "include_docs": True,
                "use_async": True,
                "ai_provider": "watsonx",
                "model_name": "ibm/granite-13b-chat-v2",
                "tokens_used": 1500,
                "generation_time_seconds": 12.5
            }
        }


class GenerationDetailResponse(GenerationResponse):
    """Model for detailed generation API responses (includes code)"""
    
    code: Optional[str] = Field(None, description="Generated code")
    logs: Optional[str] = Field(None, description="Generation logs")
    files: Optional[dict[str, str]] = Field(None, description="Generated files")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "project_id": "project-123",
                "user_id": "user-123",
                "status": "completed",
                "output_language": "python",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:05:00Z",
                "completed_at": "2024-01-01T00:05:00Z",
                "include_tests": True,
                "include_docs": True,
                "use_async": True,
                "code": "# Generated MCP server code\n...",
                "logs": "Generation completed successfully",
                "files": {
                    "server.py": "# Main server file\n...",
                    "test_server.py": "# Test file\n..."
                }
            }
        }


class GenerationListResponse(BaseModel):
    """Model for paginated generation list responses"""
    
    generations: list[GenerationResponse] = Field(..., description="List of generations")
    total: int = Field(..., description="Total number of generations")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "generations": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "project_id": "project-123",
                        "user_id": "user-123",
                        "status": "completed",
                        "output_language": "python",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:05:00Z",
                        "completed_at": "2024-01-01T00:05:00Z",
                        "include_tests": True,
                        "include_docs": True,
                        "use_async": True
                    }
                ],
                "total": 5,
                "page": 1,
                "page_size": 10
            }
        }


class GenerationStats(BaseModel):
    """Model for generation statistics"""
    
    total_generations: int = Field(..., description="Total number of generations")
    pending_generations: int = Field(..., description="Number of pending generations")
    processing_generations: int = Field(..., description="Number of processing generations")
    completed_generations: int = Field(..., description="Number of completed generations")
    failed_generations: int = Field(..., description="Number of failed generations")
    average_generation_time: Optional[float] = Field(None, description="Average generation time in seconds")
    total_tokens_used: Optional[int] = Field(None, description="Total tokens used")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "total_generations": 10,
                "pending_generations": 1,
                "processing_generations": 2,
                "completed_generations": 6,
                "failed_generations": 1,
                "average_generation_time": 15.3,
                "total_tokens_used": 15000
            }
        }

# Made with Bob