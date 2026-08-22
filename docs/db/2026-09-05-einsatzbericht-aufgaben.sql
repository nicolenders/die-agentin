/* ===========================================================================
   Einsatzbericht-Aufgaben und Erinnerungen — manuelle Ausführung
   Migration: 20260905120000_mission_report_reminders
   Ziel:      Azure SQL (Datenbank „nicolenders")

   ABLAUF: identisch zur ersten Migration, siehe
   docs/db/2026-08-22-admin-umbau.md — Wiederherstellungspunkt, Skript,
   VERBUCHEN (Abschnitt 5), Kontrolle. Ohne das Verbuchen versucht der nächste
   Serverstart die Migration erneut.

   Diese Migration LÖSCHT NICHTS. Sie ergänzt zwei Spalten, zieht den Stichtag
   auf den Einsatztag und legt die fehlenden Aufgaben an.

   Wiederholbar: Jeder Schritt prüft erst, ob er nötig ist.
   =========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRAN;

/* --- 1. Erinnerungsmarken je Aufgabe ------------------------------------ */
IF COL_LENGTH(N'[dbo].[MissionReportTask]', N'reminderBeforeSentAt') IS NULL
    ALTER TABLE [dbo].[MissionReportTask] ADD [reminderBeforeSentAt] DATETIME2;
IF COL_LENGTH(N'[dbo].[MissionReportTask]', N'reminderAfterSentAt') IS NULL
    ALTER TABLE [dbo].[MissionReportTask] ADD [reminderAfterSentAt] DATETIME2;
PRINT '1/4  Erinnerungsmarken ergänzt.';

/* --- 2. Stichtag ist der Einsatztag ------------------------------------- */
/* Bisher zählte das Ende mehrtägiger Einsätze. Der Bericht hängt am Auftritt,
   also am Beginn — sonst läge die Erinnerung „x Tage vorher" bei einer
   dreitägigen Konferenz mitten in der Veranstaltung. */
UPDATE t
   SET t.[dueOn] = m.[startDate]
  FROM [dbo].[MissionReportTask] AS t
  JOIN [dbo].[Mission] AS m ON m.[id] = t.[missionId]
 WHERE t.[dueOn] <> m.[startDate];
PRINT CONCAT('2/4  Stichtage auf den Einsatztag gezogen: ', @@ROWCOUNT);

/* --- 3. Fehlende Aufgaben nachziehen ------------------------------------ */
/* Legt nur an, was fehlt. Wo der deutsche Bericht (Veranstaltung UND Vortrag)
   schon steht, gilt die Aufgabe direkt als erledigt. */
INSERT INTO [dbo].[MissionReportTask] ([id], [missionId], [dueOn], [status], [doneAt], [createdAt], [updatedAt])
SELECT
    LOWER(CONVERT(NVARCHAR(36), NEWID())),
    m.[id],
    m.[startDate],
    CASE WHEN t.[missionId] IS NULL THEN N'OPEN' ELSE N'DONE' END,
    CASE WHEN t.[missionId] IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM [dbo].[Mission] AS m
LEFT JOIN [dbo].[MissionTranslation] AS t
    ON t.[missionId] = m.[id]
   AND t.[locale] = N'de'
   AND LEN(LTRIM(RTRIM(t.[eventText]))) > 0
   AND LEN(LTRIM(RTRIM(t.[talkText]))) > 0
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[MissionReportTask] AS x WHERE x.[missionId] = m.[id]);
PRINT CONCAT('3/4  Fehlende Aufgaben angelegt: ', @@ROWCOUNT);

/* --- 4. Eine Empfängeradresse für alle Erinnerungen --------------------- */
INSERT INTO [dbo].[SiteSetting] ([key], [value], [updatedAt])
SELECT N'reminder.email', s.[value], CURRENT_TIMESTAMP
  FROM [dbo].[SiteSetting] AS s
 WHERE s.[key] = N'dispatch.reminder.email'
   AND LEN(LTRIM(RTRIM(s.[value]))) > 0
   AND NOT EXISTS (SELECT 1 FROM [dbo].[SiteSetting] AS x WHERE x.[key] = N'reminder.email');
PRINT '4/4  Empfängeradresse übernommen (falls eine gepflegt war).';

COMMIT TRAN;
PRINT '';
PRINT 'Fertig. JETZT die Migration verbuchen:';
PRINT '  npx prisma migrate resolve --applied 20260905120000_mission_report_reminders';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
    PRINT 'Abgebrochen und zurückgerollt. Es wurde NICHTS geändert.';
END;

THROW;

END CATCH
