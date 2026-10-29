import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";
import "./dashboard.css";

export const metadata: Metadata = { title: "Dashboard - Scam Shield" };

export default function DashboardPage() {
  return <Dashboard />;
}
