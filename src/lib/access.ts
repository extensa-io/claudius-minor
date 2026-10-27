import { createHash, timingSafeEqual } from "node:crypto";

export const ACCESS_CODE_HEADER = "x-access-code";

export function accessError(request: Request, source: { NODE_ENV?: string; APP_ACCESS_CODE?: string } = process.env): Response | null {
  const expected = source.APP_ACCESS_CODE;
  if (!expected || expected.length < 16 || !expected.trim()) {
    if (!expected && source.NODE_ENV !== "production") return null;
    return Response.json({ error: "Demo access is not configured." }, { status: 503 });
  }
  const supplied = request.headers.get(ACCESS_CODE_HEADER) ?? "";
  // Compare fixed-length hashes so code length does not affect the comparison.
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(supplied), hash(expected))) {
    return Response.json({ error: "Enter a valid access code." }, { status: 401 });
  }
  return null;
}
