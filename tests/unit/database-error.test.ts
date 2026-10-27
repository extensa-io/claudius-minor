import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseErrorResponse } from "@/lib/database-error";

afterEach(() => vi.restoreAllMocks());

describe("database error responses", () => {
  it("identifies a missing MongoDB configuration without exposing internals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = databaseErrorResponse(new Error("Set MONGODB_URI to connect to Atlas."), "list users");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Database is not configured. Set MONGODB_URI on the server.",
      code: "DATABASE_NOT_CONFIGURED",
    });
  });

  it("logs safe diagnostics and keeps database errors out of the client response", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("connection failed for mongodb+srv://person:secret@cluster.example/db");
    const response = databaseErrorResponse(error, "list users");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Database request failed. Check server logs for details.",
      code: "DATABASE_UNAVAILABLE",
    });
    expect(log).toHaveBeenCalledWith("Database operation failed: list users", expect.objectContaining({
      name: "Error",
      message: "connection failed for [redacted MongoDB URI]",
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
});
