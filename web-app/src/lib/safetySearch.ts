const supportSearchTerms = [
  // Japanese
  "自殺", "死にたい", "死にたく", "死んでしまいたい", "消えたい", "消えてしまいたい",
  "生きるのがつらい", "生きていたくない", "自傷",
  // English
  "suicid", "kill myself", "end my life", "want to die", "wanna die",
  "don't want to live", "do not want to live", "self harm", "hurt myself",
  // Korean
  "자살", "죽고 싶", "죽고싶", "살기 싫", "살기싫", "사라지고 싶", "자해",
  // Simplified and Traditional Chinese
  "自杀", "自殺", "不想活", "想死", "想去死", "自残", "自殘", "伤害自己", "傷害自己",
];

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

const normalizedSupportTerms = supportSearchTerms.map(normalizeSearchText);

/** Detects support-related search terms locally; it does not persist or transmit the query. */
export function isSupportSearchQuery(query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery.length > 0 && normalizedSupportTerms.some((term) => normalizedQuery.includes(term));
}
