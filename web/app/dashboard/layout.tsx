import type { Metadata } from "next";
import DashboardShell from "@/app/components/DashboardShell";

// Back-office : jamais dans les moteurs de recherche.
export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
