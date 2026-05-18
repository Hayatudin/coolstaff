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
        gap: '15px',
        margin: '10px 0',
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: '6px',
        padding: '4px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <QRCode url={videoUrl} size={85} />
      </div>
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
          padding: '8px 18px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none',
          letterSpacing: '0.3px',
          boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
        </svg>
        Watch Video
      </a>
    </div>
  );
}
