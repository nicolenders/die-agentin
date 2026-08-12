BEGIN TRY

BEGIN TRAN;

-- AddColumn: Art einer Zertifizierung/Auszeichnung (CERTIFICATION | MVP | TRAINING | AWARD)
ALTER TABLE [dbo].[Certification] ADD [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [Certification_kind_df] DEFAULT 'CERTIFICATION';

-- Bestehende „MVP"-Reihen als MVP-Einträge markieren (Backfill).
-- Als dynamisches SQL (EXEC), damit die Anweisung erst zur Laufzeit kompiliert
-- wird — die Spalte [kind] wird im selben Batch oben erst hinzugefügt und wäre
-- bei statischer Kompilierung „Invalid column name" (SQL Server, Fehler 207).
EXEC(N'UPDATE [dbo].[Certification] SET [kind] = ''MVP'' WHERE [series] IS NOT NULL AND [series] LIKE ''%MVP%''');

-- CreateTable: aktuelle Lernthemen
CREATE TABLE [dbo].[FocusTopic] (
    [id] NVARCHAR(1000) NOT NULL,
    [titleDe] NVARCHAR(1000) NOT NULL,
    [titleEn] NVARCHAR(1000),
    [note] NVARCHAR(max),
    [active] BIT NOT NULL CONSTRAINT [FocusTopic_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [FocusTopic_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FocusTopic_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FocusTopic_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FocusTopic_active_sortOrder_idx] ON [dbo].[FocusTopic]([active], [sortOrder]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
