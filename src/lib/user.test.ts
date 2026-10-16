import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { parseUserId } from "@/lib/user";

describe("persona identifiers", () => {
  it("rejects unknown or malformed cookie identifiers", () => {
    expect(parseUserId("not-a-user")).toBeNull();
    expect(parseUserId(new ObjectId().toString())).toBeInstanceOf(ObjectId);
  });
});
