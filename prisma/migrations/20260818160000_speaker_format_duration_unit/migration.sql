BEGIN TRY

BEGIN TRAN;

-- Vortragsformate: Dauer bekommt eine wählbare Einheit (MINUTES | HOURS | DAYS).
-- Ein Workshop dauert Stunden oder Tage; ihn in Minuten zu erfassen war eine
-- Rechenaufgabe bei jeder Pflege.
--
-- Rein additiv: EINE neue Spalte. Die vorhandenen Spalten [minutesMin] und
-- [minutesMax] bleiben unverändert und behalten ihre Werte — sie tragen ab
-- jetzt die Zahl in der gewählten Einheit. Weil die Vorgabe MINUTES ist,
-- bedeuten alle bereits erfassten Zeilen weiterhin genau dasselbe wie vorher.
-- Es wird keine Zeile angefasst und nichts umgerechnet.
--
-- Wiederholbar geschrieben (`IF COL_LENGTH … IS NULL`), damit dieselbe Datei von
-- Hand ausgeführt werden kann und ein späteres `prisma migrate deploy` trotzdem
-- durchläuft, statt an einer bereits vorhandenen Spalte zu scheitern.
IF COL_LENGTH(N'[dbo].[SpeakerFormat]', N'durationUnit') IS NULL
BEGIN
    ALTER TABLE [dbo].[SpeakerFormat]
        ADD [durationUnit] NVARCHAR(1000) NOT NULL
            CONSTRAINT [SpeakerFormat_durationUnit_df] DEFAULT 'MINUTES';
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
