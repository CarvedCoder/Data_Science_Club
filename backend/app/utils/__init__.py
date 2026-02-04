from datetime import datetime, timezone

def utc_now():
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)

def ensure_utc(dt):
    """Ensure a datetime is timezone-aware (UTC). Handles both aware and naive datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
