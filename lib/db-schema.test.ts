import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { isMissingSchemaError } from "./db-schema";

function known(code: string, message = "boom") {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: "test" });
}

describe("isMissingSchemaError", () => {
  it("recognises missing tables and columns by Prisma code", () => {
    expect(isMissingSchemaError(known("P2021"))).toBe(true);
    expect(isMissingSchemaError(known("P2022"))).toBe(true);
  });

  it("recognises SQL Server messages when Prisma reports no matching code", () => {
    expect(isMissingSchemaError(known("P2010", "Invalid object name 'dbo.EventSeries'."))).toBe(true);
    expect(isMissingSchemaError(new Error("Invalid column name 'eventSeriesId'."))).toBe(true);
  });

  it("does not treat other failures as a missing schema", () => {
    expect(isMissingSchemaError(known("P1001", "Can't reach database server"))).toBe(false);
    expect(isMissingSchemaError(known("P2002", "Unique constraint failed"))).toBe(false);
    expect(isMissingSchemaError(new Error("timeout"))).toBe(false);
    expect(isMissingSchemaError(undefined)).toBe(false);
  });
});
