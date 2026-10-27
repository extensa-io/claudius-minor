const MISSING_MONGODB_URI = "Set MONGODB_URI to connect to Atlas.";

function safeErrorDetails(error: unknown) {
  const value = error instanceof Error ? error : new Error(String(error));
  const details = value as Error & { code?: unknown; codeName?: unknown };
  const code = typeof details.code === "string" || typeof details.code === "number" ? details.code : undefined;
  const codeName = typeof details.codeName === "string" ? details.codeName : undefined;
  const message = value.message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[redacted MongoDB URI]");
  return { name: value.name, code, codeName, message };
}

export function databaseErrorResponse(error: unknown, operation: string): Response {
  const details = safeErrorDetails(error);
  const notConfigured = details.message === MISSING_MONGODB_URI;
  console.error(`Database operation failed: ${operation}`, details);

  return Response.json({
    error: notConfigured
      ? "Database is not configured. Set MONGODB_URI on the server."
      : "Database request failed. Check server logs for details.",
    code: notConfigured ? "DATABASE_NOT_CONFIGURED" : "DATABASE_UNAVAILABLE",
  }, { status: 503 });
}
