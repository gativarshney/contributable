/**
 * The next Google Summer of Code, step by step. Until Google publishes the official
 * calendar, the dates follow the 2026 programme, which has kept the same shape for
 * years. When the official dates are out, set `official` and replace the dates.
 */
export const NEXT_GSOC = {
  year: 2027,
  official: false,
  source: "https://developers.google.com/open-source/gsoc/timeline",
  phases: [
    { id: "orgs", label: "Organisations" },
    { id: "apply", label: "Applications" },
    { id: "code", label: "Coding" },
  ],
  steps: [
    {
      date: "2027-01-18",
      when: "Mid January",
      phase: "orgs",
      title: "Organisations apply",
      tip: "Many publish their idea lists now.",
      icon: "M4 20V9l8-5 8 5v11M9 20v-6h6v6",
    },
    {
      date: "2027-02-18",
      when: "Late February",
      phase: "orgs",
      title: "Organisations announced",
      tip: "Pick two or three and read their ideas.",
      icon: "M5 6h14M5 12h14M5 18h9",
    },
    {
      date: "2027-03-15",
      when: "Mid March",
      phase: "apply",
      title: "Applications open",
      tip: "Send mentors a draft early for feedback.",
      icon: "M4 12 20 4l-6 16-3-7-7-1Z",
    },
    {
      date: "2027-03-30",
      when: "End of March",
      phase: "apply",
      title: "Application deadline",
      tip: "About two weeks after opening.",
      icon: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    },
    {
      date: "2027-04-29",
      when: "End of April",
      phase: "apply",
      title: "Projects announced",
      tip: "Meet your mentor before coding starts.",
      icon: "M5 12.5 10 17 19 7.5",
    },
    {
      date: "2027-05-24",
      when: "Late May",
      phase: "code",
      title: "Coding begins",
      tip: "About 12 paid weeks, midterm in July.",
      icon: "m8 8-4 4 4 4m8-8 4 4-4 4",
    },
    {
      date: "2027-08-23",
      when: "Late August",
      phase: "code",
      title: "Final submissions",
      tip: "Larger projects can run into November.",
      icon: "M5 21V4h11l-2 4 2 4H5",
    },
  ],
} as const;
