"""
Unit tests for common response and pagination schemas.
"""

from app.schemas import BaseResponse, PageParams, PaginatedResponse, ErrorResponse, ErrorDetail


def test_page_params_offset_limit():
    params = PageParams(page=1, page_size=25)
    assert params.offset == 0
    assert params.limit == 25

    params_p3 = PageParams(page=3, page_size=15)
    assert params_p3.offset == 30
    assert params_p3.limit == 15


def test_paginated_response_schema():
    payload = PaginatedResponse[str](
        items=["item1", "item2"],
        total=2,
        page=1,
        page_size=10,
        pages=1,
    )
    assert len(payload.items) == 2
    assert payload.total == 2
    assert payload.pages == 1


def test_base_and_error_responses():
    base = BaseResponse(success=True, message="Operation completed", data={"id": "xyz"})
    assert base.success is True
    assert base.data["id"] == "xyz"

    err = ErrorResponse(error=ErrorDetail(code="INVALID_INPUT", message="Field missing", field="phone"))
    assert err.success is False
    assert err.error.code == "INVALID_INPUT"
    assert err.error.field == "phone"
