BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[_DossierCategories] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_DossierCategories_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_TalkCategories] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_TalkCategories_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_CertificationCategories] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_CertificationCategories_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_DossierCategories_B_index] ON [dbo].[_DossierCategories]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_TalkCategories_B_index] ON [dbo].[_TalkCategories]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_CertificationCategories_B_index] ON [dbo].[_CertificationCategories]([B]);

-- AddForeignKey
-- Entitäts-Seite kaskadiert (Eintrag löschen -> Verknüpfungen weg).
-- Kategorie-Seite NO ACTION: SQL Server verbietet mehrere Kaskadenpfade, und
-- Kategorien werden ohnehin nur gelöscht, wenn sie nirgends zugeordnet sind.
ALTER TABLE [dbo].[_DossierCategories] ADD CONSTRAINT [_DossierCategories_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Dossier]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_DossierCategories] ADD CONSTRAINT [_DossierCategories_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_TalkCategories] ADD CONSTRAINT [_TalkCategories_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_TalkCategories] ADD CONSTRAINT [_TalkCategories_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_CertificationCategories] ADD CONSTRAINT [_CertificationCategories_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Certification]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_CertificationCategories] ADD CONSTRAINT [_CertificationCategories_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Backfill: bestehende Einzel-Kategorie (categoryId) in die Mehrfach-Verknüpfung übernehmen.
INSERT INTO [dbo].[_DossierCategories] ([A],[B])
    SELECT [id],[categoryId] FROM [dbo].[Dossier] WHERE [categoryId] IS NOT NULL;

INSERT INTO [dbo].[_TalkCategories] ([A],[B])
    SELECT [id],[categoryId] FROM [dbo].[Talk] WHERE [categoryId] IS NOT NULL;

INSERT INTO [dbo].[_CertificationCategories] ([A],[B])
    SELECT [id],[categoryId] FROM [dbo].[Certification] WHERE [categoryId] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
