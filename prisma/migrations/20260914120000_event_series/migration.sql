BEGIN TRY

BEGIN TRAN;

-- ===========================================================================
-- Veranstaltungen als eigene Entität.
--
-- Eine Veranstaltung („TechDay") klammert die Einsätze, die dieselbe
-- Konferenz meinen. Sie trägt die Stammdaten (Name, Veranstalter, Website);
-- die Ausgabe (EventEdition) hält fest, wann die Veranstaltung in einem Jahr
-- stattfand.
--
-- Rein additiv: zwei neue Tabellen, zwei neue Spalten am Einsatz. Bestehende
-- Einsätze bekommen NULL und verhalten sich unverändert — `Mission.eventName`
-- und `Mission.eventUrl` bleiben, wo sie sind, und bleiben die Wahrheit für
-- den einzelnen Auftritt.
--
-- Die Zuordnung des Bestands macht `npm run db:backfill-events` in einem
-- zweiten Schritt: Sie braucht die Namensnormalisierung aus
-- lib/events/naming.ts und hat in SQL nichts verloren.
--
-- Fremdschlüssel am Einsatz mit NO ACTION statt SET NULL: SQL Server verbietet
-- mehrere Kaskadenpfade auf dieselbe Tabelle (Mission hängt an Veranstaltung
-- UND an Ausgabe, die Ausgabe wiederum an der Veranstaltung). Das Lösen der
-- Zuordnung vor dem Löschen erledigt der Adminbereich.
-- ===========================================================================

CREATE TABLE [dbo].[EventSeries] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [matchKey] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [organizer] NVARCHAR(1000),
    [websiteUrl] NVARCHAR(2048),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EventSeries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EventSeries_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EventSeries_matchKey_key] UNIQUE NONCLUSTERED ([matchKey]),
    CONSTRAINT [EventSeries_slug_key] UNIQUE NONCLUSTERED ([slug])
);

CREATE NONCLUSTERED INDEX [EventSeries_name_idx] ON [dbo].[EventSeries]([name]);

CREATE TABLE [dbo].[EventEdition] (
    [id] NVARCHAR(1000) NOT NULL,
    [seriesId] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EventEdition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EventEdition_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EventEdition_seriesId_label_key] UNIQUE NONCLUSTERED ([seriesId],[label])
);

CREATE NONCLUSTERED INDEX [EventEdition_seriesId_startDate_idx] ON [dbo].[EventEdition]([seriesId],[startDate]);

ALTER TABLE [dbo].[EventEdition] ADD CONSTRAINT [EventEdition_seriesId_fkey] FOREIGN KEY ([seriesId]) REFERENCES [dbo].[EventSeries]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[Mission] ADD [eventSeriesId] NVARCHAR(1000);
ALTER TABLE [dbo].[Mission] ADD [eventEditionId] NVARCHAR(1000);

CREATE NONCLUSTERED INDEX [Mission_eventSeriesId_idx] ON [dbo].[Mission]([eventSeriesId]);
CREATE NONCLUSTERED INDEX [Mission_eventEditionId_idx] ON [dbo].[Mission]([eventEditionId]);

ALTER TABLE [dbo].[Mission] ADD CONSTRAINT [Mission_eventSeriesId_fkey] FOREIGN KEY ([eventSeriesId]) REFERENCES [dbo].[EventSeries]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Mission] ADD CONSTRAINT [Mission_eventEditionId_fkey] FOREIGN KEY ([eventEditionId]) REFERENCES [dbo].[EventEdition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW

END CATCH
