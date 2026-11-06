/** Cited market facts. Every figure links to the page it was read from (opened Nov 5, 2026). */
export interface MarketFact {
  readonly metric: string;
  readonly figure: string;
  readonly asOf: string;
  readonly source: string;
  readonly url: string;
}

export const MARKET_FACTS: readonly MarketFact[] = [
  {
    metric: 'US student loan balances',
    figure: '$1.651 trillion',
    asOf: 'Q2 2026',
    source: 'New York Fed, Household Debt and Credit',
    url: 'https://www.newyorkfed.org/newsevents/news/research/2026/20260811',
  },
  {
    metric: 'Federal loan recipients',
    figure: '42.3 million, portfolio above $1.7 trillion',
    asOf: 'Jun 30, 2026',
    source: 'Federal Student Aid Data Center',
    url: 'https://fsapartners.ed.gov/knowledge-center/library/electronic-announcements/2026-09-22/federal-student-aid-posts-updated-reports-fsa-data-center',
  },
  {
    metric: 'Tax-free employer loan repayment (IRC 127)',
    figure: '$5,250 a year, now permanent, indexed after 2026',
    asOf: 'Jul 2025',
    source: 'Mercer on the OBBBA',
    url: 'https://www.mercer.com/en-us/insights/law-and-policy/obbba-makes-tax-free-student-loan-reimbursements-permanent/',
  },
  {
    metric: 'Employers offering loan repayment help',
    figure: 'about 9% to 14%',
    asOf: '2024',
    source: 'SHRM',
    url: 'https://www.shrm.org/mena/topics-tools/news/benefits-compensation/student-loan-benefits-on-the-rise',
  },
  {
    metric: 'Indebted workers swayed by the benefit',
    figure: '77% likelier to accept a job',
    asOf: '2025',
    source: 'SHRM',
    url: 'https://www.shrm.org/mena/topics-tools/news/benefits-compensation/student-loan-benefits-on-the-rise',
  },
  {
    metric: 'Student-loan fundraisers on GoFundMe',
    figure: 'up 40% year on year',
    asOf: '2023',
    source: 'GoFundMe year in review',
    url: 'https://www.gofundme.com/c/newsroom/look-what-help-can-do-gofundmes-2023-year-in-review',
  },
  {
    metric: 'PayPal total payment volume',
    figure: '$487.1 billion a quarter, 440 million active accounts',
    asOf: 'Q3 2026',
    source: 'PayPal Q3 2026 earnings (8-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/0001633917/000163391726000086/pypl3q-26earningsrelease.htm',
  },
  {
    metric: 'Reference platform fee',
    figure: '2.9% + $0.30 per donation',
    asOf: 'current',
    source: 'GoFundMe pricing',
    url: 'https://www.gofundme.com/c/pricing',
  },
];
