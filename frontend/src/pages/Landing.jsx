import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanSearch, Sparkles, ArrowRight, MapPin, Building2, Globe, Radar, Compass, Users, Bot, Send } from "lucide-react";
import AnalysisRunner from "@/components/AnalysisRunner";

const CATEGORY = "Halal Restaurant";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Landing() {
  const navigate = useNavigate();
  const [entityName, setEntityName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [running, setRunning] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!entityName.trim() || !location.trim()) {
      toast.error("Please fill in restaurant name and location");
      return;
    }
    setRunning(true);
    try {
      const { data } = await axios.post(`${API}/analyze`, {
        entity_name: entityName.trim(),
        location: location.trim(),
        category: CATEGORY,
        website_url: websiteUrl.trim() || null,
      }, { timeout: 180000 });
      navigate(`/results/${data.id}`, { state: { analysis: data } });
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Analysis failed. Please try again.";
      toast.error(msg);
      setRunning(false);
    }
  };

  return (
    <main data-testid="landing-page">
      <AnimatePresence>
        {running && <AnalysisRunner entityName={entityName} />}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1528862973381-9bc5ad6d4227"
            alt="mosque architecture"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 pb-24 pt-20 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pt-28">
          <div className="lg:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              <Sparkles size={14} />
              <span className="label-eyebrow">AI Visibility for Halal Restaurants</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              When Muslims search for halal,<br />
              <span className="text-primary">do AI tools recommend you?</span><br />
              <span className="text-accent">ChatGPT, Claude, Gemini</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Your halal restaurant is great. But are ChatGPT, Claude, and Google Gemini recommending you? When Muslim customers search for halal food on AI, most don't find you—even though you have real reviews, real ratings, and real customers. HalalRadar analyzes your visibility across all major AI tools and gives specific, actionable recommendations to get discovered. In 5 seconds, you'll know exactly where you're invisible to AI—and how to fix it.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Built by <a href="https://salmashafi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Salma Shafi</a>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Bot size={16} className="text-primary" /> Tests ChatGPT, Claude & Gemini</div>
              <div className="flex items-center gap-2"><Radar size={16} className="text-primary" /> 5 content clusters</div>
              <div className="flex items-center gap-2"><Compass size={16} className="text-primary" /> Actionable fixes</div>
            </div>
          </div>

          {/* FORM */}
          <div className="lg:col-span-5">
            <form
              onSubmit={submit}
              data-testid="analyze-form"
              className="rounded-2xl border border-border bg-card p-8 lg:p-10"
            >
              <div className="mb-6">
                <div className="label-eyebrow text-primary">Free · No sign-up</div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">Analyze your AI visibility</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Takes ~40 seconds. We compare Claude's knowledge to your real business data.
                </p>
              </div>

              <div className="space-y-5">
                <Field icon={<Building2 size={16} />} label="Restaurant name">
                  <Input
                    data-testid="input-entity-name"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="e.g. Sunrise Halal Grocery"
                    className="h-12 bg-input"
                    required
                  />
                </Field>

                <Field icon={<MapPin size={16} />} label="Location">
                  <Input
                    data-testid="input-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Paterson, NJ"
                    className="h-12 bg-input"
                    required
                  />
                </Field>

                <Field icon={<Globe size={16} />} label="Website (optional)">
                  <Input
                    data-testid="input-website"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-12 bg-input"
                  />
                </Field>
              </div>

              <Button
                type="submit"
                data-testid="submit-analyze"
                disabled={running}
                className="btn-hover mt-8 h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {running ? (
                  <>Analyzing…</>
                ) : (
                  <>
                    Get a free audit report <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-border/70 bg-secondary/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-24 lg:grid-cols-3 lg:px-10">
          <StepCard
            step="01"
            title="Real customer questions"
            body="We auto-generate 10 realistic queries Muslims ask when searching for halal restaurants: menu & offerings, location & hours, reviews, community vibes, and pricing."
            icon={<ScanSearch size={22} />}
          />
          <StepCard
            step="02"
            title="Probe AI tools with real search"
            body="Each question is sent to ChatGPT, Claude, and Google Gemini with web search enabled. We see exactly what these AI tools recommend and whether your restaurant gets discovered by real customer queries."
            icon={<Send size={22} />}
          />
          <StepCard
            step="03"
            title="Gap analysis & fixes"
            body="We compare what AI tools know about you to your actual business data (from Yelp/Google). Missing clusters get actionable content recommendations to improve visibility."
            icon={<Radar size={22} />}
          />
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <Label className="label-eyebrow flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StepCard({ step, title, body, icon }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-8 btn-hover hover:border-primary/40">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="font-display text-3xl font-bold text-muted-foreground/40">{step}</span>
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
