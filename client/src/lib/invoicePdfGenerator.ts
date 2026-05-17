import jsPDF from 'jspdf';
import { numberToWords } from './numberToWords';

interface InvoiceCandidate {
  name: string;
  passportNumber: string;
  deployedDate: string;
  price: number;
}

async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function generateInvoicePdf(
  candidates: InvoiceCandidate[],
  templateFullName: string,
  invoiceNumber: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR;

  // Load images
  const [headerImg, signatureImg, stampImg] = await Promise.all([
    loadImageAsBase64('/coolstaff-header.jpg'),
    loadImageAsBase64('/coolstaff-signature.png'),
    loadImageAsBase64('/coolstaff-stamp.png'),
  ]);

  // ── Header Image ──
  // The header image is wide – scale to fit content width
  const headerH = 28;
  doc.addImage(headerImg, 'JPEG', marginL, 5, contentW, headerH);

  let y = 38;

  // ── DATE line (right-aligned) ──
  const today = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`DATE:${dateStr}`, pageW - marginR, y, { align: 'right' });

  y += 6;

  // ── TO line ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TO ${templateFullName} INVOICE`, marginL, y);

  y += 8;

  // ── Table ──
  // Column definitions [x, width, header, align]
  const colDefs: { x: number; w: number; header: string; align: 'left' | 'center' | 'right' }[] = [
    { x: marginL, w: 10, header: 'NO', align: 'center' },
    { x: marginL + 10, w: 52, header: 'PARTICULARS', align: 'left' },
    { x: marginL + 62, w: 30, header: 'PASSPORT NO', align: 'left' },
    { x: marginL + 92, w: 26, header: 'STATUS', align: 'center' },
    { x: marginL + 118, w: 30, header: 'DATE', align: 'center' },
    { x: marginL + 148, w: contentW - 148, header: 'AMOUNT(USD)', align: 'right' },
  ];

  const rowH = 6.5;
  const headerRowH = 7;

  // Invoice number row (above the column headers)
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, headerRowH, 'FD');
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(marginL, y, contentW, headerRowH, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`INVOICE NO ${invoiceNumber}`, marginL + 2, y + 5);
  doc.text('INVOICE NO', pageW - marginR - 2, y + 5, { align: 'right' });

  y += headerRowH;

  // Column header row
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, headerRowH, 'FD');
  doc.rect(marginL, y, contentW, headerRowH, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  for (const col of colDefs) {
    const textX = col.align === 'right' ? col.x + col.w - 2 :
                  col.align === 'center' ? col.x + col.w / 2 : col.x + 2;
    doc.text(col.header, textX, y + 5, { align: col.align });
    // Draw column border
    doc.line(col.x, y, col.x, y + headerRowH);
  }
  // Right border
  doc.line(marginL + contentW, y, marginL + contentW, y + headerRowH);

  y += headerRowH;

  // ── Data Rows ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  let total = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    total += c.price;

    // Check if we need a new page (leave room for total + signature = ~50mm)
    if (y + rowH > 260) {
      doc.addPage();
      y = 15;
    }

    // Row background (alternate)
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 255);
      doc.rect(marginL, y, contentW, rowH, 'F');
    }

    // Row border
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, y, contentW, rowH, 'S');

    // Cell data
    const rowData = [
      String(i + 1),
      c.name.toUpperCase(),
      c.passportNumber,
      'DEPLOYED',
      c.deployedDate,
      String(c.price),
    ];

    for (let j = 0; j < colDefs.length; j++) {
      const col = colDefs[j];
      const textX = col.align === 'right' ? col.x + col.w - 2 :
                    col.align === 'center' ? col.x + col.w / 2 : col.x + 2;
      
      // Truncate long names
      let cellText = rowData[j];
      if (j === 1 && cellText.length > 28) {
        cellText = cellText.substring(0, 26) + '..';
      }
      
      doc.text(cellText, textX, y + 4.5, { align: col.align });
      // Column separator
      doc.line(col.x, y, col.x, y + rowH);
    }
    doc.line(marginL + contentW, y, marginL + contentW, y + rowH);

    y += rowH;
  }

  // ── Total Row ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, rowH + 1, 'FD');
  doc.rect(marginL, y, contentW, rowH + 1, 'S');

  // Total label spans across columns
  const totalLabelX = colDefs[4].x + colDefs[4].w / 2;
  doc.text('', totalLabelX, y + 5, { align: 'center' });

  // Total value
  const totalAmountX = colDefs[5].x + colDefs[5].w - 2;
  doc.text(`${total.toLocaleString()}`, totalAmountX, y + 5, { align: 'right' });

  y += rowH + 1;

  // ── Amount in Words Row ──
  const wordsText = `AMOUNT IN WORDS: - ${numberToWords(total)}`;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.rect(marginL, y, contentW, rowH + 1, 'S');
  doc.text(wordsText, marginL + 2, y + 5);

  // Total label on the right side of amount row
  doc.text(`${total.toLocaleString()} USD`, totalAmountX, y + 5, { align: 'right' });

  y += rowH + 5;

  // ── Signature & Stamp Section ──
  // Check if we need a new page for signature
  if (y + 45 > 290) {
    doc.addPage();
    y = 20;
  }

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SIGNATURE', marginL, y);

  y += 4;
  const sigW = 30;
  const sigH = 15;
  doc.addImage(signatureImg, 'PNG', marginL, y, sigW, sigH);

  const textY = y + sigH + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('G. MANAGER IBRAHIM ABDURAHMAN', marginL, textY);

  // Stamp (positioned to the right)
  const stampW = 35;
  const stampH = 35;
  const stampX = pageW - marginR - stampW;
  const stampY = y - 4; // Position stamp alongside the signature

  doc.text('STAMP', stampX + stampW / 2, stampY - 2, { align: 'center' });
  doc.addImage(stampImg, 'PNG', stampX, stampY, stampW, stampH);

  // ── Download ──
  const fileName = `COOLSTAFF_INVOICE_${invoiceNumber}_${dateStr.replace(/ /g, '_')}.pdf`;
  doc.save(fileName);
}
