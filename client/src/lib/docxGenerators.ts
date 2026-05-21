import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, VerticalAlign, BorderStyle, WidthType, HeightRule, TextDirection, Header, TableAnchorType, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionAlign, TextWrappingType, ShadingType } from 'docx';
import { getFileUrl } from './utils';
import { Candidate } from '../types';
import QRCode from 'qrcode';

// Helper to generate QR code as PNG ArrayBuffer
async function generateQRBuffer(text: string): Promise<ArrayBuffer | null> {
  if (!text) return null;
  try {
    const dataUrl = await QRCode.toDataURL(text, { width: 120, margin: 1 });
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch (err) {
    console.warn('QR generation error:', err);
    return null;
  }
}

// Helper to fetch image as ArrayBuffer
async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  if (!url) return null;
  const fullUrl = getFileUrl(url);
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (err) {
    console.warn('Error fetching image:', err);
    return null;
  }
}

// Helpers for data mapping
const calculateAge = (dob: string | undefined) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
};

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const BORDER_SOLID = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

function createText(text: string, options: { bold?: boolean, size?: number, color?: string } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: text || '-',
        bold: options.bold || false,
        size: options.size || 24, // 24 half-points = 12pt
        font: "Times New Roman",
        color: options.color || "000000"
      })
    ]
  });
}

function createTextLeft(text: string, options: { bold?: boolean, size?: number } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: text || '-',
        bold: options.bold || false,
        size: options.size || 24,
        font: "Times New Roman"
      })
    ]
  });
}

