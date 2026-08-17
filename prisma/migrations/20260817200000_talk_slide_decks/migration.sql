BEGIN TRY

BEGIN TRAN;

-- Foliensatz je Briefing und Sprache. Additiv — bestehende Briefings, Einsätze
-- und die Vorlagen in den Einstellungen bleiben unverändert.
--
-- Wiederholbar geschrieben (`IF OBJECT_ID … IS NULL`), damit dieselbe Datei von
-- Hand ausgeführt werden kann und ein späteres `prisma migrate deploy` trotzdem
-- durchläuft, statt an einer bereits vorhandenen Tabelle zu scheitern.
--
-- Die beiden Anweisungen stehen in `EXEC(N'…')`: SQL Server kompiliert einen
-- Batch als Ganzes, und ein `ALTER TABLE` auf eine im selben Batch erst
-- angelegte Tabelle scheitert sonst mit „Invalid object name" (Fehler 207 —
-- derselbe Stolperstein wie in Migration 20260809140000).
IF OBJECT_ID(N'[dbo].[TalkSlideDeck]', N'U') IS NULL
BEGIN
    EXEC(N'
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
    ');

    EXEC(N'
        ALTER TABLE [dbo].[TalkSlideDeck]
            ADD CONSTRAINT [TalkSlideDeck_talkId_fkey]
            FOREIGN KEY ([talkId]) REFERENCES [dbo].[Talk]([id])
            ON DELETE CASCADE ON UPDATE CASCADE;
    ');
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
