import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, ScanSearch } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/analyses`);
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="history-page"
      className="mx-auto max-w-7xl px-6 py-16 lg:px-10"
    >
      <div className="mb-10">
        <div className="label-eyebrow text-primary">History</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
          Past audits
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          A running log of every visibility audit run on this device&apos;s session. Public MVP — nothing is behind a login.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <ScanSearch size={28} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display text-xl font-semibold">No audits yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Run your first audit to see it appear here.</p>
          <Link
            to="/"
            className="btn-hover mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Start audit <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/results/${item.id}`}
              data-testid={`history-item-${item.id}`}
              className="btn-hover rounded-2xl border border-border bg-card p-6 hover:border-primary/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${
                    item.overall_score >= 60
                      ? "bg-emerald-100 text-emerald-800"
                      : item.overall_score >= 30
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.overall_score}/100
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{item.entity_name}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={12} /> {item.location} · {item.category}
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.main>
  );
}
