/**
 * Ethiopian (Ge'ez) calendar conversion utilities.
 *
 * The Ethiopian calendar has 12 months of 30 days each plus a 13th month
 * called Pagume of 5 or 6 days.  The Ethiopian new year (Meskerem 1) falls
 * on 11 September of the corresponding Gregorian year, except when the
 * previous Gregorian year was a leap year, in which case it falls on
 * 12 September.
 *
 * All date arithmetic is performed via Julian Day Numbers (JDN).
 *
 * Expected conversions:
 *   2023-09-11  →  { year: 2016, month: 1, day: 1 }  (Meskerem 1, 2016 EC)
 *   2024-09-11  →  { year: 2017, month: 1, day: 1 }  (Meskerem 1, 2017 EC)
 */

export type EthDate = { year: number; month: number; day: number };

// ─── Amharic month names (1-indexed, index 0 unused) ─────────────────────────

const MONTH_NAMES: readonly string[] = [
  '',          // 0 — unused
  'መስከረም',   // 1  Meskerem
  'ጥቅምት',    // 2  Tikimt
  'ሕዳር',     // 3  Hidar
  'ታኅሣሥ',   // 4  Tahsas
  'ጥር',      // 5  Tir
  'የካቲት',   // 6  Yekatit
  'መጋቢት',   // 7  Megabit
  'ሚያዝያ',   // 8  Miyazia
  'ግንቦት',   // 9  Ginbot
  'ሰኔ',     // 10 Sene
  'ሐምሌ',    // 11 Hamle
  'ነሐሴ',    // 12 Nehase
  'ጳጉሜ',   // 13 Pagume
];

// ─── Internal JDN helpers ────────────────────────────────────────────────────

/** Convert a proleptic Gregorian date to a Julian Day Number. */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Convert a Julian Day Number to a proleptic Gregorian Date. */
function jdnToGregorian(jdn: number): Date {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d2 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d2) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d2 - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
}

// ─── Ethiopian new year ──────────────────────────────────────────────────────

/**
 * Returns true when a Gregorian year is a leap year (adds Feb 29).
 * Accounts for the century/400-year exception.
 */
function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the Julian Day Number of Meskerem 1 (new year) for the given
 * Ethiopian year.
 *
 * The new year falls on 11 September of Gregorian year (ethYear + 7),
 * or on 12 September when the previous Gregorian year was a leap year.
 */
function ethiopianNewYearJdn(ethYear: number): number {
  const gYear = ethYear + 7;
  const newYearDay = isGregorianLeapYear(gYear - 1) ? 12 : 11;
  return gregorianToJdn(gYear, 9, newYearDay);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert a Gregorian `Date` to an Ethiopian calendar date.
 *
 * @example
 * toEthiopian(new Date(2023, 8, 11)) // { year: 2016, month: 1, day: 1 }
 * toEthiopian(new Date(2024, 8, 11)) // { year: 2017, month: 1, day: 1 }
 */
export function toEthiopian(date: Date): EthDate {
  const jdn = gregorianToJdn(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  // Estimate Ethiopian year: Gregorian year − 7 or − 8 depending on the date.
  let ethYear = date.getFullYear() - 7;

  // If the given JDN falls before the new year of ethYear, step back one year.
  let nyJdn = ethiopianNewYearJdn(ethYear);
  if (jdn < nyJdn) {
    ethYear -= 1;
    nyJdn = ethiopianNewYearJdn(ethYear);
  }

  const daysElapsed = jdn - nyJdn; // 0-indexed days since Meskerem 1
  const month = Math.floor(daysElapsed / 30) + 1;
  const day = (daysElapsed % 30) + 1;
  return { year: ethYear, month, day };
}

/**
 * Convert an Ethiopian calendar date to a Gregorian `Date`.
 *
 * @example
 * toGregorian({ year: 2016, month: 1, day: 1 }) // Date(2023, 8, 11)
 * toGregorian({ year: 2017, month: 1, day: 1 }) // Date(2024, 8, 11)
 */
export function toGregorian(eth: EthDate): Date {
  const nyJdn = ethiopianNewYearJdn(eth.year);
  const jdn = nyJdn + (eth.month - 1) * 30 + (eth.day - 1);
  return jdnToGregorian(jdn);
}

/**
 * Returns the Amharic name of an Ethiopian month (1–13).
 *
 * @throws {RangeError} if month is outside [1, 13]
 *
 * @example
 * ethiopianMonthName(1)  // 'መስከረም'
 * ethiopianMonthName(13) // 'ጳጉሜ'
 */
export function ethiopianMonthName(month: number): string {
  if (month < 1 || month > 13) {
    throw new RangeError(`Month must be between 1 and 13, got ${month}`);
  }
  return MONTH_NAMES[month];
}

/**
 * Returns `true` for Ethiopian leap years (year % 4 === 3).
 *
 * In a leap year the 13th month, Pagume, has 6 days instead of 5.
 * Note: Due to Gregorian-calendar interactions, the actual number of days
 * in an Ethiopian calendar year depends on whether the corresponding
 * Gregorian year span crosses a Gregorian leap day.
 *
 * @example
 * isEthiopianLeapYear(2015) // true  (2015 % 4 === 3)
 * isEthiopianLeapYear(2016) // false (2016 % 4 === 0)
 */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/**
 * Format a Gregorian `Date` as an Ethiopian calendar string.
 *
 * @param date        - The Gregorian date to format.
 * @param includeYear - When `true` (default), appends " ዓ.ም".
 * @returns           - e.g. "01/01/2016 ዓ.ም"
 *
 * @example
 * formatEthiopian(new Date(2023, 8, 11))        // "01/01/2016 ዓ.ም"
 * formatEthiopian(new Date(2023, 8, 11), false) // "01/01/2016"
 */
export function formatEthiopian(date: Date, includeYear = true): string {
  const { year, month, day } = toEthiopian(date);
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const base = `${dd}/${mm}/${year}`;
  return includeYear ? `${base} ዓ.ም` : base;
}
