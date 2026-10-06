BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Bilder-Pool je Depesche (ADR 0033). Einmal gepflegt, in DE und EN
-- einfügbar. Rein additiv — nichts Bestehendes wird verändert oder gelöscht.
-- ===========================================================================

CREATE TABLE [dbo].[DispatchImage] (
    [id] NVARCHAR(1000) NOT NULL,
    [dispatchId] NVARCHAR(1000) NOT NULL,
    [assetId] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [DispatchImage_sortOrder_df] DEFAULT 0,
    CONSTRAINT [DispatchImage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DispatchImage_dispatchId_assetId_key] UNIQUE NONCLUSTERED ([dispatchId], [assetId])
);

CREATE NONCLUSTERED INDEX [DispatchImage_dispatchId_sortOrder_idx] ON [dbo].[DispatchImage]([dispatchId], [sortOrder]);

ALTER TABLE [dbo].[DispatchImage] ADD CONSTRAINT [DispatchImage_dispatchId_fkey] FOREIGN KEY ([dispatchId]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[DispatchImage] ADD CONSTRAINT [DispatchImage_assetId_fkey] FOREIGN KEY ([assetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
