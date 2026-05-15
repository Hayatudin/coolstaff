import React from 'react';
import QRCode from './QRCode';

interface CVVideoFooterProps {
  videoUrl?: string | null;
}

/**
 * A compact footer bar rendered at the bottom of CV templates when a video URL exists.
 * Contains a QR code and a "Watch Video" link/button.
 */
export default function CVVideoFooter({ videoUrl }: CVVideoFooterProps) {
  if (!videoUrl) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '8px',
        margin: '0',
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: '6px',
        padding: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <QRCode url={videoUrl} size={45} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{
          color: '#94a3b8',
          fontSize: '9px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Scan QR or click below
        </span>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
            color: 'white',
            padding: '5px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.3px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
          </svg>
          Watch Video
        </a>
      </div>
    </div>
  );
}
