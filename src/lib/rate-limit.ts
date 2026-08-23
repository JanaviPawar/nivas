type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Simple in-memory sliding-window limiter. Fine for a single-instance deployment
// like this project's; a production system at scale would swap this for a shared
// store (e.g. Redis/Upstash) so limits hold across multiple server instances.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}