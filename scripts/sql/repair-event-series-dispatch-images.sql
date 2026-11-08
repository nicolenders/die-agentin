-- ===========================================================================
-- Reparatur: Migrationen 20260914120000_event_series und
-- 20261006120000_dispatch_images von Hand herstellen (ADR 0035).
--
-- Was das Skript tut
--   1. Prüft, dass alle früheren Migrationen angewandt sind. Sonst Abbruch,
--      ohne etwas zu ändern.
--   2. Legt die Tabellen, Spalten, Indizes und Fremdschlüssel beider
--      Migrationen an — jedes Objekt einzeln und nur, wenn es fehlt.
--   3. Bringt die Buchführung von Prisma (_prisma_migrations) in Ordnung:
--      ein fehlgeschlagener Eintrag wird als zurückgerollt markiert, ein
--      erfolgreicher Eintrag mit der Prüfsumme der Migrationsdatei angelegt.
--      Danach meldet `prisma migrate deploy` nichts mehr offen.
--   4. Zeigt am Ende den Stand.
--
-- Idempotent: mehrfach ausführbar. Ist alles vorhanden, ändert es nichts.
-- Alles in einer Transaktion: Scheitert ein Schritt, bleibt die DB, wie sie war.
-- Ein Batch ohne GO — läuft im Abfrage-Editor des Azure-Portals, in SSMS,
-- Azure Data Studio und sqlcmd. Anweisungen auf neue Spalten laufen über
-- EXEC, damit sie erst zur Laufzeit kompiliert werden (SQL-Fehler 207).
--
-- Erwartete Warnungen: „Warning! The maximum key length ... 1700 bytes" für
-- die eindeutigen Schlüssel auf NVARCHAR(1000). Die erzeugt die originale
-- Prisma-Migration genauso; sie sind harmlos.
--
-- Vorher: Backup bzw. Point-in-Time-Restore-Zeitpunkt notieren.
-- Danach: optional `npm run db:backfill-events` (ordnet Bestandseinsätze
-- Veranstaltungen zu) und eine Änderung an einem Einsatz speichern, damit der
-- Cache der öffentlichen Liste neu gefüllt wird.
-- ===========================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- --- 0. Stand vorher -------------------------------------------------------
SELECT N'vorher' AS [phase], [migration_name], [started_at], [finished_at], [rolled_back_at],
       LEFT([logs], 400) AS [logs]
  FROM [dbo].[_prisma_migrations]
 WHERE [migration_name] IN (N'20260914120000_event_series', N'20261006120000_dispatch_images')
    OR ([finished_at] IS NULL AND [rolled_back_at] IS NULL)
 ORDER BY [migration_name], [started_at];

BEGIN TRY
BEGIN TRAN;

-- --- 1. Vorbedingungen -----------------------------------------------------
DECLARE @expected TABLE ([name] NVARCHAR(250) NOT NULL PRIMARY KEY);
INSERT INTO @expected ([name]) VALUES
    (N'20260801120000_init'),
    (N'20260801130000_legal_docs'),
    (N'20260808210000_multi_categories'),
    (N'20260808220000_legend_content'),
    (N'20260808230000_certification_logo'),
    (N'20260809000000_mission_banner'),
    (N'20260809100000_site_settings'),
    (N'20260809110000_talk_audiences'),
    (N'20260809120000_home_content'),
    (N'20260809130000_media_source'),
    (N'20260809140000_records_kind_focus'),
    (N'20260809150000_cert_family'),
    (N'20260811120000_identities'),
    (N'20260811130000_dispatches'),
    (N'20260811140000_cert_status'),
    (N'20260811150000_publication_repository'),
    (N'20260811160000_mission_material'),
    (N'20260814120000_mission_slides_file'),
    (N'20260814130000_talk_sort_order'),
    (N'20260814140000_reach_and_mission_online'),
    (N'20260815120000_identity_focus_and_book_sales'),
    (N'20260815160000_tools_employer_resume'),
    (N'20260816120000_case_file_media_docs_radar'),
    (N'20260816180000_talk_archived_at'),
    (N'20260816200000_mission_duration'),
    (N'20260817200000_talk_slide_decks'),
    (N'20260818120000_home_focus'),
    (N'20260818130000_speaker_formats'),
    (N'20260818160000_speaker_format_duration_unit'),
    (N'20260821120000_prompt_workbench'),
    (N'20260822120000_admin_umbau'),
    (N'20260824120000_resume_portrait'),
    (N'20260905120000_mission_report_reminders'),
    (N'20260912120000_talk_attachments'),
    (N'20260913120000_publication_mission');

