import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const collegeName = 'GOVERNMENT ENGINEERING COLLEGE, MODASA';
const subTitle = 'OFFICIAL LETTER OF RECOMMENDATION';
const brandBlue = '#0f3e6e';
const muted = '#6b7280';
const ink = '#1f2937';
const lightBorder = '#e5e7eb';
const panelBg = '#f7f7f5';

const getLogoPath = () => path.resolve(process.cwd(), 'assets', 'college-logo.png');

const buildHeader = (doc, logoBuffer, layout) => {
  const { left, right, top, contentWidth, pageWidth } = layout;
  const barHeight = 10;

  doc.rect(0, 0, pageWidth, barHeight).fill(brandBlue);

  const logoWidth = 62;
  const headerTop = top + 12;

  if (logoBuffer) {
    const logoX = (pageWidth - logoWidth) / 2;
    doc.image(logoBuffer, logoX, headerTop, { width: logoWidth });
  }

  const nameY = headerTop + 70;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(brandBlue);
  doc.text(collegeName, left, nameY, { width: contentWidth, align: 'center' });

  doc.font('Helvetica').fontSize(9).fillColor(muted);
  doc.text(subTitle, left, nameY + 22, { width: contentWidth, align: 'center', letterSpacing: 1 });

  const dividerY = nameY + 50;
  doc
    .moveTo(left, dividerY)
    .lineTo(right, dividerY)
    .strokeColor(lightBorder)
    .stroke();

  doc.y = dividerY + 18;
};

const drawKeyValueBlock = (doc, x, y, width, title, items) => {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#b37b3d').text(title, x, y, { width });
  let cursorY = y + 16;
  items.forEach(({ label, value }) => {
    doc.font('Helvetica').fontSize(9).fillColor(muted).text(label, x, cursorY, { width });
    cursorY += 12;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(value || '-', x, cursorY, { width });
    cursorY += 18;
  });
  return cursorY;
};

const buildMetadata = (doc, request, layout) => {
  const { left, right, contentWidth } = layout;
  const blockTop = doc.y + 4;
  const blockHeight = 120;
  const mid = left + contentWidth / 2;

  doc
    .rect(left, blockTop, contentWidth, blockHeight)
    .fill(panelBg);
  doc.rect(left, blockTop, contentWidth, blockHeight).strokeColor(lightBorder).stroke();

  const leftBlockX = left + 24;
  const rightBlockX = mid + 16;
  const columnWidth = contentWidth / 2 - 40;

  drawKeyValueBlock(doc, leftBlockX, blockTop + 18, columnWidth, 'STUDENT INFORMATION', [
    { label: 'Name', value: request.studentId?.name || 'Student' },
    { label: 'Enrollment No.', value: request.studentId?.enrollment || '-' },
    { label: 'Email', value: request.studentId?.email || '-' }
  ]);

  drawKeyValueBlock(doc, rightBlockX, blockTop + 18, columnWidth, 'ACADEMIC CONTEXT', [
    { label: 'Current Program', value: request.program || '-' },
    { label: 'Target University', value: request.targetUniversity || '-' },
    { label: 'Purpose', value: request.purpose || '-' }
  ]);

  doc.y = blockTop + blockHeight + 22;
};

