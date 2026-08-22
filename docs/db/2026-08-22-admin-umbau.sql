/* ===========================================================================
   Adminbereich-Umbau — manuelle Ausführung
   Migration: 20260822120000_admin_umbau
   Ziel:      Azure SQL (Datenbank „nicolenders")

   ANLEITUNG: docs/db/2026-08-22-admin-umbau.md — dort steht auch, warum die
   Migration danach verbucht werden MUSS (Abschnitt 5).

   VOR DEM AUSFÜHREN: Wiederherstellungspunkt sichern. Dieses Skript löscht
   Tabellen und Spalten. Es gibt keinen Rückweg außer der Wiederherstellung.

   Das Skript ist wiederholbar: Jeder Schritt prüft erst, ob er nötig ist.
   Ein Abbruch in der Mitte lässt sich also durch erneutes Ausführen beheben.
   Alles läuft in EINER Transaktion — entweder ganz oder gar nicht.
   =========================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRAN;

/* ---------------------------------------------------------------------------
   1. Aufgabe „Einsatzbericht" je Einsatz
   --------------------------------------------------------------------------- */

IF OBJECT_ID(N'[dbo].[MissionReportTask]', N'U') IS NULL
BEGIN
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
    PRINT '1/8  Tabelle MissionReportTask angelegt.';
END
ELSE
    PRINT '1/8  Tabelle MissionReportTask war schon da.';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'MissionReportTask_status_dueOn_idx' AND object_id = OBJECT_ID(N'[dbo].[MissionReportTask]'))
    CREATE NONCLUSTERED INDEX [MissionReportTask_status_dueOn_idx] ON [dbo].[MissionReportTask]([status], [dueOn]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'MissionReportTask_missionId_fkey')
    ALTER TABLE [dbo].[MissionReportTask] ADD CONSTRAINT [MissionReportTask_missionId_fkey]
        FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

/* Rückwirkend für ALLE bestehenden Einsätze. Wo der deutsche Bericht
   (Veranstaltung UND Vortrag) schon steht, gilt die Aufgabe als erledigt —
   sonst bleibt sie offen und ist nachzuliefern.
   EXEC, weil die Tabelle womöglich in diesem Stapel erst entstanden ist. */
EXEC(N'
INSERT INTO [dbo].[MissionReportTask] ([id], [missionId], [dueOn], [status], [doneAt], [createdAt], [updatedAt])
SELECT
    LOWER(CONVERT(NVARCHAR(36), NEWID())),
    m.[id],
    COALESCE(m.[endDate], m.[startDate]),
    CASE WHEN t.[missionId] IS NULL THEN N''OPEN'' ELSE N''DONE'' END,
    CASE WHEN t.[missionId] IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM [dbo].[Mission] AS m
LEFT JOIN [dbo].[MissionTranslation] AS t
    ON t.[missionId] = m.[id]
   AND t.[locale] = N''de''
   AND LEN(LTRIM(RTRIM(t.[eventText]))) > 0
   AND LEN(LTRIM(RTRIM(t.[talkText]))) > 0
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[MissionReportTask] AS x WHERE x.[missionId] = m.[id]);
');

/* ---------------------------------------------------------------------------
   2. Erinnerung an das Veröffentlichungsdatum einer Depesche
   --------------------------------------------------------------------------- */

IF COL_LENGTH(N'[dbo].[Dispatch]', N'reminderSentAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[Dispatch] ADD [reminderSentAt] DATETIME2;
    PRINT '2/8  Dispatch.reminderSentAt angelegt.';
END
ELSE
    PRINT '2/8  Dispatch.reminderSentAt war schon da.';

/* ---------------------------------------------------------------------------
   3. Belegmaterial: Publikum in drei Zahlen statt einer
   --------------------------------------------------------------------------- */

IF COL_LENGTH(N'[dbo].[Mission]', N'attendeesOnsite') IS NULL
    ALTER TABLE [dbo].[Mission] ADD [attendeesOnsite] INT;
IF COL_LENGTH(N'[dbo].[Mission]', N'attendeesRemote') IS NULL
    ALTER TABLE [dbo].[Mission] ADD [attendeesRemote] INT;
IF COL_LENGTH(N'[dbo].[Mission]', N'onDemandViews') IS NULL
    ALTER TABLE [dbo].[Mission] ADD [onDemandViews] INT;

/* Bestehende Teilnehmerzahlen sind Präsenzzahlen — umziehen, BEVOR die alte
   Spalte fällt. EXEC, weil die Zielspalte in diesem Stapel entstanden sein kann. */
IF COL_LENGTH(N'[dbo].[Mission]', N'attendeeCount') IS NOT NULL
    EXEC(N'UPDATE [dbo].[Mission] SET [attendeesOnsite] = [attendeeCount] WHERE [attendeeCount] IS NOT NULL AND [attendeesOnsite] IS NULL');

/* Alte Spalten löschen. Sie tragen keine Default-Constraints (siehe
   20260811160000_mission_material); hätte doch eine von Hand eine bekommen,
   scheitert der Befehl sichtbar und die ganze Transaktion rollt zurück —
   besser, als still das Falsche zu tun. */
IF COL_LENGTH(N'[dbo].[Mission]', N'attendeeCount') IS NOT NULL
    ALTER TABLE [dbo].[Mission] DROP COLUMN [attendeeCount];
IF COL_LENGTH(N'[dbo].[Mission]', N'slidesUrl') IS NOT NULL
    ALTER TABLE [dbo].[Mission] DROP COLUMN [slidesUrl];
IF COL_LENGTH(N'[dbo].[Mission]', N'slidesPlatform') IS NOT NULL
    ALTER TABLE [dbo].[Mission] DROP COLUMN [slidesPlatform];
IF COL_LENGTH(N'[dbo].[Mission]', N'feedbackScore') IS NOT NULL
    ALTER TABLE [dbo].[Mission] DROP COLUMN [feedbackScore];
IF COL_LENGTH(N'[dbo].[Mission]', N'feedbackSource') IS NOT NULL
    ALTER TABLE [dbo].[Mission] DROP COLUMN [feedbackSource];
PRINT '3/8  Publikum aufgeteilt, Folien-URL/-Plattform und Feedback-Felder entfernt.';

/* ---------------------------------------------------------------------------
   4. Lebenslauf: Projekt- und Fähigkeitsangaben
   --------------------------------------------------------------------------- */

IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'projectFrom') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [projectFrom] NVARCHAR(1000);
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'projectTo') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [projectTo] NVARCHAR(1000);
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'personDays') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [personDays] INT;
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'clientAnonymous') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [clientAnonymous] BIT NOT NULL CONSTRAINT [ResumeEntry_clientAnonymous_df] DEFAULT 0;
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'clientSector') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [clientSector] NVARCHAR(1000);
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'skillYears') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [skillYears] INT;
IF COL_LENGTH(N'[dbo].[ResumeEntry]', N'skillLevel') IS NULL
    ALTER TABLE [dbo].[ResumeEntry] ADD [skillLevel] NVARCHAR(1000);