DECLARE @msg NVARCHAR(2048);

SELECT @msg = STRING_AGG(CAST(e.[name] AS NVARCHAR(MAX)), N', ')
  FROM @expected AS e
 WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[_prisma_migrations] AS m
         WHERE m.[migration_name] = e.[name]
           AND m.[finished_at] IS NOT NULL
           AND m.[rolled_back_at] IS NULL);
IF @msg IS NOT NULL
BEGIN
    SET @msg = LEFT(N'Abbruch, nichts geändert: Frühere Migrationen sind nicht angewandt: ' + @msg, 2048);
    THROW 50001, @msg, 1;
END;

SELECT @msg = STRING_AGG(CAST([migration_name] AS NVARCHAR(MAX)), N', ')
  FROM [dbo].[_prisma_migrations]
 WHERE [finished_at] IS NULL AND [rolled_back_at] IS NULL
   AND [migration_name] NOT IN (N'20260914120000_event_series', N'20261006120000_dispatch_images');
IF @msg IS NOT NULL
BEGIN
    SET @msg = LEFT(N'Abbruch, nichts geändert: Weitere fehlgeschlagene Migrationen in _prisma_migrations: ' + @msg, 2048);
    THROW 50002, @msg, 1;
END;

-- --- 2. Migration 20260914120000_event_series ------------------------------
IF OBJECT_ID(N'[dbo].[EventSeries]', N'U') IS NULL
    EXEC(N'CREATE TABLE [dbo].[EventSeries] (
        [id] NVARCHAR(1000) NOT NULL,
        [name] NVARCHAR(1000) NOT NULL,
        [matchKey] NVARCHAR(1000) NOT NULL,
        [slug] NVARCHAR(1000) NOT NULL,
        [organizer] NVARCHAR(1000),
        [websiteUrl] NVARCHAR(2048),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [EventSeries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [EventSeries_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [EventSeries_matchKey_key] UNIQUE NONCLUSTERED ([matchKey]),
        CONSTRAINT [EventSeries_slug_key] UNIQUE NONCLUSTERED ([slug])
    )');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[EventSeries]') AND [name] = N'EventSeries_matchKey_key')
    EXEC(N'ALTER TABLE [dbo].[EventSeries] ADD CONSTRAINT [EventSeries_matchKey_key] UNIQUE NONCLUSTERED ([matchKey])');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[EventSeries]') AND [name] = N'EventSeries_slug_key')
    EXEC(N'ALTER TABLE [dbo].[EventSeries] ADD CONSTRAINT [EventSeries_slug_key] UNIQUE NONCLUSTERED ([slug])');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[EventSeries]') AND [name] = N'EventSeries_name_idx')
    EXEC(N'CREATE NONCLUSTERED INDEX [EventSeries_name_idx] ON [dbo].[EventSeries]([name])');

