import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  return NextResponse.redirect(new URL(`/ir/${encodeURIComponent(sku)}/ml`, request.url), 302);
}
