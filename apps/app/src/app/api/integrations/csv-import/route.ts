import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export const runtime = "nodejs";
export const maxDuration = 30;

type CsvRow = Record<string, string>;
type ImportType = "contacts" | "deals" | "reviews" | "competitors";

function parseCsv(text: string): CsvRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function countByField(rows: CsvRow[], field: string): Array<{ value: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const v = (row[field] ?? "").trim();
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));
}

function findField(row: CsvRow, candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[\s_]/g, "") === c.toLowerCase().replace(/[\s_]/g, "")
    );
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return "";
}

function processContacts(rows: CsvRow[]) {
  const industries = countByField(
    rows,
    Object.keys(rows[0] ?? {}).find((k) => k.toLowerCase().includes("industry")) ?? "industry"
  );
  const titles = countByField(
    rows,
    Object.keys(rows[0] ?? {}).find((k) => k.toLowerCase().includes("title") || k.toLowerCase().includes("jobtitle")) ?? "jobtitle"
  );
  const companies = countByField(
    rows,
    Object.keys(rows[0] ?? {}).find((k) => k.toLowerCase().includes("company")) ?? "company"
  );
  const summary = `${rows.length} contacts imported. Top industries: ${
    industries
      .slice(0, 3)
      .map((i) => i.value)
      .join(", ") || "N/A"
  }. Top roles: ${
    titles
      .slice(0, 3)
      .map((t) => t.value)
      .join(", ") || "N/A"
  }.`;
  return {
    imported: rows.length,
    summary,
    data: { industries, titles, companies, rows: rows.slice(0, 50) }
  };
}

function processDeals(rows: CsvRow[]) {
  const stageField =
    Object.keys(rows[0] ?? {}).find((k) => k.toLowerCase().includes("stage")) ?? "dealstage";
  const amountField =
    Object.keys(rows[0] ?? {}).find(
      (k) => k.toLowerCase().includes("amount") || k.toLowerCase().includes("value")
    ) ?? "amount";
  const stages = countByField(rows, stageField);
  const totalValue = rows.reduce((sum, r) => {
    const v = parseFloat((r[amountField] ?? "").replace(/[$,]/g, "")) || 0;
    return sum + v;
  }, 0);
  const avgValue = rows.length > 0 ? totalValue / rows.length : 0;
  const summary = `${rows.length} deals imported. Pipeline value: $${Math.round(totalValue).toLocaleString()}. Avg deal: $${Math.round(avgValue).toLocaleString()}. Stages: ${
    stages
      .slice(0, 3)
      .map((s) => s.value)
      .join(", ") || "N/A"
  }.`;
  return {
    imported: rows.length,
    summary,
    data: { stages, total_value: totalValue, avg_value: avgValue, rows: rows.slice(0, 50) }
  };
}

function processReviews(rows: CsvRow[]) {
  const textField =
    Object.keys(rows[0] ?? {}).find(
      (k) =>
        k.toLowerCase().includes("review") ||
        k.toLowerCase().includes("text") ||
        k.toLowerCase().includes("body") ||
        k.toLowerCase().includes("content") ||
        k.toLowerCase().includes("comment")
    ) ?? Object.keys(rows[0] ?? {})[0] ?? "text";
  const notes = rows
    .slice(0, 100)
    .map((r) => r[textField] ?? "")
    .filter(Boolean);
  const summary = `${rows.length} reviews imported as research notes.`;
  return {
    imported: rows.length,
    summary,
    data: { notes, rows: rows.slice(0, 50) }
  };
}

function processCompetitors(rows: CsvRow[]) {
  const competitors = rows.slice(0, 50).map((r) => ({
    name: findField(r, ["name", "company", "competitor", "companyname"]),
    url: findField(r, ["url", "website", "domain", "websiteurl"]),
    description: findField(r, ["description", "about", "notes", "summary"]),
    source: "csv_import"
  }));
  const summary = `${rows.length} competitors imported.`;
  return {
    imported: rows.length,
    summary,
    data: { competitors }
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) {
      return NextResponse.json({ error: "No product/environment selected." }, { status: 400 });
    }
    const { environmentId } = selected;

    const formData = await req.formData();
    const file = formData.get("file");
    const type = (formData.get("type") as ImportType | null) ?? "contacts";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const validTypes: ImportType[] = ["contacts", "deals", "reviews", "competitors"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or has no data rows." }, { status: 400 });
    }

    let result: { imported: number; summary: string; data: unknown };
    switch (type) {
      case "contacts":
        result = processContacts(rows);
        break;
      case "deals":
        result = processDeals(rows);
        break;
      case "reviews":
        result = processReviews(rows);
        break;
      case "competitors":
        result = processCompetitors(rows);
        break;
      default:
        result = { imported: rows.length, summary: `${rows.length} rows imported.`, data: rows.slice(0, 50) };
    }

    const { error: saveErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "market_research",
      key: `csv_import_${type}`,
      value_json: result.data
    });
    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({ imported: result.imported, type, summary: result.summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
