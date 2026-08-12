BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Mission] ADD [attendeeCount] INT,
[coSpeakers] NVARCHAR(max),
[feedbackScore] FLOAT(53),
[feedbackSource] NVARCHAR(1000),
[recapDe] NVARCHAR(max),
[recapEn] NVARCHAR(max),
[recordingUrl] NVARCHAR(2048),
[sessionLanguage] NVARCHAR(1000),
[sessionType] NVARCHAR(1000),
[slidesPlatform] NVARCHAR(1000),
[slidesUrl] NVARCHAR(2048);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

