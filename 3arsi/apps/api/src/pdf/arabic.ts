// Compact Arabic reshaper: maps letters to their contextual presentation
// forms, handles lam-alef ligatures, and reverses runs for RTL so pdf-lib
// (which lays out glyphs left-to-right with no shaping) renders Arabic
// correctly. Good enough for names, labels and short phrases.

// [isolated, final, initial, medial]; for non-joining letters initial/medial = isolated/final.
const FORMS: Record<string, [string, string, string, string]> = {
  '\u0621': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'], // hamza
  '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // alef madda
  '\u0623': ['\uFE83', '\uFE84', '\uFE83', '\uFE84'], // alef hamza above
  '\u0624': ['\uFE85', '\uFE86', '\uFE85', '\uFE86'], // waw hamza
  '\u0625': ['\uFE87', '\uFE88', '\uFE87', '\uFE88'], // alef hamza below
  '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'], // yeh hamza
  '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // alef
  '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // beh
  '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // teh marbuta
  '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // teh
  '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // theh
  '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // jeem
  '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // hah
  '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // khah
  '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // dal
  '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'], // thal
  '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // reh
  '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'], // zain
  '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // seen
  '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // sheen
  '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // sad
  '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // dad
  '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // tah
  '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // zah
  '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // ain
  '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // ghain
  '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // feh
  '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // qaf
  '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // kaf
  '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // lam
  '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // meem
  '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // noon
  '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // heh
  '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEEE'], // waw
  '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'], // alef maksura
  '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // yeh
};

// Letters that do NOT connect to the following letter.
const NON_JOIN_AFTER = new Set([
  '\u0621', '\u0622', '\u0623', '\u0624', '\u0625', '\u0627', '\u0629',
  '\u062F', '\u0630', '\u0631', '\u0632', '\u0648', '\u0649',
]);

// Lam-Alef ligatures: lam + alef variant → single glyph.
const LAM = '\u0644';
const LAMALEF: Record<string, [string, string]> = {
  '\u0627': ['\uFEFB', '\uFEFC'],
  '\u0622': ['\uFEF5', '\uFEF6'],
  '\u0623': ['\uFEF7', '\uFEF8'],
  '\u0625': ['\uFEF9', '\uFEFA'],
};

const isArabic = (ch: string) => ch >= '\u0600' && ch <= '\u06FF';
const TASHKEEL = /[\u064B-\u065F\u0670]/g;

export function reshapeArabic(input: string): string {
  if (!input) return input;
  // Strip diacritics (pdf-lib has no mark positioning).
  const text = input.replace(TASHKEEL, '');

  const out: string[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (!FORMS[ch]) {
      out.push(ch);
      continue;
    }
    // Lam-Alef ligature.
    if (ch === LAM && i + 1 < chars.length && LAMALEF[chars[i + 1]!]) {
      const prev = chars[i - 1];
      const prevJoins = prev !== undefined && FORMS[prev] !== undefined && !NON_JOIN_AFTER.has(prev);
      const pair = LAMALEF[chars[i + 1]!]!;
      out.push(prevJoins ? pair[1] : pair[0]);
      i++; // consume alef
      continue;
    }

    const prev = chars[i - 1];
    const next = chars[i + 1];
    const prevJoins = prev !== undefined && FORMS[prev] !== undefined && !NON_JOIN_AFTER.has(prev);
    const nextJoins = next !== undefined && FORMS[next] !== undefined;
    const canConnectAfter = !NON_JOIN_AFTER.has(ch);

    const [iso, fin, ini, med] = FORMS[ch]!;
    let form = iso;
    if (prevJoins && nextJoins && canConnectAfter) form = med;
    else if (prevJoins && (!nextJoins || !canConnectAfter)) form = fin;
    else if (!prevJoins && nextJoins && canConnectAfter) form = ini;
    out.push(form);
  }

  // Reverse runs of Arabic so they read right-to-left, keeping Latin/number
  // runs left-to-right.
  return reorderForRtl(out.join(''));
}

function reorderForRtl(s: string): string {
  const tokens: { text: string; arabic: boolean }[] = [];
  let buf = '';
  let bufArabic: boolean | null = null;
  const flush = () => {
    if (buf) tokens.push({ text: buf, arabic: bufArabic === true });
    buf = '';
  };
  for (const ch of s) {
    const arabicLike = isArabic(ch) || (ch >= '\uFE70' && ch <= '\uFEFF') || ch === ' ';
    if (bufArabic === null) bufArabic = arabicLike;
    if (arabicLike === bufArabic) buf += ch;
    else {
      flush();
      bufArabic = arabicLike;
      buf = ch;
    }
  }
  flush();

  // Reverse the order of tokens and reverse characters within Arabic tokens.
  return tokens
    .reverse()
    .map((t) => (t.arabic ? [...t.text].reverse().join('') : t.text))
    .join('');
}
