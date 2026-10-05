"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import {
  Users,
  UserCheck,
  Repeat,
  Flame,
  Calendar,
  TrendingUp,
  Shield,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  CalendarDays,
  Table,
  Loader2,
} from "lucide-react";
import type { AnalyticsAggregateDTO } from "@/lib/server/analyticsDb";

interface AdminAnalyticsProps {
  onSessionExpired?: () => void;
}

export default function AdminAnalytics({ onSessionExpired }: AdminAnalyticsProps) {
  const [data, setData] = useState<AnalyticsAggregateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/analytics", {
        headers: { "Cache-Control": "no-cache" },
        cache: "no-store",
      });

      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load analytics (HTTP ${res.status})`);
      }

      const json = (await res.json()) as AnalyticsAggregateDTO;
      setData(json);
    } catch (err) {
      console.error("[AdminAnalytics] Fetch error:", err);
      setError("Unable to load analytics data. Please check connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatTimestamp = (iso?: string) => {
    if (!iso) return "Unknown";
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Helper for KPI definitions as required in Part 13
  const TOOLTIP_DEFINITIONS: Record<string, string> = {
    totalUsers: "Unique App Users: Unique anonymous installations that have opened AU75.",
    usersWhoSynced: "Users Who Synced: Unique anonymous installations that have successfully synchronized at least once.",
    totalSyncs: "Total Syncs: Total number of successful synchronization operations.",
    activeToday: "Active Today: Unique anonymous installations that interacted with AU75 today.",
    activeThisWeek: "Active This Week: Unique anonymous installations that generated activity during the current week.",
    activeThisMonth: "Active This Month: Unique anonymous installations that generated activity during the current month.",
    syncSuccessRate: "Sync Success Rate: Percentage of synchronization attempts that completed successfully.",
  };

  const renderTooltip = (key: string) => {
    if (activeTooltip !== key) return null;
    return (
      <div
        role="tooltip"
        className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full z-30 w-64 rounded-xl border border-line bg-surface p-2.5 text-xs text-ink shadow-lg animate-fade-in"
      >
        <p className="font-medium leading-relaxed">{TOOLTIP_DEFINITIONS[key]}</p>
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-line" />
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 pt-4">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-marker">
            <Activity size={14} />
            Telemetry & Usage
          </span>
          <h2 className="font-hand text-3xl font-bold tracking-tight text-ink">
            Usage Analytics
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Privacy-first anonymous telemetry & aggregate reliability numbers
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.lastUpdated && (
            <span className="text-xs text-faint hidden sm:inline-block">
              Updated {formatTimestamp(data.lastUpdated)}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="text-xs"
            title="Refresh usage analytics"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh Analytics</span>
          </Button>
        </div>
      </div>

      {/* Privacy Notice Banner (Part 14) */}
      <div className="rounded-2xl border border-line bg-surface/70 p-4 text-xs text-muted flex items-start gap-3">
        <Shield size={16} className="text-marker shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-ink font-semibold">Privacy:</strong> AU75 analytics
          contain only anonymous aggregate usage statistics. No student IDs, passwords,
          attendance records, subjects, timetable information, OTPs, IP addresses, or
          personal information are collected for analytics.
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchAnalytics(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="card p-12 text-center flex flex-col items-center justify-center gap-3 border-2 border-line">
          <Loader2 size={24} className="animate-spin text-marker" />
          <p className="text-sm font-semibold text-muted">Loading aggregate usage statistics…</p>
        </div>
      )}

      {/* Analytics Content */}
      {data && (
        <div className="space-y-6">
          {/* Top KPI Cards (Row 1: Primary Metrics) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* KPI 1: Unique App Users */}
            <div className="card p-5 border-2 border-line flex flex-col justify-between relative">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Unique App Users</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTooltip(activeTooltip === "totalUsers" ? null : "totalUsers")
                    }
                    className="text-faint hover:text-ink transition p-1"
                    aria-label="Info"
                  >
                    <Info size={14} />
                  </button>
                  {renderTooltip("totalUsers")}
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="font-hand text-4xl font-bold text-ink">
                  {data.totalUsers.toLocaleString()}
                </div>
                <div className="rounded-xl bg-accent-soft p-2 text-pen">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted font-medium">
                Total unique installations
              </div>
            </div>

            {/* KPI 2: Users Who Synced */}
            <div className="card p-5 border-2 border-line flex flex-col justify-between relative">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Users Who Synced</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTooltip(activeTooltip === "usersWhoSynced" ? null : "usersWhoSynced")
                    }
                    className="text-faint hover:text-ink transition p-1"
                    aria-label="Info"
                  >
                    <Info size={14} />
                  </button>
                  {renderTooltip("usersWhoSynced")}
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="font-hand text-4xl font-bold text-success">
                  {data.usersWhoSynced.toLocaleString()}
                </div>
                <div className="rounded-xl bg-success-soft p-2 text-success">
                  <UserCheck size={20} />
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted font-medium">
                Completed at least 1 sync
              </div>
            </div>

            {/* KPI 3: Total Syncs */}
            <div className="card p-5 border-2 border-line flex flex-col justify-between relative">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Total Syncs</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTooltip(activeTooltip === "totalSyncs" ? null : "totalSyncs")
                    }
                    className="text-faint hover:text-ink transition p-1"
                    aria-label="Info"
                  >
                    <Info size={14} />
                  </button>
                  {renderTooltip("totalSyncs")}
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="font-hand text-4xl font-bold text-pen">
                  {data.totalSyncs.toLocaleString()}
                </div>
                <div className="rounded-xl bg-accent-soft p-2 text-pen">
                  <Repeat size={20} />
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted font-medium">
                Successful sync operations
              </div>
            </div>
          </div>

          {/* Active Users Grid (Row 2: Activity Windows) */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Active Today */}
            <div className="card p-4 border border-line bg-surface/80 flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow">Active Today</span>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === "activeToday" ? null : "activeToday")
                      }
                      className="text-faint hover:text-ink transition"
                      aria-label="Info"
                    >
                      <Info size={12} />
                    </button>
                    {renderTooltip("activeToday")}
                  </div>
                </div>
                <div className="font-hand text-3xl font-bold text-ink mt-1">
                  {data.activeToday.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                <Flame size={18} />
              </div>
            </div>

            {/* Active This Week */}
            <div className="card p-4 border border-line bg-surface/80 flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow">Active This Week</span>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === "activeThisWeek" ? null : "activeThisWeek")
                      }
                      className="text-faint hover:text-ink transition"
                      aria-label="Info"
                    >
                      <Info size={12} />
                    </button>
                    {renderTooltip("activeThisWeek")}
                  </div>
                </div>
                <div className="font-hand text-3xl font-bold text-ink mt-1">
                  {data.activeThisWeek.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-pen/10 p-2 text-pen">
                <Calendar size={18} />
              </div>
            </div>

            {/* Active This Month */}
            <div className="card p-4 border border-line bg-surface/80 flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow">Active This Month</span>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === "activeThisMonth" ? null : "activeThisMonth")
                      }
                      className="text-faint hover:text-ink transition"
                      aria-label="Info"
                    >
                      <Info size={12} />
                    </button>
                    {renderTooltip("activeThisMonth")}
                  </div>
                </div>
                <div className="font-hand text-3xl font-bold text-ink mt-1">
                  {data.activeThisMonth.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-marker/10 p-2 text-marker">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>

          {/* Synchronization Breakdown & Reliability (Part 7) */}
          <div className="card p-6 border-2 border-line space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <span className="eyebrow flex items-center gap-1.5">
                  <Repeat size={13} className="text-pen" />
                  Synchronization Reliability
                </span>
                <h3 className="font-hand text-2xl font-bold text-ink">
                  Sync Performance & Health
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Sync Success Rate:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 font-mono text-sm font-bold ${
                    data.syncSuccessRate >= 90
                      ? "bg-success-soft text-success border border-success/30"
                      : data.syncSuccessRate >= 75
                        ? "bg-warning-soft text-warning border border-warning/30"
                        : "bg-danger-soft text-danger border border-danger/30"
                  }`}
                >
                  {data.syncSuccessRate}%
                </span>
              </div>
            </div>

            {/* Visual Success Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted font-medium">
                <span>Reliability Meter</span>
                <span>{data.syncSuccessRate}% Successful</span>
              </div>
              <div className="h-3 w-full rounded-full bg-paper-edge overflow-hidden p-0.5 border border-line">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, data.syncSuccessRate))}%` }}
                />
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center gap-3">
                <div className="rounded-lg bg-success-soft p-2 text-success">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                    Successful Syncs
                  </span>
                  <span className="font-mono text-lg font-bold text-ink">
                    {data.successfulSyncs.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center gap-3">
                <div className="rounded-lg bg-danger-soft p-2 text-danger">
                  <XCircle size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                    Failed Syncs
                  </span>
                  <span className="font-mono text-lg font-bold text-ink">
                    {data.failedSyncs.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center gap-3">
                <div className="rounded-lg bg-accent-soft p-2 text-pen">
                  <Repeat size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                    Total Attempts
                  </span>
                  <span className="font-mono text-lg font-bold text-ink">
                    {data.syncAttempts.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Analytics Table */}
          <div className="card p-6 border-2 border-line space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <span className="eyebrow flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-marker" />
                  Daily Breakdown
                </span>
                <h3 className="font-hand text-2xl font-bold text-ink">
                  Daily Usage &amp; Sync Numbers
                </h3>
                <p className="text-xs text-muted">
                  Anonymous daily statistics for the last 14 days
                </p>
              </div>

              <div className="text-xs text-muted">
                Showing last <span className="font-semibold text-ink">14 days</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-line bg-surface/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface/90 text-muted">
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">
                      No. of Active Users
                    </th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">
                      Total No. of Syncs
                    </th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">
                      Unique Users
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(() => {
                    const sorted = [...data.dailyTrends].reverse();
                    const todayStr = new Date().toISOString().slice(0, 10);

                    return sorted.map((row) => {
                      const isToday = row.date === todayStr;

                      return (
                        <tr
                          key={row.date}
                          className={`transition hover:bg-surface/70 ${
                            isToday ? "bg-accent-soft/30 font-medium" : ""
                          }`}
                        >
                          {/* Date column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink">
                                {row.label} ({row.date})
                              </span>
                              {isToday && (
                                <span className="rounded-md bg-marker/15 px-1.5 py-0.5 text-[10px] font-bold text-marker">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* No of active users column */}
                          <td className="py-3 px-4 text-right font-mono text-sm">
                            <span
                              className={
                                row.activeUsers > 0 ? "font-bold text-ink" : "text-faint"
                              }
                            >
                              {row.activeUsers.toLocaleString()}
                            </span>
                          </td>

                          {/* Total no of syncs column */}
                          <td className="py-3 px-4 text-right font-mono text-sm">
                            <span
                              className={
                                row.totalSyncs > 0 ? "font-bold text-pen" : "text-faint"
                              }
                            >
                              {row.totalSyncs.toLocaleString()}
                            </span>
                          </td>

                          {/* Unique users column */}
                          <td className="py-3 px-4 text-right font-mono text-sm">
                            <span
                              className={
                                row.uniqueUsers > 0 ? "font-bold text-marker" : "text-faint"
                              }
                            >
                              {row.uniqueUsers.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-surface/90 font-bold text-ink">
                    <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-muted">
                      14-Day Totals
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      {data.dailyTrends
                        .reduce((sum, r) => sum + r.activeUsers, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-pen">
                      {data.dailyTrends
                        .reduce((sum, r) => sum + r.totalSyncs, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-marker">
                      {data.totalUsers.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
