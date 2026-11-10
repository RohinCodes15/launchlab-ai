# LaunchLab AI: 2-minute demo script

About 280 words, roughly 100–120 seconds spoken. Screen actions are in brackets. Use the built-in StudySwap demo project, which is fictional.

---

**[Landing page]**

"Hi, I'm Rohin. This is LaunchLab AI, a web app I built to help students turn a startup idea into a plan they can actually defend.

The problem: when students pitch ideas, they usually jump straight to the product and skip the hard parts, like checking whether anyone has the problem and whether the numbers work. LaunchLab walks you through those steps in order."

**[Dashboard → Explore the demo project → Idea]**

"It's built with Next.js, React and TypeScript, with Zod validating every piece of data. You start in Idea Studio: the problem, audience, solution and assumptions."

**[Coach → Get feedback]**

"The coach gives structured feedback. By default it runs offline with fixed rules, and it says so on every answer. I made it optional to plug in Claude, but I never present rule-based output as AI."

**[Validation → add contradicting evidence]**

"In the Validation Lab, your assumptions become hypotheses. When I record evidence against one, the next steps update. The app never invents interviews or results."

**[Finance → set cost above price]**

"Finance Studio models break-even and cash runway. If the cost per sale is higher than the price, it tells you break-even is impossible."

**[Pitch → Preview]**

"The tools connect: evidence, finances and personas can be added to the canvas and the pitch with one click, which exports to PDF."

**[Backup → Export]**

"There are no accounts, so everything stays in your browser, and you can export a backup file."

"The hardest part was protecting saved data. Every edit is validated before it's saved, and old projects still load after updates. I also wrote about 100 unit tests and a Playwright suite with accessibility checks.

I learned how much engineering goes into being honest with users, and into testing the things that only break in a real browser."

---

## Tips

- Practise once with a timer. Cut the Finance or Backup line if you run long.
- If asked "is it AI?": "The default coach is rule-based so it works for free and offline. There's an optional Claude integration behind a server-side route, off by default."
- If asked what you would add next: accounts with a real database, so projects sync across devices. Explain that you held off because a database without authentication would let anyone read anyone's data.
