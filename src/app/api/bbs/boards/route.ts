import { db } from "@/db";
import { forumBoards } from "@/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const boards = await db.select().from(forumBoards).orderBy(forumBoards.sortOrder);
  return NextResponse.json(boards);
}