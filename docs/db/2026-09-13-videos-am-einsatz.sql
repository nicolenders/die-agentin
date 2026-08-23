-- ===========================================================================
-- Videos an einem Einsatz (13.09.2026)
--
-- Publication bekommt einen optionalen Einsatzbezug. Rein additiv: eine
-- Spalte, ein Index, ein Fremdschluessel. Bestehende Zeilen bekommen NULL und
-- verhalten sich unveraendert.
--
-- Normalerweise braucht es dieses Skript NICHT -- die Anwendung wendet die
-- Migration beim Serverstart selbst an. Es ist fuer den Fall gedacht, dass das
-- von Hand geschehen soll. Dann traegt es sich auch gleich selbst in
-- [_prisma_migrations] ein: Ohne diesen Eintrag versucht Prisma die Migration
-- beim naechsten Start erneut, scheitert an der schon vorhandenen Spalte und
-- laesst ALLES Nachfolgende liegen (genau das ist im September passiert).
--
-- Mehrfach ausfuehrbar. Loescht nichts, aendert keine Daten.
-- ===========================================================================

SET NOCOUNT ON;

BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('dbo.Publication', 'missionId') IS NULL
BEGIN
    ALTER TABLE [dbo].[Publication] ADD [missionId] NVARCHAR(1000);
    PRINT 'Spalte Publication.missionId angelegt.';
END
ELSE
    PRINT 'Spalte Publication.missionId war schon da.';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH;

-- Index und Fremdschluessel in eigenen Anweisungen: Sie setzen die Spalte
-- voraus, und in SQL Server ist eine gerade angelegte Spalte im selben Stapel
-- noch nicht fuer jede Anweisung sichtbar.

IF COL_LENGTH('dbo.Publication', 'missionId') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.indexes
       WHERE [name] = 'Publication_missionId_idx' AND object_id = OBJECT_ID('dbo.Publication')
   )
BEGIN
    CREATE NONCLUSTERED INDEX [Publication_missionId_idx] ON [dbo].[Publication] ([missionId]);
    PRINT 'Index angelegt.';
END;

IF COL_LENGTH('dbo.Publication', 'missionId') IS NOT NULL
   AND OBJECT_ID('dbo.Publication_missionId_fkey', 'F') IS NULL
BEGIN
    -- ON DELETE SET NULL: Wird ein Einsatz geloescht, verschwindet deshalb kein
    -- Video. Es verliert nur seine Zuordnung -- die Aufzeichnung existiert ja
    -- weiter.
    ALTER TABLE [dbo].[Publication]
        ADD CONSTRAINT [Publication_missionId_fkey] FOREIGN KEY ([missionId])
        REFERENCES [dbo].[Mission] ([id]) ON DELETE SET NULL ON UPDATE NO ACTION;
    PRINT 'Fremdschluessel angelegt.';
END;

-- ---------------------------------------------------------------------------
-- Buchfuehrung: Nur wenn die Spalte wirklich steht.
-- ---------------------------------------------------------------------------

IF COL_LENGTH('dbo.Publication', 'missionId') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260913120000_publication_mission')
BEGIN
    INSERT INTO [dbo].[_prisma_migrations]
        ([id], [checksum], [finished_at], [migration_name], [logs], [rolled_back_at], [started_at], [applied_steps_count])
    VALUES
        (CONVERT(NVARCHAR(36), NEWID()), N'a827d871e15fbf1da6bff386ed6676b3a317a9ad83a4ac2978ffcf4e351d2281', SYSUTCDATETIME(),
         N'20260913120000_publication_mission', N'Von Hand ausgefuehrt, per Skript nachgetragen.', NULL, SYSUTCDATETIME(), 1);
    PRINT 'Nachgetragen: 20260913120000_publication_mission';
END
ELSE
    PRINT 'Uebersprungen (schon eingetragen oder Spalte fehlt): 20260913120000_publication_mission';

SELECT [migration_name], [finished_at] FROM [dbo].[_prisma_migrations] ORDER BY [migration_name];
