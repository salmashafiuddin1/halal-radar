import { Link, useLocation } from "react-router-dom";
import { ScanSearch } from "lucide-react";

export default function SiteNav() {
  const location = useLocation();
  const isActive = (p) => location.pathname === p;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="text-2xl">🎯</span>
          HalalRadar
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            data-testid="nav-analyze"
            className={`btn-hover rounded-full px-4 py-2 ${isActive("/") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Analyze
          </Link>
          <Link
            to="/history"
            data-testid="nav-history"
            className={`btn-hover rounded-full px-4 py-2 ${isActive("/history") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}
