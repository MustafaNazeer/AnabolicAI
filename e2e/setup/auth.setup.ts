import { test as setup, expect } from "@playwright/test";
import { resetE2eAccount } from "./reset";
import { resolveE2eAccount, type E2eProject } from "./accounts";

// Runs once per browser project, before any spec in e2e/session. It reseeds
// that project's account so every run starts from identical known data, then
// signs in once and saves the session. Saving it means no spec ever signs in
// again, so the sign in rate limit of ten per ten minutes can never bite.
setup("reset the account and save a signed in session", async ({ page }, testInfo) => {
  // The setup projects are named "chromium-setup" and "webkit-setup".
  const project = testInfo.project.name.replace(/-setup$/, "") as E2eProject;
  const { email, password } = resolveE2eAccount(process.env, project);

  await resetE2eAccount(project);

  await page.goto("/sign-in");
  // The fields carry a placeholder and no label at all, so they are addressed
  // by placeholder. getByLabel finds nothing here.
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The dashboard heading. Only the dashboard renders it, so seeing it proves
  // the redirect landed rather than merely that some page rendered. Same
  // marker the Lighthouse harness has used since 2026-08-02.
  await expect(page.getByRole("heading", { name: "Recent workouts" })).toBeVisible({
    timeout: 30_000,
  });

  await page.context().storageState({ path: `e2e/.auth/${project}.json` });
});
