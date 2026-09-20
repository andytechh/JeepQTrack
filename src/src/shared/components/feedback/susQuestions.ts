export interface SUSQuestion {
  number: number;
  text: string;
}

export const SUS_QUESTIONS: SUSQuestion[] = [
  {
    number: 1,
    text: "I think that I would like to use this system frequently.",
  },
  {
    number: 2,
    text: "I found the system unnecessarily complex.",
  },
  {
    number: 3,
    text: "I thought the system was easy to use.",
  },
  {
    number: 4,
    text: "I think that I would need the support of a technical person to be able to use this system.",
  },
  {
    number: 5,
    text: "I found the various functions in this system were well integrated.",
  },
  {
    number: 6,
    text: "I thought there was too much inconsistency in this system.",
  },
  {
    number: 7,
    text: "I would imagine that most people would learn to use this system very quickly.",
  },
  {
    number: 8,
    text: "I found the system very cumbersome to use.",
  },
  {
    number: 9,
    text: "I felt very confident using the system.",
  },
  {
    number: 10,
    text: "I needed to learn a lot of things before I could get going with this system.",
  },
];

export const SUS_SCALE = [
  {
    value: 1,
    label: "Strongly Disagree",
  },
  {
    value: 2,
    label: "Disagree",
  },
  {
    value: 3,
    label: "Neutral",
  },
  {
    value: 4,
    label: "Agree",
  },
  {
    value: 5,
    label: "Strongly Agree",
  },
] as const;
