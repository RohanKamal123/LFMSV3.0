import threading
import time
from collections import defaultdict

# Deliberately in-memory, not a real APM/Prometheus setup - there's no
# external metrics service wired in yet (see the P1 discussion this was
# scoped from). This is enough to see basic health trends and catch an
# error-rate spike from the same log viewer /health already uses, without
# a new account or cost. Resets on every restart/redeploy by design.

_lock = threading.Lock()
_start_time = time.time()
_total_requests = 0
_status_class_counts = defaultdict(int)
_latencies_ms = []
_MAX_LATENCY_SAMPLES = 2000


def record_request(status_code: int, duration_ms: float) -> None:
    global _total_requests
    with _lock:
        _total_requests += 1
        _status_class_counts[f"{status_code // 100}xx"] += 1
        _latencies_ms.append(duration_ms)
        if len(_latencies_ms) > _MAX_LATENCY_SAMPLES:
            del _latencies_ms[: len(_latencies_ms) - _MAX_LATENCY_SAMPLES]


def snapshot() -> dict:
    with _lock:
        latencies = sorted(_latencies_ms)
        total = _total_requests
        status_counts = dict(_status_class_counts)

    def percentile(p):
        if not latencies:
            return None
        idx = min(int(len(latencies) * p), len(latencies) - 1)
        return latencies[idx]

    error_count = status_counts.get("5xx", 0)
    return {
        "uptime_seconds": round(time.time() - _start_time, 1),
        "total_requests": total,
        "requests_by_status_class": status_counts,
        "error_rate_percent": round(error_count / total * 100, 2) if total else 0.0,
        "latency_ms": {
            "p50": percentile(0.5),
            "p95": percentile(0.95),
            "p99": percentile(0.99),
            "samples": len(latencies),
        },
    }
