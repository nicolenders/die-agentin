BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Identity] (
    [id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [codenameDe] NVARCHAR(1000) NOT NULL CONSTRAINT [Identity_codenameDe_df] DEFAULT '',
    [codenameEn] NVARCHAR(1000) NOT NULL CONSTRAINT [Identity_codenameEn_df] DEFAULT '',
    [roleDe] NVARCHAR(1000) NOT NULL,
    [roleEn] NVARCHAR(1000) NOT NULL CONSTRAINT [Identity_roleEn_df] DEFAULT '',
    [taglineDe] NVARCHAR(1000) NOT NULL CONSTRAINT [Identity_taglineDe_df] DEFAULT '',
    [taglineEn] NVARCHAR(1000) NOT NULL CONSTRAINT [Identity_taglineEn_df] DEFAULT '',
    [registryCode] NVARCHAR(1000),
    [since] NVARCHAR(1000),
    [descriptionDe] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_descriptionDe_df] DEFAULT '',
    [descriptionEn] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_descriptionEn_df] DEFAULT '',
    [shortBioDe] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_shortBioDe_df] DEFAULT '',
    [shortBioEn] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_shortBioEn_df] DEFAULT '',
    [focusDe] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_focusDe_df] DEFAULT '[]',
    [focusEn] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_focusEn_df] DEFAULT '[]',
    [languages] NVARCHAR(max) NOT NULL CONSTRAINT [Identity_languages_df] DEFAULT '[]',
    [portraitAssetId] NVARCHAR(1000),
    [envelopeAssetId] NVARCHAR(1000),
    [ogAssetId] NVARCHAR(1000),
    [color] NVARCHAR(1000) NOT NULL,
    [iconKey] NVARCHAR(1000),
    [sortOrder] INT NOT NULL CONSTRAINT [Identity_sortOrder_df] DEFAULT 0,
    [isPrimary] BIT NOT NULL CONSTRAINT [Identity_isPrimary_df] DEFAULT 0,
    [metaTitleDe] NVARCHAR(1000),
    [metaTitleEn] NVARCHAR(1000),
    [metaDescriptionDe] NVARCHAR(max),
    [metaDescriptionEn] NVARCHAR(max),
    [published] BIT NOT NULL CONSTRAINT [Identity_published_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Identity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Identity_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Identity_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[IdentityAttribute] (
    [id] NVARCHAR(1000) NOT NULL,
    [identityId] NVARCHAR(1000) NOT NULL,
    [labelDe] NVARCHAR(1000) NOT NULL,
    [labelEn] NVARCHAR(1000) NOT NULL CONSTRAINT [IdentityAttribute_labelEn_df] DEFAULT '',
    [valueDe] NVARCHAR(max) NOT NULL,
    [valueEn] NVARCHAR(max) NOT NULL CONSTRAINT [IdentityAttribute_valueEn_df] DEFAULT '',
    [sortOrder] INT NOT NULL CONSTRAINT [IdentityAttribute_sortOrder_df] DEFAULT 0,
    [displayPublic] BIT NOT NULL CONSTRAINT [IdentityAttribute_displayPublic_df] DEFAULT 1,
    CONSTRAINT [IdentityAttribute_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Tool] (
    [id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [iconAssetId] NVARCHAR(1000),
    [url] NVARCHAR(2048),
    [sortOrder] INT NOT NULL CONSTRAINT [Tool_sortOrder_df] DEFAULT 0,
    CONSTRAINT [Tool_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tool_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityCertifications] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityCertifications_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityTools] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityTools_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityMissions] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityMissions_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityTalks] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityTalks_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_IdentityPublications] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_IdentityPublications_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Identity_published_sortOrder_idx] ON [dbo].[Identity]([published], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IdentityAttribute_identityId_sortOrder_idx] ON [dbo].[IdentityAttribute]([identityId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tool_sortOrder_idx] ON [dbo].[Tool]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityCertifications_B_index] ON [dbo].[_IdentityCertifications]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityTools_B_index] ON [dbo].[_IdentityTools]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityMissions_B_index] ON [dbo].[_IdentityMissions]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityTalks_B_index] ON [dbo].[_IdentityTalks]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_IdentityPublications_B_index] ON [dbo].[_IdentityPublications]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[Identity] ADD CONSTRAINT [Identity_portraitAssetId_fkey] FOREIGN KEY ([portraitAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Identity] ADD CONSTRAINT [Identity_envelopeAssetId_fkey] FOREIGN KEY ([envelopeAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Identity] ADD CONSTRAINT [Identity_ogAssetId_fkey] FOREIGN KEY ([ogAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IdentityAttribute] ADD CONSTRAINT [IdentityAttribute_identityId_fkey] FOREIGN KEY ([identityId]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Tool] ADD CONSTRAINT [Tool_iconAssetId_fkey] FOREIGN KEY ([iconAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityCertifications] ADD CONSTRAINT [_IdentityCertifications_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Certification]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityCertifications] ADD CONSTRAINT [_IdentityCertifications_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityTools] ADD CONSTRAINT [_IdentityTools_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityTools] ADD CONSTRAINT [_IdentityTools_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityMissions] ADD CONSTRAINT [_IdentityMissions_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityMissions] ADD CONSTRAINT [_IdentityMissions_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityTalks] ADD CONSTRAINT [_IdentityTalks_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityTalks] ADD CONSTRAINT [_IdentityTalks_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityPublications] ADD CONSTRAINT [_IdentityPublications_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Identity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_IdentityPublications] ADD CONSTRAINT [_IdentityPublications_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Publication]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

