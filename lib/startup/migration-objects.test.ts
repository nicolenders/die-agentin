import { describe, it, expect } from "vitest";
import { createdTables } from "./migration-objects";

describe("createdTables", () => {
  it("findet eine angelegte Tabelle", () => {
    expect(createdTables("CREATE TABLE [dbo].[TalkAttachment] ( [id] NVARCHAR(1000) );")).toEqual([
      "TalkAttachment",
    ]);
  });

  it("findet mehrere und nennt jede nur einmal", () => {
    const sql = `
      CREATE TABLE [dbo].[PromptTemplate] ([id] INT);
      CREATE TABLE [dbo].[PromptSnippet] ([id] INT);
      CREATE TABLE [dbo].[PromptTemplate] ([id] INT);
    `;
    expect(createdTables(sql).sort()).toEqual(["PromptSnippet", "PromptTemplate"]);
  });

  it("kommt ohne dbo-Präfix aus", () => {
    expect(createdTables("create table [Tag] ([id] INT);")).toEqual(["Tag"]);
  });

  it("verwechselt ein DROP nicht mit einem CREATE", () => {
    expect(createdTables("DROP TABLE [dbo].[Tag];")).toEqual([]);
  });

  it("ignoriert reine Spaltenzusätze", () => {
    expect(createdTables("ALTER TABLE [dbo].[Mission] ADD [attendeesOnsite] INT;")).toEqual([]);
  });

  it("liefert bei leerem Text nichts", () => {
    expect(createdTables("")).toEqual([]);
  });
});
