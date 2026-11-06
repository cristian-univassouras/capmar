import { API_URL, getJson } from "@/lib/api";

export type ProjectMetric = {
  project_id: number; name: string; category: string | null; rank: number;
  views: number; viewers: number; likes: number; dislikes: number; approval: number | null;
  like_events: number; dislike_events: number; vote_changes: number; undos: number;
  details: number; details_people: number; details_liked: number; link_clicks: number; avg_dwell_s: number | null;
};
export type DiscoverMetrics = {
  range: { since: string | null; until: string | null; source: string | null; first_event: string | null; last_event: string | null };
  totals: {
    people: number; visits: number; events: number; card_views: number; votes_cast: number; likes: number; dislikes: number;
    like_rate: number | null; votes_current: number; likes_current: number; vote_changes: number; people_who_changed: number;
    undos: number; drag_cancels: number; details_opens: number; link_clicks: number; signup_clicks: number; errors: number;
  };
  people: {
    voters: number; likers: number; dislikers: number; details: number; link_clicks: number; signups: number; undo: number;
    ranking: number; finished: number; no_vote: number; returned: number; logged_in: number;
  };
  engagement: {
    avg_votes_per_person: number | null; median_votes_per_person: number | null; avg_session_seconds: number | null;
    median_session_seconds: number | null; avg_seconds_to_first_vote: number | null;
    avg_decision_seconds: Record<string, number>; median_decision_seconds: Record<string, number>;
    avg_details_seconds: number | null; completion_rate: number | null; bounce_rate: number | null; details_rate: number | null;
    like_rate_with_details: number | null; like_rate_without_details: number | null;
    votes_distribution: { label: string; people: number }[];
  };
  funnel: { step: string; people: number }[];
  methods: { method: string; type: "like" | "dislike"; count: number }[];
  by_position: { start: number; votes: number; likes: number }[];
  devices: { device: string; os: string; browser: string; logged_in: boolean; returned: boolean; n: number }[];
  sources: { source: string; people: number; votes: number; likes: number }[];
  timeline: { bucket: string; people: number; events: number; likes: number; dislikes: number }[];
  peak: { bucket: string; people: number } | null;
  errors: { message: string; n: number }[];
  projects: ProjectMetric[];
};

export type ExportKind = "events" | "votes" | "sessions" | "projects";

function query(since: string | null, source: string | null, extra: Record<string, string> = {}) {
  const q = new URLSearchParams(extra);
  if (since) q.set("since", since);
  if (source) q.set("source", source);
  return q.toString();
}

export const getDiscoverMetrics = (since: string | null, source: string | null) =>
  getJson<DiscoverMetrics>("/admin/discover/metrics?" + query(since, source));

/** Baixa o CSV com o cookie de sessão e entrega ao navegador como arquivo. */
export async function downloadDiscoverCsv(kind: ExportKind, since: string | null, source: string | null) {
  const response = await fetch(`${API_URL}/admin/discover/export?` + query(since, source, { kind }), { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "Não foi possível exportar.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `capmar-descobrir-${kind}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
