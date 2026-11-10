import type { CanvasKey, Project } from "./schema";

const DRAFT_NOTE = "(Draft from your idea. Check it against what real customers tell you.)";

const or = (value: string, fallback: string) => value.trim() || fallback;

/**
 * Template-based first drafts built only from what the student already wrote.
 * No model is involved and nothing here is researched: every draft is a starting
 * point for the student to rewrite.
 */
export function suggestBlock(key: CanvasKey, project: Project): string {
  const { idea, name } = project;
  const audience = or(idea.audience, "[describe your target audience in Idea Studio]");
  const solution = or(idea.solution, "[describe your solution in Idea Studio]");
  const problem = or(idea.problem, "[describe the problem in Idea Studio]");

  const drafts: Record<CanvasKey, string> = {
    customerSegments: `First customers: ${audience}\nWho feels this problem most often? Start with them.`,
    valuePropositions: `Problem: ${problem}\nWhat ${name} offers: ${solution}${
      idea.differentiation.trim() ? `\nWhy switch: ${idea.differentiation.trim()}` : ""
    }`,
    channels: `Where does this audience already spend time? (${audience})\nIdeas to test: word of mouth, a club or class announcement, one online community they already use.`,
    customerRelationships: `How will the first 10 users get help? Start personal: message each one yourself.\nWhat brings them back a second time?`,
    revenueStreams: `Hypotheses to test (none are tested yet):\n- Free while you validate the idea\n- A small one-time or monthly price\n- Someone else pays (a school, club, or sponsor)\nAsk: what do they pay for today to solve this?`,
    keyResources: `To deliver "${solution}" you need:\n- People and skills:\n- Tools or technology:\n- Content, data, or space:`,
    keyActivities: `Every week you must:\n- Build or improve the product\n- Talk to users (${audience})\n- Check your success criteria${
      idea.successCriteria.trim() ? `: ${idea.successCriteria.trim().split("\n")[0]}` : ""
    }`,
    keyPartnerships: `Who already reaches this audience and could help? (teachers, clubs, local organizations, online communities)\nWhat would each partner get in return?`,
    costStructure: `List what costs money and what costs time:\n- Tools and hosting:\n- Materials or marketing:\n- Your hours per week:\nWhich costs grow as you get more users?`,
  };
  return `${drafts[key]}\n${DRAFT_NOTE}`;
}