const truncateText = (value, maxLength) => {
  if (!value) return '';
  const trimmed = String(value).replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3)}...`;
};

const fitText = (doc, text, maxHeight, options) => {
  if (!text) return '';
  if (doc.heightOfString(text, options) <= maxHeight) return text;
  let lo = 0;
  let hi = text.length;
  let best = '';
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = `${text.slice(0, mid).trim()}...`;
    if (doc.heightOfString(candidate, options) <= maxHeight) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best || '';
};

const buildBody = (doc, request, layout) => {
  const { left, contentWidth, footerY } = layout;
  const safeBottom = footerY - 20;
  const facultyName = request.facultyId?.name || 'Faculty';
  const studentName = request.studentId?.name || 'Student';
  const enrollment = request.studentId?.enrollment || '-';
  const studentEmail = request.studentId?.email || '-';
  const targetUniversity = request.targetUniversity || '-';
  const program = request.program || '-';
  const subject = request.subject || '-';
  const purpose = request.purpose || '-';
  const achievements = truncateText(request.achievements || '-', 600);
  const requirements = truncateText(request.lorRequirements || '-', 400);

  doc.font('Helvetica').fontSize(11).fillColor(ink);
  doc.text('To Whom It May Concern,', left, doc.y, { width: contentWidth });
  doc.moveDown(1);

  const paragraphOne = `This letter is to recommend ${studentName} (Enrollment: ${enrollment}, Email: ${studentEmail}) ` +
    `for admission to ${targetUniversity} in the ${program} program. The student has requested this letter for ` +
    `the following purpose: ${purpose}.`;

  const paraOptions = { width: contentWidth, align: 'justify' };
  const availableParaHeight = Math.max(60, safeBottom - doc.y - 180);
  const fittedParaOne = fitText(doc, paragraphOne, availableParaHeight, paraOptions);
  doc.font('Helvetica').fontSize(11).fillColor(ink).text(fittedParaOne || paragraphOne, paraOptions);

  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(ink).text('Notable achievements and highlights include:', {
    width: contentWidth
  });

  doc.moveDown(0.5);
  const bullets = [
    achievements,
    requirements ? `Additional points: ${requirements}` : '',
    subject && subject !== '-' ? `Relevant coursework: ${subject}` : ''
  ]
    .filter((line) => line && line !== '-' && line.trim() !== '');

  bullets.forEach((line) => {
    if (doc.y > safeBottom) return;
    const lineOptions = { width: contentWidth - 16, align: 'left' };
    const maxHeight = safeBottom - doc.y - 60;
    const fittedLine = fitText(doc, line, Math.max(20, maxHeight), lineOptions);
    if (!fittedLine) return;
    doc.circle(left + 4, doc.y + 6, 1.6).fill('#b37b3d');
    doc.font('Helvetica').fontSize(10).fillColor(muted);
    doc.text(fittedLine, left + 16, doc.y - 2, lineOptions);
    doc.moveDown(0.6);
  });

  if (doc.y > safeBottom) {
    doc.font('Helvetica').fontSize(9).fillColor(muted);
    doc.text('Additional details are available upon request.', left, doc.y, { width: contentWidth });
  }

  doc.moveDown(1.2);
  doc.font('Helvetica').fontSize(11).fillColor(ink).text('Sincerely,', { width: contentWidth });
  doc.moveDown(1.8);

  doc.moveTo(left, doc.y).lineTo(left + 120, doc.y).strokeColor(lightBorder).stroke();
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(brandBlue).text(facultyName, { width: contentWidth });
  doc.font('Helvetica').fontSize(9).fillColor(muted).text('Department Faculty', { width: contentWidth });
  doc.font('Helvetica').fontSize(9).fillColor(muted).text('Government Engineering College, Modasa', { width: contentWidth });
};

const buildFooter = (doc, layout) => {
  const { left, right, footerY } = layout;
  doc
    .moveTo(left, footerY)
    .lineTo(right, footerY)
    .strokeColor(lightBorder)
    .stroke();
  doc.font('Helvetica').fontSize(8).fillColor(muted).text('OFFICIAL ACADEMIC DOCUMENT', left, footerY + 12, {
    width: right - left,
    align: 'left'
  });
  doc.font('Helvetica').fontSize(8).fillColor(muted).text(`© ${new Date().getFullYear()} GEC MODASA`, left, footerY + 12, {
    width: right - left,
    align: 'right'
  });
};

export const generateLorPdfBuffer = async (request) => {
  const logoPath = getLogoPath();
  const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    let pageCount = 1;
    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = (...args) => {
      if (pageCount >= 1) {
        return doc;
      }
      pageCount += 1;
      return originalAddPage(...args);
    };

    const pageWidth = doc.page.width;
    const footerY = doc.page.height - 60;
    const left = 80;
    const right = pageWidth - 80;
    const contentWidth = right - left;
    const layout = {
      top: 50,
      left,
      right,
      contentWidth,
      pageWidth,
      footerY
    };

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildHeader(doc, logoBuffer, layout);
    buildMetadata(doc, request, layout);
    buildBody(doc, request, layout);
    buildFooter(doc, layout);

    doc.end();
  });
};
