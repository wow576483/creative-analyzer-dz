import type { WeddingPackage } from '@3arsi/core';
import { formatDZD } from '@3arsi/core';
import { PDFDocument, PDFFont, PDFPage, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { reshapeArabic } from './arabic.js';

const BURGUNDY = rgb(143 / 255, 47 / 255, 56 / 255);
const HENNA_DARK = rgb(110 / 255, 31 / 255, 38 / 255);
const GOLD = rgb(201 / 255, 161 / 255, 74 / 255);
const CREAM = rgb(255 / 255, 248 / 255, 236 / 255);
const INK = rgb(42 / 255, 27 / 255, 31 / 255);

const A4 = { w: 595.28, h: 841.89 };

const ar = (s: string) => reshapeArabic(s);

function drawRightText(page: PDFPage, font: PDFFont, text: string, opts: { x: number; y: number; size: number; color: ReturnType<typeof rgb> }) {
  const w = font.widthOfTextAtSize(text, opts.size);
  page.drawText(text, { x: opts.x - w, y: opts.y, size: opts.size, font, color: opts.color });
}

function drawCenterText(page: PDFPage, font: PDFFont, text: string, opts: { cx: number; y: number; size: number; color: ReturnType<typeof rgb> }) {
  const w = font.widthOfTextAtSize(text, opts.size);
  page.drawText(text, { x: opts.cx - w / 2, y: opts.y, size: opts.size, font, color: opts.color });
}

function watermark(page: PDFPage, font: PDFFont, label: string) {
  const text = ar(label);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      page.drawText(text, {
        x: 40 + col * 200,
        y: 120 + row * 130,
        size: 16,
        font,
        color: GOLD,
        opacity: 0.06,
        rotate: degrees(35),
      });
    }
  }
}

function footer(page: PDFPage, font: PDFFont) {
  drawCenterText(page, font, ar('صُمّم بحبّ لعرايس الجزائر · 3ARSI © 2025-2026'), {
    cx: A4.w / 2,
    y: 28,
    size: 9,
    color: GOLD,
  });
}

