import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, ScanSearch, Radar, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: ScanSearch, label: "Generating community questions" },
  { icon: Bot, label: "Querying Claude" },
  { icon: Radar, label: "Clustering results by theme" },
  { icon: CheckCircle2, label: "Drafting content recommendations" },
];

export default function AnalysisRunner({ entityName }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setActive((a) => Math.max(a, i)), i * 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      data-testid="analysis-runner"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-10">
        <div className="mb-6">
          <div className="label-eyebrow text-primary">Live probe in progress</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Auditing <span className="text-primary">{entityName || "your entity"}</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are asking Claude the same questions Muslims ask every day.
            This usually takes 20–40 seconds.
          </p>
        </div>

        <ul className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < active;
            const current = i === active;
            return (
              <li
                key={s.label}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  done
                    ? "border-primary/40 bg-primary/5"
                    : current
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-secondary/30"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : current
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {current ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    >
                      <Icon size={18} />
                    </motion.span>
                  ) : (
                    <Icon size={18} />
                  )}
                </span>
                <span className={`text-sm ${done ? "text-foreground" : current ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {current && (
                  <motion.span
                    className="ml-auto h-2 w-2 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
