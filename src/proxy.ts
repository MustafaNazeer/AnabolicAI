import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { buildCsp } from "@/lib/security/csp";

export async function proxy(request: NextRequest) {
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

// Only genuine static files are excluded, and only the ones that actually
// exist. An earlier blanket ".*\.png$" excluded every nonexistent ".png" path,
// and the "icons/" and "splash/" directory prefixes that replaced it did the
// same thing one directory narrower. Both fall through to the app's 404, which
// is a real HTML document that then rendered without a policy.
//
// Next requires this matcher to be a constant, so it cannot import
// IPHONE_SPLASH or THEMES and will drift silently when a device or an accent is
// added. Both directions of that drift are caught in
// src/lib/brand/__tests__/generated-assets.test.ts: one case asserts every
// generated filename still matches a shape here, and another reads this file
// and asserts the shapes themselves are still present.
//
// The per accent home screen icon set needs a pattern of its own, because
// "apple-icon\.png$" below does not match a name with a theme suffix, and a
// miss here is invisible: the file would 307 to /sign-in for a signed out
// visitor and the install would silently take no icon at all.
//
// The accents are enumerated rather than written as "[a-z]+" on purpose, the
// same way the icon sizes are. A shape would also exclude
// "/icons/apple-icon-nope.png", which has no file behind it, and that falls
// through to the app's 404: a real HTML document rendered with no policy,
// which is the exact defect the note above describes. Adding a sixth accent
// therefore means adding it here too, and generated-assets.test.ts fails until
// it is.
//
// Keep the "$" anchors and keep this matching the pathname only. Next stamps a
// cache busting query on metadata icon hrefs, so the browser requests
// "/icon.svg?icon.<hash>.svg", and an anchored pattern run against a full URL
// would never match.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|sw\\.js$|manifest\\.webmanifest$|icons/icon-(?:192|512|maskable-512)\\.png$|icons/apple-icon-(?:cobalt|magenta|emerald|crimson|rose)\\.png$|splash/splash-\\d+x\\d+\\.png$|apple-icon\\.png$|icon\\.svg$).*)",
  ],
};
