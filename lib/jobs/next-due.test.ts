import { describe, it, expect } from "vitest";
import {
  earliest,
  publishMoment,
  dispatchReminderMoment,
  reportReminderMoment,
} from "@/lib/jobs/next-due";

const now = new Date("2026-09-10T09:00:00.000Z");

describe("earliest", () => {
  it("nimmt den frühesten Zeitpunkt", () => {
    expect(
      earliest([new Date("2026-09-11T00:00:00Z"), null, new Date("2026-09-10T12:00:00Z")]),
    ).toEqual(new Date("2026-09-10T12:00:00Z"));
  });

  it("gibt null zurück, wenn nichts ansteht", () => {
    expect(earliest([null, undefined])).toBeNull();
  });
});

describe("publishMoment", () => {
  it("zählt nur terminierte Beiträge", () => {
    const publishAt = new Date("2026-09-12T08:00:00Z");
    expect(publishMoment({ status: "SCHEDULED", publishAt })).toEqual(publishAt);
    expect(publishMoment({ status: "DRAFT", publishAt })).toBeNull();
    expect(publishMoment({ status: "PUBLISHED", publishAt })).toBeNull();
  });
});

describe("dispatchReminderMoment", () => {
  it("liegt um die Vorlaufzeit vor dem Termin", () => {
    expect(
      dispatchReminderMoment(
        { status: "SCHEDULED", publishAt: new Date("2026-09-14T08:00:00Z"), reminderSentAt: null },
        3,
      ),
    ).toEqual(new Date("2026-09-11T08:00:00Z"));
  });

  it("entfällt, wenn die Erinnerung schon heraus ist", () => {
    expect(
      dispatchReminderMoment(
        {
          status: "SCHEDULED",
          publishAt: new Date("2026-09-14T08:00:00Z"),
          reminderSentAt: new Date("2026-09-11T08:00:00Z"),
        },
        3,
      ),
    ).toBeNull();
  });

  it("entfällt für veröffentlichte Depeschen", () => {
    expect(
      dispatchReminderMoment(
        { status: "PUBLISHED", publishAt: new Date("2026-09-14T08:00:00Z"), reminderSentAt: null },
        3,
      ),
    ).toBeNull();
  });
});

describe("reportReminderMoment", () => {
  const window = { beforeDays: 3, afterDays: 2 };

  it("nennt die Vorher-Erinnerung, solange der Einsatz bevorsteht", () => {
    expect(
      reportReminderMoment(
        {
          status: "OPEN",
          dueOn: new Date("2026-09-20T00:00:00Z"),
          reminderBeforeSentAt: null,
          reminderAfterSentAt: null,
        },
        window,
        now,
      ),
    ).toEqual(new Date("2026-09-17T00:00:00Z"));
  });

  it("vergisst die Vorher-Erinnerung nach dem Einsatz und nennt die Nachher-Erinnerung", () => {
    expect(
      reportReminderMoment(
        {
          status: "OPEN",
          dueOn: new Date("2026-09-01T00:00:00Z"),
          reminderBeforeSentAt: null,
          reminderAfterSentAt: null,
        },
        window,
        now,
      ),
    ).toEqual(new Date("2026-09-03T00:00:00Z"));
  });

  it("schweigt zu erledigten Berichten", () => {
    expect(
      reportReminderMoment(
        {
          status: "DONE",
          dueOn: new Date("2026-09-01T00:00:00Z"),
          reminderBeforeSentAt: null,
          reminderAfterSentAt: null,
        },
        window,
        now,
      ),
    ).toBeNull();
  });

  it("schweigt, wenn beide Erinnerungen heraus sind", () => {
    expect(
      reportReminderMoment(
        {
          status: "OPEN",
          dueOn: new Date("2026-09-01T00:00:00Z"),
          reminderBeforeSentAt: new Date("2026-08-29T00:00:00Z"),
          reminderAfterSentAt: new Date("2026-09-03T00:00:00Z"),
        },
        window,
        now,
      ),
    ).toBeNull();
  });
});
