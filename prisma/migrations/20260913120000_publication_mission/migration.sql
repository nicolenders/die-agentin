BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Videos an einem Einsatz: Publication bekommt einen optionalen Einsatzbezug.
-- Rein additiv — eine Spalte, ein Index, ein Fremdschlüssel. Bestehende Zeilen
-- bekommen NULL und verhalten sich unverändert.
--
-- ON DELETE SET NULL statt CASCADE: Wird ein Einsatz gelöscht, verschwindet
-- deshalb kein Video. Es verliert nur seine Zuordnung und bleibt als
-- Publikation stehen — die Aufzeichnung existiert schließlich weiter.
-- ===========================================================================

ALTER TABLE [dbo].[Publication] ADD [missionId] NVARCHAR(1000);

CREATE NONCLUSTERED INDEX [Publication_missionId_idx] ON [dbo].[Publication]([missionId]);

ALTER TABLE [dbo].[Publication] ADD CONSTRAINT [Publication_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
