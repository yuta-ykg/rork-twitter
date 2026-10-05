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

const consumerProtectionSearchTerms = [
  // Japanese: consumer fraud and potentially misleading advertising.
  "詐欺", "特殊詐欺", "通販詐欺", "投資詐欺", "副業詐欺", "返金詐欺", "広告詐欺",
  "景品表示法", "景品表示違反", "景表法", "不当表示", "優良誤認", "有利誤認",
  "誇大広告", "虚偽広告", "おとり広告", "偽広告", "二重価格", "ステマ",
  "ステルスマーケティング", "サクラレビュー", "やらせレビュー", "定期購入トラブル",
  "架空請求", "不当請求", "悪質商法", "解約できない", "返金されない", "自動更新トラブル",
  // English
  "fraud", "scammed", "consumer scam", "online scam", "shopping scam", "false advertising",
  "misleading advertising", "deceptive advertising", "bait advertising", "bait and switch",
  "stealth marketing", "fake review", "subscription trap", "unauthorized charge", "refund refused",
  // Korean
  "사기", "소비자 사기", "허위 광고", "과장 광고", "기만 광고", "부당 표시", "표시광고법",
  "뒷광고", "가짜 리뷰", "소비자 피해", "소비자 분쟁", "온라인 사기", "정기 결제",
  "자동 결제", "해지 불가", "환불 불가",
  // Simplified and Traditional Chinese
  "诈骗", "詐騙", "消费欺诈", "消費欺詐", "虚假广告", "虛假廣告", "误导广告", "誤導廣告",
  "不当表示", "不當表示", "诱饵广告", "誘餌廣告", "隐形广告", "隱形廣告", "虚假评价", "虛假評價",
  "消费者纠纷", "消費者糾紛", "网购诈骗", "網購詐騙", "夸大宣传", "誇大宣傳",
  "定期购买", "定期購買", "自动续费", "自動續費", "无法退款", "無法退款",
];

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

const normalizedSupportTerms = supportSearchTerms.map(normalizeSearchText);
const normalizedCrimePreventionTerms = crimePreventionSearchTerms.map(normalizeSearchText);
const normalizedConsumerProtectionTerms = consumerProtectionSearchTerms.map(normalizeSearchText);

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

/** Detects consumer fraud and misleading-advertising topics locally. */
export function isConsumerProtectionSearchQuery(query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery.length > 0 && normalizedConsumerProtectionTerms.some((term) => normalizedQuery.includes(term));
}
