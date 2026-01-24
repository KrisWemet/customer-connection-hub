import { jsPDF } from "jspdf";

export async function generatePdfFromHtml(html: string): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await doc.html(html, {
    x: 24,
    y: 24,
    width: 548,
    windowWidth: 800,
  });
  const blob = doc.output("blob");
  return blob;
}
