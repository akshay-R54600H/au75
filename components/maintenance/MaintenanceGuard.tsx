"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMaintenanceStatus } from "@/lib/hooks/useMaintenanceStatus";
import { useApp } from "@/lib/context/AppContext";
import MaintenanceScreen from "./MaintenanceScreen";

export default function MaintenanceGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useApp();
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/");
  const {
    maintenanceMode,
    title,
    message,
    updatedAt,
    isChecking,
    checkNow,
  } = useMaintenanceStatus(!isAdminRoute);

  // Admin and API routes are NEVER blocked by maintenance mode
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // If user is completely offline, retain existing offline behavior (showing cached app shell & last synced data)
  if (state.isOffline) {
    return <>{children}</>;
  }

  // When global maintenance mode is enabled, display the maintenance screen
  if (maintenanceMode) {
    return (
      <MaintenanceScreen
        title={title}
        message={message}
        updatedAt={updatedAt}
        onRefresh={checkNow}
        isChecking={isChecking}
      />
    );
  }

  return <>{children}</>;
}
