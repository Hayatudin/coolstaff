import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, VerticalAlign, BorderStyle, WidthType, HeightRule, Header, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, ShadingType, HorizontalPositionAlign, VerticalPositionAlign } from 'docx';
import fs from 'fs';
import path from 'path';

// Load local background images from public folder
const bgAlShablan = fs.existsSync(path.join(__dirname, '../public/Al-shablan.png')) ? fs.readFileSync(path.join(__dirname, '../public/Al-shablan.png')) : null;
const bgUssus = fs.existsSync(path.join(__dirname, '../public/Ussus.png')) ? fs.readFileSync(path.join(__dirname, '../public/Ussus.png')) : null;

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

function createText(text: string, options: { bold?: boolean, size?: number, color?: string, align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: options.align || AlignmentType.CENTER,
    children: [
      new TextRun({
        text: text,
        bold: options.bold || false,
        size: options.size || 24, // 24 half-points = 12pt
        font: "Times New Roman",
        color: options.color || "000000"
      })
    ]
  });
}

function createTextLeft(text: string, options: { bold?: boolean, size?: number } = {}) {
  return createText(text, { ...options, align: AlignmentType.LEFT });
}

function createDataRow(label: string, tagValue: string, options: { labelFill?: string, labelSize?: number, tagSize?: number } = {}) {
  return new TableRow({
    height: { value: 350, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        children: [createTextLeft(label, { bold: true, size: options.labelSize || 20 })],
        shading: { fill: options.labelFill || "F4EBD0", type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        borders: BORDER_SOLID,
        width: { size: 40, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(tagValue, { bold: true, size: options.tagSize || 20 })],
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        borders: BORDER_SOLID,
        width: { size: 60, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });
}

function createSkillRow(skill1: string, tag1: string, skill2: string, tag2: string) {
  return new TableRow({
    children: [
      new TableCell({
        children: [createTextLeft(skill1, { size: 18 })],
        shading: { fill: "F4EBD0", type: ShadingType.CLEAR },
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 35, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(tag1, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createTextLeft(skill2, { size: 18 })],
        shading: { fill: "F4EBD0", type: ShadingType.CLEAR },
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 35, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        children: [createText(tag2, { size: 18 })],
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        borders: BORDER_SOLID,
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });
}

async function generateTemplates() {
  // --- AL SHABLAN ---
  if (bgAlShablan) {
    const alShablanDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 2500, right: 750, bottom: 750, left: 750 },
              size: { width: 11906, height: 16838 } // A4
            },
            titlePage: true,
          },
          headers: {
            first: new Header({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: bgAlShablan,
                      type: "png",
                      transformation: { width: 595, height: 842 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                        wrap: { type: TextWrappingType.NONE },
                        behindDocument: true,
                      }
                    }),
                  ],
                }),
              ]
            }),
            default: new Header({ children: [] })
          },
          children: [
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
                        new Table({
                          width: { size: 100, type: WidthType.PERCENTAGE },
                          rows: [
                            new TableRow({
                              height: { value: 2500, rule: HeightRule.ATLEAST },
                              children: [
                                new TableCell({
                                  borders: BORDER_SOLID,
                                  verticalAlign: VerticalAlign.CENTER,
                                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                                  children: [
                                    new Paragraph({
                                      alignment: AlignmentType.CENTER,
                                      spacing: { before: 0, after: 0 },
                                      children: [new TextRun("{%facePhoto}")]
                                    })
                                  ]
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      margins: { left: 150 },
                      children: [
                        new Table({
                          width: { size: 100, type: WidthType.PERCENTAGE },
                          rows: [
                            createDataRow("Reference No", "124764987"),
                            createDataRow("Full Name", "{fullName}"),
                            createDataRow("Religion", "{religion}"),
                            createDataRow("Position Desired", "{job}"),
                            createDataRow("Salary", "-"),
                            createDataRow("Age", "{age}"),
                            createDataRow("Sex", "{gender}"),
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            
            new Paragraph({ text: "" }), // Spacer
            
            new Table({
              borders: BORDER_NONE,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    // LEFT COLUMN
                    new TableCell({
                      width: { size: 56, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      margins: { right: 100 },
                      children: [
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
                            new TableRow({
                              children: [
                                new TableCell({ borders: BORDER_SOLID, children: [createText("{expCountry}", { size: 20 })] }),
                                new TableCell({ borders: BORDER_SOLID, children: [createText("{expPeriod}", { size: 20 })] }),
                                new TableCell({ borders: BORDER_SOLID, children: [createText("{expPosition}", { size: 20 })] }),
                              ]
                            })
                          ]
                        }),
                        new Paragraph({ text: "" }),
                        
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
                            createDataRow("Nationality", "{nationality}"),
                            createDataRow("Date of Birth", "{dob}"),
                            createDataRow("Address", "{address}"),
                            createDataRow("Marital Status", "{maritalStatus}"),
                            createDataRow("No of Children", "{numberOfChildren}"),
                            createDataRow("Height", "{height}"),
                            createDataRow("Weight", "{weight}"),
                            createDataRow("Education", "{educationLevel}"),
                            createDataRow("Tel.Number", "{phone}"),
                          ]
                        }),
                        new Paragraph({ text: "" }),
                        
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
                            createDataRow("English", "{english}"),
                            createDataRow("Arabic", "{arabic}"),
                          ]
                        }),
                        new Paragraph({ text: "" }),
                        
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
                            createSkillRow("BABY SITTING", "{skillBaby}", "CHILDREN CARE", "{skillChildren}"),
                            createSkillRow("TUTORING", "{skillTutor}", "COMPUTER", "{skillComputer}"),
                            createSkillRow("CLEANING", "{skillClean}", "WASHING", "{skillWash}"),
                            createSkillRow("IRONING", "{skillIron}", "COOKING", "{skillCook}"),
                            createSkillRow("ARABIC COOKING", "{skillArabicCook}", "SEWING", "{skillSew}"),
                            createSkillRow("DRIVING", "{skillDrive}", "DISABLED CARE", "{skillDisabled}"),
                          ]
                        }),
                      ]
                    }),
                    // RIGHT COLUMN
                    new TableCell({
                      width: { size: 44, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      margins: { left: 100 },
                      children: [
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
                            createDataRow("Number", "{passportNumber}"),
                            createDataRow("Issue Date", "{issueDate}"),
                            createDataRow("Expiry Date", "{expiryDate}"),
                            createDataRow("Issue Place", "{issuePlace}"),
                            createDataRow("Next of Kin", "{emergencyName}"),
                            createDataRow("Next of Kin No", "{emergencyPhone}"),
                          ]
                        }),
                        new Paragraph({ text: "" }),
                        
                        new Table({
                          width: { size: 100, type: WidthType.PERCENTAGE },
                          rows: [
                            new TableRow({
                              children: [
                                new TableCell({
                                  borders: BORDER_SOLID,
                                  verticalAlign: VerticalAlign.CENTER,
                                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                                  children: [
                                    new Paragraph({
                                      alignment: AlignmentType.CENTER,
                                      spacing: { before: 0, after: 0 },
                                      children: [new TextRun("{%fullBodyPhoto}")]
                                    })
                                  ]
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
          ]
        },
        // Page 2: Passport Document + QR
        {
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
                new TextRun("{%passport image}"),
                new TextRun({ text: "\n\n", break: 1 }),
                new TextRun("Scan to watch video:"),
                new TextRun({ text: "\n", break: 1 }),
                new TextRun("{%qrCode}")
              ]
            })
          ]
        }
      ]
    });

    const alShablanBlob = await Packer.toBuffer(alShablanDoc);
    fs.writeFileSync(path.join(__dirname, '../../templates/CV Al-shablan.docx'), alShablanBlob);
    console.log('Saved CV Al-shablan.docx');
  }

  // --- USSUS ---
  if (bgUssus) {
    function ussusLabel(label: string, value: string, opts: { boldValue?: boolean, size?: number } = {}) {
      return new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: opts.size || 22, font: "Times New Roman" }),
          new TextRun({ text: value, bold: opts.boldValue || false, size: opts.size || 22, font: "Times New Roman" }),
        ]
      });
    }

    const ussusDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 2500, right: 750, bottom: 600, left: 750 },
              size: { width: 11906, height: 16838 }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: bgUssus,
                      type: "png",
                      transformation: { width: 595, height: 842 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.LEFT },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.TOP },
                        wrap: { type: TextWrappingType.NONE },
                        behindDocument: true,
                      }
                    })
                  ],
                }),
              ],
            })
          },
          children: [
            // TOP SECTION: Data left, Face photo right
            new Table({
              borders: BORDER_NONE,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.CENTER,
                      children: [
                        ussusLabel("NAME", "{fullName}"),
                        ussusLabel("AGE", "{age} YEARS"),
                        ussusLabel("NATIONALITY", "{nationality}"),
                        ussusLabel("RELIGION", "{religion}"),
                        ussusLabel("PASSPORT NUMBER", "{passportNumber}"),
                      ]
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { before: 0, after: 0 },
                          children: [new TextRun("{%facePhoto}")]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            new Paragraph({ spacing: { after: 100 }, text: "" }),

            // BOTTOM SECTION: Full body photo left, more data right
            new Table({
              borders: BORDER_NONE,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { before: 0, after: 0 },
                          children: [new TextRun("{%fullBodyPhoto}")]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.TOP,
                      margins: { left: 200 },
                      children: [
                        ussusLabel("LANGUAGE", "{languages}", { size: 20 }),
                        ussusLabel("MONTHLY SALARY", "{salary}", { boldValue: true, size: 20 }),
                        ussusLabel("PHONE NUMBER", "{phone}", { boldValue: true, size: 20 }),
                        ussusLabel("MARITAL STATUS", "{maritalStatus}", { size: 20 }),
                        ussusLabel("NUMBER OF KIDS", "{numberOfChildren} KIDS", { size: 20 }),
                        ussusLabel("HEIGHT", "{height}", { size: 20 }),
                        ussusLabel("WEIGHT", "{weight}", { size: 20 }),
                        new Paragraph({ spacing: { after: 150 }, text: "" }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 80 },
                          children: [new TextRun({ text: "EXPERIENCE", bold: true, size: 22, font: "Times New Roman" })]
                        }),
                        new Paragraph({
                          spacing: { after: 80 },
                          children: [
                            new TextRun({ text: "➤ ", size: 20, font: "Times New Roman" }),
                            new TextRun({ text: "{workPeriod}", bold: true, size: 22, font: "Times New Roman" }),
                          ]
                        }),
                        new Paragraph({ spacing: { after: 150 }, text: "" }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 80 },
                          children: [new TextRun({ text: "SKILLS", bold: true, size: 22, font: "Times New Roman", color: "0066CC" })]
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "{skills}", size: 20, font: "Times New Roman" })]
                        }),
                      ]
                    })
                  ]
                })
              ]
            }),

            new Paragraph({ spacing: { after: 100 }, text: "" }),

            // FOOTER: QR Code left + Agency text right
            new Table({
              borders: BORDER_NONE,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 25, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.CENTER,
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun("{%qrCode}")]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 75, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      verticalAlign: VerticalAlign.CENTER,
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Daera Foreign Employment Agency", bold: true, size: 24, font: "Times New Roman", color: "333333" })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
          ]
        }
      ]
    });

    const ussusBlob = await Packer.toBuffer(ussusDoc);
    fs.writeFileSync(path.join(__dirname, '../../templates/CV Ussus.docx'), ussusBlob);
    console.log('Saved CV Ussus.docx');
  }

  // --- GENERIC ALM-STYLE (ALM, KA7, MA, RA, KU2) ---
  const genericTemplates = [
    { id: 'ALM', header: 'ALM.png' },
    { id: 'KA-7', header: 'KA-7.png' },
    { id: 'MA', header: 'MA.png' },
    { id: 'RA', header: 'RA-1.png' },
    { id: 'KU2', header: 'KU2.png' }
  ];

  for (const t of genericTemplates) {
    const headerPath = path.join(__dirname, `../public/${t.header}`);
    const headerImg = fs.existsSync(headerPath) ? fs.readFileSync(headerPath) : null;

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 750, right: 750, bottom: 750, left: 750 },
              size: { width: 11906, height: 16838 }
            }
          },
          children: [
            // Header Image
            headerImg ? new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: headerImg,
                  type: "png",
                  transformation: { width: 500, height: 100 }
                })
              ]
            }) : new Paragraph(""),

            new Paragraph({ text: "" }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 25, type: WidthType.PERCENTAGE },
                      borders: BORDER_SOLID,
                      verticalAlign: VerticalAlign.CENTER,
                      children: [createText("{%facePhoto}")]
                    }),
                    new TableCell({
                      width: { size: 75, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      children: [
                        new Table({
                          width: { size: 100, type: WidthType.PERCENTAGE },
                          rows: [
                            new TableRow({
                              children: [
                                new TableCell({
                                  columnSpan: 3, borders: BORDER_SOLID, shading: { fill: "D9E1F2", type: ShadingType.CLEAR },
                                  children: [createText("APPLICATION FOR EMPLOYMENT", { bold: true, size: 28, color: "0066CC" })]
                                })
                              ]
                            }),
                            createDataRow("Full Name", "{fullName}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Telephone", "{phone}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Position", "{job}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Age", "{age}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Date of Expiry", "{expiryDate}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            new Paragraph({ text: "" }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 35, type: WidthType.PERCENTAGE },
                      borders: BORDER_SOLID,
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { before: 0, after: 0 },
                          children: [new TextRun("{%fullBodyPhoto}")]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 65, type: WidthType.PERCENTAGE },
                      borders: BORDER_NONE,
                      children: [
                        new Table({
                          width: { size: 100, type: WidthType.PERCENTAGE },
                          rows: [
                            new TableRow({
                               children: [new TableCell({ columnSpan: 3, borders: BORDER_SOLID, shading: { fill: "B4C6E7", type: ShadingType.CLEAR }, children: [createText("Details of Applicant", { bold: true, size: 20 })] })]
                            }),
                            createDataRow("Nationality", "{nationality}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Passport No.", "{passportNumber}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Religion", "{religion}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Date of Birth", "{dob}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Place of Birth", "{placeOfBirth}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Marital Status", "{maritalStatus}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("No. of Children", "{numberOfChildren}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Height", "{height}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                            createDataRow("Weight", "{weight}", { labelFill: "FFFFFF", labelSize: 18, tagSize: 18 }),
                          ]
                        }),
                        new Paragraph({ text: "" }),
                        new Table({
                           width: { size: 100, type: WidthType.PERCENTAGE },
                           rows: [
                             new TableRow({
                                children: [new TableCell({ columnSpan: 3, borders: BORDER_SOLID, shading: { fill: "B4C6E7", type: ShadingType.CLEAR }, children: [createText("Previous Employment Abroad", { bold: true, size: 20 })] })]
                             }),
                             new TableRow({
                               children: [
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("Period", { bold: true, size: 18 })] }),
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("Country", { bold: true, size: 18 })] }),
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("Position", { bold: true, size: 18 })] }),
                               ]
                             }),
                             new TableRow({
                               children: [
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("{expPeriod}", { size: 18 })] }),
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("{expCountry}", { size: 18 })] }),
                                 new TableCell({ borders: BORDER_SOLID, children: [createText("{expPosition}", { size: 18 })] }),
                               ]
                             })
                           ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            new Table({
               width: { size: 100, type: WidthType.PERCENTAGE },
               rows: [
                 new TableRow({
                    children: [new TableCell({ columnSpan: 6, borders: BORDER_SOLID, shading: { fill: "B4C6E7", type: ShadingType.CLEAR }, children: [createText("Skills & Experience", { bold: true, size: 20 })] })]
                 }),
                 createSkillRow("Ironing", "{skillIron}", "Baby Sitting", "{skillBaby}"),
                 createSkillRow("Cooking", "{skillCook}", "Children Care", "{skillChildren}"),
                 createSkillRow("Cleaning", "{skillClean}", "Washing", "{skillWash}"),
               ]
            })
          ]
        },
        {
          properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
          children: [
            new Paragraph({
               alignment: AlignmentType.CENTER,
               children: [
                 new TextRun("{%passport image}"),
                 new TextRun({ text: "\n\nScan to watch video:\n", break: 2 }),
                 new TextRun("{%qrCode}")
               ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBuffer(doc);
    const targetDir = path.join(__dirname, `../../server/templates`);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, `CV ${t.id}.docx`), blob);
    console.log(`Saved CV ${t.id}.docx`);
  }
}

generateTemplates().catch(console.error);
