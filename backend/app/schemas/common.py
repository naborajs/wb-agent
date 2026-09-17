"""
Common Pydantic v2 schemas: base response envelopes, pagination, and error representations.
"""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseResponse(BaseModel):
    """Standard success response wrapper."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class PageParams(BaseModel):
    """
    Standard pagination query parameters.
    """
    page: int = Field(default=1, ge=1, description="1-indexed page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (1-100)")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated collection response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    """Structured error payload."""
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Top-level error response envelope."""
    success: bool = False
    error: ErrorDetail
