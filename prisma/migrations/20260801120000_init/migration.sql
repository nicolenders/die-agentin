BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Post] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Post_status_df] DEFAULT 'DRAFT',
    [publishAt] DATETIME2,
    [publishedAt] DATETIME2,
    [sourceUrl] NVARCHAR(2048),
    [sourceTitle] NVARCHAR(1000),
    [sourceSite] NVARCHAR(1000),
    [sourceImage] NVARCHAR(2048),
    [heroAssetId] NVARCHAR(1000),
    [missionId] NVARCHAR(1000),
    [dossierId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Post_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Post_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PostTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [postId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(600),
    [bodyJson] NVARCHAR(max) NOT NULL,
    [socialText] NVARCHAR(2000),
    [state] NVARCHAR(1000) NOT NULL CONSTRAINT [PostTranslation_state_df] DEFAULT 'MISSING',
    CONSTRAINT [PostTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PostTranslation_postId_locale_key] UNIQUE NONCLUSTERED ([postId],[locale]),
    CONSTRAINT [PostTranslation_locale_slug_key] UNIQUE NONCLUSTERED ([locale],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[Dossier] (
    [id] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Dossier_status_df] DEFAULT 'DRAFT',
    [publishAt] DATETIME2,
    [categoryId] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Dossier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Dossier_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DossierTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [dossierId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(600),
    [bodyJson] NVARCHAR(max) NOT NULL,
    [tocEnabled] BIT NOT NULL CONSTRAINT [DossierTranslation_tocEnabled_df] DEFAULT 1,
    [state] NVARCHAR(1000) NOT NULL CONSTRAINT [DossierTranslation_state_df] DEFAULT 'MISSING',
    CONSTRAINT [DossierTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DossierTranslation_dossierId_locale_key] UNIQUE NONCLUSTERED ([dossierId],[locale]),
    CONSTRAINT [DossierTranslation_locale_slug_key] UNIQUE NONCLUSTERED ([locale],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[Mission] (
    [id] NVARCHAR(1000) NOT NULL,
    [eventName] NVARCHAR(1000) NOT NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [countryCode] CHAR(2) NOT NULL,
    [lat] FLOAT(53) NOT NULL,
    [lon] FLOAT(53) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Mission_status_df] DEFAULT 'PLANNED',
    [eventUrl] NVARCHAR(2048),
    [contentStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Mission_contentStatus_df] DEFAULT 'DRAFT',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Mission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Mission_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MissionTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [missionId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [eventText] NVARCHAR(max) NOT NULL,
    [talkText] NVARCHAR(max) NOT NULL,
    [state] NVARCHAR(1000) NOT NULL CONSTRAINT [MissionTranslation_state_df] DEFAULT 'MISSING',
    CONSTRAINT [MissionTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MissionTranslation_missionId_locale_key] UNIQUE NONCLUSTERED ([missionId],[locale]),
    CONSTRAINT [MissionTranslation_locale_slug_key] UNIQUE NONCLUSTERED ([locale],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[MissionPhoto] (
    [id] NVARCHAR(1000) NOT NULL,
    [missionId] NVARCHAR(1000) NOT NULL,
    [assetId] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [MissionPhoto_sortOrder_df] DEFAULT 0,
    CONSTRAINT [MissionPhoto_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Talk] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [level] NVARCHAR(1000),
    [durationMin] INT,
    [active] BIT NOT NULL CONSTRAINT [Talk_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Talk_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Talk_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TalkTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [talkId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [abstract] NVARCHAR(max),
    CONSTRAINT [TalkTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TalkTranslation_talkId_locale_key] UNIQUE NONCLUSTERED ([talkId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[TalkDelivery] (
    [id] NVARCHAR(1000) NOT NULL,
    [talkId] NVARCHAR(1000) NOT NULL,
    [missionId] NVARCHAR(1000) NOT NULL,
    [language] NVARCHAR(1000) NOT NULL,
    [heldOn] DATETIME2 NOT NULL,
    CONSTRAINT [TalkDelivery_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Publication] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [year] INT NOT NULL,
    [isbn] NVARCHAR(1000),
    [publisher] NVARCHAR(1000),
    [coverAssetId] NVARCHAR(1000),
    [url] NVARCHAR(2048),
    [sortOrder] INT NOT NULL CONSTRAINT [Publication_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Publication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Publication_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PublicationTranslation] (
    [id] NVARCHAR(1000) NOT NULL,
    [publicationId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000),
    [description] NVARCHAR(max),
    CONSTRAINT [PublicationTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PublicationTranslation_publicationId_locale_key] UNIQUE NONCLUSTERED ([publicationId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[Certification] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [shortCode] NVARCHAR(1000),
    [categoryId] NVARCHAR(1000),
    [acquiredOn] DATETIME2 NOT NULL,
    [validUntil] DATETIME2,
    [proofUrl] NVARCHAR(2048),
    [series] NVARCHAR(1000),
    [sortOrder] INT NOT NULL CONSTRAINT [Certification_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Certification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Certification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Taxonomy] (
    [id] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [nameDe] NVARCHAR(1000) NOT NULL,
    [nameEn] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [Taxonomy_sortOrder_df] DEFAULT 0,
    CONSTRAINT [Taxonomy_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Taxonomy_kind_slug_key] UNIQUE NONCLUSTERED ([kind],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[Tag] (
    [id] NVARCHAR(1000) NOT NULL,
    [nameDe] NVARCHAR(1000) NOT NULL,
    [nameEn] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Tag_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tag_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[PostTag] (
    [postId] NVARCHAR(1000) NOT NULL,
    [tagId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [PostTag_pkey] PRIMARY KEY CLUSTERED ([postId],[tagId])
);

-- CreateTable
CREATE TABLE [dbo].[MediaAsset] (
    [id] NVARCHAR(1000) NOT NULL,
    [blobPath] NVARCHAR(1000) NOT NULL,
    [width] INT NOT NULL,
    [height] INT NOT NULL,
    [mime] NVARCHAR(1000) NOT NULL,
    [altDe] NVARCHAR(1000) NOT NULL,
    [altEn] NVARCHAR(1000),
    [decorative] BIT NOT NULL CONSTRAINT [MediaAsset_decorative_df] DEFAULT 0,
    [credit] NVARCHAR(1000),
    [variants] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MediaAsset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MediaAsset_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ChannelAccount] (
    [platform] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [connected] BIT NOT NULL CONSTRAINT [ChannelAccount_connected_df] DEFAULT 0,
    [tokenRef] NVARCHAR(1000),
    [expiresAt] DATETIME2,
    [lastError] NVARCHAR(max),
    CONSTRAINT [ChannelAccount_pkey] PRIMARY KEY CLUSTERED ([platform])
);

-- CreateTable
CREATE TABLE [dbo].[ChannelTask] (
    [id] NVARCHAR(1000) NOT NULL,
    [postId] NVARCHAR(1000) NOT NULL,
    [platform] NVARCHAR(1000) NOT NULL,
    [state] NVARCHAR(1000) NOT NULL CONSTRAINT [ChannelTask_state_df] DEFAULT 'PENDING',
    [scheduledAt] DATETIME2 NOT NULL,
    [sentAt] DATETIME2,
    [remoteUrl] NVARCHAR(1000),
    [attempts] INT NOT NULL CONSTRAINT [ChannelTask_attempts_df] DEFAULT 0,
    [lastError] NVARCHAR(max),
    [payload] NVARCHAR(max) NOT NULL,
    CONSTRAINT [ChannelTask_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Redirect] (
    [id] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL,
    [fromSlug] NVARCHAR(1000) NOT NULL,
    [toSlug] NVARCHAR(1000) NOT NULL,
    [entity] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Redirect_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Redirect_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Redirect_locale_fromSlug_entity_key] UNIQUE NONCLUSTERED ([locale],[fromSlug],[entity])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [at] DATETIME2 NOT NULL CONSTRAINT [AuditLog_at_df] DEFAULT CURRENT_TIMESTAMP,
    [actor] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entity] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [detail] NVARCHAR(max),
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Post_status_publishAt_idx] ON [dbo].[Post]([status], [publishAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Post_type_idx] ON [dbo].[Post]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Dossier_status_publishAt_idx] ON [dbo].[Dossier]([status], [publishAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Mission_startDate_idx] ON [dbo].[Mission]([startDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Mission_contentStatus_idx] ON [dbo].[Mission]([contentStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MissionPhoto_missionId_sortOrder_idx] ON [dbo].[MissionPhoto]([missionId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Talk_categoryId_idx] ON [dbo].[Talk]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TalkDelivery_heldOn_idx] ON [dbo].[TalkDelivery]([heldOn]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TalkDelivery_talkId_language_idx] ON [dbo].[TalkDelivery]([talkId], [language]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Publication_year_idx] ON [dbo].[Publication]([year]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Certification_categoryId_idx] ON [dbo].[Certification]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Certification_series_idx] ON [dbo].[Certification]([series]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Taxonomy_kind_sortOrder_idx] ON [dbo].[Taxonomy]([kind], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PostTag_tagId_idx] ON [dbo].[PostTag]([tagId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChannelTask_state_scheduledAt_idx] ON [dbo].[ChannelTask]([state], [scheduledAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChannelTask_postId_idx] ON [dbo].[ChannelTask]([postId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_at_idx] ON [dbo].[AuditLog]([at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entity_entityId_idx] ON [dbo].[AuditLog]([entity], [entityId]);

-- AddForeignKey
ALTER TABLE [dbo].[Post] ADD CONSTRAINT [Post_heroAssetId_fkey] FOREIGN KEY ([heroAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Post] ADD CONSTRAINT [Post_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Post] ADD CONSTRAINT [Post_dossierId_fkey] FOREIGN KEY ([dossierId]) REFERENCES [dbo].[Dossier]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PostTranslation] ADD CONSTRAINT [PostTranslation_postId_fkey] FOREIGN KEY ([postId]) REFERENCES [dbo].[Post]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Dossier] ADD CONSTRAINT [Dossier_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DossierTranslation] ADD CONSTRAINT [DossierTranslation_dossierId_fkey] FOREIGN KEY ([dossierId]) REFERENCES [dbo].[Dossier]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MissionTranslation] ADD CONSTRAINT [MissionTranslation_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MissionPhoto] ADD CONSTRAINT [MissionPhoto_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MissionPhoto] ADD CONSTRAINT [MissionPhoto_assetId_fkey] FOREIGN KEY ([assetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Talk] ADD CONSTRAINT [Talk_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TalkTranslation] ADD CONSTRAINT [TalkTranslation_talkId_fkey] FOREIGN KEY ([talkId]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TalkDelivery] ADD CONSTRAINT [TalkDelivery_talkId_fkey] FOREIGN KEY ([talkId]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TalkDelivery] ADD CONSTRAINT [TalkDelivery_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[Mission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Publication] ADD CONSTRAINT [Publication_coverAssetId_fkey] FOREIGN KEY ([coverAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PublicationTranslation] ADD CONSTRAINT [PublicationTranslation_publicationId_fkey] FOREIGN KEY ([publicationId]) REFERENCES [dbo].[Publication]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Certification] ADD CONSTRAINT [Certification_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Taxonomy]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PostTag] ADD CONSTRAINT [PostTag_postId_fkey] FOREIGN KEY ([postId]) REFERENCES [dbo].[Post]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PostTag] ADD CONSTRAINT [PostTag_tagId_fkey] FOREIGN KEY ([tagId]) REFERENCES [dbo].[Tag]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ChannelTask] ADD CONSTRAINT [ChannelTask_postId_fkey] FOREIGN KEY ([postId]) REFERENCES [dbo].[Post]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

