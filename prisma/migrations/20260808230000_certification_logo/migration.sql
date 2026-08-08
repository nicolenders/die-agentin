BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Certification] ADD [logoAssetId] NVARCHAR(1000);

-- AddForeignKey
ALTER TABLE [dbo].[Certification] ADD CONSTRAINT [Certification_logoAssetId_fkey] FOREIGN KEY ([logoAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
