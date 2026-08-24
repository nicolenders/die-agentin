BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Eigenes Bewerbungsfoto für den Lebenslauf. Rein additiv — eine Spalte und
-- ein Fremdschlüssel. Bestehende Zeilen bekommen NULL; der Lebenslauf zeigt
-- dann weiterhin das Porträt der Legende.
--
-- ON DELETE SET NULL: Wird das Bild aus der Mediathek entfernt, verliert der
-- Lebenslauf nur sein Foto und fällt auf das Porträt der Legende zurück.
-- ===========================================================================

ALTER TABLE [dbo].[ResumeProfile] ADD [portraitAssetId] NVARCHAR(1000);

ALTER TABLE [dbo].[ResumeProfile] ADD CONSTRAINT [ResumeProfile_portraitAssetId_fkey] FOREIGN KEY ([portraitAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
