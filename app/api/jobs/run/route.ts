import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledPublish } from "@/lib/publish/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Interner Job-Endpunkt (SPEC §2, §6). Der Container Apps Job „scheduler" ruft
// diesen Endpunkt alle 5 Minuten mit einem Shared Secret auf und weckt so die
// Web-Instanz. Verarbeitet fällige terminierte Beiträge.

function authorized(request: Request): boolean {
  const secret = process.env.JOB_SHARED_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-job-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  try {
    const result = await runScheduledPublish();
    return NextResponse.json({
      ok: true,
      published: result.published,
      publishedDispatches: result.publishedDispatches,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job fehlgeschlagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
