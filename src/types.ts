export interface KeywordResult {
  keyword: string;
  words_count: number;
  chars_count: number;
  broad_frequency: number;
  exact_frequency: number;
}

export interface DomainKeywordResult extends KeywordResult {
  search_results_count: number;
  position: number;
}

export interface KeywordsResponse {
  keywords: KeywordResult[];
  total?: number;
}

export interface DomainKeywordsResponse {
  keywords: DomainKeywordResult[];
  total?: number;
}

export interface ComparisonResponse {
  keywords: DomainKeywordResult[];
  total?: number;
  comparison_type: string;
  domains: string[];
}

export interface ApiError {
  status: number;
  message: string;
  details?: string;
}
