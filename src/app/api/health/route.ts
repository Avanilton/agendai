import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/db";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "agendai",
    databaseConfigured: hasDatabaseUrl(),
    timestamp: new Date().toISOString(),
  });
}

