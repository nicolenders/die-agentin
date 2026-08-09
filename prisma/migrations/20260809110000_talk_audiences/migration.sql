BEGIN TRY

BEGIN TRAN;

-- CreateTable: Mehrfach-Verknüpfung Briefing ↔ Zielgruppe (Taxonomy kind AUDIENCE)
CREATE TABLE [dbo].[_TalkAudiences] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_TalkAudiences_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_TalkAudiences_B_index] ON [dbo].[_TalkAudiences]([B]);

-- AddForeignKey
-- Briefing-Seite kaskadiert; Zielgruppen-Seite NO ACTION (mehrere Kaskadenpfade
-- sind in SQL Server unzulässig; Zielgruppen werden nur ohne Zuordnung gelöscht).
ALTER TABLE [dbo].[_TalkAudiences] ADD CONSTRAINT [_TalkAudiences_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_TalkAudiences] ADD CONSTRAINT [_TalkAudiences_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
