BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[LegendContent] (
    [locale] NVARCHAR(1000) NOT NULL,
    [eyebrow] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [lead] NVARCHAR(max) NOT NULL,
    [missionEyebrow] NVARCHAR(1000) NOT NULL,
    [missionText] NVARCHAR(max) NOT NULL,
    [pillarsJson] NVARCHAR(max) NOT NULL,
    [toolsJson] NVARCHAR(max) NOT NULL,
    [contactEyebrow] NVARCHAR(1000) NOT NULL,
    [contactHeading] NVARCHAR(1000) NOT NULL,
    [contactText] NVARCHAR(max) NOT NULL,
    [contactButton] NVARCHAR(1000) NOT NULL,
    [contactUrl] NVARCHAR(2048) NOT NULL,
    [portraitAssetId] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LegendContent_pkey] PRIMARY KEY CLUSTERED ([locale])
);

-- AddForeignKey
ALTER TABLE [dbo].[LegendContent] ADD CONSTRAINT [LegendContent_portraitAssetId_fkey] FOREIGN KEY ([portraitAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

