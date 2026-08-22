BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Adminbereich-Umbau: Terminkalender mit Aufgaben, Erinnerung an Depeschen,
-- aufgeräumtes Belegmaterial, Lebenslauf-Details und der Wegfall von
-- Schlagworten, Weiterleitungen, Zertifizierungs-Kategorien und Merkmalen.
--
-- Reihenfolge ist bewusst: erst hinzufügen und Daten übernehmen, dann Altes
-- entfernen. Kein Schritt verwirft Inhalte, die nicht vorher umgezogen sind.
-- ===========================================================================

-- --- 1. Aufgabe „Einsatzbericht" je Einsatz -------------------------------
CREATE TABLE [dbo].[MissionReportTask] (
    [id] NVARCHAR(1000) NOT NULL,
    [missionId] NVARCHAR(1000) NOT NULL,
    [dueOn] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [MissionReportTask_status_df] DEFAULT 'OPEN',
    [doneAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MissionReportTask_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MissionReportTask_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MissionReportTask_missionId_key] UNIQUE NONCLUSTERED ([missionId])
);

CREATE NONCLUSTERED INDEX [MissionReportTask_status_dueOn_idx] ON [dbo].[MissionReportTask]([status], [dueOn]);

ALTER TABLE [dbo].[MissionReportTask] ADD CONSTRAINT [MissionReportTask_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rückwirkend für ALLE bestehenden Einsätze anlegen. Wo der deutsche Bericht
-- (Veranstaltung UND Vortrag) bereits geschrieben ist, gilt die Aufgabe direkt
-- als erledigt — sonst steht sie offen und ist nachzuliefern.
INSERT INTO [dbo].[MissionReportTask] ([id], [missionId], [dueOn], [status], [doneAt], [createdAt], [updatedAt])
SELECT
    LOWER(CONVERT(NVARCHAR(36), NEWID())),
    m.[id],
    COALESCE(m.[endDate], m.[startDate]),
    CASE WHEN t.[missionId] IS NULL THEN N'OPEN' ELSE N'DONE' END,
    CASE WHEN t.[missionId] IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM [dbo].[Mission] AS m
LEFT JOIN [dbo].[MissionTranslation] AS t
    ON t.[missionId] = m.[id]
   AND t.[locale] = N'de'
   AND LEN(LTRIM(RTRIM(t.[eventText]))) > 0
   AND LEN(LTRIM(RTRIM(t.[talkText]))) > 0;

-- --- 2. Erinnerung an das Veröffentlichungsdatum einer Depesche -----------
ALTER TABLE [dbo].[Dispatch] ADD [reminderSentAt] DATETIME2;

-- --- 3. Belegmaterial: Publikum in drei Zahlen ----------------------------
ALTER TABLE [dbo].[Mission] ADD [attendeesOnsite] INT, [attendeesRemote] INT, [onDemandViews] INT;

-- Bestehende Teilnehmerzahlen sind Präsenzzahlen — vor dem Löschen umziehen.
EXEC('UPDATE [dbo].[Mission] SET [attendeesOnsite] = [attendeeCount] WHERE [attendeeCount] IS NOT NULL');

ALTER TABLE [dbo].[Mission] DROP COLUMN [attendeeCount];

-- Folien-URL/-Plattform und die Feedback-Felder werden nicht mehr gepflegt.
ALTER TABLE [dbo].[Mission] DROP COLUMN [slidesUrl], [slidesPlatform], [feedbackScore], [feedbackSource];

-- --- 4. Lebenslauf: Projekt- und Fähigkeitsangaben ------------------------
ALTER TABLE [dbo].[ResumeEntry] ADD
    [projectFrom] NVARCHAR(1000),
    [projectTo] NVARCHAR(1000),
    [personDays] INT,
    [clientAnonymous] BIT NOT NULL CONSTRAINT [ResumeEntry_clientAnonymous_df] DEFAULT 0,
    [clientSector] NVARCHAR(1000),
    [skillYears] INT,
    [skillLevel] NVARCHAR(1000);

-- --- 5. Schlagworte entfernen --------------------------------------------
DROP TABLE [dbo].[PostTag];
DROP TABLE [dbo].[_DispatchTags];
DROP TABLE [dbo].[Tag];

-- --- 6. Weiterleitungen entfernen ----------------------------------------
DROP TABLE [dbo].[Redirect];

-- --- 7. Merkmale der Identitäten entfernen --------------------------------
DROP TABLE [dbo].[IdentityAttribute];

-- --- 8. Zertifizierungs-Kategorien entfernen ------------------------------
DROP TABLE [dbo].[_CertificationCategories];

ALTER TABLE [dbo].[Certification] DROP CONSTRAINT [Certification_categoryId_fkey];
DROP INDEX [Certification_categoryId_idx] ON [dbo].[Certification];
ALTER TABLE [dbo].[Certification] DROP COLUMN [categoryId];

-- Die zugehörigen Kategorien selbst hängen an keinem Eintrag mehr.
DELETE FROM [dbo].[Taxonomy] WHERE [kind] = N'CERTIFICATION';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
