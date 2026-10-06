// apps/api/src/modules/expenses/expenses.config.js
// Source of truth for the fixed expense categories and, where relevant,
// their reusable "coverage group" labels — mirrors the coverage groups
// worked out with Nonchalant for 79 Vernon Street (see
// claude/expenses-feature-design.md in the project docs).
//
// `fixed: true` categories are billed the same way most months, so the API
// pre-fills new entries from the last logged amount; `fixed: false`
// categories are entered fresh every time. Only Electricity, Water, and
// Butane use coverage groups — every other category is always a single
// whole-building bill (`coverage: null`).

export const CATEGORIES = {
  Electricity: {
    fixed: false,
    groups: [
      'Owner Residence',
      '3rd Floor Meter (Kwame, Catalina, Keyon, Samson)',
      'Timothy & Jak',
      'Vacant Unit (default $10)'
    ]
  },
  Water: {
    fixed: false,
    groups: ['Owner Residence', '3rd Floor (all four)', 'Timothy & Jak']
  },
  Butane: {
    fixed: false,
    groups: ['Owner Residence', '3rd Floor — Kwame, Keyon & Samson']
  },
  Internet: { fixed: true, groups: [], defaultAmountCents: 13000 },
  Garbage: { fixed: true, groups: [], defaultAmountCents: 6000 },
  Cable: { fixed: true, groups: [], defaultAmountCents: 9500 },
  'Property Tax': { fixed: false, installment: true, groups: [], defaultAmountCents: 1631888 },
  Other: { fixed: false, groups: [] }
};

export const CATEGORY_ORDER = [
  'Electricity',
  'Water',
  'Internet',
  'Garbage',
  'Cable',
  'Butane',
  'Property Tax',
  'Other'
];

export function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, category);
}

export function isInstallmentCategory(category) {
  return CATEGORIES[category]?.installment === true;
}

/** Returns true when `coverage` is an acceptable value for `category`: one
 * of that category's group labels, or null/empty for a category with no
 * groups (or when the caller just didn't pick one). */
export function isValidCoverage(category, coverage) {
  const def = CATEGORIES[category];
  if (!def) return false;
  if (coverage == null || coverage === '') return true;
  return def.groups.includes(coverage);
}
