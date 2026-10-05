import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/server/adminAuth";
import { getAggregateAnalytics } from "@/lib/server/analyticsDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics
 * Returns anonymous aggregate usage statistics for the AU75 Admin Dashboard.
 * Strictly protected by existing admin session authentication.
 */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    const data = await getAggregateAnalytics();

    // Ensure we only return aggregate totals and trends, absolutely no identifiers
    return NextResponse.json(
      {
        totalUsers: data.totalUsers,
        usersWhoSynced: data.usersWhoSynced,
        totalSyncs: data.totalSyncs,
        activeToday: data.activeToday,
        activeThisWeek: data.activeThisWeek,
        activeThisMonth: data.activeThisMonth,
        syncAttempts: data.syncAttempts,
        successfulSyncs: data.successfulSyncs,
        failedSyncs: data.failedSyncs,
        syncSuccessRate: data.syncSuccessRate,
        dailyTrends: data.dailyTrends,
        source: data.source,
        lastUpdated: data.lastUpdated,
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[api/admin/analytics] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve aggregate analytics." },
      { status: 500 }
    );
  }
}
