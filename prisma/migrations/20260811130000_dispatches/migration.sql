BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ChannelTask] ALTER COLUMN [postId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[ChannelTask] ADD [dispatchId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[Dispatch] (
    [id] NVARCHAR(1000) NOT NULL,
    [format] NVARCHAR(1000) NOT NULL CONSTRAINT [Dispatch_format_df] DEFAULT 'NOTE',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Dispatch_status_df] DEFAULT 'DRAFT',
    [publishAt] DATETIME2,
    [publishedAt] DATETIME2,
    [reviewedAt] DATETIME2,
    [sourceUrl] NVARCHAR(2048),
    [sourceTitle] NVARCHAR(1000),
    [sourceSite] NVARCHAR(1000),
    [sourceImage] NVARCHAR(2048),
    [heroAssetId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Dispatch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Dispatch_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DispatchTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [dispatchId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(600),
    [bodyJson] NVARCHAR(max) NOT NULL,
    [socialText] NVARCHAR(2000),
    [tocEnabled] BIT NOT NULL CONSTRAINT [DispatchTranslation_tocEnabled_df] DEFAULT 0,
    [state] NVARCHAR(1000) NOT NULL CONSTRAINT [DispatchTranslation_state_df] DEFAULT 'MISSING',
    CONSTRAINT [DispatchTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DispatchTranslation_dispatchId_locale_key] UNIQUE NONCLUSTERED ([dispatchId],[locale]),
    CONSTRAINT [DispatchTranslation_locale_slug_key] UNIQUE NONCLUSTERED ([locale],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityDispatches] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityDispatches_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_DispatchTopics] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_DispatchTopics_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_DispatchTags] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_DispatchTags_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Dispatch_status_publishAt_idx] ON [dbo].[Dispatch]([status], [publishAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Dispatch_format_idx] ON [dbo].[Dispatch]([format]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityDispatches_B_index] ON [dbo].[_IdentityDispatches]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_DispatchTopics_B_index] ON [dbo].[_DispatchTopics]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_DispatchTags_B_index] ON [dbo].[_DispatchTags]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChannelTask_dispatchId_idx] ON [dbo].[ChannelTask]([dispatchId]);

-- AddForeignKey
ALTER TABLE [dbo].[ChannelTask] ADD CONSTRAINT [ChannelTask_dispatchId_fkey] FOREIGN KEY ([dispatchId]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Dispatch] ADD CONSTRAINT [Dispatch_heroAssetId_fkey] FOREIGN KEY ([heroAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DispatchTranslation] ADD CONSTRAINT [DispatchTranslation_dispatchId_fkey] FOREIGN KEY ([dispatchId]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityDispatches] ADD CONSTRAINT [_IdentityDispatches_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityDispatches] ADD CONSTRAINT [_IdentityDispatches_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchTopics] ADD CONSTRAINT [_DispatchTopics_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchTopics] ADD CONSTRAINT [_DispatchTopics_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchTags] ADD CONSTRAINT [_DispatchTags_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Dispatch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_DispatchTags] ADD CONSTRAINT [_DispatchTags_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Tag]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

