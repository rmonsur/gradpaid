/** Field limits shared by the intake agent, the publish route and the borrower form. */
export const CAMPAIGN_LIMITS = {
  nameMax: 80,
  titleMin: 4,
  titleMax: 80,
  storyMin: 20,
  storyMax: 900,
  fieldMin: 2,
  fieldMax: 80,
  tagMax: 30,
  tagsMax: 6,
  loanRefMin: 4,
  loanRefMax: 40,
} as const;
