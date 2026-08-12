import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance - imported by main.py (to wire up the app) and by
# individual routers (to decorate specific endpoints). Keyed by client IP;
# good enough for a single-instance deployment without a shared store.
#
# Disabled under the test suite: most tests log in or register repeatedly
# against one shared server process, which would trip these limits and fail
# tests unrelated to rate limiting itself. The rate-limiting behavior is
# verified separately in tests/test_rate_limit.py, which spins up its own
# dedicated server without this override.
limiter = Limiter(key_func=get_remote_address, enabled=os.environ.get("DISABLE_RATE_LIMIT") != "1")
