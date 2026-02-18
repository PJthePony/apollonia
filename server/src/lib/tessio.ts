import { env } from "../config.js";

export interface CreateTaskResult {
  id: string;
  title: string;
  notes: string;
  location: string;
  created_at: number;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Compute the right Tessio location based on a due date.
 *
 * - Due date is this week → the specific day name ("monday", "tuesday", etc.)
 * - Due date is next week → "next-week"
 * - Due date is further out → "later" (caller should set activate_at)
 * - No due date → "this-week" (nudge to act soon)
 */
function computeLocation(dueDate?: string): { location: string; activateAt?: string } {
  if (!dueDate) {
    return { location: "this-week" };
  }

  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Days until due
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.floor((due.getTime() - today.getTime()) / msPerDay);

  if (daysUntil < 0) {
    // Past due — put it on today
    return { location: DAY_NAMES[now.getDay()] };
  }

  // This week: due date falls within the current week (Sun–Sat)
  const currentDayOfWeek = now.getDay();
  const daysLeftInWeek = 6 - currentDayOfWeek;

  if (daysUntil <= daysLeftInWeek) {
    return { location: DAY_NAMES[due.getDay()] };
  }

  // Next week: within the following 7 days after this week
  if (daysUntil <= daysLeftInWeek + 7) {
    return { location: "next-week" };
  }

  // Further out: use "later" with activate_at 3 days before
  const activateDate = new Date(due.getTime() - 3 * msPerDay);
  return {
    location: "later",
    activateAt: activateDate.toISOString().split("T")[0],
  };
}

/**
 * For gift/prep reminders, shift the effective due date earlier
 * so P.J. has time to act before the actual event.
 */
function getEffectiveDueDate(
  dueDate: string | undefined,
  reminderType: string,
): string | undefined {
  if (!dueDate) return undefined;

  const prepTypes = ["birthday", "anniversary", "milestone"];
  if (!prepTypes.includes(reminderType)) return dueDate;

  // Shift 4 days earlier for gift/prep reminders
  const due = new Date(dueDate + "T00:00:00");
  const effective = new Date(due.getTime() - 4 * 24 * 60 * 60 * 1000);
  return effective.toISOString().split("T")[0];
}

export async function createTessioTask(
  userId: string,
  title: string,
  opts: {
    notes?: string;
    dueDate?: string;
    reminderType?: string;
  } = {},
): Promise<CreateTaskResult> {
  if (!env.TESSIO_API_URL || !env.TESSIO_SERVICE_KEY) {
    throw new Error("Tessio not configured — add TESSIO_API_URL and TESSIO_SERVICE_KEY");
  }

  const effectiveDate = getEffectiveDueDate(opts.dueDate, opts.reminderType ?? "");
  const { location, activateAt } = computeLocation(effectiveDate);

  const body: Record<string, unknown> = {
    title,
    notes: opts.notes || "",
    location,
    tags: ["apollonia"],
    target_user_id: userId,
  };

  if (activateAt) {
    body.activate_at = activateAt;
  }

  const response = await fetch(env.TESSIO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TESSIO_SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Tessio error ${response.status}: ${(err as { error?: string }).error || "Unknown"}`);
  }

  return response.json() as Promise<CreateTaskResult>;
}
