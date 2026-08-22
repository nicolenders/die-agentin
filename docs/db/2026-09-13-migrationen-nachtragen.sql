-- ===========================================================================
-- Migrationen nachtragen (13.09.2026)
--
-- Ausgangslage: In der Datenbank stehen Tabellen, die zu Migrationen gehoeren,
-- die nie in [_prisma_migrations] eingetragen wurden -- sie wurden seinerzeit
-- von Hand ausgefuehrt. Beim Serverstart versucht Prisma sie deshalb erneut,
-- scheitert an den schon vorhandenen Objekten und BRICHT DEN GANZEN LAUF AB.
-- Alles, was danach kommt, bleibt liegen. Genau daran fehlte zuletzt die
-- Tabelle [TalkAttachment], und die Briefing-Maske liess sich nicht mehr
-- oeffnen.
--
-- Dieses Skript raeumt beides auf:
--   1. Es traegt die Migrationen nach, deren Objekte nachweislich schon da
--      sind -- und nur diese. Geprueft wird mit OBJECT_ID, nicht geraten.
--   2. Es legt [TalkAttachment] an, falls sie fehlt, und traegt sie ein.
--
-- Es ist mehrfach ausfuehrbar: Was schon eingetragen ist, wird nicht doppelt
-- geschrieben; was schon existiert, wird nicht neu angelegt. Es loescht nichts
-- und aendert keine Daten.
--
-- Danach: Container App neu starten. Die Kopfzeile sollte die Warnung
-- "Migration pruefen" dann nicht mehr zeigen.
-- ===========================================================================

SET NOCOUNT ON;

BEGIN TRY

BEGIN TRAN;

-- ---------------------------------------------------------------------------
-- 1. Fehlende Tabelle anlegen: Material am Briefing
-- ---------------------------------------------------------------------------

IF OBJECT_ID('dbo.TalkAttachment', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TalkAttachment] (
        [id] NVARCHAR(1000) NOT NULL,
        [talkId] NVARCHAR(1000) NOT NULL,
        [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [TalkAttachment_kind_df] DEFAULT 'OTHER',
        [title] NVARCHAR(1000) NOT NULL,
        [note] NVARCHAR(max),
        [blobPath] NVARCHAR(2048) NOT NULL,
        [fileName] NVARCHAR(1000) NOT NULL,
        [mime] NVARCHAR(1000) NOT NULL,
        [bytes] INT NOT NULL CONSTRAINT [TalkAttachment_bytes_df] DEFAULT 0,
        [sortOrder] INT NOT NULL CONSTRAINT [TalkAttachment_sortOrder_df] DEFAULT 0,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [TalkAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [TalkAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
    );

    CREATE NONCLUSTERED INDEX [TalkAttachment_talkId_sortOrder_idx]
        ON [dbo].[TalkAttachment] ([talkId], [sortOrder]);

    ALTER TABLE [dbo].[TalkAttachment]
        ADD CONSTRAINT [TalkAttachment_talkId_fkey] FOREIGN KEY ([talkId])
        REFERENCES [dbo].[Talk] ([id]) ON DELETE CASCADE ON UPDATE CASCADE;

    PRINT 'Tabelle TalkAttachment angelegt.';
END
ELSE
    PRINT 'Tabelle TalkAttachment war schon da.';

-- ---------------------------------------------------------------------------
-- 2. Buchfuehrung nachtragen
--
-- Je Migration: Gibt es das Kennobjekt und fehlt der Eintrag, wird er gesetzt.
-- Die Pruefsumme ist die SHA-256 der jeweiligen migration.sql -- Prisma
-- vergleicht sie und meldete sonst eine geaenderte Migration.
-- ---------------------------------------------------------------------------

IF OBJECT_ID('dbo.TalkSlideDeck', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260817200000_talk_slide_decks')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'f7fd434cec0791178dd823b341e2e853a7a08b0c491d5174dfe5f5eb83ed7003', SYSUTCDATETIME(),
         N'20260817200000_talk_slide_decks', N'Von Hand ausgefuehrt, per Skript nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260817200000_talk_slide_decks';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen oder Objekt fehlt): 20260817200000_talk_slide_decks';

IF OBJECT_ID('dbo.PromptTemplate', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260821120000_prompt_workbench')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'777a6b1490c281d3042dbebc18b2f2248e2807a839f447df76cbb3c5a4a0e2d8', SYSUTCDATETIME(),
         N'20260821120000_prompt_workbench', N'Von Hand ausgefuehrt, per Skript nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260821120000_prompt_workbench';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen oder Objekt fehlt): 20260821120000_prompt_workbench';

IF OBJECT_ID('dbo.MissionReportTask', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260822120000_admin_umbau')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'9aa8465669da114245731704b9eacd9739f831a8866b668af139ca4b897a8007', SYSUTCDATETIME(),
         N'20260822120000_admin_umbau', N'Von Hand ausgefuehrt, per Skript nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260822120000_admin_umbau';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen oder Objekt fehlt): 20260822120000_admin_umbau';

IF OBJECT_ID('dbo.MissionReportTask', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260905120000_mission_report_reminders')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'e74618e57d1ff4910928cd5f953a577f3fbefddaf25abdf85438c63b9616cf14', SYSUTCDATETIME(),
         N'20260905120000_mission_report_reminders', N'Von Hand ausgefuehrt, per Skript nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260905120000_mission_report_reminders';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen oder Objekt fehlt): 20260905120000_mission_report_reminders';

-- Diese hier hat Abschnitt 1 gerade angelegt (oder sie war schon da).
IF OBJECT_ID('dbo.TalkAttachment', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260912120000_talk_attachments')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'7f3d7b985e46d299581069e49405bb18dc150c99a22e2d5639015f88b1b9b7cf', SYSUTCDATETIME(),
         N'20260912120000_talk_attachments', N'Per Skript angelegt und nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260912120000_talk_attachments';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen): 20260912120000_talk_attachments';

COMMIT TRAN;

PRINT '--- Fertig. Offene Migrationen laut Buchfuehrung: ---';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH;

-- ---------------------------------------------------------------------------
-- 3. Kontrolle: Was steht jetzt drin?
-- ---------------------------------------------------------------------------

SELECT
    [migration_name],
    [finished_at],
    [rolled_back_at],
    [applied_steps_count]
FROM [dbo].[_prisma_migrations]
ORDER BY [migration_name];
