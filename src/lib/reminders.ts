import { useCallback, useEffect, useState } from "react";

export type ReminderPrefs = {
  enabled: boolean;
  leadMinutes: number;
  checkInEnabled: boolean;
  checkInTime: string; // HH:MM local
};

const KEY = "kronos.reminders";

export const DEFAULT_PREFS: ReminderPrefs = {
  enabled: false,
  leadMinutes: 10,
  checkInEnabled: true,
  checkInTime: "21:00",
};

export function readPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: ReminderPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("kronos:reminders"));
}

/** Reads reminder preferences after hydration and keeps every mount in sync. */
export function useReminderPrefs() {
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(readPrefs());
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("kronos:reminders", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kronos:reminders", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<ReminderPrefs>) => {
    const next = { ...readPrefs(), ...patch };
    writePrefs(next);
    setPrefs(next);
  }, []);

  return { prefs, update };
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Fires once per key per day; remembers what already fired in localStorage. */
export function notifyOnce(key: string, title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const seenKey = "kronos.reminders.sent";
  let sent: string[] = [];
  try {
    sent = JSON.parse(window.localStorage.getItem(seenKey) ?? "[]") as string[];
  } catch {
    sent = [];
  }
  if (sent.includes(key)) return;
  new Notification(title, { body, icon: "/icon-192.png", tag: key });
  const today = key.slice(0, 10);
  window.localStorage.setItem(
    seenKey,
    JSON.stringify([...sent.filter((k) => k.startsWith(today)), key].slice(-200)),
  );
}

export function minutesUntil(dateKey: string, time: string, now = new Date()) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const target = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return (target.getTime() - now.getTime()) / 60000;
}
