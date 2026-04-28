/**
 * Read-only merge of task-like rows from module_settings JSON across the product environment.
 * Keep parsers tolerant of partial / legacy shapes.
 */

export type WorkItem = {
  id: string;
  source: string;
  sourceLabel: string;
  category: string;
  title: string;
  subtitle?: string;
  timeline?: string;
  status?: string;
  owner?: string;
  due?: string;
  dueTs: number | null;
  done: boolean;
  href: string;
  tags?: string[];
};

type SettingRow = { module: string; key: string; value_json: unknown };

const HREF: Record<string, string> = {
  gtm_planner: "/dashboard/gtm-planner",
  events: "/dashboard/events",
  content_studio: "/dashboard/content-studio",
  social_media: "/dashboard/social-media",
  design_assets: "/dashboard/design-assets",
  presentations: "/dashboard/presentations",
  campaigns: "/dashboard/campaigns",
  messaging_artifacts: "/dashboard/messaging-artifacts",
  positioning_studio: "/dashboard/positioning-studio"
};

const LABEL: Record<string, string> = {
  gtm_planner: "GTM Planner",
  events: "Events",
  content_studio: "Content Studio",
  social_media: "Social Media",
  design_assets: "Design & Assets",
  presentations: "Presentations",
  campaigns: "Campaigns",
  messaging_artifacts: "Messaging & Artifacts",
  positioning_studio: "Positioning Studio"
};

function dueTsFromIso(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t.length === 10 ? `${t}T12:00:00` : t);
  const n = d.getTime();
  return Number.isNaN(n) ? null : n;
}

/** If the string starts with YYYY-MM-DD, use it for sorting. */
function tryParseLeadingIsoDate(s: string): number | null {
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? dueTsFromIso(m[1]) : null;
}

function parseGtmPlan(value: unknown): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const v = value as Record<string, unknown>;
  const tasks = v.tasks;
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (!t || typeof t !== "object") continue;
      const x = t as { id?: string; label?: string; done?: boolean };
      const label = String(x.label ?? "").trim();
      if (!label) continue;
      const id = String(x.id ?? label);
      const done = Boolean(x.done);
      out.push({
        id: `gtm:task:${id}`,
        source: "gtm_planner",
        sourceLabel: LABEL.gtm_planner,
        category: "GTM task",
        title: label,
        status: done ? "Done" : "Open",
        dueTs: null,
        done,
        href: HREF.gtm_planner
      });
    }
  }
  const timeline = typeof v.timeline === "string" ? v.timeline.trim() : "";
  if (timeline) {
    out.push({
      id: "gtm:note:timeline",
      source: "gtm_planner",
      sourceLabel: LABEL.gtm_planner,
      category: "Timeline",
      title: "GTM plan — milestones",
      timeline: timeline.slice(0, 800),
      status: "Reference",
      dueTs: null,
      done: false,
      href: HREF.gtm_planner
    });
  }
  const stakeholders = typeof v.stakeholders === "string" ? v.stakeholders.trim() : "";
  if (stakeholders) {
    out.push({
      id: "gtm:note:stakeholders",
      source: "gtm_planner",
      sourceLabel: LABEL.gtm_planner,
      category: "Ownership",
      title: "GTM plan — stakeholders / RACI",
      subtitle: stakeholders.split("\n")[0]?.slice(0, 120),
      timeline: stakeholders.slice(0, 800),
      status: "Reference",
      dueTs: null,
      done: false,
      href: HREF.gtm_planner
    });
  }
  return out;
}

function migrateEventTask(raw: unknown): { id: string; label: string; done: boolean } | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return { id: raw, label: raw.trim(), done: false };
  }
  if (typeof raw === "object" && raw !== null && "label" in raw) {
    const x = raw as { id?: string; label?: string; done?: boolean };
    const label = String(x.label ?? "").trim();
    if (!label) return null;
    return { id: String(x.id ?? label), label, done: Boolean(x.done) };
  }
  return null;
}

