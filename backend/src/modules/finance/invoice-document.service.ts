import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InvoiceStatus } from '../../prisma';
import { InvoicesRepository } from './invoices.repository';

const COLORS = {
  navy: '#17253D',
  blue: '#0B73F6',
  muted: '#68778D',
  border: '#DCE5F0',
  surface: '#F3F7FC',
  success: '#16865C',
  warning: '#A56A00',
  danger: '#B42318',
  white: '#FFFFFF',
};

@Injectable()
export class InvoiceDocumentService {
  constructor(private readonly invoices: InvoicesRepository) {}

  async generate(schoolId: string, invoiceId: string) {
    const invoice = await this.invoices.findDocument(schoolId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const paidMinor = invoice.paymentAllocations.reduce(
      (sum, allocation) => sum + allocation.amountMinor,
      0n,
    );
    const outstandingMinor =
      invoice.status === InvoiceStatus.ISSUED
        ? invoice.totalMinor - paidMinor
        : 0n;
    const studentName = invoice.studentNameSnapshot ?? invoice.student.name;
    const className = invoice.classNameSnapshot ?? invoice.student.className;
    const documentNumber = invoice.invoiceNumber ?? `DRAFT-${invoice.id.slice(0, 8).toUpperCase()}`;
    const fileName = `${safeFileName(documentNumber)}.pdf`;

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, right: 48, bottom: 64, left: 48 },
      bufferPages: true,
      info: {
        Title: `Invoice ${documentNumber}`,
        Author: invoice.school.name,
        Subject: `Fee invoice for ${studentName}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    drawBrandHeader(doc, invoice.school.name, invoice.school.slug);
    drawInvoiceIdentity(doc, documentNumber, invoice.status);
    drawParties(doc, {
      studentName,
      className,
      rollNo: invoice.student.rollNo,
      academicYear: invoice.academicYear,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      billingPeriod: invoice.billingPeriod,
    });
    drawItems(doc, invoice.items, invoice.currency);
    drawTotals(doc, {
      currency: invoice.currency,
      subtotalMinor: invoice.subtotalMinor,
      discountMinor: invoice.discountMinor,
      totalMinor: invoice.totalMinor,
      paidMinor,
      outstandingMinor,
      paymentStatus: paymentStatus(invoice.status, paidMinor, outstandingMinor),
    });
    drawNotice(doc, invoice.status);
    addFooters(doc, invoice.school.name, documentNumber);
    doc.end();

    return { buffer: await completed, fileName };
  }
}

function drawBrandHeader(doc: PDFKit.PDFDocument, schoolName: string, slug: string) {
  const top = doc.y;
  doc.roundedRect(48, top, 42, 42, 11).fill(COLORS.blue);
  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(17)
    .text('S', 48, top + 11, { width: 42, align: 'center' });
  doc
    .fillColor(COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(schoolName, 104, top + 2, { width: 310 });
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(`School workspace · ${slug}`, 104, top + 28, { width: 310 });
  doc
    .fillColor(COLORS.blue)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('SchoolSaaS', 430, top + 13, { width: 117, align: 'right' });
  doc.y = top + 66;
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(2);
}

function drawInvoiceIdentity(
  doc: PDFKit.PDFDocument,
  invoiceNumber: string,
  status: InvoiceStatus,
) {
  const top = doc.y;
  doc
    .fillColor(COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(27)
    .text('INVOICE', 48, top, { width: 280 });
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(invoiceNumber, 48, top + 35, { width: 280 });
  const label = statusLabel(status);
  const statusColor =
    status === InvoiceStatus.ISSUED
      ? COLORS.success
      : status === InvoiceStatus.VOID
        ? COLORS.danger
        : COLORS.warning;
  doc.roundedRect(440, top + 5, 107, 25, 12).fill(COLORS.surface);
  doc
    .fillColor(statusColor)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label, 440, top + 13, { width: 107, align: 'center' });
  doc.y = top + 78;
}

function drawParties(
  doc: PDFKit.PDFDocument,
  details: {
    studentName: string;
    className: string;
    rollNo: string;
    academicYear: string;
    issueDate: Date | null;
    dueDate: Date;
    billingPeriod: Date | null;
  },
) {
  const top = doc.y;
  card(doc, 48, top, 239, 105);
  label(doc, 'BILL TO', 63, top + 15, 200);
  doc
    .fillColor(COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(details.studentName, 63, top + 34, { width: 200 });
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(`Class: ${details.className}`, 63, top + 57, { width: 200 })
    .text(`Roll: ${details.rollNo}`, 63, top + 74, { width: 200 });

  card(doc, 302, top, 245, 105);
  meta(doc, 'Academic year', details.academicYear, 317, top + 15, 104);
  meta(doc, 'Issue date', dateLabel(details.issueDate), 428, top + 15, 104);
  meta(doc, 'Due date', dateLabel(details.dueDate), 317, top + 58, 104);
  meta(
    doc,
    'Billing period',
    dateLabel(details.billingPeriod),
    428,
    top + 58,
    104,
  );
  doc.y = top + 130;
}

function drawItems(
  doc: PDFKit.PDFDocument,
  items: Array<{
    description: string;
    quantity: number;
    unitAmountMinor: bigint;
    lineTotalMinor: bigint;
    feeCategory: { name: string; code: string };
  }>,
  currency: string,
) {
  drawTableHeader(doc);
  for (const item of items) {
    ensureSpace(doc, 52, () => drawTableHeader(doc));
    const top = doc.y;
    doc
      .fillColor(COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(item.description, 58, top + 11, { width: 245, ellipsis: true });
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(8)
      .text(`${item.feeCategory.name} · ${item.feeCategory.code}`, 58, top + 29, {
        width: 245,
        ellipsis: true,
      });
    doc
      .fillColor(COLORS.navy)
      .fontSize(9)
      .text(String(item.quantity), 312, top + 17, { width: 42, align: 'center' })
      .text(money(item.unitAmountMinor, currency), 365, top + 17, {
        width: 78,
        align: 'right',
      })
      .font('Helvetica-Bold')
      .text(money(item.lineTotalMinor, currency), 453, top + 17, {
        width: 84,
        align: 'right',
      });
    doc
      .moveTo(48, top + 49)
      .lineTo(547, top + 49)
      .strokeColor(COLORS.border)
      .stroke();
    doc.y = top + 50;
  }
  doc.moveDown(1.5);
}

function drawTableHeader(doc: PDFKit.PDFDocument) {
  const top = doc.y;
  doc.roundedRect(48, top, 499, 30, 7).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
  doc.text('DESCRIPTION', 58, top + 11, { width: 245 });
  doc.text('QTY', 312, top + 11, { width: 42, align: 'center' });
  doc.text('UNIT PRICE', 365, top + 11, { width: 78, align: 'right' });
  doc.text('AMOUNT', 453, top + 11, { width: 84, align: 'right' });
  doc.y = top + 31;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  totals: {
    currency: string;
    subtotalMinor: bigint;
    discountMinor: bigint;
    totalMinor: bigint;
    paidMinor: bigint;
    outstandingMinor: bigint;
    paymentStatus: string;
  },
) {
  ensureSpace(doc, 170);
  const top = doc.y;
  card(doc, 302, top, 245, 154);
  totalRow(doc, 'Subtotal', money(totals.subtotalMinor, totals.currency), top + 17);
  totalRow(doc, 'Discount', money(totals.discountMinor, totals.currency), top + 40);
  totalRow(doc, 'Total', money(totals.totalMinor, totals.currency), top + 68, true);
  totalRow(doc, 'Paid', money(totals.paidMinor, totals.currency), top + 94);
  totalRow(
    doc,
    'Outstanding',
    money(totals.outstandingMinor, totals.currency),
    top + 117,
    true,
  );
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(`PAYMENT STATUS: ${totals.paymentStatus}`, 48, top + 18, { width: 220 });
  doc.y = top + 172;
}

function drawNotice(doc: PDFKit.PDFDocument, status: InvoiceStatus) {
  ensureSpace(doc, 55);
  const top = doc.y;
  const copy =
    status === InvoiceStatus.DRAFT
      ? 'This is a draft invoice and is not yet payable.'
      : status === InvoiceStatus.VOID
        ? 'This invoice has been voided and must not be used for payment.'
        : 'Thank you. Please retain this invoice for your records.';
  doc
    .roundedRect(48, top, 499, 42, 9)
    .fill(status === InvoiceStatus.ISSUED ? '#EDF9F4' : '#FFF8E7');
  doc
    .fillColor(status === InvoiceStatus.ISSUED ? COLORS.success : COLORS.warning)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(copy, 62, top + 16, { width: 471, align: 'center' });
  doc.y = top + 42;
}

function addFooters(
  doc: PDFKit.PDFDocument,
  schoolName: string,
  invoiceNumber: string,
) {
  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index += 1) {
    doc.switchToPage(index);
    // Keep footer text inside PDFKit's writable content boundary. Writing in
    // the physical bottom margin makes PDFKit auto-create a page per text run.
    const y = doc.page.height - doc.page.margins.bottom - 10;
    doc
      .moveTo(48, y - 10)
      .lineTo(547, y - 10)
      .strokeColor(COLORS.border)
      .stroke();
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(7.5)
      .text(`${schoolName} · ${invoiceNumber}`, 48, y, { width: 350 })
      .text(`Page ${index - pages.start + 1} of ${pages.count}`, 430, y, {
        width: 117,
        align: 'right',
      });
  }
}

function card(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  doc.roundedRect(x, y, width, height, 10).fillAndStroke(COLORS.surface, COLORS.border);
}

function label(doc: PDFKit.PDFDocument, value: string, x: number, y: number, width: number) {
  doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(7.5).text(value, x, y, { width });
}

function meta(doc: PDFKit.PDFDocument, name: string, value: string, x: number, y: number, width: number) {
  label(doc, name.toUpperCase(), x, y, width);
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(value, x, y + 16, { width });
}

function totalRow(doc: PDFKit.PDFDocument, name: string, value: string, y: number, strong = false) {
  doc
    .fillColor(strong ? COLORS.navy : COLORS.muted)
    .font(strong ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(strong ? 10 : 9)
    .text(name, 317, y, { width: 90 })
    .text(value, 407, y, { width: 125, align: 'right' });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number, onNewPage?: () => void) {
  if (doc.y + height <= doc.page.height - 82) return;
  doc.addPage();
  onNewPage?.();
}

function money(amountMinor: bigint, currency: string) {
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');
  return `${negative ? '-' : ''}${currency} ${whole.toLocaleString('en-US')}.${fraction}`;
}

function dateLabel(value: Date | null) {
  if (!value) return 'Not issued';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function statusLabel(status: InvoiceStatus) {
  return status === InvoiceStatus.ISSUED
    ? 'ISSUED'
    : status === InvoiceStatus.VOID
      ? 'VOID'
      : 'DRAFT';
}

function paymentStatus(
  status: InvoiceStatus,
  paidMinor: bigint,
  outstandingMinor: bigint,
) {
  if (status === InvoiceStatus.DRAFT) return 'NOT ISSUED';
  if (status === InvoiceStatus.VOID) return 'VOID';
  if (outstandingMinor === 0n) return 'PAID';
  if (paidMinor === 0n) return 'UNPAID';
  return 'PARTIALLY PAID';
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'invoice';
}
