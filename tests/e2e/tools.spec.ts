import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Explore the demo project" }).click();
  await expect(page.getByRole("heading", { name: "StudySwap" })).toBeVisible();
}

// Completed step tabs read "<name> (complete)" to screen readers.
const openTool = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Project steps" })
    .getByRole("link", { name: new RegExp(`^${name}( \\(complete\\))?$`) })
    .click();

async function capture(page: Page, name: string) {
  if (process.env.SCREENSHOTS && test.info().project.name === "desktop") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  }
}

test("validation lab: hypotheses, evidence, interviews, survey and experiments persist and reach the pitch", async ({
  page,
}) => {
  test.slow();
  await openDemo(page);
  await openTool(page, "Validation");

  await expect(page.getByLabel("Hypothesis 1", { exact: true })).toHaveValue(
    "Students will tutor a stranger in exchange for tutoring.",
  );
  await expect(page.getByText("Suggested draft").first()).toBeVisible();
  await page.getByLabel("Priority of hypothesis 1", { exact: true }).selectOption("high");

  await page
    .getByRole("textbox", { name: "Evidence", exact: true })
    .fill("2 of 3 juniors said they would not tutor a stranger.");
  await page.getByLabel("Evidence direction", { exact: true }).selectOption("contradicts");
  await page.getByLabel("Linked hypothesis", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add evidence", exact: true }).click();
  await expect(page.getByText("Evidence: 0 for · 1 against").first()).toBeVisible();
  await expect(page.getByText(/Evidence leans against/)).toBeVisible();

  await page.getByRole("button", { name: /\+ Tell me about the last time/ }).click();
  await expect(page.getByLabel("Interview question 1", { exact: true })).toHaveValue(
    /last time this problem/,
  );
  await page.getByLabel("Who you interviewed", { exact: true }).fill("Junior, chemistry student");
  await page
    .getByRole("textbox", { name: "Interview notes" })
    .fill("Missed office hours twice this month.");
  await page.getByRole("button", { name: "Save interview" }).click();
  await expect(page.getByText("Junior, chemistry student")).toBeVisible();

  await page
    .getByLabel("New survey question", { exact: true })
    .fill("How hard is it to get help before a test?");
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel(/^Answer to: How hard/).selectOption("4");
  await page.getByRole("button", { name: "Save response" }).click();
  await expect(page.getByText("Average 4.0 out of 5 from 1 answers.")).toBeVisible();

  await page.getByLabel("New experiment", { exact: true }).fill("Library sign-up sheet");
  await page.getByRole("button", { name: "Add", exact: true }).last().click();
  await page.getByLabel("Status of experiment 1", { exact: true }).selectOption("done");
  await expect(page.getByText(/Write down the result of “Library sign-up sheet”/)).toBeVisible();
  await capture(page, "validation-lab");

  await page.reload();
  await expect(page.getByText("Junior, chemistry student")).toBeVisible();
  await expect(page.getByLabel("Priority of hypothesis 1", { exact: true })).toHaveValue("high");

  await page.getByRole("button", { name: "Add evidence to pitch" }).click();
  await expect(page.getByText(/Added to the “What we still need to prove” slide/)).toBeVisible();
  await openTool(page, "Pitch");
  await expect(page.getByLabel("Content of slide 7, Validation plan", { exact: true })).toHaveValue(
    /1 interviews, 1 survey responses, 1 pieces of evidence/,
  );
});

test("finance studio: validated inputs, break-even, runway, chart, comparison and canvas integration", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Bracelets");
  await page.getByRole("button", { name: "Create project" }).click();
  await openTool(page, "Finance");

  await page.getByRole("button", { name: "Create a scenario" }).click();
  await expect(page.getByText("Illustrative estimates only.")).toBeVisible();
  const price = page.getByLabel("Price per sale ($)", { exact: true });
  await price.fill("5");
  await page.getByLabel("Cost per sale ($)", { exact: true }).fill("2");
  await page.getByLabel("Fixed costs per month ($)", { exact: true }).fill("30");
  const comparison = page.getByRole("region", { name: "Scenario comparison" });
  await expect(comparison.getByRole("row", { name: /Break-even sales/ })).toContainText(
    "10 sales a month",
  );

  await price.fill("-3");
  await expect(page.getByText("Must be 0 or more")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Price per sale ($)", { exact: true })).toHaveValue("5");

  await page.getByLabel("Cost per sale ($)", { exact: true }).fill("6");
  await expect(comparison.getByRole("row", { name: /Break-even sales/ })).toContainText(
    "Never: each sale loses money",
  );
  await page.getByLabel("Cost per sale ($)", { exact: true }).fill("2");

  await page.getByRole("button", { name: "Add scenario", exact: true }).click();
  await expect(comparison.getByRole("columnheader", { name: "Scenario 2" })).toBeVisible();
  await page.getByRole("button", { name: "Monthly profit" }).click();
  await expect(page.getByRole("button", { name: "Monthly profit" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const chart = page.getByRole("img", { name: /Monthly profit by month/ });
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status").filter({ hasText: "M1" })).toBeVisible();
  await page.getByText("Show the numbers as a table").click();
  await expect(page.getByRole("table", { name: "Monthly profit by month" })).toBeVisible();
  await capture(page, "finance-studio");

  await page.getByRole("button", { name: "Add to canvas: Base case" }).click();
  await expect(page.getByText(/Added “Base case” to your Revenue Streams/)).toBeVisible();
  await openTool(page, "Canvas");
  await expect(page.getByRole("textbox", { name: "Revenue Streams" })).toHaveValue(
    /Pricing assumption \(Base case\): \$5\.00 per sale/,
  );
});

test("pitch practice: offline feedback is labelled, saved to history and survives reload", async ({
  page,
}) => {
  await openDemo(page);
  await openTool(page, "Practice");

  await expect(
    page.getByText("Feedback comes from the offline checker: fixed rules, not an AI model."),
  ).toBeVisible();
  await expect(page.getByText("What problem does StudySwap solve, and who has it?")).toBeVisible();
  await page
    .getByRole("textbox", { name: /What problem does StudySwap solve/ })
    .fill(
      "Students at our school fall behind before every test because tutors cost money. We interviewed six students and four missed help last month.",
    );
  await page.getByRole("button", { name: "Get feedback" }).click();

  const latest = page.getByRole("region", { name: "Latest feedback" });
  await expect(latest.getByText("Offline coach · rule-based, not an AI model")).toBeVisible();
  await expect(latest.getByText("Clarity")).toBeVisible();
  await expect(
    latest.getByText("You pointed to something you actually did, which builds trust."),
  ).toBeVisible();
  await capture(page, "pitch-practice");

  await page.reload();
  await expect(page.getByRole("region", { name: "Your progress" })).toContainText(
    "1 answers practised",
  );
});

test("backup center: export, delete, import, merge duplicates, replace and reject bad files", async ({
  page,
}) => {
  test.slow();
  await openDemo(page);
  await openTool(page, "Personas");
  await expect(page.getByLabel("Name of persona 1", { exact: true })).toHaveValue("Draft persona");

  await page.goto("/backup");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export all projects \(1\)/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^launchlab-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(file).toMatchObject({ format: "launchlab-backup", version: 1 });
  expect(file.projects[0].name).toBe("StudySwap");
  expect(file.projects[0].personas).toHaveLength(1);

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Delete StudySwap" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click();
  await expect(page.getByRole("heading", { name: "Start with one idea." })).toBeVisible();

  await page.goto("/backup");
  const input = page.getByLabel("Backup file (.json)");
  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByText(/contains 1 readable project/)).toBeVisible();
  await page.getByRole("button", { name: "Import and merge" }).click();
  await expect(page.getByText("Added 1 project from backup.json.")).toBeVisible();

  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await page.getByRole("button", { name: "Import and merge" }).click();
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "StudySwap", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "StudySwap (imported)" })).toBeVisible();
  await page.getByRole("link", { name: "StudySwap", exact: true }).click();
  await openTool(page, "Personas");
  await expect(page.getByLabel("Name of persona 1", { exact: true })).toHaveValue("Draft persona");

  await page.goto("/backup");
  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await page.getByLabel(/^Replace/).check();
  await page.getByRole("button", { name: "Replace my projects" }).click();
  const dialog = page.getByRole("dialog", { name: "Replace all projects?" });
  await expect(dialog).toContainText("All 2 projects in this browser will be deleted");
  await dialog.getByRole("button", { name: "Replace my projects" }).click();
  await expect(page.getByText("Restored 1 project from backup.json.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "StudySwap (imported)" })).toBeHidden();

  await page.goto("/backup");
  await input.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{oops"),
  });
  await expect(page.getByText(/not valid JSON/)).toBeVisible();
});

test("personas, competitors, roadmap and lessons work together on one project", async ({
  page,
}) => {
  test.slow();
  await openDemo(page);

  await openTool(page, "Personas");
  await page.getByRole("button", { name: "Add persona" }).click();
  await page.getByLabel("Name of persona 2", { exact: true }).fill("Struggling sophomore");
  await expect(page.getByRole("region", { name: "Compare personas" })).toContainText(
    "Struggling sophomore",
  );
  await page.getByRole("button", { name: "Add to canvas" }).first().click();
  await expect(
    page.getByText("Added Draft persona to Customer Segments in the canvas."),
  ).toBeVisible();

  await openTool(page, "Competitors");
  await page.getByLabel("Competitor name", { exact: true }).fill("Paid tutoring");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .getByLabel("Source link for Paid tutoring", { exact: true })
    .fill("javascript:alert(1)");
  await expect(
    page.getByText("Only links starting with http:// or https:// are opened."),
  ).toBeVisible();
  await expect(page.locator("a[href^='javascript']")).toHaveCount(0);
  await page
    .getByLabel("Source link for Paid tutoring", { exact: true })
    .fill("https://example.com/tutoring");
  await expect(page.getByRole("link", { name: /Open source/ })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await page.getByLabel("New feature to compare", { exact: true }).fill("Free");
  await page.getByRole("button", { name: "Add feature" }).click();
  await page.getByLabel("StudySwap offers Free", { exact: true }).check();
  await expect(page.getByText("Only you").locator("..")).toContainText("Free");
  await page.getByRole("button", { name: "Draft from template" }).click();
  await expect(page.getByLabel("Positioning statement", { exact: true })).toHaveValue(
    /Unlike Paid tutoring, we offer Free/,
  );

  await openTool(page, "Roadmap");
  const backlog = page.getByRole("region", { name: "Backlog" });
  await expect(backlog.getByText("Suggested draft").first()).toBeVisible();
  await page.getByLabel("New task", { exact: true }).fill("Build sign-up page");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel(/Dependency of “Build sign-up page”/).selectOption({ index: 1 });
  await expect(
    backlog.getByRole("listitem").filter({ hasText: "Build sign-up page" }).getByText("Blocked"),
  ).toBeVisible();

  const move = page.getByRole("button", { name: "Move “Build sign-up page” to To do" });
  await move.focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "To do" })
      .getByLabel("Task “Build sign-up page”", { exact: true }),
  ).toBeVisible();
  await capture(page, "roadmap");

  await openTool(page, "Learn");
  await expect(
    page.getByRole("heading", { name: "Start with the problem, not the product" }),
  ).toBeVisible();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
  await page.getByLabel(/Sophomores in chemistry fall behind/).check();
  await page.getByLabel(/So you can check whether the problem is real/).check();
  await page.getByRole("button", { name: "Check answers" }).click();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await expect(
    page.getByRole("button", { name: /Start with the problem.*\(completed\)/ }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText(/1\/5 lessons/)).toBeVisible();
});

test("an over-limit list is refused instead of corrupting the project", async ({ page }) => {
  await openDemo(page);
  await openTool(page, "Finance");
  const add = page.getByRole("button", { name: "Add scenario", exact: true });
  for (let i = 0; i < 3; i++) await add.click();
  await expect(add).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Name of scenario 4", { exact: true })).toBeVisible();
});

test("the content security policy is sent and the app still runs under it", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text()))
      errors.push(message.text());
  });
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await page.getByRole("link", { name: "Start a project" }).click();
  await page.getByRole("button", { name: "Explore the demo project" }).click();
  await openTool(page, "Finance");
  await expect(page.getByRole("img", { name: /Cash balance by month/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("production basics: privacy page, icon, robots, sitemap and social preview", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link", { name: "Privacy" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your projects stay in your browser" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Privacy · LaunchLab AI");

  await page.goto("/");
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /opengraph-image/,
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /students/);

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/privacy</loc>");
  for (const asset of ["/icon.svg", "/opengraph-image.png"]) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
  }
});
