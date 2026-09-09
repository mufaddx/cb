import PDFDocument from "pdfkit";

export interface AgreementPdfSection {
  heading: string;
  lines: string[];
}

export interface AgreementPdfContent {
  title: string;
  subtitle: string;
  sections: AgreementPdfSection[];
}

/**
 * Renders a real PDF (via pdfkit — pure JS, no native/headless-browser
 * dependency) for the campaign agreement (spec §36). This is
 * deliberately plain typography, not a branded template — legal
 * counsel should review the actual contract language before this
 * goes anywhere near production use (spec §38).
 */
export function renderAgreementPdf(content: AgreementPdfContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).font("Helvetica-Bold").text(content.title);
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica").fillColor("#555").text(content.subtitle);
    doc.moveDown(1);
    doc.fillColor("#000");

    for (const section of content.sections) {
      doc.fontSize(13).font("Helvetica-Bold").text(section.heading);
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica");
      for (const line of section.lines) {
        doc.text(line, { lineGap: 2 });
      }
      doc.moveDown(0.8);
    }

    doc.end();
  });
}
