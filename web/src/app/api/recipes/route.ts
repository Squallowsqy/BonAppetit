import { NextResponse } from "next/server";
import { recipes } from "@/lib/catalog";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
  const limit = Number(url.searchParams.get("limit") || 24);

  if (ids?.length) {
    const list = ids
      .map((id) => recipes.find((r) => r.id === id || r.slug === id))
      .filter(Boolean)
      .map((r) => ({
        id: r!.id,
        slug: r!.slug,
        title_fr: r!.title_fr,
        prepMin: r!.prepMin,
        costBase: r!.costBase,
        baseServings: r!.baseServings,
      }));
    return NextResponse.json(list);
  }

  const list = recipes.slice(0, limit).map((r) => ({
    id: r.id,
    slug: r.slug,
    title_fr: r.title_fr,
    prepMin: r.prepMin,
    costBase: r.costBase,
    baseServings: r.baseServings,
  }));
  return NextResponse.json(list);
}
