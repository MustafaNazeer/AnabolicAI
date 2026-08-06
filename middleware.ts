import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp } from "@/lib/security/csp";

export async function middleware(request: NextRequest) {
  // Minted per request. The CSP travels on the request headers because Next
  // reads it there during rendering to stamp the nonce onto its own inline
  // scripts; the copy on the response is what the browser enforces.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    preview: process.env.VERCEL_ENV === "preview",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  const response = await updateSession(request);
  response.headers.set("content-security-policy", csp);
  return response;
}

// Only genuine static files are excluded. An earlier blanket ".*\.png$" also
// excluded every nonexistent ".png" path, and those fall through to the app's
// 404, which is a real HTML document that then rendered without a CSP.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/.*|splash/.*|apple-icon\\.png$|icon\\.svg$).*)",
  ],
};
