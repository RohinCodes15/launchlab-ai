import type { Canvas, Idea, Status } from "./schema";

/**
 * A fictional sample project. It contains no real people, companies, or market
 * figures; every number in it is written as a goal or an assumption.
 */
export const DEMO_PROJECT_INPUT: {
  name: string;
  summary: string;
  status: Status;
  idea: Idea;
  canvas: Canvas;
} = {
  name: "StudySwap",
  summary: "Students trade tutoring hours instead of paying for them.",
  status: "validating",
  idea: {
    problem:
      "Students at our high school who fall behind in one subject often cannot afford a paid tutor, and teacher office hours fill up before tests. Many of them are strong in a different subject and could help someone else, but there is no simple way to find each other.",
    audience:
      "Sophomores and juniors at one public high school who are struggling in a core class (math, chemistry, or a language) and are confident in at least one other subject.",
    solution:
      "A web app where a student lists one subject they can teach and one they need help with. StudySwap matches pairs, schedules a 30-minute session in the school library, and tracks hours given and received so the exchange stays fair.",
    differentiation:
      "Today students ask friends, post in group chats, or pay for tutoring. Group chats are hit-or-miss and paid tutoring costs money. StudySwap is free because the payment is an hour of your own help, and matches are made by subject instead of by who you already know.",
    assumptions:
      "Students will tutor a stranger in exchange for tutoring.\nA student who is good at a subject can explain it well enough to help.\nThe school will let us use the library after classes.\nStudents will show up to sessions they booked.",
    successCriteria:
      "20 students sign up in the first month (goal, not yet tested).\nAt least half of matched pairs complete a first session.\nStudents who complete a session book a second one.",
  },
  canvas: {
    customerSegments:
      "First: sophomores and juniors at our school who need help in one core class and are strong in another.\nLater (untested): other schools in the district.",
    valuePropositions:
      "Free tutoring from someone who took the same class with the same teacher.\nTeaching a subject is also a way to review it.\nHours given and received are tracked, so nobody feels used.",
    channels:
      "Announcements in homeroom.\nPosters with a QR code near the library.\nTeachers recommending it to students who ask for extra help.",
    customerRelationships:
      "A short check-in message after every session.\nA student ambassador in each grade who answers questions.",
    revenueStreams:
      "None during the pilot.\nHypothesis to test later: the school or parent association pays a small yearly fee if it reduces demand for after-school help.",
    keyResources: "The matching web app.\nA quiet room (library).\nA faculty sponsor.",
    keyActivities:
      "Matching students each week.\nReminding pairs about sessions.\nCollecting feedback after sessions.",
    keyPartnerships:
      "School librarian for the room.\nCounseling office to refer students.\nA faculty sponsor so it can run as a club.",
    costStructure:
      "Web hosting (free tier during the pilot).\nPrinting posters.\nOur own time: roughly a few hours a week to run matches.",
  },
};