PRINT '4/8  Lebenslauf um Projekt- und Fähigkeitsangaben erweitert.';

/* ---------------------------------------------------------------------------
   5. Schlagworte entfernen
   --------------------------------------------------------------------------- */

IF OBJECT_ID(N'[dbo].[PostTag]', N'U') IS NOT NULL DROP TABLE [dbo].[PostTag];
IF OBJECT_ID(N'[dbo].[_DispatchTags]', N'U') IS NOT NULL DROP TABLE [dbo].[_DispatchTags];
IF OBJECT_ID(N'[dbo].[Tag]', N'U') IS NOT NULL DROP TABLE [dbo].[Tag];
PRINT '5/8  Schlagworte entfernt.';

/* ---------------------------------------------------------------------------
   6. Weiterleitungen entfernen
   --------------------------------------------------------------------------- */

IF OBJECT_ID(N'[dbo].[Redirect]', N'U') IS NOT NULL DROP TABLE [dbo].[Redirect];
PRINT '6/8  Weiterleitungen entfernt.';

/* ---------------------------------------------------------------------------
   7. Merkmale der Identitäten entfernen
   --------------------------------------------------------------------------- */

IF OBJECT_ID(N'[dbo].[IdentityAttribute]', N'U') IS NOT NULL DROP TABLE [dbo].[IdentityAttribute];
PRINT '7/8  Merkmale entfernt.';

/* ---------------------------------------------------------------------------
   8. Zertifizierungs-Kategorien entfernen
   --------------------------------------------------------------------------- */

IF OBJECT_ID(N'[dbo].[_CertificationCategories]', N'U') IS NOT NULL DROP TABLE [dbo].[_CertificationCategories];

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'Certification_categoryId_fkey')
    ALTER TABLE [dbo].[Certification] DROP CONSTRAINT [Certification_categoryId_fkey];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Certification_categoryId_idx' AND object_id = OBJECT_ID(N'[dbo].[Certification]'))
    DROP INDEX [Certification_categoryId_idx] ON [dbo].[Certification];

IF COL_LENGTH(N'[dbo].[Certification]', N'categoryId') IS NOT NULL
    ALTER TABLE [dbo].[Certification] DROP COLUMN [categoryId];

/* Die zugehörigen Kategorien selbst hängen an keinem Eintrag mehr. Sollte doch
   eine irgendwo verknüpft sein, bleibt sie stehen, statt die Migration an einem
   Fremdschlüssel scheitern zu lassen — sie stört dann niemanden mehr. */
DELETE FROM [dbo].[Taxonomy]
WHERE [kind] = N'CERTIFICATION'
  AND [id] NOT IN (SELECT [B] FROM [dbo].[_DossierCategories])
  AND [id] NOT IN (SELECT [B] FROM [dbo].[_TalkCategories])
  AND [id] NOT IN (SELECT [B] FROM [dbo].[_TalkAudiences])
  AND [id] NOT IN (SELECT [B] FROM [dbo].[_DispatchTopics])
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Dossier] AS d WHERE d.[categoryId] = [Taxonomy].[id])
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Talk] AS t WHERE t.[categoryId] = [Taxonomy].[id]);
PRINT '8/8  Zertifizierungs-Kategorien entfernt.';

COMMIT TRAN;
PRINT '';
PRINT 'Fertig. JETZT die Migration verbuchen — Abschnitt 5 der Anleitung.';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
    PRINT 'Abgebrochen und zurückgerollt. Es wurde NICHTS geändert.';
END;

THROW;

END CATCH
