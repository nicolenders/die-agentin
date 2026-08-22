BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Einsatzberichte als echte Aufgaben: zwei Erinnerungen je Aufgabe, Stichtag
-- ist der Einsatztag, und für JEDEN Einsatz im Bestand gibt es eine Aufgabe.
-- ===========================================================================

-- --- 1. Erinnerungsmarken je Aufgabe -------------------------------------
ALTER TABLE [dbo].[MissionReportTask] ADD [reminderBeforeSentAt] DATETIME2, [reminderAfterSentAt] DATETIME2;

-- --- 2. Stichtag ist der Einsatztag ---------------------------------------
-- Bisher zählte das Ende mehrtägiger Einsätze. Der Bericht hängt am Auftritt,
-- also am Beginn — sonst liegt die Erinnerung „x Tage vorher" bei einer
-- dreitägigen Konferenz mitten in der Veranstaltung.
UPDATE t
   SET t.[dueOn] = m.[startDate]
  FROM [dbo].[MissionReportTask] AS t
  JOIN [dbo].[Mission] AS m ON m.[id] = t.[missionId]
 WHERE t.[dueOn] <> m.[startDate];

-- --- 3. Fehlende Aufgaben nachziehen --------------------------------------
-- Idempotent: legt nur an, was fehlt. Deckt sowohl Einsätze ab, die nach der
-- ersten Migration dazugekommen sind, als auch einen Bestand, bei dem die
-- Rückwirkung damals nicht griff.
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

-- --- 4. Eine Empfängeradresse für alle Erinnerungen ------------------------
-- Der bisherige Schlüssel hieß nach den Depeschen, gilt aber ab jetzt auch für
-- die Einsatzberichte. Vorhandene Adresse übernehmen, damit niemand sie erneut
-- eintragen muss.
INSERT INTO [dbo].[SiteSetting] ([key], [value], [updatedAt])
SELECT N'reminder.email', s.[value], CURRENT_TIMESTAMP
  FROM [dbo].[SiteSetting] AS s
 WHERE s.[key] = N'dispatch.reminder.email'
   AND LEN(LTRIM(RTRIM(s.[value]))) > 0
   AND NOT EXISTS (SELECT 1 FROM [dbo].[SiteSetting] AS x WHERE x.[key] = N'reminder.email');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
