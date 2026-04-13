import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import { ImageEntry } from '../types';

export const exportToWord = async (
  entries: ImageEntry[], 
  imagesPerPage: number,
  layout: 'side-by-side' | 'top-bottom',
  fontSettings: { family: string; size: number; color: string },
  headerSettings: { text: string; preparedBy: string; reference: string; logo: string | null; alignment: 'right' | 'center'; showPageNum: boolean }
) => {
  const children: any[] = [];
  const fontColor = fontSettings.color.replace('#', '');
  const fontSize = fontSettings.size * 2; // docx uses half-points
  const fontFamily = fontSettings.family.split(',')[0].replace(/['"]/g, '').trim();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    const maxWidth = layout === 'side-by-side' ? 300 : 500;
    const scale = maxWidth / entry.width;
    const userScale = entry.scale || 1;
    const imgWidth = maxWidth * userScale;
    const imgHeight = (entry.height * scale) * userScale;

    // Convert base64 to ArrayBuffer
    const base64Data = entry.dataUrl.split(',')[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let j = 0; j < len; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }

    const imageRun = new ImageRun({
      data: bytes.buffer,
      transformation: {
        width: imgWidth,
        height: imgHeight,
      },
    });

    const textRuns = entry.notes.split('\n').map((line) => (
      new Paragraph({
        alignment: layout === 'side-by-side' ? AlignmentType.RIGHT : AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: line,
            rightToLeft: true,
            size: fontSize,
            font: fontFamily,
            color: fontColor,
          }),
        ],
      })
    ));

    const itemHeader = new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          shading: { fill: "F3F4F6" },
          borders: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `مرفق رقم (${i + 1})`,
                  bold: true,
                  rightToLeft: true,
                  size: fontSize,
                  font: fontFamily,
                  color: "1F2937",
                }),
              ],
            }),
          ],
        }),
      ],
    });

    let table;
    if (layout === 'side-by-side') {
      table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
        },
        rows: [
          itemHeader,
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: textRuns.length > 0 ? textRuns : [new Paragraph("")],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: "F9FAFB" },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [imageRun],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
    } else {
      table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
        },
        rows: [
          itemHeader,
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: "F9FAFB" },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [imageRun],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                verticalAlign: VerticalAlign.TOP,
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: textRuns.length > 0 ? textRuns : [new Paragraph("")],
              }),
            ],
          }),
        ],
      });
    }

    children.push(table);

    // Add spacing between items
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "" }));

    // Page break if needed
    if ((i + 1) % imagesPerPage === 0 && i !== entries.length - 1) {
      children.push(new Paragraph({ pageBreakBefore: true }));
    }
  }

  // Prepare Header
  const headerChildren = [];
  if (headerSettings.text || headerSettings.preparedBy || headerSettings.reference) {
    if (headerSettings.alignment === 'center') {
      const centerRuns = [];
      centerRuns.push(new TextRun({ text: headerSettings.text, bold: true, size: 32, font: fontFamily, rightToLeft: true }));
      
      const metaRuns = [];
      if (headerSettings.reference) {
        metaRuns.push(new TextRun({ text: `المرجع: ${headerSettings.reference}    `, rightToLeft: true, font: fontFamily, size: 20 }));
      }
      if (headerSettings.preparedBy) {
        metaRuns.push(new TextRun({ text: `إعداد: ${headerSettings.preparedBy}`, rightToLeft: true, font: fontFamily, size: 20 }));
      }

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.DOUBLE, size: 12, color: "1F2937" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                margins: { bottom: 200 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: centerRuns,
                  }),
                  ...(metaRuns.length > 0 ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 120 },
                      children: metaRuns,
                    })
                  ] : [])
                ],
              }),
            ],
          }),
        ],
      });
      headerChildren.push(headerTable);
      headerChildren.push(new Paragraph({ text: "" }));
    } else {
      const metaRuns = [];
      if (headerSettings.reference) {
        metaRuns.push(new TextRun({ text: `المرجع: ${headerSettings.reference}`, rightToLeft: true, font: fontFamily, size: 20 }));
        metaRuns.push(new TextRun({ text: "\n", break: 1 }));
      }
      if (headerSettings.preparedBy) {
        metaRuns.push(new TextRun({ text: `إعداد: ${headerSettings.preparedBy}`, rightToLeft: true, font: fontFamily, size: 20 }));
      }

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.DOUBLE, size: 12, color: "1F2937" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.BOTTOM,
                margins: { bottom: 200 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: metaRuns,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.BOTTOM,
                margins: { bottom: 200 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: headerSettings.text,
                        bold: true,
                        size: 32, // 16pt
                        font: fontFamily,
                        rightToLeft: true,
                      })
                    ]
                  })
                ],
              }),
            ],
          }),
        ],
      });
      headerChildren.push(headerTable);
      headerChildren.push(new Paragraph({ text: "" })); // Spacing after header
    }
  }

  // Prepare Footer
  const footerChildren = [];
  if (headerSettings.showPageNum) {
    const footerRuns = [];
    if (headerSettings.showPageNum) {
      footerRuns.push(new TextRun({ children: ["صفحة ", PageNumber.CURRENT], font: fontFamily, size: 20 }));
    }
    
    footerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: footerRuns
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: headerChildren.length > 0 ? {
          default: new Header({ children: headerChildren })
        } : undefined,
        footers: footerChildren.length > 0 ? {
          default: new Footer({ children: footerChildren })
        } : undefined,
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "report.docx");
};