export async function generateWeddingBook(pkg: WeddingPackage, fontBytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // subset:false — subsetting drops the Arabic presentation-form glyphs we
  // reference, so we embed the full font.
  const font = await doc.embedFont(fontBytes, { subset: false });

  const { intake } = pkg;
  const wm = `3ARSI · ${intake.brideName}`;

  // ---- Cover -------------------------------------------------------------
  const cover = doc.addPage([A4.w, A4.h]);
  cover.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: BURGUNDY });
  cover.drawRectangle({ x: 28, y: 28, width: A4.w - 56, height: A4.h - 56, borderColor: GOLD, borderWidth: 2 });
  // Monogram
  cover.drawCircle({ x: A4.w / 2, y: A4.h - 150, size: 46, color: HENNA_DARK, borderColor: GOLD, borderWidth: 2 });
  drawCenterText(cover, font, '3A', { cx: A4.w / 2, y: A4.h - 162, size: 34, color: GOLD });

  drawCenterText(cover, font, ar('كتاب العرس'), { cx: A4.w / 2, y: A4.h - 300, size: 40, color: CREAM });
  drawCenterText(cover, font, '3ARSI Wedding Book', { cx: A4.w / 2, y: A4.h - 345, size: 22, color: GOLD });

  drawCenterText(cover, font, ar(`${intake.brideName}  &  ${intake.groomName}`), {
    cx: A4.w / 2,
    y: A4.h - 470,
    size: 30,
    color: CREAM,
  });
  drawCenterText(cover, font, ar(pkg.wilayaLabel), { cx: A4.w / 2, y: A4.h - 520, size: 16, color: GOLD });
  drawCenterText(cover, font, intake.weddingDate, { cx: A4.w / 2, y: A4.h - 555, size: 18, color: CREAM });
  drawCenterText(cover, font, ar('نظام تنظيم العرس الجزائري'), { cx: A4.w / 2, y: 70, size: 12, color: GOLD });

  // ---- Content page helper ----------------------------------------------
  const contentPage = (titleAr: string): { page: PDFPage; cursor: number } => {
    const page = doc.addPage([A4.w, A4.h]);
    page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
    watermark(page, font, wm);
    page.drawRectangle({ x: 0, y: A4.h - 70, width: A4.w, height: 70, color: BURGUNDY });
    drawRightText(page, font, ar(titleAr), { x: A4.w - 40, y: A4.h - 48, size: 22, color: CREAM });
    footer(page, font);
    return { page, cursor: A4.h - 110 };
  };

  // ---- Dashboard ---------------------------------------------------------
  {
    const { page } = contentPage('لوحة العرس');
    const d = pkg.dashboard;
    const cards: [string, string][] = [
      ['العدّ التنازلي', `${d.daysUntilWedding} ${ar('يوم')}`],
      ['المدعوّون', String(d.guests.total)],
      ['الطاولات', String(d.guests.tables)],
      ['الميزانية', formatDZD(d.budget.planned)],
    ];
    let y = A4.h - 160;
    let x = 40;
    cards.forEach((card, i) => {
      const cw = (A4.w - 80 - 30) / 2;
      const cx = i % 2 === 0 ? 40 : 40 + cw + 30;
      if (i % 2 === 0 && i > 0) y -= 120;
      page.drawRectangle({ x: cx, y: y - 90, width: cw, height: 90, color: rgb(1, 1, 1), borderColor: GOLD, borderWidth: 1 });
      drawRightText(page, font, ar(card[0]), { x: cx + cw - 16, y: y - 30, size: 14, color: HENNA_DARK });
      drawRightText(page, font, card[1], { x: cx + cw - 16, y: y - 65, size: 22, color: BURGUNDY });
      x = cx;
    });
  }

  // ---- Budget ------------------------------------------------------------
  {
    const { page } = contentPage('الميزانية');
    let y = A4.h - 130;
    const maxBarW = 260;
    const max = Math.max(...pkg.budget.byCategory.map((c) => c.planned), 1);
    for (const cat of pkg.budget.byCategory.slice(0, 12)) {
      drawRightText(page, font, ar(cat.category), { x: A4.w - 40, y, size: 11, color: INK });
      const barW = (cat.planned / max) * maxBarW;
      page.drawRectangle({ x: 40, y: y - 2, width: barW, height: 12, color: GOLD });
      page.drawText(formatDZD(cat.planned), { x: 40 + barW + 6, y: y, size: 9, font, color: HENNA_DARK });
      y -= 28;
    }
    page.drawRectangle({ x: 40, y: y - 10, width: A4.w - 80, height: 1, color: GOLD });
    drawRightText(page, font, ar(`الإجمالي: ${formatDZD(pkg.budget.total)}`), { x: A4.w - 40, y: y - 35, size: 16, color: BURGUNDY });
  }

  // ---- Timeline highlights ----------------------------------------------
  {
    const { page } = contentPage('الجدول الزمني');
    let y = A4.h - 130;
    for (const t of pkg.timeline.slice(0, 18)) {
      drawRightText(page, font, ar(t.task), { x: A4.w - 40, y, size: 11, color: INK });
      page.drawText(t.date, { x: 40, y, size: 10, font, color: HENNA_DARK });
      y -= 24;
      if (y < 80) break;
    }
  }

  // ---- Events ------------------------------------------------------------
  {
    const { page } = contentPage('الأحداث الخمسة');
    let y = A4.h - 140;
    for (const e of pkg.events) {
      page.drawRectangle({ x: 40, y: y - 50, width: A4.w - 80, height: 50, color: rgb(1, 1, 1), borderColor: GOLD, borderWidth: 1 });
      drawRightText(page, font, ar(e.name), { x: A4.w - 56, y: y - 24, size: 15, color: BURGUNDY });
      drawRightText(page, font, ar(`${e.place} · ${e.time}`), { x: A4.w - 56, y: y - 42, size: 10, color: INK });
      page.drawText(e.date, { x: 56, y: y - 24, size: 11, font, color: HENNA_DARK });
      page.drawText(`${e.guests} ${ar('ضيف')}`, { x: 56, y: y - 42, size: 10, font, color: GOLD });
      y -= 64;
    }
  }

  return doc.save();
}
