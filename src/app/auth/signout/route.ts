import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Use 303 (See Other) to force GET request on the redirected URL (/login)
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
