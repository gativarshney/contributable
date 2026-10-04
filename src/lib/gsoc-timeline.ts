/**
 * The next Google Summer of Code, step by step. Until Google publishes the official
 * calendar, the dates follow the 2026 programme, which has kept the same shape for
 * years. When the official dates are out, set `official` and replace the dates.
 */
export const NEXT_GSOC = {
  year: 2027,
  official: false,
  source: "https://developers.google.com/open-source/gsoc/timeline",
  steps: [
    {
      date: "2027-01-18",
      when: "Mid January",
      title: "Organisations apply",
      tip: "Watch which projects apply. Many publish their idea lists now.",
    },
    {
      date: "2027-02-18",
      when: "Late February",
      title: "Organisations announced",
      tip: "The accepted list goes up. Pick two or three and read their ideas.",
    },
    {
      date: "2027-03-15",
      when: "Mid March",
      title: "Applications open",
      tip: "Send a draft proposal to the mentors early and ask for feedback.",
    },
    {
      date: "2027-03-30",
      when: "End of March",
      title: "Application deadline",
      tip: "About two weeks after opening. Late proposals are not accepted.",
    },
    {
      date: "2027-04-29",
      when: "End of April",
      title: "Projects announced",
      tip: "Accepted contributors get to know their mentors before coding starts.",
    },
    {
      date: "2027-05-24",
      when: "Late May",
      title: "Coding begins",
      tip: "About 12 weeks of paid work, with a midterm check in July.",
    },
    {
      date: "2027-08-23",
      when: "Late August",
      title: "Final submissions",
      tip: "Larger projects can run on into November.",
    },
  ],
} as const;
