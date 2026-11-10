import type { Answer, CoachRequest, Review } from "../schema";
import type { CoachProvider } from "./provider";

/**
 * The offline coach: fixed rules over the student's own text. It is deterministic,
 * needs no network or API key, and is always labelled as rule-based in the UI.
 * It never states facts about markets or competitors, only questions and hypotheses.
 */

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const blank = (text: string) => text.trim().length === 0;
const listItems = (text: string) =>
  text
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
const shorten = (text: string, max = 90) => {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

const BROAD_AUDIENCE =
  /\b(everyone|everybody|anyone|anybody|all (people|students|teens|teenagers)|the world|people|users)\b/i;
const SOLUTION_WORDS = /\b(app|platform|website|software|tool|ai|chatbot|marketplace)\b/i;
const CONSEQUENCE_WORDS =
  /\b(because|so that|costs?|wastes?|hours?|every (day|week|month)|struggle|can't|cannot|hard to|afford|miss|late|stress)/i;
const SUPERLATIVES = /\b(best|first|only|unique|better|faster|cheaper|easier|revolutionary)\b/gi;
const HAS_NUMBER = /\d/;
const MINORS =
  /\b(students?|teens?|teenagers?|kids?|children|high school|middle school|minors?)\b/i;

const MIN_PROBLEM_WORDS = 12;

function assessProblem(idea: CoachRequest["idea"]): Review["problemClarity"] {
  if (blank(idea.problem)) {
    return {
      score: 1,
      assessment:
        "There is no problem statement yet. Start with one or two sentences about what goes wrong, for whom, and how often.",
    };
  }
  const checks: [passed: boolean, advice: string][] = [
    [
      wordCount(idea.problem) >= MIN_PROBLEM_WORDS,
      "add detail about when and how often it happens",
    ],
    [!blank(idea.audience), "name who has this problem"],
    [
      CONSEQUENCE_WORDS.test(idea.problem),
      "say what it costs people (time, money, stress, a missed chance)",
    ],
    [!SOLUTION_WORDS.test(idea.problem), "describe the pain without mentioning your product"],
  ];
  const gaps = checks.filter(([passed]) => !passed).map(([, advice]) => advice);
  return {
    score: 1 + checks.length - gaps.length,
    assessment:
      gaps.length === 0
        ? "The problem statement names a specific pain and its consequence without leaning on the solution. Now check whether real people describe it the same way."
        : `To sharpen the problem statement: ${gaps.join("; ")}.`,
  };
}

function assessSegment(idea: CoachRequest["idea"]): Review["customerSegment"] {
  if (blank(idea.audience)) {
    return {
      assessment:
        "No target audience is written down yet, so there is no one to test the idea with.",
      suggestions: [
        "Name one group you could reach this week, such as a class, a club, or a team.",
        "Describe them by situation (what they are trying to do), not only by age.",
      ],
    };
  }
  if (BROAD_AUDIENCE.test(idea.audience) || wordCount(idea.audience) < 6) {
    return {
      assessment:
        "The audience reads as broad. A broad audience is hard to find and hard to interview, so early feedback will be vague.",
      suggestions: [
        "Pick the narrowest group that feels the problem most often and start only with them.",
        "Add a situation: where they are and what they are doing when the problem shows up.",
        "Write down the names of 10 real people who fit. If you cannot, narrow further.",
      ],
    };
  }
  return {
    assessment:
      "The audience is specific enough to go and find. Whether they actually have this problem is still a hypothesis until you talk to them.",
    suggestions: [
      "List 10 real people who fit this description and ask five of them for a 15-minute conversation.",
      "Decide who is not your customer yet, so you can say no to distractions.",
    ],
  };
}

function suggestDifferentiation(idea: CoachRequest["idea"]): string[] {
  if (blank(idea.differentiation)) {
    return [
      "Write down what people do today instead of using your idea. Doing nothing counts as an alternative.",
      "Finish this sentence: “Unlike [what they use now], we [one specific difference].”",
    ];
  }
  const claims = [
    ...new Set((idea.differentiation.match(SUPERLATIVES) ?? []).map((w) => w.toLowerCase())),
  ];
  return [
    ...(claims.length > 0
      ? [
          `Words like “${claims.join("”, “")}” are claims. Say compared to what, and how you would show it.`,
        ]
      : []),
    "Ask three target users to explain, in their own words, why they would switch. Use their wording.",
    "Pick one difference you could demonstrate in under a minute, and lead with that.",
  ];
}

function suggestBusinessModels(idea: CoachRequest["idea"]): string[] {
  const forMinors = MINORS.test(`${idea.audience} ${idea.problem}`);
  return [
    ...(forMinors
      ? [
          "Hypothesis: the user and the payer are different people. Students use it; a school, club, or parent pays.",
        ]
      : []),
    "Hypothesis: free core product, with a paid extra once people rely on it.",
    "Hypothesis: a small subscription, if the problem comes back every week.",
    "Hypothesis: a one-time price, if people only need it once.",
    "None of these are tested. Ask users what they spend today, in money or time, to deal with the problem.",
  ];
}

function findRisks(idea: CoachRequest["idea"]): Review["risks"] {
  const everything = Object.values(idea).join(" ");
  const risks: Review["risks"] = [];
  if (blank(idea.assumptions)) {
    risks.push({
      risk: "No assumptions are written down, so the riskiest one is untested and invisible.",
      severity: "high",
    });
  }
  if (blank(idea.audience) || BROAD_AUDIENCE.test(idea.audience)) {
    risks.push({
      risk: "The audience is undefined or very broad, so it will be hard to find early users.",
      severity: "high",
    });
  }
  if (HAS_NUMBER.test(everything)) {
    risks.push({
      risk: "Your notes contain numbers. Unless each has a source or is labelled as a goal, a judge will question it.",
      severity: "medium",
    });
  }
  if (MINORS.test(everything)) {
    risks.push({
      risk: "Your users may be under 18. Collecting their data can require a parent's or school's permission. Ask a teacher or adviser before you collect anything.",
      severity: "medium",
    });
  }
  if (blank(idea.successCriteria)) {
    risks.push({
      risk: "Without success criteria you cannot tell a promising test from a failed one.",
      severity: "medium",
    });
  }
  risks.push({
    risk: "Building before validating: the most common risk is spending weeks on a product nobody asked for.",
    severity: blank(idea.solution) ? "low" : "medium",
  });
  return risks;
}

function planExperiments(idea: CoachRequest["idea"]): Review["experiments"] {
  const who = blank(idea.audience)
    ? "people who might have this problem"
    : shorten(idea.audience, 70);
  const firstAssumption = listItems(idea.assumptions)[0];
  return [
    {
      title: "Five problem interviews",
      how: `Talk to five of: ${who}. Ask about the last time the problem happened. Do not pitch your idea.`,
      measure: "How many bring up the problem themselves, and what they did about it.",
    },
    {
      title: "Sign-up test",
      how: "Describe the idea on one page or a paper sign-up sheet and ask people to leave a contact to try it.",
      measure:
        "Sign-ups out of the number of people who saw it. Set your own target before you start.",
    },
    {
      title: "Do it by hand first",
      how: "Deliver the solution manually for two or three users before building anything.",
      measure: "Whether they come back or ask for it a second time.",
    },
    ...(firstAssumption
      ? [
          {
            title: "Test your first assumption",
            how: `You wrote: “${shorten(firstAssumption)}”. Design the smallest test that could prove this wrong within a week.`,
            measure: "A result you agreed on in advance that would change your mind.",
          },
        ]
      : []),
  ];
}

function planNextSteps(idea: CoachRequest["idea"]): string[] {
  const fieldSteps: [missing: boolean, step: string][] = [
    [blank(idea.problem), "Write the problem statement: who, what goes wrong, how often."],
    [blank(idea.audience), "Define a target audience you could reach this week."],
    [blank(idea.solution), "Describe the solution in two plain sentences."],
    [blank(idea.differentiation), "Write what people use today and why they would switch."],
    [blank(idea.assumptions), "List three things that must be true for this to work."],
    [blank(idea.successCriteria), "Choose one measurable signal that would show it is working."],
  ];
  return [
    ...fieldSteps.filter(([missing]) => missing).map(([, step]) => step),
    "Run five problem interviews and write down exact quotes.",
    "Update your assumptions with what you learned, then ask for feedback again.",
    "Fill in the Business Model Canvas, starting with Customer Segments and Value Propositions.",
  ];
}

function review(request: CoachRequest): Review {
  const { idea } = request;
  const problemClarity = assessProblem(idea);
  const emptyCount = Object.values(idea).filter(blank).length;
  return {
    summary:
      emptyCount === 0
        ? `All six parts of ${request.name} are written down, which is enough to start testing. The feedback below points at wording to tighten and assumptions to check with real people.`
        : `${request.name} has ${6 - emptyCount} of 6 idea sections filled in. The gaps are listed first under next steps, because the rest of the feedback is only as good as what you have written.`,
    problemClarity,
    customerSegment: assessSegment(idea),
    competitorQuestions: [
      "What do your target users do today when this problem comes up?",
      "Which existing products, apps, or habits would they name if you asked how they cope?",
      "What do they like about those alternatives, and what annoys them?",
      "Has someone tried this idea before? If so, what happened to it?",
      "If nothing like this exists, is that an opening or a sign that the problem is too small?",
    ],
    differentiation: suggestDifferentiation(idea),
    businessModels: suggestBusinessModels(idea),
    risks: findRisks(idea),
    experiments: planExperiments(idea),
    nextSteps: planNextSteps(idea),
    uncertainty:
      "This is LaunchLab's offline coach. It checks the structure and wording of what you wrote using fixed rules. It has not researched your market, competitors, or customers, so treat every suggestion as a hypothesis to test.",
  };
}

const TOPICS: { match: RegExp; answer: (name: string) => Answer }[] = [
  {
    match: /\b(pric\w*|charge|money|revenue|pay\w*|cost|profit|free)\b/i,
    answer: (name) => ({
      answer: `Pricing for ${name} is a hypothesis until someone pays. Before choosing a number, find out what your users spend today, in money or time, to deal with the problem. That is the amount you are competing against. Then test willingness to pay directly: offer a pre-order, a deposit, or a paid pilot to a few users.`,
      hypotheses: [
        "People will pay at all, rather than keep using a free alternative.",
        "The person who uses it is the person who pays.",
      ],
      nextSteps: [
        "Ask five users what they currently spend on this problem.",
        "Offer one concrete price to three users and note their reaction word for word.",
        "Write your revenue hypothesis in the Revenue Streams block of the canvas.",
      ],
    }),
  },
  {
    match: /\b(competit\w*|rivals?|alternatives?|similar|already exists?)\b/i,
    answer: (name) => ({
      answer: `The offline coach cannot look up competitors for ${name}, so you need to do that research yourself. Search the way a customer would: type the problem, not your solution, into a search engine and an app store. Then ask target users what they use now. An existing competitor is usually good news, because it shows people care about the problem.`,
      hypotheses: [
        "Your users are unhappy enough with what they use now to try something new.",
        "Your difference matters to them, not only to you.",
      ],
      nextSteps: [
        "List three alternatives, including “do nothing”.",
        "For each, write one thing users like and one thing that frustrates them.",
        "Update the Differentiation section with what you find, and cite where you found it.",
      ],
    }),
  },
  {
    match: /\b(customers?|users?|interview\w*|surveys?|audience|talk to|find people|feedback)\b/i,
    answer: () => ({
      answer:
        "Start with conversations, not surveys. Ask people about the last time the problem happened, what they did, and what was annoying about it. Do not describe your idea until the end, because people are polite and will say they like it. Five honest conversations will teach you more than fifty survey answers.",
      hypotheses: [
        "The people you can reach actually have this problem.",
        "They care enough about it to have tried solving it already.",
      ],
      nextSteps: [
        "Write five open questions about past behaviour (“Tell me about the last time…”).",
        "Book five 15-minute conversations this week.",
        "Record exact quotes and look for phrases that repeat.",
      ],
    }),
  },
  {
    match: /\b(mvp|build\w*|prototype|cod(e|ing)|develop\w*|features?|launch|start)\b/i,
    answer: (name) => ({
      answer: `Build the smallest thing that tests your riskiest assumption about ${name}, which is often not software at all. A sign-up sheet, a clickable mock-up, or doing the service by hand for three people can answer the question faster. Add features only after someone uses the first version twice.`,
      hypotheses: [
        "The feature you most want to build is the one users most need.",
        "People will change their current habit to use your product.",
      ],
      nextSteps: [
        "Pick the one assumption that would end the project if it were false.",
        "Design a test for it that takes less than a week.",
        "Decide in advance what result would make you change direction.",
      ],
    }),
  },
  {
    match: /\b(pitch\w*|present\w*|judges?|investors?|slides?|demo day|competition)\b/i,
    answer: () => ({
      answer:
        "A strong student pitch tells one clear story: a real person with a real problem, what you built or plan to build, and what you have learned so far. Judges trust evidence over adjectives. Say plainly what you have tested and what you have not. An honest “we don't know yet, and here is how we will find out” is more convincing than a big unsupported number.",
      hypotheses: [
        "Your audience understands the problem within the first 30 seconds.",
        "Every number on your slides can be traced to a source.",
      ],
      nextSteps: [
        "Generate an outline in the Pitch Builder and rewrite it in your own voice.",
        "Fix every slide the builder flags for unverified claims.",
        "Practise out loud with a timer and one friendly listener.",
      ],
    }),
  },
];

const DEFAULT_ANSWER = (name: string): Answer => ({
  answer: `The offline coach answers from a fixed set of topics (customers, competitors, pricing, building a first version, and pitching) and your question about ${name} did not match one of them. A general rule still applies: turn the question into something you can test with real people this week.`,
  hypotheses: ["The answer you expect is the one your users would give."],
  nextSteps: [
    "Rephrase the question around one of the topics above, or",
    "Write down what you believe the answer is, then ask three target users.",
  ],
});

export const offlineProvider: CoachProvider = {
  source: "offline",
  review: async (request) => review(request),
  answer: async (request) =>
    (TOPICS.find((topic) => topic.match.test(request.question))?.answer ?? DEFAULT_ANSWER)(
      request.name,
    ),
};
