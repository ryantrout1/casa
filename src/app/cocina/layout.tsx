import "./admin.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Casa Rewards — Admin",
  // Keep this out of search engines while it's unauthenticated.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <div className="admin-bar">
        <div className="brand">Casa Rewards · Admin</div>
        <nav>
          <Link href="/cocina">Dashboard</Link>
          <Link href="/cocina/members">Members</Link>
          <Link href="/cocina/campaigns">Campaigns</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
