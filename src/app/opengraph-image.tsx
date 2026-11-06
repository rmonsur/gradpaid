import { ImageResponse } from 'next/og';
import { APP_NAME } from '@/lib/constants';

export const alt = 'GradPaid: give once, an AI agent pays the student loan servicer through PayPal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BACKGROUND = '#0F1115';
const SURFACE = '#18181B';
const BORDER = '#27272A';
const LIME = '#84CC16';
const MUTED = '#A1A1AA';
const STEPS = ['Donor', 'PayPal Orders', 'AI agent', 'PayPal Payouts', 'Loan servicer'] as const;

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: BACKGROUND,
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: LIME }} />
        {APP_NAME.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -3, lineHeight: 1 }}>
          THE LOAN GETS PAID.
        </div>
        <div style={{ fontSize: 34, color: MUTED }}>
          Give once. An AI agent pays the servicer through PayPal.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 15,
                border: `2px solid ${step.startsWith('PayPal') ? LIME : BORDER}`,
                background: SURFACE,
                fontSize: 23,
                color: step.startsWith('PayPal') ? LIME : '#FFFFFF',
              }}
            >
              {step}
            </div>
            {i < STEPS.length - 1 ? <div style={{ fontSize: 30, color: LIME }}>→</div> : null}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
