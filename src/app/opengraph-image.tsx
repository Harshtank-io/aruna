import { ImageResponse } from 'next/og';

export const alt = 'Aruna — Maps for Photographers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#121212',
          padding: '64px 72px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              color: '#e85d04',
              fontSize: 22,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
            }}
          >
            Maps for photographers
          </div>
          <div
            style={{
              width: 48,
              height: 4,
              background: '#e85d04',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 148,
              lineHeight: 0.85,
              letterSpacing: '-0.04em',
            }}
          >
            Aruna
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 32,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
              maxWidth: 780,
            }}
          >
            Pin the place. Read the light. Shoot the frame.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            paddingTop: 28,
            color: 'rgba(255,255,255,0.55)',
            fontSize: 20,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          <span>Location scouting</span>
          <span>aruna-light.vercel.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
