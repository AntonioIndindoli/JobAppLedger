import { TASK_TYPE_LABELS } from "./constants";
import type { Task, TaskType } from "./types";

export type TaskDueState =
    | "completed"
    | "overdue"
    | "today"
    | "upcoming"
    | "unscheduled";

export function isTaskType(type: string): type is TaskType {
    return Object.prototype.hasOwnProperty.call(TASK_TYPE_LABELS, type);
}

export function getTaskTypeLabel(type: string) {
    return isTaskType(type) ? TASK_TYPE_LABELS[type] : type;
}

function getValidDate(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export function getTaskTimestamp(task: Task) {
    const date = getValidDate(task.dueDate) ?? getValidDate(task.createdAt);
    return date?.getTime() ?? 0;
}

export function getTaskDueState(task: Task): TaskDueState {
    if (task.completedAt) return "completed";

    const dueDate = getValidDate(task.dueDate);
    if (!dueDate) return "unscheduled";

    const dueDay = startOfDay(dueDate).getTime();
    const today = startOfDay(new Date()).getTime();

    if (dueDay < today) return "overdue";
    if (dueDay === today) return "today";
    return "upcoming";
}

export function isOpenTask(task: Task) {
    return !task.completedAt;
}

export function isTaskNeedingAttention(task: Task) {
    const state = getTaskDueState(task);
    return state === "overdue" || state === "today";
}

export function formatTaskDueDate(value: string | null) {
    const date = getValidDate(value);
    if (!date) return "No due date";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

export function toTaskDueDateInput(value: string | null) {
    const date = getValidDate(value);
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function toTaskDueDatePayload(value: string) {
    if (!value) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function sortTasksByDueDate(tasks: Task[]) {
    return [...tasks].sort((left, right) => {
        const leftCompleted = Boolean(left.completedAt);
        const rightCompleted = Boolean(right.completedAt);
        if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;

        const leftDue = getValidDate(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDue =
            getValidDate(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (leftDue !== rightDue) return leftDue - rightDue;

        return getTaskTimestamp(right) - getTaskTimestamp(left);
    });
}
