// The `server-only` package throws when it is loaded anywhere but a server
// component. Five modules import it, so under Vitest they cannot be loaded at
// all, and the v8 coverage provider drops any file it cannot load. All five are
// untested, so dropping them removed them from the denominator and pushed the
// reported percentage above the truth.
//
// Aliasing the package to this empty module lets coverage instrument them. It
// changes no test behaviour: nothing under `src` that a test reaches imports
// `server-only`, and on the server the real package is itself a no-op.
export {};
