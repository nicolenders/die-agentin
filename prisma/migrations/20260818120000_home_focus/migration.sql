BEGIN TRY

BEGIN TRAN;

-- Startseite: „Woran ich gerade arbeite". Werkzeuge und Themen mit kleinem Logo
-- und einem Satz. Rein additiv, keine bestehende Tabelle wird angefasst.
--
-- Wiederholbar geschrieben (`IF OBJECT_ID … IS NULL`), damit dieselbe Datei von
-- Hand ausgeführt werden kann und ein späteres `prisma migrate deploy` trotzdem
-- durchläuft, statt an einer bereits vorhandenen Tabelle zu scheitern.
--
-- Die Anweisungen stehen in `EXEC(N'…')`: SQL Server kompiliert einen Batch als
-- Ganzes, und ein `ALTER TABLE` auf eine im selben Batch erst angelegte Tabelle
-- scheitert sonst mit „Invalid object name" (Fehler 207).
IF OBJECT_ID(N'[dbo].[HomeFocus]', N'U') IS NULL
BEGIN
    EXEC(N'
        CREATE TABLE [dbo].[HomeFocus] (
            [id] NVARCHAR(1000) NOT NULL,
            [titleDe] NVARCHAR(1000) NOT NULL,
            [titleEn] NVARCHAR(1000),
            [textDe] NVARCHAR(Max) NOT NULL,
            [textEn] NVARCHAR(Max),
            [iconAssetId] NVARCHAR(1000),
            [active] BIT NOT NULL CONSTRAINT [HomeFocus_active_df] DEFAULT 1,
            [sortOrder] INT NOT NULL CONSTRAINT [HomeFocus_sortOrder_df] DEFAULT 0,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [HomeFocus_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL,
            CONSTRAINT [HomeFocus_pkey] PRIMARY KEY CLUSTERED ([id])
        );
    ');

    EXEC(N'
        CREATE NONCLUSTERED INDEX [HomeFocus_active_sortOrder_idx]
            ON [dbo].[HomeFocus]([active], [sortOrder]);
    ');

    EXEC(N'
        ALTER TABLE [dbo].[HomeFocus]
            ADD CONSTRAINT [HomeFocus_iconAssetId_fkey]
            FOREIGN KEY ([iconAssetId]) REFERENCES [dbo].[MediaAsset]([id])
            ON DELETE NO ACTION ON UPDATE NO ACTION;
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
