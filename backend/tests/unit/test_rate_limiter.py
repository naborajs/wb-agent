"""
Unit tests for sliding window rate limiter.
"""

from app.utils.rate_limiter import SlidingWindowRateLimiter


def test_rate_limiter_allows_under_limit():
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=10)
    key = "+919876543210"

    assert limiter.record_hit(key, now=100.0) is True
    assert limiter.record_hit(key, now=101.0) is True
    assert limiter.record_hit(key, now=102.0) is True
    # 4th request should be rate limited
    assert limiter.record_hit(key, now=103.0) is False
    assert limiter.is_rate_limited(key, now=103.0) is True


def test_rate_limiter_window_expiry():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)
    key = "+919876543210"

    assert limiter.record_hit(key, now=100.0) is True
    assert limiter.record_hit(key, now=105.0) is True
    assert limiter.is_rate_limited(key, now=106.0) is True

    # At now=111.0, 100.0 has expired (> 10s old)
    assert limiter.is_rate_limited(key, now=111.0) is False
    assert limiter.record_hit(key, now=111.0) is True


def test_rate_limiter_retry_after():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)
    key = "+919876543210"

    limiter.record_hit(key, now=100.0)
    limiter.record_hit(key, now=102.0)

    # Oldest is 100.0, current is 105.0, window is 10. retry_after should be 10 - (105-100) = 5
    assert limiter.get_retry_after(key, now=105.0) == 5
