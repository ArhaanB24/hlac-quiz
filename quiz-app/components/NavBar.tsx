"use client";

/** Top navigation shared by the participant quiz and the organiser dashboard. */
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const path = usePathname();
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">🛡️</span> Scam Shield</Link>
        <nav aria-label="Main">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>Quiz</Link>
          <Link href="/dashboard" aria-current={path.startsWith("/dashboard") ? "page" : undefined}>Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