function parseEventsWorkspace(value: unknown): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events)) return out;
  events.forEach((rawEv, idx) => {
    if (!rawEv || typeof rawEv !== "object") return;
    const ev = rawEv as Record<string, unknown>;
    const eventId = String(ev.id ?? `ev-${idx}`);
    const name = String(ev.name ?? "").trim();
    const eventDate = String(ev.eventDate ?? "").trim();
    const location = String(ev.location ?? "").trim();
    const prepPct = typeof ev.prepPct === "number" ? Math.round(ev.prepPct) : 0;
    const attendees = String(ev.attendees ?? "").trim();
    const timeline = String(ev.timeline ?? "").trim();
    const ownerLine = attendees.split("\n").map((l) => l.trim()).find(Boolean);

    if (name) {
      const parts = [eventDate, location].filter(Boolean).join(" · ");
      out.push({
        id: `event:summary:${eventId}`,
        source: "events",
        sourceLabel: LABEL.events,
        category: "Event",
        title: name,
        subtitle: parts || undefined,
        timeline: timeline ? timeline.slice(0, 500) : undefined,
        status: `${prepPct}% prep`,
        owner: ownerLine,
        due: eventDate || undefined,
        dueTs: tryParseLeadingIsoDate(eventDate),
        done: false,
        href: HREF.events,
        tags: location ? [location] : undefined
      });
    }

    const tasksRaw = ev.tasks;
    if (Array.isArray(tasksRaw)) {
      for (const tr of tasksRaw) {
        const task = migrateEventTask(tr);
        if (!task) continue;
        const label = task.label;
        if (!label) continue;
        out.push({
          id: `event:${eventId}:task:${task.id}`,
          source: "events",
          sourceLabel: LABEL.events,
          category: "Event task",
          title: label,
          subtitle: name ? `Event: ${name}` : undefined,
          status: task.done ? "Done" : "Open",
          owner: ownerLine,
          due: eventDate || undefined,
          dueTs: tryParseLeadingIsoDate(eventDate),
          done: task.done,
          href: HREF.events
        });
      }
    }
  });
  return out;
}

type QueueRow = Record<string, unknown>;

function parseQueueRow(r: QueueRow, fallbackId: string): {
  id: string;
  title: string;
  due: string;
  status: string;
  description: string;
  contentType: string;
  channel: string;
  audience: string;
  owner: string;
  reviewer: string;
  dueDate: string;
} {
  return {
    id: String(r.id ?? fallbackId),
    title: String(r.title ?? "").trim(),
    due: String(r.due ?? ""),
    status: String(r.status ?? "").trim() || "Planned",
    description: String(r.description ?? "").trim(),
    contentType: String(r.contentType ?? "").trim(),
    channel: String(r.channel ?? "").trim(),
    audience: String(r.audience ?? "").trim(),
    owner: String(r.owner ?? "").trim(),
    reviewer: String(r.reviewer ?? "").trim(),
    dueDate: String(r.dueDate ?? "").trim()
  };
}

function parseCreationWorkspace(
  value: unknown,
  source: keyof typeof HREF
): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const queue = (value as { queue?: unknown }).queue;
  if (!Array.isArray(queue)) return out;
  const href = HREF[source];
  const sourceLabel = LABEL[source];
  queue.forEach((raw, qi) => {
    if (!raw || typeof raw !== "object") return;
    const r = parseQueueRow(raw as QueueRow, `${source}-q${qi}`);
    const title = r.title || "Untitled piece";
    const dueTs = r.dueDate ? tryParseLeadingIsoDate(r.dueDate) ?? dueTsFromIso(r.dueDate) : null;
    const subtitleParts = [r.contentType, r.channel].filter(Boolean);
    const owner = r.owner || (r.reviewer ? `Reviewer: ${r.reviewer}` : undefined);
    out.push({
      id: `${source}:queue:${r.id}`,
      source,
      sourceLabel,
      category: "Creation queue",
      title,
      subtitle: subtitleParts.length ? subtitleParts.join(" · ") : r.due || undefined,
      timeline: r.description ? r.description.slice(0, 400) : undefined,
      status: r.status,
      owner,
      due: r.dueDate || r.due || undefined,
      dueTs,
      done: /published|live|done|shipped/i.test(r.status),
      href,
      tags: r.audience ? [r.audience] : undefined
    });
  });
  const calendar = typeof (value as { calendar?: string }).calendar === "string"
    ? (value as { calendar: string }).calendar.trim()
    : "";
  if (calendar && (source === "content_studio" || source === "social_media")) {
    out.push({
      id: `${source}:calendar`,
      source,
      sourceLabel,
      category: "Milestones",
      title: `${sourceLabel} — calendar notes`,
      timeline: calendar.slice(0, 800),
      status: "Reference",
      dueTs: null,
      done: false,
      href
    });
  }
  return out;
}

const COLUMN_LABEL: Record<string, string> = {
  planning: "Planning",
  "in-progress": "In progress",
  "in-review": "In review",
  live: "Live"
};

function parseCampaignsKanban(value: unknown): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const cols = (value as { columns?: Record<string, unknown[]> }).columns;
  if (!cols || typeof cols !== "object") return out;
  for (const colKey of Object.keys(cols)) {
    const cards = cols[colKey];
    if (!Array.isArray(cards)) continue;
    const colLabel = COLUMN_LABEL[colKey] ?? colKey;
    for (const c of cards) {
      if (!c || typeof c !== "object") continue;
      const card = c as { id?: string; title?: string; tags?: string[] };
      const title = String(card.title ?? "").trim();
      if (!title) continue;
      const id = String(card.id ?? title);
      const tags = Array.isArray(card.tags) ? card.tags.map(String) : [];
      const done = colKey === "live";
      out.push({
        id: `campaign:${colKey}:${id}`,
        source: "campaigns",
        sourceLabel: LABEL.campaigns,
        category: "Campaign",
        title,
        subtitle: `Column: ${colLabel}`,
        status: colLabel,
        dueTs: null,
        done,
        href: HREF.campaigns,
        tags: tags.length ? tags : undefined
      });
    }
  }
  return out;
}

