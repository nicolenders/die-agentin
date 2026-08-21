BEGIN TRY

BEGIN TRAN;

-- Prompt-Werkstatt: Vorlagen für Bild- und Textprompts plus wiederverwendbare
-- Textbausteine. Rein additiv — kein Bestandsdatensatz wird angefasst, und
-- ohne Vorlagen zeigt der Adminbereich schlicht einen leeren Zustand mit dem
-- Angebot, den mitgelieferten Standardsatz einzuspielen.
--
-- Wiederholbar geschrieben (`IF OBJECT_ID … IS NULL`), damit dieselbe Datei von
-- Hand ausgeführt werden kann und ein späteres `prisma migrate deploy` trotzdem
-- durchläuft, statt an einer bereits vorhandenen Tabelle zu scheitern.
IF OBJECT_ID(N'[dbo].[PromptTemplate]', N'U') IS NULL
BEGIN
    EXEC(N'
        CREATE TABLE [dbo].[PromptTemplate] (
            [id] NVARCHAR(1000) NOT NULL,
            [key] NVARCHAR(1000) NOT NULL,
            [title] NVARCHAR(1000) NOT NULL,
            [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [PromptTemplate_kind_df] DEFAULT ''IMAGE'',
            [subject] NVARCHAR(1000) NOT NULL CONSTRAINT [PromptTemplate_subject_df] DEFAULT ''NONE'',
            [purpose] NVARCHAR(Max),
            [body] NVARCHAR(Max) NOT NULL,
            [withIdentities] BIT NOT NULL CONSTRAINT [PromptTemplate_withIdentities_df] DEFAULT 0,
            [aspect] NVARCHAR(1000),
            [inputLabel] NVARCHAR(1000),
            [active] BIT NOT NULL CONSTRAINT [PromptTemplate_active_df] DEFAULT 1,
            [sortOrder] INT NOT NULL CONSTRAINT [PromptTemplate_sortOrder_df] DEFAULT 0,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [PromptTemplate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL,
            CONSTRAINT [PromptTemplate_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [PromptTemplate_key_key] UNIQUE NONCLUSTERED ([key])
        );
    ');

    EXEC(N'
        CREATE NONCLUSTERED INDEX [PromptTemplate_active_sortOrder_idx]
            ON [dbo].[PromptTemplate]([active], [sortOrder]);
    ');
END;

IF OBJECT_ID(N'[dbo].[PromptSnippet]', N'U') IS NULL
BEGIN
    EXEC(N'
        CREATE TABLE [dbo].[PromptSnippet] (
            [id] NVARCHAR(1000) NOT NULL,
            [key] NVARCHAR(1000) NOT NULL,
            [title] NVARCHAR(1000) NOT NULL,
            [body] NVARCHAR(Max) NOT NULL,
            [note] NVARCHAR(Max),
            [sortOrder] INT NOT NULL CONSTRAINT [PromptSnippet_sortOrder_df] DEFAULT 0,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [PromptSnippet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL,
            CONSTRAINT [PromptSnippet_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [PromptSnippet_key_key] UNIQUE NONCLUSTERED ([key])
        );
    ');

    EXEC(N'
        CREATE NONCLUSTERED INDEX [PromptSnippet_sortOrder_idx]
            ON [dbo].[PromptSnippet]([sortOrder]);
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
