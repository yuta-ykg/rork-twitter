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

const crimePreventionSearchTerms = [
  // Japanese: suspicious recruitment and common crime-related queries.
  "闇バイト", "高額バイト", "違法バイト", "高額報酬", "即日現金", "受け子", "出し子",
  "口座を売る", "口座売買", "荷物を受け取るだけ", "犯罪", "詐欺", "特殊詐欺", "強盗",
  "窃盗", "恐喝", "違法行為", "証拠隠滅", "捕まらない方法", "犯罪予告",
  // English
  "illegal job", "crime", "criminal", "fraud", "scam job", "robbery", "money mule",
  "sell my bank account", "avoid getting caught",
  // Korean
  "불법 알바", "불법 아르바이트", "범죄", "사기", "강도", "보이스피싱", "대포통장",
  // Simplified and Traditional Chinese
  "黑工", "非法兼职", "非法兼職", "犯罪", "诈骗", "詐騙", "抢劫", "搶劫", "洗钱", "洗錢",
];

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

const normalizedSupportTerms = supportSearchTerms.map(normalizeSearchText);
const normalizedCrimePreventionTerms = crimePreventionSearchTerms.map(normalizeSearchText);

/** Detects support-related search terms locally; it does not persist or transmit the query. */
export function isSupportSearchQuery(query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery.length > 0 && normalizedSupportTerms.some((term) => normalizedQuery.includes(term));
}

/** Detects crime-prevention topics locally without persisting or transmitting the query. */
export function isCrimePreventionSearchQuery(query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery.length > 0 && normalizedCrimePreventionTerms.some((term) => normalizedQuery.includes(term));
}
