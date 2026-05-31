// The 58 Algerian wilayas (provinces). Used in the intake form + cost factors.
export interface Wilaya {
  code: string; // "16"
  ar: string;
  fr: string;
  costFactor: number; // multiplier on baseline budget (Algiers/Oran more expensive)
}

export const WILAYAS: Wilaya[] = [
  { code: '01', ar: 'أدرار', fr: 'Adrar', costFactor: 0.85 },
  { code: '02', ar: 'الشلف', fr: 'Chlef', costFactor: 0.95 },
  { code: '03', ar: 'الأغواط', fr: 'Laghouat', costFactor: 0.9 },
  { code: '04', ar: 'أم البواقي', fr: 'Oum El Bouaghi', costFactor: 0.9 },
  { code: '05', ar: 'باتنة', fr: 'Batna', costFactor: 0.95 },
  { code: '06', ar: 'بجاية', fr: 'Béjaïa', costFactor: 1.0 },
  { code: '07', ar: 'بسكرة', fr: 'Biskra', costFactor: 0.9 },
  { code: '08', ar: 'بشار', fr: 'Béchar', costFactor: 0.9 },
  { code: '09', ar: 'البليدة', fr: 'Blida', costFactor: 1.1 },
  { code: '10', ar: 'البويرة', fr: 'Bouira', costFactor: 0.95 },
  { code: '11', ar: 'تمنراست', fr: 'Tamanrasset', costFactor: 0.9 },
  { code: '12', ar: 'تبسة', fr: 'Tébessa', costFactor: 0.9 },
  { code: '13', ar: 'تلمسان', fr: 'Tlemcen', costFactor: 1.0 },
  { code: '14', ar: 'تيارت', fr: 'Tiaret', costFactor: 0.9 },
  { code: '15', ar: 'تيزي وزو', fr: 'Tizi Ouzou', costFactor: 1.05 },
  { code: '16', ar: 'الجزائر العاصمة', fr: 'Alger', costFactor: 1.25 },
  { code: '17', ar: 'الجلفة', fr: 'Djelfa', costFactor: 0.9 },
  { code: '18', ar: 'جيجل', fr: 'Jijel', costFactor: 0.95 },
  { code: '19', ar: 'سطيف', fr: 'Sétif', costFactor: 1.05 },
  { code: '20', ar: 'سعيدة', fr: 'Saïda', costFactor: 0.9 },
  { code: '21', ar: 'سكيكدة', fr: 'Skikda', costFactor: 0.95 },
  { code: '22', ar: 'سيدي بلعباس', fr: 'Sidi Bel Abbès', costFactor: 0.95 },
  { code: '23', ar: 'عنابة', fr: 'Annaba', costFactor: 1.05 },
  { code: '24', ar: 'قالمة', fr: 'Guelma', costFactor: 0.9 },
  { code: '25', ar: 'قسنطينة', fr: 'Constantine', costFactor: 1.1 },
  { code: '26', ar: 'المدية', fr: 'Médéa', costFactor: 0.95 },
  { code: '27', ar: 'مستغانم', fr: 'Mostaganem', costFactor: 0.95 },
  { code: '28', ar: 'المسيلة', fr: "M'Sila", costFactor: 0.9 },
  { code: '29', ar: 'معسكر', fr: 'Mascara', costFactor: 0.9 },
  { code: '30', ar: 'ورقلة', fr: 'Ouargla', costFactor: 0.95 },
  { code: '31', ar: 'وهران', fr: 'Oran', costFactor: 1.2 },
  { code: '32', ar: 'البيض', fr: 'El Bayadh', costFactor: 0.85 },
  { code: '33', ar: 'إليزي', fr: 'Illizi', costFactor: 0.85 },
  { code: '34', ar: 'برج بوعريريج', fr: 'Bordj Bou Arréridj', costFactor: 0.95 },
  { code: '35', ar: 'بومرداس', fr: 'Boumerdès', costFactor: 1.05 },
  { code: '36', ar: 'الطارف', fr: 'El Tarf', costFactor: 0.9 },
  { code: '37', ar: 'تندوف', fr: 'Tindouf', costFactor: 0.85 },
  { code: '38', ar: 'تيسمسيلت', fr: 'Tissemsilt', costFactor: 0.85 },
  { code: '39', ar: 'الوادي', fr: 'El Oued', costFactor: 0.9 },
  { code: '40', ar: 'خنشلة', fr: 'Khenchela', costFactor: 0.85 },
  { code: '41', ar: 'سوق أهراس', fr: 'Souk Ahras', costFactor: 0.9 },
  { code: '42', ar: 'تيبازة', fr: 'Tipaza', costFactor: 1.1 },
  { code: '43', ar: 'ميلة', fr: 'Mila', costFactor: 0.9 },
  { code: '44', ar: 'عين الدفلى', fr: 'Aïn Defla', costFactor: 0.9 },
  { code: '45', ar: 'النعامة', fr: 'Naâma', costFactor: 0.85 },
  { code: '46', ar: 'عين تموشنت', fr: 'Aïn Témouchent', costFactor: 0.95 },
  { code: '47', ar: 'غرداية', fr: 'Ghardaïa', costFactor: 0.95 },
  { code: '48', ar: 'غليزان', fr: 'Relizane', costFactor: 0.9 },
  { code: '49', ar: 'تيميمون', fr: 'Timimoun', costFactor: 0.85 },
  { code: '50', ar: 'برج باجي مختار', fr: 'Bordj Badji Mokhtar', costFactor: 0.85 },
  { code: '51', ar: 'أولاد جلال', fr: 'Ouled Djellal', costFactor: 0.85 },
  { code: '52', ar: 'بني عباس', fr: 'Béni Abbès', costFactor: 0.85 },
  { code: '53', ar: 'عين صالح', fr: 'In Salah', costFactor: 0.85 },
  { code: '54', ar: 'عين قزام', fr: 'In Guezzam', costFactor: 0.85 },
  { code: '55', ar: 'تقرت', fr: 'Touggourt', costFactor: 0.9 },
  { code: '56', ar: 'جانت', fr: 'Djanet', costFactor: 0.85 },
  { code: '57', ar: 'المغير', fr: "El M'Ghair", costFactor: 0.85 },
  { code: '58', ar: 'المنيعة', fr: 'El Meniaa', costFactor: 0.85 },
];

const byCode = new Map(WILAYAS.map((w) => [w.code, w]));
const byName = new Map<string, Wilaya>();
for (const w of WILAYAS) {
  byName.set(w.ar, w);
  byName.set(w.fr.toLowerCase(), w);
}

export function findWilaya(input: string): Wilaya | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  return byCode.get(trimmed) ?? byName.get(trimmed) ?? byName.get(trimmed.toLowerCase());
}

export function wilayaLabel(input: string): string {
  const w = findWilaya(input);
  return w ? `${w.ar} (${w.fr})` : input;
}

export function wilayaCostFactor(input: string): number {
  return findWilaya(input)?.costFactor ?? 1.0;
}
