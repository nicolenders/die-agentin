BEGIN TRY

BEGIN TRAN;

-- AlterTable: Freigabe der öffentlichen Einsatzakte (Default: nicht verlinkt).
ALTER TABLE [dbo].[Mission] ADD [caseFilePublic] BIT NOT NULL CONSTRAINT [Mission_caseFilePublic_df] DEFAULT 0;

-- CreateTable: PDF-Dokumente (Vortragsfolien) in der Medienverwaltung.
CREATE TABLE [dbo].[MediaDocument] (
    [id] NVARCHAR(1000) NOT NULL,
    [blobPath] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000),
    [mime] NVARCHAR(1000) NOT NULL CONSTRAINT [MediaDocument_mime_df] DEFAULT 'application/pdf',
    [bytes] INT NOT NULL CONSTRAINT [MediaDocument_bytes_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MediaDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MediaDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MediaDocument_createdAt_idx] ON [dbo].[MediaDocument]([createdAt]);

-- CreateTable: Zuordnung Depesche ↔ Radar-Thema (Aufklärung).
CREATE TABLE [dbo].[_DispatchFocusTopics] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_DispatchFocusTopics_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_DispatchFocusTopics_B_index] ON [dbo].[_DispatchFocusTopics]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchFocusTopics] ADD CONSTRAINT [_DispatchFocusTopics_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchFocusTopics] ADD CONSTRAINT [_DispatchFocusTopics_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[FocusTopic]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestandsdaten: Bereits hochgeladene Foliendateien in die Dokumentenliste
-- übernehmen, damit die Medienverwaltung sie ab sofort anzeigt.
INSERT INTO [dbo].[MediaDocument] ([id], [blobPath], [fileName], [title], [mime], [bytes])
SELECT
    LOWER(CONVERT(NVARCHAR(36), NEWID())),
    m.[slidesFilePath],
    MIN(COALESCE(m.[slidesFileName], N'folien.pdf')),
    MIN(m.[eventName]),
    N'application/pdf',
    0
FROM [dbo].[Mission] AS m
WHERE m.[slidesFilePath] IS NOT NULL
GROUP BY m.[slidesFilePath];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
