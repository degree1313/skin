import type { RecentLogItem } from "@/components/DashboardShell";

interface Props {
  logs: RecentLogItem[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanDose(dose: RecentLogItem["dose"]) {
  switch (dose) {
    case "half_pea":
      return "½ pea";
    case "pea":
      return "pea";
    case "dime":
      return "dime";
    case "one_pump":
      return "1 pump";
    case "two_pumps":
      return "2 pumps";
    default:
      return dose;
  }
}

export default function RecentLogs({ logs }: Props) {
  return (
    <div className="card h-full p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight text-slate-50">
        Recent logs
      </h2>
      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-300">
          No usage logged yet. Start by adding a product and logging tonight&apos;s
          routine.
        </p>
      ) : (
        <ul className="mt-3 space-y-3 text-xs text-slate-200">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-md bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-50">
                  {log.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {log.routineSlot.toUpperCase()} • {humanDose(log.dose)}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">
                {formatTime(log.usedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

