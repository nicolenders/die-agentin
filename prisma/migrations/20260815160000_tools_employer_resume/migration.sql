BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[LegendContent] ADD [employerName] NVARCHAR(1000),
[employerUrl] NVARCHAR(2048);

-- CreateTable
CREATE TABLE [dbo].[ResumeProfile] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [ResumeProfile_id_df] DEFAULT 'default',
    [headline] NVARCHAR(1000) NOT NULL CONSTRAINT [ResumeProfile_headline_df] DEFAULT '',
    [summary] NVARCHAR(max) NOT NULL CONSTRAINT [ResumeProfile_summary_df] DEFAULT '',
    [location] NVARCHAR(1000) NOT NULL CONSTRAINT [ResumeProfile_location_df] DEFAULT '',
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ResumeProfile_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ResumeEntry] (
    [id] NVARCHAR(1000) NOT NULL,
    [section] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [subtitle] NVARCHAR(1000),
    [location] NVARCHAR(1000),
    [periodFrom] NVARCHAR(1000),
    [periodTo] NVARCHAR(1000),
    [description] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [sortOrder] INT NOT NULL CONSTRAINT [ResumeEntry_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResumeEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ResumeEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[_MissionTools] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_MissionTools_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_TalkTools] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_TalkTools_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResumeEntry_section_sortOrder_idx] ON [dbo].[ResumeEntry]([section], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_MissionTools_B_index] ON [dbo].[_MissionTools]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_TalkTools_B_index] ON [dbo].[_TalkTools]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[_MissionTools] ADD CONSTRAINT [_MissionTools_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Mission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_MissionTools] ADD CONSTRAINT [_MissionTools_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_TalkTools] ADD CONSTRAINT [_TalkTools_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Talk]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_TalkTools] ADD CONSTRAINT [_TalkTools_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

