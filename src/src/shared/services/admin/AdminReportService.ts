import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import { supabase } from "../../config/supabase";

export type ReportPeriod = "today" | "7d" | "30d" | "all";

export interface ReportStats {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  totalPassengers: number;
  averagePassengers: number;
  averageTripDuration: number;
  averageLoadingDuration: number;
  activeJeepneys: number;
  totalJeepneys: number;
  activeStaff: number;
  totalStaff: number;
  drivers: number;
  dispatchers: number;
  admins: number;
  totalActivityLogs: number;
}

export interface ReportSnapshot {
  stats: ReportStats;
  terminalStats: any[];
  staffStats: any;
  jeepneyStats: any[];
  dailyTrips: any[];
  dailyActivity: any[];
  actionStats: any[];
  trips: any[];
  activityLogs: any[];
}

export interface MonitoringReportLog {
  id: string;
  generated_by: string | null;
  report_type: string;
  period: ReportPeriod;
  generated_at: string;
  total_trips: number;
  completed_trips: number;
  active_trips: number;
  total_passengers: number;
  average_passengers: number;
  average_trip_duration: number;
  average_loading_duration: number;
  total_activity_logs: number;
  report_data: ReportSnapshot;
  created_at: string;
  generated_by_name?: string;
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  all: "All Records",
};

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSeconds(value: unknown): string {
  const seconds = safeNumber(value);
  if (!seconds) return "0 min";
  return `${Math.round(seconds / 60)} min`;
}

function reportTitle(report: MonitoringReportLog): string {
  return `JeepQTrack ${report.report_type || "Operational"} Report — ${PERIOD_LABELS[report.period] || report.period}`;
}

export async function createReportLog(
  period: ReportPeriod,
  snapshot: ReportSnapshot,
): Promise<MonitoringReportLog> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user)
    throw new Error(
      "You must be signed in as an administrator to generate a report.",
    );

  const stats = snapshot.stats;

  const { data, error } = await supabase
    .from("report_logs")
    .insert({
      generated_by: user.id,
      report_type: "operational",
      period,
      total_trips: safeNumber(stats.totalTrips),
      completed_trips: safeNumber(stats.completedTrips),
      active_trips: safeNumber(stats.activeTrips),
      total_passengers: safeNumber(stats.totalPassengers),
      average_passengers: safeNumber(stats.averagePassengers),
      average_trip_duration: safeNumber(stats.averageTripDuration),
      average_loading_duration: safeNumber(stats.averageLoadingDuration),
      total_activity_logs: safeNumber(stats.totalActivityLogs),
      report_data: snapshot,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...(data as MonitoringReportLog),
    report_data: snapshot,
    generated_by_name: "You",
  };
}

export async function getReportHistory(
  limit = 25,
): Promise<MonitoringReportLog[]> {
  const { data, error } = await supabase
    .from("report_logs")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const reports = (data ?? []) as MonitoringReportLog[];
  const userIds = Array.from(
    new Set(
      reports.map((report) => report.generated_by).filter(Boolean) as string[],
    ),
  );

  if (!userIds.length) return reports;

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, display_name, email")
    .in("id", userIds);

  if (usersError) throw usersError;

  const usersById = new Map<string, string>();
  (users ?? []).forEach((user: any) => {
    usersById.set(
      user.id,
      user.display_name?.trim() || user.email?.trim() || "Unknown User",
    );
  });

  return reports.map((report) => ({
    ...report,
    generated_by_name: report.generated_by
      ? usersById.get(report.generated_by) || "Unknown User"
      : "System",
  }));
}

