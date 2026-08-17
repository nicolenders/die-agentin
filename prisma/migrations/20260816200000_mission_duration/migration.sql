BEGIN TRY

BEGIN TRAN;

-- AlterTable: tatsächliche Vortragslänge je Einsatz (Vorbelegung aus dem Briefing).
ALTER TABLE [dbo].[Mission] ADD [durationMin] INT;

-- Bestandsdaten: frühere Freitexte im Sprachfeld auf Locale-Kürzel normalisieren,
-- damit die Anzeige überall dieselbe Quelle hat.
UPDATE [dbo].[Mission] SET [sessionLanguage] = N'de'
 WHERE [sessionLanguage] IS NOT NULL
   AND LOWER(LTRIM(RTRIM([sessionLanguage]))) IN (N'de', N'deutsch', N'german', N'de-de');

UPDATE [dbo].[Mission] SET [sessionLanguage] = N'en'
 WHERE [sessionLanguage] IS NOT NULL
   AND LOWER(LTRIM(RTRIM([sessionLanguage]))) IN (N'en', N'englisch', N'english', N'en-gb', N'en-us');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
