BEGIN TRY

BEGIN TRAN;

-- CreateTable: Foliensatz je Briefing und Sprache. Additiv — bestehende
-- Briefings und Einsätze bleiben unverändert, die Vorlagen in den
-- Einstellungen ebenfalls.
CREATE TABLE [dbo].[TalkSlideDeck] (
    [id] NVARCHAR(1000) NOT NULL,
    [talkId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [blobPath] NVARCHAR(2048) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [bytes] INT NOT NULL CONSTRAINT [TalkSlideDeck_bytes_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TalkSlideDeck_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TalkSlideDeck_talkId_locale_key] UNIQUE NONCLUSTERED ([talkId],[locale])
);

-- AddForeignKey
ALTER TABLE [dbo].[TalkSlideDeck] ADD CONSTRAINT [TalkSlideDeck_talkId_fkey] FOREIGN KEY ([talkId]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

