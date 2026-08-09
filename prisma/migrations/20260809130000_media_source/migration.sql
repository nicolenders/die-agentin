BEGIN TRY

BEGIN TRAN;

-- AddColumn: Herkunft eines Bildes (MINE | OTHER | AI). Bestehende Bilder gelten
-- als eigene Aufnahmen (MINE), bis in der Bibliothek anders gesetzt.
ALTER TABLE [dbo].[MediaAsset] ADD [source] NVARCHAR(1000) NOT NULL CONSTRAINT [MediaAsset_source_df] DEFAULT 'MINE';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
