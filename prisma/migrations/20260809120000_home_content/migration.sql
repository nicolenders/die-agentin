BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[HomeContent] (
    [locale] NVARCHAR(1000) NOT NULL,
    [eyebrow] NVARCHAR(1000),
    [headline] NVARCHAR(max),
    [lead] NVARCHAR(max),
    [roles] NVARCHAR(max),
    [heroAssetId] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [HomeContent_pkey] PRIMARY KEY CLUSTERED ([locale])
);

-- AddForeignKey
ALTER TABLE [dbo].[HomeContent] ADD CONSTRAINT [HomeContent_heroAssetId_fkey] FOREIGN KEY ([heroAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
