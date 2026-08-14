BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Mission] ADD [isOnline] BIT NOT NULL CONSTRAINT [Mission_isOnline_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[Pageview] (
    [id] NVARCHAR(1000) NOT NULL,
    [at] DATETIME2 NOT NULL CONSTRAINT [Pageview_at_df] DEFAULT CURRENT_TIMESTAMP,
    [day] DATE NOT NULL,
    [path] NVARCHAR(512) NOT NULL,
    [locale] CHAR(2) NOT NULL,
    [section] NVARCHAR(64) NOT NULL,
    [country] CHAR(2) NOT NULL,
    [visitorHash] CHAR(64) NOT NULL,
    CONSTRAINT [Pageview_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pageview_day_idx] ON [dbo].[Pageview]([day]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pageview_country_idx] ON [dbo].[Pageview]([country]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pageview_section_idx] ON [dbo].[Pageview]([section]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pageview_day_visitorHash_idx] ON [dbo].[Pageview]([day], [visitorHash]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

