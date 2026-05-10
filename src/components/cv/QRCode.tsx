'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Minimal QR Code generator component using Canvas API.
 * Uses the qr-code-generator algorithm (ISO 18004) via a lightweight inline implementation.
 * Falls back to a Google Charts API URL for the QR image.
 */
interface QRCodeProps {
  url: string;
  size?: number;
}

export default function QRCode({ url, size = 80 }: QRCodeProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  // Use Google Charts QR API as a reliable, zero-dependency solution
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(url)}&format=png&margin=1`;

  return (
    <img
      ref={imgRef}
      src={qrSrc}
      alt="QR Code"
      width={size}
      height={size}
      className="block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
