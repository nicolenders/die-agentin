BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Material am Briefing: Anleitungen, Notizen, Demo-Dateien, Videos.
-- Rein additiv — nichts Bestehendes wird verändert oder gelöscht.
-- ===========================================================================

CREATE TABLE [dbo].[TalkAttachment] (
    [id] NVARCHAR(1000) NOT NULL,
    [talkId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [TalkAttachment_kind_df] DEFAULT 'OTHER',
    [title] NVARCHAR(1000) NOT NULL,
    [note] NVARCHAR(max),
    [blobPath] NVARCHAR(2048) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [mime] NVARCHAR(1000) NOT NULL,
    [bytes] INT NOT NULL CONSTRAINT [TalkAttachment_bytes_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [TalkAttachment_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TalkAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TalkAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [TalkAttachment_talkId_sortOrder_idx] ON [dbo].[TalkAttachment]([talkId], [sortOrder]);

ALTER TABLE [dbo].[TalkAttachment] ADD CONSTRAINT [TalkAttachment_talkId_fkey] FOREIGN KEY ([talkId]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
