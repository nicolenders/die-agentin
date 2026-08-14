BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[PublicationSales] (
    [id] NVARCHAR(1000) NOT NULL,
    [publicationId] NVARCHAR(1000) NOT NULL,
    [period] NVARCHAR(1000) NOT NULL,
    [printedCount] INT NOT NULL CONSTRAINT [PublicationSales_printedCount_df] DEFAULT 0,
    [pdfCount] INT NOT NULL CONSTRAINT [PublicationSales_pdfCount_df] DEFAULT 0,
    [bundleCount] INT NOT NULL CONSTRAINT [PublicationSales_bundleCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PublicationSales_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PublicationSales_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PublicationSales_publicationId_period_key] UNIQUE NONCLUSTERED ([publicationId],[period])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityFocusTopics] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityFocusTopics_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityFocusTopics_B_index] ON [dbo].[_IdentityFocusTopics]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[PublicationSales] ADD CONSTRAINT [PublicationSales_publicationId_fkey] FOREIGN KEY ([publicationId]) REFERENCES [dbo].[Publication]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityFocusTopics] ADD CONSTRAINT [_IdentityFocusTopics_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[FocusTopic]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityFocusTopics] ADD CONSTRAINT [_IdentityFocusTopics_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

