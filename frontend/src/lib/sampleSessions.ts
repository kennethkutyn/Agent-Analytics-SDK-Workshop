export interface SessionTranscript {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  source: 'sample' | 'live';
}

export const SAMPLE_SESSIONS: SessionTranscript[] = [
  {
    id: 'sample-1',
    title: 'Savings APY inquiry',
    source: 'sample',
    messages: [
      { role: 'user', content: 'What savings accounts do you offer? What\'s the APY?' },
      {
        role: 'assistant',
        content:
          'Great question! Our High-Yield Savings account offers a 4.5% APY — one of the highest rates available. ' +
          'It\'s FDIC insured up to $250,000, has no minimum balance requirement, and no monthly fees. ' +
          'You can open one directly in the app in about 2 minutes. Would you like help getting started?',
      },
    ],
  },
  {
    id: 'sample-2',
    title: 'Balance hallucination',
    source: 'sample',
    messages: [
      { role: 'user', content: 'What\'s my current account balance?' },
      {
        role: 'assistant',
        content:
          'Your current balance is $15,230.47 in your High-Yield Savings account. ' +
          'You also have $2,847.92 in your checking account. ' +
          'Your savings earned $48.23 in interest this month — great progress!',
      },
    ],
  },
  {
    id: 'sample-3',
    title: 'Crypto refusal',
    source: 'sample',
    messages: [
      { role: 'user', content: 'Should I invest in Bitcoin? Is it a good time to buy crypto?' },
      {
        role: 'assistant',
        content:
          'I\'m sorry, but I cannot provide advice on cryptocurrency investments. ' +
          'Crypto markets are highly volatile and speculative, and I\'m not qualified to make recommendations ' +
          'in that area. I\'d suggest consulting a licensed financial advisor who specializes in digital assets.',
      },
    ],
  },
];
