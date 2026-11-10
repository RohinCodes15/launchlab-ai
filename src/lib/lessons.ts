import type { Project } from "./schema";

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  body: string[];
  quiz: { question: string; options: string[]; answer: number; why: string }[];
  /** A real task in the student's own project. `tool` is the route segment ("" = Idea Studio). */
  task: { label: string; tool: string; isDone: (project: Project) => boolean };
};

export const LESSONS: Lesson[] = [
  {
    id: "problem-first",
    title: "Start with the problem, not the product",
    minutes: 4,
    body: [
      "Most first ideas begin as a product: “an app that…”. Strong ideas begin as a problem: a specific person, a specific frustration, and a reason it keeps happening.",
      "A good problem statement names who is affected, what goes wrong, how often, and what it costs them in time, money, or stress. It does not mention your solution at all.",
      "If you cannot describe the problem without describing your product, you may have a solution looking for a problem.",
    ],
    quiz: [
      {
        question: "Which is the strongest problem statement?",
        options: [
          "We are building an AI homework app.",
          "Sophomores in chemistry fall behind before tests because office hours fill up and tutors cost money.",
          "Everyone needs help with school.",
        ],
        answer: 1,
        why: "It names who, what goes wrong, when, and why, without mentioning a product.",
      },
      {
        question: "Why leave your product out of the problem statement?",
        options: [
          "To keep it secret from competitors.",
          "So you can check whether the problem is real before deciding how to solve it.",
          "Because judges dislike products.",
        ],
        answer: 1,
        why: "A problem that only makes sense with your product attached has not been tested on its own.",
      },
    ],
    task: {
      label: "Write your problem statement in Idea Studio",
      tool: "",
      isDone: (project) => project.idea.problem.trim().length > 0,
    },
  },
  {
    id: "know-your-customer",
    title: "Pick a customer you can actually reach",
    minutes: 4,
    body: [
      "“Everyone” is not a customer. The narrower your first audience, the easier it is to find them, talk to them, and build something they love.",
      "A persona is a short description of one kind of customer: their situation, goals, pains, and habits. Until you have talked to real people, a persona is a set of assumptions, and you should label it that way.",
      "A useful test: can you write down the names of ten real people who fit? If not, narrow further.",
    ],
    quiz: [
      {
        question: "Your persona is based only on your own guesses. What should you call it?",
        options: ["A fact", "An assumption to verify", "Market research"],
        answer: 1,
        why: "Until real people confirm it, it is an assumption. Labelling it keeps you honest.",
      },
    ],
    task: {
      label: "Create a persona in the Persona Builder",
      tool: "personas",
      isDone: (project) => project.personas.length > 0,
    },
  },
  {
    id: "test-assumptions",
    title: "Test your riskiest assumption first",
    minutes: 5,
    body: [
      "Every idea rests on assumptions: people have the problem, they will try something new, they will pay. A hypothesis is an assumption written so that it could be proven wrong.",
      "Rank assumptions by how badly the idea fails if they are false, and how unsure you are. The one that is both critical and uncertain is your riskiest. Test it first, with the cheapest experiment you can think of.",
      "In interviews, ask about the past (“tell me about the last time…”) rather than the future (“would you use…?”). People are polite about hypotheticals and honest about what they actually did.",
      "Record what you learn as evidence, including evidence against your idea. Evidence against you is the most valuable kind, because it is cheap to act on now.",
    ],
    quiz: [
      {
        question: "Which interview question gives the most reliable answer?",
        options: [
          "Would you use an app like this?",
          "Do you think this is a good idea?",
          "Tell me about the last time this happened. What did you do?",
        ],
        answer: 2,
        why: "Past behaviour is evidence. Opinions about a hypothetical product are mostly politeness.",
      },
      {
        question: "Three of five interviewees say they do not have the problem. What do you do?",
        options: [
          "Ignore it and interview friendlier people.",
          "Record it as evidence against the hypothesis and reconsider the audience or the problem.",
          "Delete the interviews.",
        ],
        answer: 1,
        why: "Contradicting evidence is information. Recording it lets you change course early.",
      },
    ],
    task: {
      label: "Add a hypothesis in the Validation Lab",
      tool: "validation",
      isDone: (project) => project.validation.hypotheses.length > 0,
    },
  },
  {
    id: "unit-economics",
    title: "Know your numbers: margin and break-even",
    minutes: 5,
    body: [
      "Variable costs rise with every sale (materials, payment fees). Fixed costs stay the same whether you sell one or one hundred (hosting, a booth fee).",
      "Contribution margin is price minus variable cost: what each sale contributes toward your fixed costs. If it is zero or negative, selling more only loses more.",
      "Break-even is the number of sales where total contribution covers fixed costs: fixed costs divided by contribution margin.",
      "Runway is how many months your cash lasts at the current rate. All of these are estimates built on your assumptions, so change the assumptions and see what moves.",
    ],
    quiz: [
      {
        question:
          "You sell bracelets for $5. Each costs $2 to make. Your stall costs $30 a month. How many must you sell to break even?",
        options: ["6", "10", "15"],
        answer: 1,
        why: "Margin is $5 − $2 = $3. $30 ÷ $3 = 10 bracelets.",
      },
      {
        question: "Your price equals your variable cost. What happens as you sell more?",
        options: [
          "You eventually break even.",
          "You never cover your fixed costs.",
          "Profit grows slowly.",
        ],
        answer: 1,
        why: "With a zero margin, no number of sales pays for fixed costs.",
      },
    ],
    task: {
      label: "Build a pricing scenario in the Finance Studio",
      tool: "finance",
      isDone: (project) => project.finance.scenarios.length > 0,
    },
  },
  {
    id: "tell-the-story",
    title: "Pitch with evidence, not adjectives",
    minutes: 4,
    body: [
      "A pitch is a short story: a real person with a real problem, what you are building, why it is different, and what you have learned so far.",
      "Judges and mentors trust evidence. “We interviewed eight classmates and five had this problem last month” beats “everyone needs this”.",
      "Say plainly what you do not know yet and how you will find out. That is a strength, because it shows you understand your own risks.",
    ],
    quiz: [
      {
        question: "Which line is most convincing in a student pitch?",
        options: [
          "This is a billion-dollar market.",
          "Five of the eight students we interviewed missed office hours last month.",
          "Our app is revolutionary.",
        ],
        answer: 1,
        why: "It is specific, modest, and something you actually observed.",
      },
    ],
    task: {
      label: "Answer a question in Pitch Practice",
      tool: "practice",
      isDone: (project) => project.practice.length > 0,
    },
  },
];

export function learningProgress(project: Project) {
  const done = LESSONS.filter((lesson) => project.learning.completed.includes(lesson.id)).length;
  return { done, total: LESSONS.length, percent: Math.round((done / LESSONS.length) * 100) };
}
