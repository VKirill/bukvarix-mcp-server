export const API_BASE_URL = "http://api.bukvarix.com";
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_NUM = 250;
export const MAX_NUM = 1000000;
export const MAX_QUERIES_FREE = 100;
export const MAX_EXCLUSIONS_FREE = 250;
export const MAX_DOMAINS_COMPARE = 10;

export const REGIONS = {
  msk: "Москва (Яндекс)",
  gmsk: "Москва (Google)",
  spb: "СПб (Яндекс)",
  rus: "Россия (Яндекс)",
  nsk: "Новосибирск (Яндекс)",
  ekb: "Екатеринбург (Яндекс)",
  kzn: "Казань (Яндекс)",
  nnv: "Н. Новгород (Яндекс)",
  kry: "Красноярск (Яндекс)",
  che: "Челябинск (Яндекс)",
  sam: "Самара (Яндекс)",
  ufa: "Уфа (Яндекс)",
  rnd: "Ростов-на-Дону (Яндекс)",
  krr: "Краснодар (Яндекс)",
  oms: "Омск (Яндекс)",
  vrn: "Воронеж (Яндекс)",
  prm: "Пермь (Яндекс)",
  vlg: "Волгоград (Яндекс)",
  sar: "Саратов (Яндекс)",
  tmn: "Тюмень (Яндекс)",
  tom: "Томск (Яндекс)",
  gkiev: "Киев (Google)",
  minsk: "Минск (Яндекс)",
  gminsk: "Минск (Google)",
  nursul: "Астана (Яндекс)",
} as const;

export type Region = keyof typeof REGIONS;

export const FORMATS = ["txt", "json", "csv", "tsv"] as const;
export type Format = (typeof FORMATS)[number];

export const REPORT_TYPES = ["report", "word_analysis"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const COMPARISON_TYPES = ["intersect", "domain1_uniq", "domain2_uniq"] as const;
export type ComparisonType = (typeof COMPARISON_TYPES)[number];
