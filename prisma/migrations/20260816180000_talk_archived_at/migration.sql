BEGIN TRY

BEGIN TRAN;

-- AlterTable: Archivierungsdatum eines Briefings. NULL = nicht archiviert.
ALTER TABLE [dbo].[Talk] ADD [archivedAt] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