IF OBJECT_ID(N'[dbo].[EventEdition]', N'U') IS NULL
    EXEC(N'CREATE TABLE [dbo].[EventEdition] (
        [id] NVARCHAR(1000) NOT NULL,
        [seriesId] NVARCHAR(1000) NOT NULL,
        [label] NVARCHAR(1000) NOT NULL,
        [startDate] DATETIME2,
        [endDate] DATETIME2,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [EventEdition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [EventEdition_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [EventEdition_seriesId_label_key] UNIQUE NONCLUSTERED ([seriesId],[label])
    )');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[EventEdition]') AND [name] = N'EventEdition_seriesId_label_key')
    EXEC(N'ALTER TABLE [dbo].[EventEdition] ADD CONSTRAINT [EventEdition_seriesId_label_key] UNIQUE NONCLUSTERED ([seriesId],[label])');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[EventEdition]') AND [name] = N'EventEdition_seriesId_startDate_idx')
    EXEC(N'CREATE NONCLUSTERED INDEX [EventEdition_seriesId_startDate_idx] ON [dbo].[EventEdition]([seriesId],[startDate])');

IF OBJECT_ID(N'[dbo].[EventEdition_seriesId_fkey]', N'F') IS NULL
    EXEC(N'ALTER TABLE [dbo].[EventEdition] ADD CONSTRAINT [EventEdition_seriesId_fkey] FOREIGN KEY ([seriesId]) REFERENCES [dbo].[EventSeries]([id]) ON DELETE CASCADE ON UPDATE CASCADE');

IF COL_LENGTH(N'dbo.Mission', N'eventSeriesId') IS NULL
    EXEC(N'ALTER TABLE [dbo].[Mission] ADD [eventSeriesId] NVARCHAR(1000)');

IF COL_LENGTH(N'dbo.Mission', N'eventEditionId') IS NULL
    EXEC(N'ALTER TABLE [dbo].[Mission] ADD [eventEditionId] NVARCHAR(1000)');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[Mission]') AND [name] = N'Mission_eventSeriesId_idx')
    EXEC(N'CREATE NONCLUSTERED INDEX [Mission_eventSeriesId_idx] ON [dbo].[Mission]([eventSeriesId])');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[Mission]') AND [name] = N'Mission_eventEditionId_idx')
    EXEC(N'CREATE NONCLUSTERED INDEX [Mission_eventEditionId_idx] ON [dbo].[Mission]([eventEditionId])');

IF OBJECT_ID(N'[dbo].[Mission_eventSeriesId_fkey]', N'F') IS NULL
    EXEC(N'ALTER TABLE [dbo].[Mission] ADD CONSTRAINT [Mission_eventSeriesId_fkey] FOREIGN KEY ([eventSeriesId]) REFERENCES [dbo].[EventSeries]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION');

IF OBJECT_ID(N'[dbo].[Mission_eventEditionId_fkey]', N'F') IS NULL
    EXEC(N'ALTER TABLE [dbo].[Mission] ADD CONSTRAINT [Mission_eventEditionId_fkey] FOREIGN KEY ([eventEditionId]) REFERENCES [dbo].[EventEdition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION');

-- --- 3. Migration 20261006120000_dispatch_images ---------------------------
IF OBJECT_ID(N'[dbo].[DispatchImage]', N'U') IS NULL
    EXEC(N'CREATE TABLE [dbo].[DispatchImage] (
        [id] NVARCHAR(1000) NOT NULL,
        [dispatchId] NVARCHAR(1000) NOT NULL,
        [assetId] NVARCHAR(1000) NOT NULL,
        [sortOrder] INT NOT NULL CONSTRAINT [DispatchImage_sortOrder_df] DEFAULT 0,
        CONSTRAINT [DispatchImage_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [DispatchImage_dispatchId_assetId_key] UNIQUE NONCLUSTERED ([dispatchId], [assetId])
    )');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[DispatchImage]') AND [name] = N'DispatchImage_dispatchId_assetId_key')
    EXEC(N'ALTER TABLE [dbo].[DispatchImage] ADD CONSTRAINT [DispatchImage_dispatchId_assetId_key] UNIQUE NONCLUSTERED ([dispatchId], [assetId])');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'[dbo].[DispatchImage]') AND [name] = N'DispatchImage_dispatchId_sortOrder_idx')
    EXEC(N'CREATE NONCLUSTERED INDEX [DispatchImage_dispatchId_sortOrder_idx] ON [dbo].[DispatchImage]([dispatchId], [sortOrder])');