function parseMessagingArtifacts(value: unknown): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return out;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as { id?: string; name?: string; segmentName?: string; status?: string; consistency?: number };
    const name = String(it.name ?? "").trim() || "Artifact";
    const id = String(it.id ?? name);
    const segment = String(it.segmentName ?? "").trim();
    const status = String(it.status ?? "Draft").trim();
    const consistency = typeof it.consistency === "number" ? it.consistency : undefined;
    out.push({
      id: `messaging:${id}`,
      source: "messaging_artifacts",
      sourceLabel: LABEL.messaging_artifacts,
      category: "Messaging",
      title: name,
      subtitle: segment ? `Segment: ${segment}` : undefined,
      status: consistency != null ? `${status} (${consistency}%)` : status,
      dueTs: null,
      done: /approved|live|published/i.test(status),
      href: HREF.messaging_artifacts,
      tags: segment ? [segment] : undefined
    });
  }
  return out;
}

function parsePositioningCanvas(value: unknown): WorkItem[] {
  const out: WorkItem[] = [];
  if (!value || typeof value !== "object") return out;
  const v = value as {
    doc?: Record<string, unknown>;
    health?: Record<string, unknown>;
    revision?: number;
  };

  const doc = v.doc ?? {};
  const target = String((doc as any).target ?? "").trim();
  const wedge = String((doc as any).wedge ?? "").trim();
  const category = String((doc as any).category ?? "").trim();

  const health = v.health ?? {};
  const clarity = typeof (health as any).clarity === "number" ? Math.round((health as any).clarity) : null;
  const differentiation =
    typeof (health as any).differentiation === "number"
      ? Math.round((health as any).differentiation)
      : null;
  const credibility =
    typeof (health as any).credibility === "number" ? Math.round((health as any).credibility) : null;
  const mmf =
    typeof (health as any).message_market_fit === "number"
      ? Math.round((health as any).message_market_fit)
      : null;

  const subtitleParts = [target, category].filter(Boolean).join(" · ");
  const statusParts = [
    clarity != null ? `Clarity ${clarity}%` : null,
    differentiation != null ? `Differentiation ${differentiation}%` : null,
    credibility != null ? `Credibility ${credibility}%` : null,
    mmf != null ? `MMF ${mmf}%` : null
  ].filter(Boolean) as string[];

  const title = wedge || target || "Positioning canvas";
  out.push({
    id: "positioning:canvas",
    source: "positioning_studio",
    sourceLabel: LABEL.positioning_studio,
    category: "Positioning",
    title,
    subtitle: subtitleParts || undefined,
    timeline: wedge ? `Wedge: ${wedge}` : undefined,
    status: statusParts.length ? statusParts.join(" · ") : "Reference",
    owner: "—",
    due: undefined,
    dueTs: null,
    done: false,
    href: HREF.positioning_studio
  });

  return out;
}

export function aggregateWorkFromSettings(rows: SettingRow[]): WorkItem[] {
  const items: WorkItem[] = [];
  for (const row of rows) {
    const { module, key, value_json: v } = row;
    try {
      if (module === "gtm_planner" && key === "plan") {
        items.push(...parseGtmPlan(v));
      } else if (module === "events" && key === "workspace") {
        items.push(...parseEventsWorkspace(v));
      } else if (module === "positioning_studio" && key === "canvas") {
        items.push(...parsePositioningCanvas(v));
      } else if (key === "workspace") {
        if (module === "content_studio") items.push(...parseCreationWorkspace(v, "content_studio"));
        else if (module === "social_media") items.push(...parseCreationWorkspace(v, "social_media"));
        else if (module === "design_assets") items.push(...parseCreationWorkspace(v, "design_assets"));
        else if (module === "presentations") items.push(...parseCreationWorkspace(v, "presentations"));
      } else if (module === "campaigns" && key === "kanban") {
        items.push(...parseCampaignsKanban(v));
      } else if (module === "messaging_artifacts" && key === "artifacts") {
        items.push(...parseMessagingArtifacts(v));
      }
    } catch {
      /* ignore malformed module JSON */
    }
  }

  return items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueTs != null && b.dueTs != null && a.dueTs !== b.dueTs) return a.dueTs - b.dueTs;
    if (a.dueTs != null && b.dueTs == null) return -1;
    if (a.dueTs == null && b.dueTs != null) return 1;
    return `${a.sourceLabel} ${a.title}`.localeCompare(`${b.sourceLabel} ${b.title}`);
  });
}

export function workSourcesSummary(items: WorkItem[]): { source: string; label: string; count: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    const cur = map.get(it.source) ?? { label: it.sourceLabel, count: 0 };
    cur.count += 1;
    map.set(it.source, cur);
  }
  return Array.from(map.entries())
    .map(([source, { label, count }]) => ({ source, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
