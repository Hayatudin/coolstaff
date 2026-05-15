'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Robust QR Code generator component using SVG.
 * Ensures reliability in PDF generation (html-to-image) by avoiding external network requests.
 */
interface QRCodeProps {
  url: string;
  size?: number;
}

export default function QRCode({ url, size = 80 }: QRCodeProps) {
  if (!url) return null;

  return (
    <div style={{ width: size, height: size, background: 'white' }}>
      <QRCodeSVG 
        value={url} 
        size={size}
        level="H"
        includeMargin={false}
      />
    </div>
  );
}
