import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowLeft, CheckCircle2, XCircle, Lightbulb, MapPin } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const preloaded = location.state?.analysis;
  const [data, setData] = useState(preloaded || null);
  const [loading, setLoading] = useState(!preloaded);

  useEffect(() => {
    if (preloaded) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/analyses/${id}`);
        setData(data);
      } catch (e) {
        toast.error("Could not load analysis");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, preloaded]);

  if (loading) return <div className="mx-auto max-w-7xl px-6 py-24 text-muted-foreground">Loading…</div>;
  if (!data) return <div className="mx-auto max-w-7xl px-6 py-24 text-muted-foreground">No data.</div>;

  const radarData = data.cluster_scores.map((c) => ({
    cluster: c.label.replace(" & ", " &\n"),
    Visibility: c.visibility_pct,
    fullMark: 100,
  }));
  const visibleCount = data.questions.filter((q) => q.mentioned).length;
  const invisibleCount = data.questions.length - visibleCount;
  const pieData = [
    { name: "Mentioned", value: visibleCount },
    { name: "Not found", value: invisibleCount },
  ];
  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--border))"];

  const scoreColor =
    data.overall_score >= 60
      ? "text-emerald-700"
      : data.overall_score >= 30
        ? "text-amber-600"
        : "text-red-600";

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.entity_name.replace(/\s+/g, "-")}-visibility-audit.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit report downloaded. PDF export coming soon.");
  };

  return (
    <motion.main
      data-testid="results-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16"
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          to="/"
          data-testid="back-link"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> New audit
        </Link>
        <Button
          data-testid="download-report"
          onClick={downloadReport}
          className="btn-hover rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Download size={16} className="mr-2" /> Download report
        </Button>
      </div>

      {/* Header + Score */}
      <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="label-eyebrow text-primary">Visibility Audit</div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
            {data.entity_name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {data.location}</span>
            <Badge variant="outline" className="rounded-full">{data.category}</Badge>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-8">
            <div>
              <div className="label-eyebrow text-muted-foreground">Overall visibility</div>
              <div className={`mt-2 font-display text-7xl font-bold tracking-tighter ${scoreColor}`} data-testid="overall-score">
                {data.overall_score}
                <span className="text-3xl text-muted-foreground">/100</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Percentage of community questions where AI tools discovered your entity.
            </p>
          </div>
        </div>
      </section>

      {/* Visibility Gap Analysis */}
      {data.claude_visibility_gap && (
        <section className="mb-12">
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="mb-4">
              <div className="label-eyebrow text-accent">AI Tools vs Public Data</div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
                The visibility gap
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What AI Sees</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{data.claude_visibility_gap}</p>
              </div>
              <div className="rounded-lg border border-emerald-300/50 bg-emerald-50/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Customer Impact</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{data.estimated_customer_impact}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Public Business Data */}
      {data.business_data && (
        <section className="mb-12">
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="mb-4">
              <div className="label-eyebrow text-primary">What Yelp & Google show</div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
                Your public business data
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.business_data.rating && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Rating</p>
                  <p className="mt-2 font-display text-2xl font-bold text-foreground">{data.business_data.rating}</p>
                  {data.business_data.review_count && <p className="text-xs text-muted-foreground">({data.business_data.review_count} reviews)</p>}
                </div>
              )}
              {data.business_data.address && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Location</p>
                  <p className="mt-2 text-sm text-foreground">{data.business_data.address}</p>
                </div>
              )}
              {data.business_data.hours && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Hours</p>
                  <p className="mt-2 text-sm text-foreground">{data.business_data.hours}</p>
                </div>
              )}
              {data.business_data.menu_highlights && data.business_data.menu_highlights.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Highlights</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {data.business_data.menu_highlights.slice(0, 3).map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Charts */}
      <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <div className="mb-4">
            <div className="label-eyebrow text-primary">Cluster visibility</div>
            <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
              Where AI can & can&apos;t find you
            </h3>
          </div>
          <div className="h-72" data-testid="radar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="cluster" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar
                  name="Visibility"
                  dataKey="Visibility"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <div className="mb-4">
            <div className="label-eyebrow text-accent">Question breakdown</div>
            <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
              Mentioned vs. missed
            </h3>
          </div>
          <div className="h-72" data-testid="visibility-pie-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Cluster recommendations */}
      <section className="mb-12">
        <div className="mb-6">
          <div className="label-eyebrow text-primary">Content prescriptions</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            What to publish, cluster by cluster
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.cluster_scores.map((c) => (
            <div key={c.cluster_id} data-testid={`cluster-${c.cluster_id}`} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold tracking-tight">{c.label}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    c.visibility_pct >= 50
                      ? "bg-emerald-100 text-emerald-800"
                      : c.visibility_pct > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {c.visibility_pct}% visible
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.visible_questions}/{c.total_questions} questions mentioned you
              </p>
              <div className="mt-4 flex gap-3 rounded-xl bg-secondary/60 p-4">
                <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-accent" />
                <p className="text-sm leading-relaxed text-foreground">{c.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Questions accordion */}
      <section>
        <div className="mb-6">
          <div className="label-eyebrow text-accent">The questions we asked</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            See every AI answer
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Expand any question to read exactly what the AI tools answered and whether your entity was mentioned.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full" data-testid="questions-accordion">
          {data.questions.map((q, i) => (
            <AccordionItem
              key={i}
              value={`q-${i}`}
              className="mb-3 overflow-hidden rounded-xl border border-border bg-card"
            >
              <AccordionTrigger
                data-testid={`question-trigger-${i}`}
                className="px-6 py-4 text-left hover:no-underline"
              >
                <div className="flex flex-1 items-start gap-3 pr-4">
                  {q.mentioned ? (
                    <CheckCircle2 size={18} className="mt-1 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle size={18} className="mt-1 flex-shrink-0 text-red-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{q.question}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {clusterLabel(data.cluster_scores, q.cluster_id)}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div
                  className={`rounded-xl border p-4 ${
                    q.mentioned
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-border bg-secondary/30"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label-eyebrow text-foreground">AI Tools Response</span>
                    {q.mentioned ? (
                      <Badge className="bg-emerald-600">Mentioned</Badge>
                    ) : (
                      <Badge variant="outline">Missed</Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{q.snippet}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </motion.main>
  );
}

function clusterLabel(clusters, id) {
  const c = clusters.find((x) => x.cluster_id === id);
  return c ? c.label : id;
}