function createDataRow(label: string, value: string, bgColor: string = "F4EBD0") {
  return new TableRow({
    children: [
      new TableCell({
        children: [createTextLeft(label, { bold: true, size: 20 })],
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        borders: BORDER_SOLID,
        width: { size: 40, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(value, { bold: true, size: 20 })],
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        borders: BORDER_SOLID,
        width: { size: 60, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });
}

// Helper for Skills row
function createSkillRow(skill1: string, val1: string, skill2: string, val2: string) {
  return new TableRow({
    children: [
      new TableCell({
        children: [createTextLeft(skill1, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 35, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(val1, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createTextLeft(skill2, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 35, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(val2, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });
}

export async function generateAlShablanNativeDocx(candidate: Candidate, facePhoto: string | null, fullBodyPhoto: string | null): Promise<Blob> {
  const bgBuffer = await fetchImageBuffer('/Al-shablan.png');
  const faceBuffer = facePhoto ? await fetchImageBuffer(facePhoto) : null;
  const fullBodyBuffer = fullBodyPhoto ? await fetchImageBuffer(fullBodyPhoto) : null;
  const passportBuffer = candidate.passportImageUrl ? await fetchImageBuffer(candidate.passportImageUrl) : null;
  const qrBuffer = candidate.videoUrl ? await generateQRBuffer(candidate.videoUrl) : null;

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim().toUpperCase();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  const hasLang = (lang: string) => candidate.personalInfo?.languages?.includes(lang) ? 'YES' : 'NO';
  const hasSkill = (skill: string) => candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';

  const doc = new Document({
    sections: [
      // Page 1: Main CV Page
      {
        properties: {
          page: {
            margin: { top: 2700, right: 750, bottom: 750, left: 750 }, // 15 DXA per px (180px top, 50px sides)
            size: { width: 11906, height: 16838 } // A4
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  bgBuffer ? new ImageRun({
                    data: bgBuffer,
                    type: "png",
                    transformation: { width: 794, height: 1123 },
                    floating: {
                      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.LEFT },
                      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.TOP },
                      wrap: { type: TextWrappingType.NONE },
                      behindDocument: true,
                    }
                  }) : new TextRun(""),
                ],
              }),
            ],
          })
        },
        children: [
          // Invisible layout table for Top Section (Photo | Basic Info)
          new Table({
            borders: BORDER_NONE,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    children: [
                      new Paragraph({
                        children: faceBuffer ? [
                          new ImageRun({
                            data: faceBuffer,
                            type: "png",
                            transformation: { width: 175, height: 175 } // Shrunk to match table height
                          })
                        ] : [new TextRun("Face Photo")]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    margins: { left: 100 },
                    children: [
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          createDataRow("Reference No", "124764987"),
                          createDataRow("Full Name", fullName),
                          createDataRow("Religion", candidate.personalInfo?.religion?.toUpperCase() || ""),
                          createDataRow("Position Desired", candidate.personalInfo?.job?.toUpperCase() || "HOUSE MAID"),
                          createDataRow("Salary", "-"),
                          createDataRow("Age", age),
                          createDataRow("Sex", candidate.passportData?.gender || "Female"),
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          
          new Paragraph({ text: "" }), // Spacer
          
          // Invisible layout table for Middle Section (Left Col | Right Col)
          new Table({
            borders: BORDER_NONE,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  // LEFT COLUMN
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    margins: { right: 100 },
                    children: [
                      // Overseas Experience Table
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                columnSpan: 3, borders: BORDER_SOLID, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                                children: [createTextLeft("Overseas Experience", { bold: true, size: 22 })]
                              })
                            ]
                          }),
                          new TableRow({
                            children: [
                              new TableCell({ borders: BORDER_SOLID, children: [createText("Country", { bold: true, size: 20 })] }),
                              new TableCell({ borders: BORDER_SOLID, children: [createText("Period", { bold: true, size: 20 })] }),
                              new TableCell({ borders: BORDER_SOLID, children: [createText("Position", { bold: true, size: 20 })] }),
                            ]
                          }),
                          // Dummy row for now
                          new TableRow({
                            children: [
                              new TableCell({ borders: BORDER_SOLID, children: [createText("-", { size: 20 })] }),
                              new TableCell({ borders: BORDER_SOLID, children: [createText("-", { size: 20 })] }),
                              new TableCell({ borders: BORDER_SOLID, children: [createText("-", { size: 20 })] }),
                            ]
                          })
                        ]
                      }),
                      new Paragraph({ text: "" }), // Spacer
                      
                      // Personal Information Table
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                columnSpan: 2, borders: BORDER_SOLID, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                                children: [createTextLeft("Personal Information", { bold: true, size: 22 })]
                              })
                            ]
                          }),
                          createDataRow("Nationality", candidate.passportData?.nationality?.toUpperCase() || ""),
                          createDataRow("Date of Birth", formatDate(candidate.passportData?.dateOfBirth)),
                          createDataRow("Address", (candidate.personalInfo?.address || candidate.personalInfo?.city || "").toUpperCase()),
                          createDataRow("Marital Status", candidate.personalInfo?.maritalStatus || ""),
                          createDataRow("No of Children", candidate.personalInfo?.numberOfChildren?.toString() || "0"),
                          createDataRow("Height", candidate.personalInfo?.height || ""),
                          createDataRow("Weight", candidate.personalInfo?.weight || ""),
                          createDataRow("Education Qualifications", candidate.personalInfo?.educationLevel || ""),
                          createDataRow("Tel.Number", candidate.personalInfo?.phone || ""),
                        ]
                      }),
                      new Paragraph({ text: "" }), // Spacer
                      
                      // Languages Table
                      new Table({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                columnSpan: 2, borders: BORDER_SOLID, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                                children: [createTextLeft("Languages", { bold: true, size: 22 })]
                              })
                            ]
                          }),
                          createDataRow("English", hasLang('ENGLISH')),
                          createDataRow("Arabic", hasLang('ARABIC')),
                        ]
                      }),
                      new Paragraph({ text: "" }), // Spacer
                      
                      // Skills Table
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                columnSpan: 4, borders: BORDER_SOLID, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                                children: [createTextLeft("Skills", { bold: true, size: 22 })]
                              })
                            ]
                          }),
                          createSkillRow("BABY SITTING", hasSkill("Baby Sitting"), "CHILDREN CARE", hasSkill("Children Care")),
                          createSkillRow("TUTORING", hasSkill("Tutoring"), "COMPUTER", hasSkill("Computer")),
                          createSkillRow("CLEANING", hasSkill("Cleaning"), "WASHING", hasSkill("Washing")),
                          createSkillRow("IRONING", hasSkill("Ironing"), "COOKING", hasSkill("Cooking")),
                          createSkillRow("ARABIC COOKING", hasSkill("Arabic Cooking"), "SEWING", hasSkill("Sewing")),
                          createSkillRow("DRIVING", hasSkill("Driving"), "DISABLED CARE", hasSkill("Disabled Care")),
                        ]
                      }),
                    ]
                  }),
                  // RIGHT COLUMN
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    margins: { left: 100 },
                    children: [
                      // Passport Information
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                columnSpan: 2, borders: BORDER_SOLID, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                                children: [createTextLeft("Passport Information", { bold: true, size: 22 })]
                              })
                            ]
                          }),
                          createDataRow("Number", candidate.passportData?.passportNumber?.toUpperCase() || ""),
                          createDataRow("Issue Date", formatDate(candidate.passportData?.dateOfIssue)),
                          createDataRow("Expiry Date", formatDate(candidate.passportData?.dateOfExpiry)),
                          createDataRow("Issue Place", candidate.passportData?.issuingCountry?.toUpperCase() || "ETHIOPIA"),
                          createDataRow("Next of Kin Name", candidate.personalInfo?.emergencyContactName?.toUpperCase() || ""),
                          createDataRow("Next of Kin Number", candidate.personalInfo?.emergencyContactPhone || ""),
                        ]
                      }),
                      new Paragraph({ text: "" }), // Spacer
                      
                      // Full Body Photo
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: fullBodyBuffer ? [
                          new ImageRun({
                            data: fullBodyBuffer,
                            type: "png",
                            transformation: { width: 230, height: 350 }
                          })
                        ] : [new TextRun("Full Body Photo")]
                      }),
                      // QR Code for YouTube Video
                      ...(qrBuffer ? [
                        new Paragraph({ text: "" }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new ImageRun({
                              data: qrBuffer,
                              type: "png",
                              transformation: { width: 80, height: 80 }
                            })
                          ]
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "Scan for Video", size: 14, font: "Times New Roman", color: "666666" })]
                        })
                      ] : [])
                    ]
                  })
                ]
              })
            ]
          }),
        ]
      },
      // Page 2: Passport Document (Only if exists)
      ...(passportBuffer ? [{
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
            size: { width: 11906, height: 16838 } // A4
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: passportBuffer,
                type: "png", // fallback or use the correct format if known
                transformation: { width: 700, height: 1000 } // Fit to A4
              })
            ]
          })
        ]
      }] : [])
    ]
  });

  return await Packer.toBlob(doc);
}

export async function generateUssusNativeDocx(candidate: Candidate, facePhoto: string | null, fullBodyPhoto: string | null): Promise<Blob> {
  const bgBuffer = await fetchImageBuffer('/Ussus.png');
  
  // To keep it simple, we build an empty document for Ussus for now. 
  // It uses floating text boxes to overlay the image.
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            size: { width: 11906, height: 16838 } // A4
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  bgBuffer ? new ImageRun({
                    data: bgBuffer,
                    type: "png",
                    transformation: { width: 794, height: 1123 },
                    floating: {
                      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.LEFT },
                      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.TOP },
                      wrap: { type: TextWrappingType.NONE },
                      behindDocument: true,
                    }
                  }) : new TextRun(""),
                ],
              }),
            ],
          })
        },
        children: [
          new Paragraph({ text: "USSUS is highly absolute-positioned. For perfect native DOCX generation, a Word template should ideally be used. This code generates the base." })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

