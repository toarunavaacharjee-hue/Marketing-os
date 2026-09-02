import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "AI Marketing Workbench";
  const description = searchParams.get("description") ?? "The PMM + GTM operating layer";
  const type = searchParams.get("type") ?? "page";

  const badge =
    type === "template"
      ? "Template"
      : type === "vs"
        ? "Comparison"
        : type === "blog"
          ? "Blog"
          : type === "glossary"
            ? "Glossary"
            : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0f",
          padding: "60px 70px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7C4DFF 0%, #5c35c8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            AI
          </div>
          <span style={{ color: "#888", fontSize: 18, fontWeight: 500, letterSpacing: "-0.2px" }}>
            Marketing Workbench
          </span>
          {badge && (
            <div
              style={{
                marginLeft: 8,
                background: "rgba(124,77,255,0.15)",
                border: "1px solid rgba(124,77,255,0.35)",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 13,
                color: "#b8a4ff",
                letterSpacing: "0.02em",
              }}
            >
              {badge}
            </div>
          )}
        </div>

        {/* title */}
        <div
          style={{
            marginTop: 44,
            fontSize: title.length > 55 ? 42 : title.length > 40 ? 48 : 56,
            fontWeight: 700,
            color: "#f0f0f8",
            lineHeight: 1.1,
            maxWidth: 960,
            letterSpacing: "-1px",
          }}
        >
          {title}
        </div>

        {/* description */}
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "#666",
            lineHeight: 1.5,
            maxWidth: 820,
          }}
        >
          {description}
        </div>

        {/* bottom gradient bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, #7C4DFF 0%, #FF8F00 50%, #00BFA5 100%)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
