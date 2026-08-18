BEGIN TRY

BEGIN TRAN;

-- Vortragsformate der Akte (Speaker-Kit), im Adminbereich pflegbar. Rein
-- additiv: solange die Tabelle leer ist, leitet die Akte die Formate weiterhin
-- aus den Dauern der gepflegten Briefings ab.
--
-- Wiederholbar geschrieben (`IF OBJECT_ID … IS NULL`), damit dieselbe Datei von
-- Hand ausgeführt werden kann und ein späteres `prisma migrate deploy` trotzdem
-- durchläuft, statt an einer bereits vorhandenen Tabelle zu scheitern.
IF OBJECT_ID(N'[dbo].[SpeakerFormat]', N'U') IS NULL
BEGIN
    EXEC(N'
        CREATE TABLE [dbo].[SpeakerFormat] (
            [id] NVARCHAR(1000) NOT NULL,
            [titleDe] NVARCHAR(1000) NOT NULL,
            [titleEn] NVARCHAR(1000),
            [noteDe] NVARCHAR(Max),
            [noteEn] NVARCHAR(Max),
            [minutesMin] INT,
            [minutesMax] INT,
            [languages] NVARCHAR(1000) NOT NULL CONSTRAINT [SpeakerFormat_languages_df] DEFAULT ''de,en'',
            [active] BIT NOT NULL CONSTRAINT [SpeakerFormat_active_df] DEFAULT 1,
            [sortOrder] INT NOT NULL CONSTRAINT [SpeakerFormat_sortOrder_df] DEFAULT 0,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [SpeakerFormat_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL,
            CONSTRAINT [SpeakerFormat_pkey] PRIMARY KEY CLUSTERED ([id])
        );
    ');

    EXEC(N'
        CREATE NONCLUSTERED INDEX [SpeakerFormat_active_sortOrder_idx]
            ON [dbo].[SpeakerFormat]([active], [sortOrder]);
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
