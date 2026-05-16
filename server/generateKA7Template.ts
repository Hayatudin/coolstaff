import * as fs from "fs";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType, VerticalAlign, ShadingType, ImageRun, PageBreak } from "docx";
import * as path from "path";

const BLUE_HEADER = "8EA9DB";
const LIGHT_BLUE = "D9E1F2";

const c = (options: any) => {
  return new TableCell({
    columnSpan: options.cspan || 1,
    rowSpan: options.rspan || 1,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: options.vAlign || VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 60, right: 60 },
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: options.text || "",
            bold: options.bold || false,
            color: options.color || "000000",
            size: options.size || 18, // 9pt
            font: "Arial"
          })
        ]
      })
    ]
  });
};

const headerImagePath = path.join(__dirname, "../client/public/KA-7.png");
let headerImage: ImageRun | null = null;

try {
  if (fs.existsSync(headerImagePath)) {
    const imageBuffer = fs.readFileSync(headerImagePath);
    headerImage = new ImageRun({
      data: imageBuffer,
      transformation: {
        width: 600,
        height: 100,
      },
    } as any);
  }
} catch (e) {
  console.error("Failed to load header image:", e);
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: headerImage ? [headerImage] : [new TextRun({ text: "Header Image Placeholder", color: "999999" })],
        }),
        new Paragraph({ text: "" }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: Array(18).fill(500),
          rows: [
            // Face photo column
            new TableRow({ children: [ 
              c({ cspan: 5, rspan: 7, text: "{%facePhoto}", align: AlignmentType.CENTER }), 
              c({ cspan: 4, fill: BLUE_HEADER, text: "Reference Number", bold: true }), 
              c({ cspan: 6, text: "{refNumber}" }), 
              c({ cspan: 3, fill: BLUE_HEADER, text: " ", align: AlignmentType.RIGHT }) 
            ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Full Name", bold: true }), c({ cspan: 6, text: "{fullName}" }), c({ cspan: 3, fill: BLUE_HEADER, text: "الاسم", align: AlignmentType.RIGHT }) ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Religion", bold: true }), c({ cspan: 6, text: "{religion}", color: "FF0000", bold: true }), c({ cspan: 3, fill: BLUE_HEADER, text: "الديانة", align: AlignmentType.RIGHT }) ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Position Desired", bold: true }), c({ cspan: 6, text: "{position}" }), c({ cspan: 3, fill: BLUE_HEADER, text: "الوظيفة", align: AlignmentType.RIGHT }) ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Salary", bold: true }), c({ cspan: 6, text: "{salary}" }), c({ cspan: 3, fill: BLUE_HEADER, text: "الراتب", align: AlignmentType.RIGHT }) ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Age", bold: true }), c({ cspan: 6, text: "{age}" }), c({ cspan: 3, fill: BLUE_HEADER, text: "العمر", align: AlignmentType.RIGHT }) ] }),
            new TableRow({ children: [ c({ cspan: 4, fill: BLUE_HEADER, text: "Sex", bold: true }), c({ cspan: 6, text: "{gender}" }), c({ cspan: 3, fill: BLUE_HEADER, text: "الجنس", align: AlignmentType.RIGHT }) ] }),
            
            // Row 8 Header
            new TableRow({ children: [ c({ cspan: 6, fill: BLUE_HEADER, text: "Personal Information", bold: true }), c({ cspan: 2, fill: BLUE_HEADER, text: "معلومات شخصيه", align: AlignmentType.RIGHT, bold: true }), c({ cspan: 8, fill: BLUE_HEADER, text: "Passport Information", bold: true }), c({ cspan: 2, fill: BLUE_HEADER, text: "معلومات الجواز", align: AlignmentType.RIGHT, bold: true }) ] }),

            // Row 9
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Nationality" }), c({ cspan: 3, text: "{nationality}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الجنسية", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Number" }), c({ cspan: 4, text: "{passportNumber}" }), c({ cspan: 2, fill: LIGHT_BLUE }) ] }),
            
            // Row 10
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Date of Birth" }), c({ cspan: 3, text: "{dob}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "تاريخ الميلاد", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Issue Date" }), c({ cspan: 4, text: "{issueDate}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الإصدار", align: AlignmentType.RIGHT }) ] }),

            // Row 11
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Address" }), c({ cspan: 3, text: "{address}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "العنوان", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Expiry Date" }), c({ cspan: 4, text: "{expiryDate}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الانتهاء", align: AlignmentType.RIGHT }) ] }),

            // Row 12
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Marital Status" }), c({ cspan: 3, text: "{maritalStatus}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الحالة الاجتماعية", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Issue place" }), c({ cspan: 4, text: "{issuePlace}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الاصدار", align: AlignmentType.RIGHT }) ] }),

            // Row 13
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "No. of Children" }), c({ cspan: 3, text: "{numberOfChildren}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "عدد الأطفال", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Next of Kin name" }), c({ cspan: 4, text: "{emergencyName}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "خص", align: AlignmentType.RIGHT }) ] }),

            // Row 14
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Height/Weight" }), c({ cspan: 3, text: "{height} / {weight}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "الوزن والطول", align: AlignmentType.RIGHT }), c({ cspan: 4, fill: LIGHT_BLUE, text: "Next of Kin number" }), c({ cspan: 4, text: "{emergencyPhone}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "رتب", align: AlignmentType.RIGHT }) ] }),

            // Row 15
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Education Qualifications" }), c({ cspan: 3, text: "{educationLevel}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "المستوى التعليمي", align: AlignmentType.RIGHT }), c({ cspan: 10, rspan: 13, text: "{%fullBodyPhoto}", align: AlignmentType.CENTER, vAlign: VerticalAlign.TOP }) ] }),

            // Row 16
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Tel. Number" }), c({ cspan: 3, text: "{phone}" }), c({ cspan: 2, fill: LIGHT_BLUE, text: "رقم التواصل", align: AlignmentType.RIGHT }) ] }),

            // Row 17
            new TableRow({ children: [ c({ cspan: 5, fill: BLUE_HEADER, text: "Overseas Experience", bold: true }), c({ cspan: 3, fill: BLUE_HEADER, text: "خبرات سابقه", align: AlignmentType.RIGHT, bold: true }) ] }),

            // Row 18
            new TableRow({ children: [ c({ cspan: 3, fill: LIGHT_BLUE, text: "Country", bold: true }), c({ cspan: 2, fill: LIGHT_BLUE, text: "Period", bold: true }), c({ cspan: 3, fill: LIGHT_BLUE, text: "Position", bold: true }) ] }),

            // Row 19
            new TableRow({ children: [ c({ cspan: 3, text: "{expCountry}" }), c({ cspan: 2, text: "{expPeriod}" }), c({ cspan: 3, text: "{expPosition}" }) ] }),

            // Row 20
            new TableRow({ children: [ c({ cspan: 5, fill: BLUE_HEADER, text: "Skills", bold: true }), c({ cspan: 3, fill: BLUE_HEADER, text: "المهارات", align: AlignmentType.RIGHT, bold: true }) ] }),

            // Row 21
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: "Cooking" }), c({ cspan: 1, text: "{skillCook}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "الطبخ", align: AlignmentType.RIGHT }), c({ cspan: 2, fill: LIGHT_BLUE, text: "Baby Sitting" }), c({ cspan: 1, text: "{skillBaby}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "التعامل", align: AlignmentType.RIGHT }) ] }),

            // Row 22
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: "Washing" }), c({ cspan: 1, text: "{skillWash}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "الغسيل", align: AlignmentType.RIGHT }), c({ cspan: 2, fill: LIGHT_BLUE, text: "Sewing" }), c({ cspan: 1, text: "{skillSew}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "الخياطة", align: AlignmentType.RIGHT }) ] }),

            // Row 23
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: "Cleaning" }), c({ cspan: 1, text: "{skillClean}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "التنظيف", align: AlignmentType.RIGHT }), c({ cspan: 2, fill: LIGHT_BLUE, text: "Driving" }), c({ cspan: 1, text: "{skillDrive}", align: AlignmentType.CENTER }), c({ cspan: 1, fill: LIGHT_BLUE, text: "سائق", align: AlignmentType.RIGHT }) ] }),

            // Row 24
            new TableRow({ children: [ c({ cspan: 5, fill: BLUE_HEADER, text: "Languages", bold: true }), c({ cspan: 3, fill: BLUE_HEADER, text: "اللغات", align: AlignmentType.RIGHT, bold: true }) ] }),

            // Row 25
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: " " }), c({ cspan: 3, fill: BLUE_HEADER, text: "English\nالانجليزية", align: AlignmentType.CENTER }), c({ cspan: 3, fill: BLUE_HEADER, text: "Arabic\nالعربية", align: AlignmentType.CENTER }) ] }),

            // Row 26
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: "Good", bold: true }), c({ cspan: 3, text: "{english}", align: AlignmentType.CENTER }), c({ cspan: 3, text: "{arabic}", align: AlignmentType.CENTER }) ] }),

            // Row 27
            new TableRow({ children: [ c({ cspan: 2, fill: LIGHT_BLUE, text: "Fluent", bold: true }), c({ cspan: 3, text: "NO", align: AlignmentType.CENTER }), c({ cspan: 3, text: "NO", align: AlignmentType.CENTER }) ] }),

            // Row 28 (Remarks)
            new TableRow({ children: [ c({ cspan: 18, fill: BLUE_HEADER, text: "REMARKS: SHE IS HARDWORKING, NEAT, ORGANISED, SMART, DISCIPLINED, CARING, HAS A GOOD ATTITUDE, SPEAKS GOOD ENGLISH AND LOVES TAKING CARE OF CHILDREN.", align: AlignmentType.CENTER, bold: true }) ] })
          ]
        }),
        // Page 2 for QR and Passport
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Scan for Video / QR Code", bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{%qrCode}" })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Passport Image", bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{%passport image}" })] }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("templates/CV KA-7-v3.docx", buffer);
  console.log("Document CV KA-7-v3.docx updated successfully in templates/");
}).catch((e) => console.error(e));
