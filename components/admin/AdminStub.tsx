// Platzhalter für Admin-Seiten, deren volle Funktion in einem späteren
// Meilenstein umgesetzt wird. Hält die Navigation vollständig und zeigt an,
// woran gearbeitet wird.
export default function AdminStub({
  title,
  milestone,
  children,
}: {
  title: string;
  milestone: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">{children ?? "Dieser Bereich wird umgesetzt."}</p>
      <p className="st sched" style={{ display: "inline-block", marginTop: 8 }}>
        Umsetzung in {milestone}
      </p>
    </section>
  );
}
