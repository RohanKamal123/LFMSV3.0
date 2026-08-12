from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance - imported by main.py (to wire up the app) and by
# individual routers (to decorate specific endpoints). Keyed by client IP;
# good enough for a single-instance deployment without a shared store.
limiter = Limiter(key_func=get_remote_address)