IF OBJECT_ID(N'[dbo].[DispatchImage_dispatchId_fkey]', N'F') IS NULL
    EXEC(N'ALTER TABLE [dbo].[DispatchImage] ADD CONSTRAINT [DispatchImage_dispatchId_fkey] FOREIGN KEY ([dispatchId]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE');

IF OBJECT_ID(N'[dbo].[DispatchImage_assetId_fkey]', N'F') IS NULL
    EXEC(N'ALTER TABLE [dbo].[DispatchImage] ADD CONSTRAINT [DispatchImage_assetId_fkey] FOREIGN KEY ([assetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION');

-- --- 4. Buchführung von Prisma ---------------------------------------------
-- Prüfsumme = SHA-256 der jeweiligen migration.sql, so wie Prisma sie
-- berechnet. Stimmt sie nicht, warnt Prisma später über eine geänderte
-- Migration.
DECLARE @done TABLE ([name] NVARCHAR(250) NOT NULL, [checksum] VARCHAR(64) NOT NULL);
INSERT INTO @done ([name], [checksum]) VALUES
    (N'20260914120000_event_series',    'aa851852aae1348afd7ba1dbe6b87da6305e803ad9634a3b8271ad9ea5df975e'),
    (N'20261006120000_dispatch_images', '839886dfa45d3093a1a4bec39e7a1017b2409ffcc53934b66c3a85873f73010a');

-- Fehlgeschlagene Läufe als zurückgerollt markieren (wie
-- `prisma migrate resolve --rolled-back`). Sonst verweigert Prisma jeden
-- weiteren Deploy (P3009).
UPDATE m
   SET m.[rolled_back_at] = SYSDATETIMEOFFSET()
  FROM [dbo].[_prisma_migrations] AS m
  JOIN @done AS d ON d.[name] = m.[migration_name]
 WHERE m.[finished_at] IS NULL AND m.[rolled_back_at] IS NULL;

-- Erfolgreichen Lauf eintragen (wie `prisma migrate resolve --applied`).
INSERT INTO [dbo].[_prisma_migrations]
       ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), d.[checksum], SYSDATETIMEOFFSET(), d.[name],
       NULL, NULL, SYSDATETIMEOFFSET(), 1
  FROM @done AS d
 WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[_prisma_migrations] AS m
         WHERE m.[migration_name] = d.[name]
           AND m.[finished_at] IS NOT NULL
           AND m.[rolled_back_at] IS NULL);

COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;

-- --- 5. Stand nachher ------------------------------------------------------
SELECT N'nachher' AS [phase], [migration_name], [started_at], [finished_at], [rolled_back_at]
  FROM [dbo].[_prisma_migrations]
 WHERE [migration_name] IN (N'20260914120000_event_series', N'20261006120000_dispatch_images')
 ORDER BY [migration_name], [started_at];

SELECT N'objekte' AS [phase], o.[name], o.[type_desc]
  FROM sys.objects AS o
 WHERE o.[name] IN (N'EventSeries', N'EventEdition', N'DispatchImage',
                    N'EventEdition_seriesId_fkey', N'Mission_eventSeriesId_fkey', N'Mission_eventEditionId_fkey',
                    N'DispatchImage_dispatchId_fkey', N'DispatchImage_assetId_fkey')
UNION ALL
SELECT N'objekte', N'Mission.' + c.[name], N'COLUMN'
  FROM sys.columns AS c
 WHERE c.[object_id] = OBJECT_ID(N'[dbo].[Mission]') AND c.[name] IN (N'eventSeriesId', N'eventEditionId')
ORDER BY 2;