function buildPdfHtml(report: MonitoringReportLog): string {
  const data = report.report_data || ({} as ReportSnapshot);
  const stats = data.stats || ({} as ReportStats);

  const terminalRows = (data.terminalStats ?? [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.terminalName)}</td>
          <td>${safeNumber(item.totalTrips)}</td>
          <td>${safeNumber(item.completedTrips)}</td>
          <td>${safeNumber(item.activeTrips)}</td>
          <td>${safeNumber(item.totalPassengers)}</td>
          <td>${safeNumber(item.averagePassengers).toFixed(1)}</td>
        </tr>`,
    )
    .join("");

  const dailyRows = (data.dailyTrips ?? [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${safeNumber(item.trips)}</td>
          <td>${safeNumber(item.completedTrips)}</td>
          <td>${safeNumber(item.passengers)}</td>
        </tr>`,
    )
    .join("");

  const jeepneyRows = (data.jeepneyStats ?? [])
    .slice(0, 20)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.plateNumber)}</td>
          <td>${safeNumber(item.totalTrips)}</td>
          <td>${safeNumber(item.totalPassengers)}</td>
          <td>${safeNumber(item.averagePassengers).toFixed(1)}</td>
          <td>${formatSeconds(item.averageTripDuration)}</td>
        </tr>`,
    )
    .join("");

  const activityRows = (data.activityLogs ?? [])
    .slice(0, 50)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.action)}</td>
          <td>${escapeHtml(item.user_name)}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.jeepney_plate)}</td>
          <td>${formatDate(item.created_at)}</td>
        </tr>`,
    )
    .join("");

  const tripRows = (data.trips ?? [])
    .slice(0, 50)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.jeepney_name)}</td>
          <td>${escapeHtml(item.plate_number)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${safeNumber(item.total_passengers)}</td>
          <td>${escapeHtml(item.driver_name)}</td>
          <td>${formatDate(item.departure_time)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 24px; }
  body { font-family: Arial, sans-serif; color: #17324d; font-size: 10px; }
  h1 { color: #087ea4; margin-bottom: 4px; }
  h2 { color: #087ea4; margin-top: 24px; border-bottom: 1px solid #cfeaf4; padding-bottom: 5px; }
  .meta { color: #5c7182; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #d7e8ef; border-radius: 8px; padding: 9px; }
  .label { color: #718391; font-size: 8px; text-transform: uppercase; }
  .value { font-size: 17px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #e7f6fb; color: #15546b; text-align: left; }
  th, td { border: 1px solid #d7e8ef; padding: 5px; vertical-align: top; }
  .footer { margin-top: 30px; color: #7a8a95; font-size: 8px; }
</style>
</head>
<body>
<h1>JeepQTrack Operational Report</h1>
<div class="meta">
  <strong>Period:</strong> ${escapeHtml(PERIOD_LABELS[report.period] || report.period)}<br/>
  <strong>Generated:</strong> ${escapeHtml(formatDate(report.generated_at))}<br/>
  <strong>Generated by:</strong> ${escapeHtml(report.generated_by_name || "Administrator")}
</div>

<div class="grid">
  <div class="card"><div class="label">Total Trips</div><div class="value">${safeNumber(stats.totalTrips)}</div></div>
  <div class="card"><div class="label">Completed Trips</div><div class="value">${safeNumber(stats.completedTrips)}</div></div>
  <div class="card"><div class="label">Passengers</div><div class="value">${safeNumber(stats.totalPassengers)}</div></div>
  <div class="card"><div class="label">Active Trips</div><div class="value">${safeNumber(stats.activeTrips)}</div></div>
  <div class="card"><div class="label">Avg Passengers</div><div class="value">${safeNumber(stats.averagePassengers).toFixed(1)}</div></div>
  <div class="card"><div class="label">Avg Trip</div><div class="value">${formatSeconds(stats.averageTripDuration)}</div></div>
  <div class="card"><div class="label">Avg Loading</div><div class="value">${formatSeconds(stats.averageLoadingDuration)}</div></div>
  <div class="card"><div class="label">Activity Logs</div><div class="value">${safeNumber(stats.totalActivityLogs)}</div></div>
</div>

<h2>Terminal Performance</h2>
<table><thead><tr><th>Terminal</th><th>Trips</th><th>Completed</th><th>Active</th><th>Passengers</th><th>Avg/Trip</th></tr></thead><tbody>${terminalRows || '<tr><td colspan="6">No terminal data.</td></tr>'}</tbody></table>

<h2>Daily Trip Summary</h2>
<table><thead><tr><th>Date</th><th>Trips</th><th>Completed</th><th>Passengers</th></tr></thead><tbody>${dailyRows || '<tr><td colspan="4">No daily trip data.</td></tr>'}</tbody></table>

<h2>Jeepney Performance</h2>
<table><thead><tr><th>Jeepney</th><th>Plate</th><th>Trips</th><th>Passengers</th><th>Avg/Trip</th><th>Avg Duration</th></tr></thead><tbody>${jeepneyRows || '<tr><td colspan="6">No jeepney data.</td></tr>'}</tbody></table>

<h2>Trip Report Log</h2>
<table><thead><tr><th>Jeepney</th><th>Plate</th><th>Status</th><th>Passengers</th><th>Driver</th><th>Departure</th></tr></thead><tbody>${tripRows || '<tr><td colspan="6">No trips.</td></tr>'}</tbody></table>

<h2>Activity Log</h2>
<table><thead><tr><th>Action</th><th>User</th><th>Description</th><th>Jeepney</th><th>Date</th></tr></thead><tbody>${activityRows || '<tr><td colspan="5">No activity logs.</td></tr>'}</tbody></table>

<div class="footer">Generated from the JeepQTrack cloud monitoring data. This report is a saved snapshot of the selected monitoring period.</div>
</body>
</html>`;
}

export async function exportReportToPdf(
  report: MonitoringReportLog,
): Promise<string> {
  const html = buildPdfHtml(report);
  const result = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: reportTitle(report),
      UTI: "com.adobe.pdf",
    });
  }

  return result.uri;
}

export async function exportReportToExcel(
  report: MonitoringReportLog,
): Promise<string> {
  const data = report.report_data || ({} as ReportSnapshot);
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["JeepQTrack Operational Report"],
    ["Period", PERIOD_LABELS[report.period] || report.period],
    ["Generated", formatDate(report.generated_at)],
    ["Generated By", report.generated_by_name || "Administrator"],
    [],
    ["Metric", "Value"],
    ["Total Trips", safeNumber(data.stats?.totalTrips)],
    ["Completed Trips", safeNumber(data.stats?.completedTrips)],
    ["Active Trips", safeNumber(data.stats?.activeTrips)],
    ["Total Passengers", safeNumber(data.stats?.totalPassengers)],
    ["Average Passengers", safeNumber(data.stats?.averagePassengers)],
    [
      "Average Trip Duration (seconds)",
      safeNumber(data.stats?.averageTripDuration),
    ],
    [
      "Average Loading Duration (seconds)",
      safeNumber(data.stats?.averageLoadingDuration),
    ],
    ["Active Jeepneys", safeNumber(data.stats?.activeJeepneys)],
    ["Total Jeepneys", safeNumber(data.stats?.totalJeepneys)],
    ["Total Activity Logs", safeNumber(data.stats?.totalActivityLogs)],
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.terminalStats ?? []),
    "Terminals",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.dailyTrips ?? []),
    "Daily Trips",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.jeepneyStats ?? []),
    "Jeepneys",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.dailyActivity ?? []),
    "Daily Activity",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.actionStats ?? []),
    "Actions",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.trips ?? []),
    "Trips",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.activityLogs ?? []),
    "Activity Logs",
  );

  const base64 = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "base64",
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `JeepQTrack_Report_${report.period}_${timestamp}.xlsx`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: reportTitle(report),
    });
  }

  return uri;
}
