import type { TaskItem } from "@/lib/queries/tasks";

// Filter und Sortierung der Aufgabenliste. Reine Logik — die Seite reicht nur
// die Suchparameter durch.

export const TASK_VIEWS = ["offen", "ueberfaellig", "erledigt", "alle"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_VIEW_LABEL: Record<TaskView, string> = {
  offen: "Offen",
  ueberfaellig: "Überfällig",
  erledigt: "Erledigt",
  alle: "Alle",
};

export function toTaskView(value: string | undefined): TaskView {
  return (TASK_VIEWS as readonly string[]).includes(value ?? "") ? (value as TaskView) : "offen";
}

/** Überfällig heißt: offen, und der Einsatztag liegt hinter uns. */
export function isOverdue(task: TaskItem, now: Date): boolean {
  return task.status === "OPEN" && task.dueOn.getTime() < now.getTime();
}

export function filterTasks(tasks: TaskItem[], view: TaskView, now: Date = new Date()): TaskItem[] {
  switch (view) {
    case "offen":
      return tasks.filter((t) => t.status === "OPEN");
    case "ueberfaellig":
      return tasks.filter((t) => isOverdue(t, now));
    case "erledigt":
      return tasks.filter((t) => t.status === "DONE");
    default:
      return tasks;
  }
}

/**
 * Offene zuerst und darin das am längsten Überfällige — das ist die
 * Reihenfolge, in der man eine solche Liste abarbeitet. Erledigtes kommt
 * zuletzt, das Jüngste zuerst.
 */
export function sortTasks(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
    if (a.status === "OPEN") return a.dueOn.getTime() - b.dueOn.getTime();
    return b.dueOn.getTime() - a.dueOn.getTime();
  });
}

export interface TaskViewCounts {
  offen: number;
  ueberfaellig: number;
  erledigt: number;
  alle: number;
}

/** Zahlen an den Filtern — ohne sie ist nicht zu sehen, was ein Filter bringt. */
export function countTaskViews(tasks: TaskItem[], now: Date = new Date()): TaskViewCounts {
  return {
    offen: tasks.filter((t) => t.status === "OPEN").length,
    ueberfaellig: tasks.filter((t) => isOverdue(t, now)).length,
    erledigt: tasks.filter((t) => t.status === "DONE").length,
    alle: tasks.length,
  };
}
