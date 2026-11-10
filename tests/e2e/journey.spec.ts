import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const IDEA = {
  "Problem statement":
    "Students at our school who fall behind in chemistry cannot afford a tutor, and office hours fill up before every test.",
  "Target audience":
    "Sophomores at one public high school who are struggling in chemistry this semester.",
  "Proposed solution": "A site that pairs students so each one teaches a subject they are good at.",
  Differentiation: "Unlike paid tutoring, the price is an hour of your own help.",
  Assumptions: "Students will tutor a stranger in exchange for tutoring.",
  "Success criteria": "Half of matched pairs complete a first session.",
};

/** Saves a screenshot into docs/ when SCREENSHOTS=1 is set (desktop only). */
async function capture(page: Page, name: string) {
  if (process.env.SCREENSHOTS && test.info().project.name === "desktop") {
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  }
}

async function createProject(page: Page, name: string) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(name);
  await page.getByLabel("One-line summary").fill("Trade tutoring hours instead of paying.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

const openStep = (page: Page, step: string) =>
  page.getByRole("navigation", { name: "Project steps" }).getByRole("link", { name: step }).click();

test("a student goes from idea to coached feedback, canvas, and an exported pitch", async ({
  page,
}) => {
  test.slow();

  await test.step("create a project and write the idea", async () => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Start with one idea." })).toBeVisible();
    await createProject(page, "TutorLoop");
    for (const [label, text] of Object.entries(IDEA)) await page.getByLabel(label).fill(text);
    await expect(page.getByText("Saved in this browser", { exact: true })).toBeVisible();
    await capture(page, "idea-studio");
  });

  await test.step("the idea survives a reload", async () => {
    await page.reload();
    await expect(page.getByLabel("Problem statement")).toHaveValue(IDEA["Problem statement"]);
    await expect(page.getByLabel("Success criteria")).toHaveValue(IDEA["Success criteria"]);
  });

  await test.step("get offline coach feedback and ask a follow-up", async () => {
    await openStep(page, "Coach");
    await page.getByRole("button", { name: "Get feedback" }).click();
    await expect(page.getByText("Idea review")).toBeVisible();
    await expect(
      page.getByText("Offline coach · rule-based, not an AI model").first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Problem clarity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Validation experiments" })).toBeVisible();
    await capture(page, "coach");

    await page.getByLabel("Ask a follow-up question").fill("How should I price this?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText("Follow-up: How should I price this?")).toBeVisible();
    await expect(page.getByText(/Pricing for TutorLoop is a hypothesis/)).toBeVisible();
  });

  await test.step("fill and edit the business model canvas", async () => {
    await openStep(page, "Canvas");
    await page.getByRole("button", { name: "Draft 9 empty blocks" }).click();
    await expect(page.getByRole("textbox", { name: "Customer Segments" })).toHaveValue(
      /Sophomores at one public high school/,
    );

    const channels = page.getByRole("textbox", { name: "Channels" });
    await channels.fill("Homeroom announcements and library posters.");
    await page.getByRole("button", { name: "Suggest a draft for Channels" }).click();
    const dialog = page.getByRole("dialog", { name: "Replace Channels?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(channels).toHaveValue("Homeroom announcements and library posters.");

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Channels" })).toHaveValue(
      "Homeroom announcements and library posters.",
    );
    await capture(page, "canvas");
  });

  await test.step("generate, edit, reorder and preview the pitch", async () => {
    await openStep(page, "Pitch");
    await page.getByRole("button", { name: "Generate pitch outline" }).click();
    await expect(page.getByRole("listitem").filter({ has: page.getByRole("textbox") })).toHaveCount(
      9,
    );
    await expect(page.getByLabel("Content of slide 1, Problem")).toHaveValue(
      IDEA["Problem statement"],
    );
    await expect(page.getByText("No unverified claims detected.")).toBeVisible();

    await page.getByLabel("Title of slide 1, Problem").fill("Chemistry help is out of reach");
    await page
      .getByLabel("Content of slide 1, Problem")
      .fill("90% of students cannot afford a tutor.");
    await expect(page.getByText("Unverified claim?")).toBeVisible();

    await page.getByRole("button", { name: "Move slide 1, Problem down" }).click();
    await expect(page.getByLabel("Title of slide 2, Problem")).toHaveValue(
      "Chemistry help is out of reach",
    );
    await capture(page, "pitch-builder");

    await page.getByRole("button", { name: "Preview" }).click();
    const preview = page.getByRole("dialog", { name: "Presentation preview" });
    await expect(preview.getByText("1 / 9")).toBeVisible();
    await preview.getByRole("button", { name: "Next" }).click();
    await expect(
      preview.getByRole("heading", { name: "Chemistry help is out of reach" }),
    ).toBeVisible();
    await preview.getByRole("button", { name: "Close" }).click();
  });

  await test.step("the exported PDF contains the student's slides", async () => {
    await page.emulateMedia({ media: "print" });
    const printed = page.locator(".print-slide");
    await expect(printed).toHaveCount(9);
    await expect(printed.nth(1)).toContainText("90% of students cannot afford a tutor.");
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeHidden();
    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
    await page.emulateMedia({ media: null });
  });

  await test.step("the dashboard shows progress and supports duplicate, archive and delete", async () => {
    await page.goto("/dashboard");
    await expect(page.getByText("100% complete")).toBeVisible();
    await capture(page, "dashboard");

    await page.getByRole("button", { name: "Duplicate TutorLoop" }).click();
    await expect(page.getByRole("link", { name: "TutorLoop (copy)" })).toBeVisible();

    await page.getByRole("button", { name: "Archive TutorLoop (copy)" }).click();
    await expect(page.getByRole("link", { name: "TutorLoop (copy)" })).toBeHidden();
    await page.getByLabel("Filter projects").selectOption("archived");
    await expect(page.getByRole("link", { name: "TutorLoop (copy)" })).toBeVisible();

    await page.getByRole("button", { name: "Delete TutorLoop (copy)" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click();
    await expect(page.getByText("No projects match this search or filter.")).toBeVisible();

    await page.getByLabel("Filter projects").selectOption("active");
    await page.getByLabel("Search projects").fill("nothing like this");
    await expect(page.getByRole("link", { name: "TutorLoop", exact: true })).toBeHidden();
  });
});

test("the demo project opens complete, with a printable canvas", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Explore the demo project" }).click();
  await expect(page.getByRole("heading", { name: "StudySwap" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Demo", { exact: true }).first()).toBeVisible();

  await openStep(page, "Canvas");
  await expect(page.getByRole("textbox", { name: "Revenue Streams" })).toHaveValue(
    /None during the pilot/,
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.getByText("StudySwap: Business Model Canvas")).toBeVisible();
  await expect(page.locator(".bmc .print-only").first()).toContainText("sophomores and juniors");
});

test("validation: a project needs a name, and an empty name is never saved", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText("Give your project a name")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByLabel("Project name").fill("Keeper");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByLabel("Project name").fill("");
  await expect(page.getByText("Give your project a name")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Project name")).toHaveValue("Keeper");
});

test("user text is rendered as text, never as HTML", async ({ page }) => {
  const payload = `<img src=x onerror="window.__xss=1">`;
  await createProject(page, payload);
  await page
    .getByLabel("Problem statement")
    .fill(`${payload} students struggle because tutoring costs money`);
  await openStep(page, "Pitch");
  await page.getByRole("button", { name: "Generate pitch outline" }).click();
  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: payload })).toBeVisible();
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
  expect(await page.locator("img[src='x']").count()).toBe(0);
});

test("projects are private to the browser that created them", async ({ page, browser }) => {
  await createProject(page, "Private idea");
  const url = page.url();

  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(url);

  await expect(stranger.getByRole("heading", { name: "Project not found." })).toBeVisible();
  await expect(stranger.getByText("Private idea")).toHaveCount(0);
});

test("the coach API rejects malformed input and exposes no secrets", async ({ request }) => {
  const bad = await request.post("/api/coach", { data: { name: "", idea: {} } });
  expect(bad.status()).toBe(400);

  const health = await request.get("/api/health");
  expect(await health.json()).toEqual({ status: "ok", ai: { mode: "offline" } });
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
});

test("an unknown address shows the not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`accessibility and layout: no axe violations or sideways scrolling (${theme})`, async ({
    page,
  }) => {
    test.slow(); // runs axe on all 14 screens
    await page.addInitScript((value) => localStorage.setItem("launchlab.theme", value), theme);
    const check = async (label: string) => {
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${label}: ${v.id} (${v.nodes[0]?.target})`)).toEqual(
        [],
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${label} scrolls sideways`).toBeLessThanOrEqual(0);
    };

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(500); // let the entrance fade finish so contrast is measured at full opacity
    await capture(page, `landing-${theme}`);
    await check("landing");

    await page.goto("/dashboard");
    await check("empty dashboard");
    await page.getByRole("button", { name: "Explore the demo project" }).click();
    await expect(page.getByLabel("Problem statement")).toBeVisible();
    await check("idea studio");

    await openStep(page, "Coach");
    await page.getByRole("button", { name: "Get feedback" }).click();
    await expect(page.getByRole("heading", { name: "Problem clarity" })).toBeVisible();
    await check("coach");

    await openStep(page, "Canvas");
    await expect(page.getByRole("textbox", { name: "Customer Segments" })).toBeVisible();
    await check("canvas");

    await openStep(page, "Pitch");
    await expect(page.getByLabel("Title of slide 1, Problem")).toBeVisible();
    await check("pitch");

    for (const [tool, ready] of [
      ["Validation", "Hypothesis 1"],
      ["Personas", "Name of persona 1"],
      ["Competitors", "Competitor name"],
      ["Finance", "Name of scenario 1"],
      ["Roadmap", "New task"],
      ["Practice", "Question category"],
    ] as const) {
      await openStep(page, tool);
      await expect(page.getByLabel(ready, { exact: true })).toBeVisible();
      await check(tool.toLowerCase());
    }
    await openStep(page, "Learn");
    await expect(page.getByRole("button", { name: "Check answers" })).toBeVisible();
    await check("learn");

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
    await check("privacy");

    await page.goto("/backup");
    await expect(page.getByLabel("Backup file (.json)")).toBeVisible();
    await check("backup");

    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "StudySwap" })).toBeVisible();
    await check("dashboard");
  });
}
