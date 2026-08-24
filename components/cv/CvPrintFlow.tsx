import type { ReactNode } from "react";

/**
 * Der Rahmen, der dem Lebenslauf auf jeder gedruckten Seite oben und unten
 * Rand verschafft.
 *
 * Warum eine Tabelle: Ein Innenabstand am Blatt gilt einmal für den ganzen
 * Block — Seite 2 stünde damit oben ohne Rand. Der naheliegende Weg wäre der
 * Seitenrand von `@page`; den verhandelt der Browser aber weg, sobald im
 * Druckdialog „Ränder: keine“ steht oder ein Druckertreiber die Angabe
 * übergeht. Dann klebte der Text an der Papierkante.
 *
 * Kopf- und Fußzeile einer Tabelle wiederholt der Browser dagegen auf jeder
 * gedruckten Seite. Zwei leere Zeilen mit fester Höhe reservieren so oben und
 * unten Platz — unabhängig von jeder Einstellung im Druckdialog. Am Bildschirm
 * sind sie ausgeblendet; dort macht der Innenabstand des Blattes die Arbeit.
 *
 * `role="presentation"` nimmt die Tabelle aus der Vorlesereihenfolge: Sie ist
 * Drucktechnik, keine Datenstruktur.
 */
export default function CvPrintFlow({ children }: { children: ReactNode }) {
  return (
    <table className="cv-flow" role="presentation">
      <thead>
        <tr>
          <td className="cv-flow-pad" />
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td className="cv-flow-pad" />
        </tr>
      </tfoot>
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}
