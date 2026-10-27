import { NextResponse } from "next/server";
import { recipes } from "@/lib/catalog";

function toCard(r: (typeof recipes)[number]) {
  return {
    id: r.id,
    slug: r.slug,
    title_fr: r.title_fr,
    prepMin: r.prepMin,
    costBase: r.costBase,
    baseServings: r.baseServings,
    image: r.image ?? null,
    stepsCount: (r.steps_fr || []).length,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
  const limitRaw = Number(url.searchParams.get("limit") || 36);
  const offsetRaw = Number(url.searchParams.get("offset") || 0);
  const pageRaw = Number(url.searchParams.get("page") || 0);

  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 36));
  const offsetFromPage =
    pageRaw > 0 ? (Math.floor(pageRaw) - 1) * limit : NaN;
  const offset = Math.max(
    0,
    Number.isFinite(offsetFromPage)
      ? offsetFromPage
      : Number.isFinite(offsetRaw)
        ? Math.floor(offsetRaw)
        : 0
  );

  if (ids?.length) {
    const list = ids
      .map((id) => recipes.find((r) => r.id === id || r.slug === id))
      .filter(Boolean)
      .map((r) => toCard(r!));
    return NextResponse.json(list);
  }

  const total = recipes.length;
  const items = recipes.slice(offset, offset + limit).map(toCard);
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    items,
    total,
    limit,
    offset,
    page,
    pageCount,
    hasMore: offset + items.length < total,
  });
}
