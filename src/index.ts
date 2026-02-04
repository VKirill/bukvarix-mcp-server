#!/usr/bin/env node
/**
 * MCP Server for Bukvarix API.
 *
 * This server provides tools to interact with Bukvarix API for keyword research
 * and domain analysis, including keyword search, batch search, domain keyword
 * extraction, and domain comparison.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SearchKeywordsSchema } from "./schemas/keywords.js";
import { SearchKeywordsBatchSchema } from "./schemas/keywords.js";
import { GetDomainKeywordsSchema } from "./schemas/domains.js";
import { CompareDomainsSchema } from "./schemas/domains.js";
import { searchKeywords, searchKeywordsBatch } from "./tools/keywords.js";
import { getDomainKeywords, compareDomains } from "./tools/domains.js";
import { REGIONS } from "./constants.js";

const server = new McpServer({
  name: "bukvarix-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "bukvarix_search_keywords",
  {
    title: "Search Keywords",
    description: `Search for keywords using a single query phrase.

This tool searches Bukvarix database for keywords matching the query. Supports special syntax:
- Wildcard: "строител* товары" (matches: строительные товары, товары для строительства)
- Exclusions: "!строительные !товары" (excludes phrases containing these words)
- Special characters (*, !, ~) are automatically percent-encoded

Args:
  - query (string, required): Keyword or phrase to search. Supports special characters: * (wildcard), ! (exclusion), ~ (synonyms). Must not be empty.
  - num (number, optional): Number of results to return. Range: 1-1,000,000. Default: 250.
  - format ('txt' | 'json' | 'csv' | 'tsv', optional): Output format. Default: 'json'.
    - 'json': Structured data as object with 'data' array
    - 'txt': Simple list of keywords, one per line
    - 'csv': Table with semicolon delimiter, quoted text values
    - 'tsv': Table with tab delimiter, unquoted text values
  - report_type ('report' | 'word_analysis', optional): Report type. Default: 'report'.
    - 'report': Standard keyword report
    - 'word_analysis': Word analysis report
  - result_count (boolean, optional): If true, return only total count without data. Default: false.

Returns:
  Response format depends on 'format' parameter and 'result_count' flag:
  
  If result_count=true:
  - Text: "Total results found: {count}"
  - Structured: { "total": number }
  
  If result_count=false and format='json':
  {
    "data": [
      [keyword, words_count, chars_count, broad_frequency, exact_frequency],
      ...
    ]
  }
  Where array indices:
  - [0]: keyword (string) - Keyword phrase
  - [1]: words_count (number) - Number of words in phrase
  - [2]: chars_count (number) - Number of characters in phrase
  - [3]: broad_frequency (number) - Broad frequency worldwide
  - [4]: exact_frequency (number) - Exact frequency worldwide
  
  For other formats (txt/csv/tsv), returns formatted text representation.
  
  Large responses (>25,000 chars) are truncated with a message.

Examples:
  - "Find keywords for 'пластиковые окна'" -> { query: "пластиковые окна", num: 10 }
  - "Search keywords starting with 'строитель'" -> { query: "строитель*", num: 50 }
  - "Get count only" -> { query: "окна", result_count: true }
  - "Export to CSV" -> { query: "окна", format: "csv", num: 100 }
  
  Don't use when: You need to search multiple queries (use bukvarix_search_keywords_batch instead)

Error Handling:
  - 400: "Error: Invalid request" - Check query format and parameters
  - 401: "Error: Authentication failed" - Check BUKVARIX_API_KEY environment variable
  - 402: "Error: Limit exceeded" - Free API limits exceeded, reduce 'num' parameter
  - 429: "Error: Rate limit exceeded" - Wait before making more requests
  - 500: "Error: Internal server error" - Contact Bukvarix support
  - 503: "Error: Server maintenance" - Try again later`,
    inputSchema: SearchKeywordsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    return await searchKeywords(params);
  }
);

server.registerTool(
  "bukvarix_search_keywords_batch",
  {
    title: "Search Keywords (Batch)",
    description: `Search for keywords using multiple query phrases with optional exclusions.

This tool performs extended search using a list of keywords. Each query phrase is processed separately.
Free API allows up to 100 queries and 250 exclusions. Queries beyond limit are ignored.

Args:
  - queries (string[], required): List of keywords to search. Minimum 1, maximum 100 for free API.
    Each query supports special syntax (*, !, ~). Empty strings are not allowed.
  - exclusions (string[], optional): List of words/phrases to exclude. Maximum 250 for free API.
    Exclusions beyond limit are ignored. Empty strings are not allowed.
  - num (number, optional): Number of results to return. Range: 1-1,000,000. Default: 250.
  - format ('txt' | 'json' | 'csv' | 'tsv', optional): Output format. Default: 'json'.
    See bukvarix_search_keywords for format details.

Returns:
  Same format as bukvarix_search_keywords. Response includes keywords matching any query in the list,
  excluding phrases matching any exclusion term.
  
  JSON format:
  {
    "data": [
      [keyword, words_count, chars_count, broad_frequency, exact_frequency],
      ...
    ]
  }

Examples:
  - "Find keywords for multiple phrases" -> { queries: ["окна", "двери"], num: 20 }
  - "Search with exclusions" -> { queries: ["окна"], exclusions: ["деревянные", "старые"] }
  - "Batch search 50 phrases" -> { queries: ["phrase1", ..., "phrase50"], num: 100 }
  
  Don't use when: You only need to search one phrase (use bukvarix_search_keywords instead)

Error Handling:
  - 400: "Error: Invalid request" - Check queries/exclusions format
  - 402: "Error: Limit exceeded" - More than 100 queries or 250 exclusions
  - 429: "Error: Rate limit exceeded" - Wait before retrying
  - Other errors: See bukvarix_search_keywords error handling`,
    inputSchema: SearchKeywordsBatchSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    return await searchKeywordsBatch(params);
  }
);

server.registerTool(
  "bukvarix_get_domain_keywords",
  {
    title: "Get Domain Keywords",
    description: `Get keywords for a specific domain or subdomain.

This tool retrieves keywords that the domain ranks for in search engines (Yandex or Google).
You can specify domain or subdomain (without protocol). Cyrillic domains (.рф, .укр) are supported.

Args:
  - domain (string, required): Domain or subdomain without protocol.
    Examples: "example.com", "subdomain.example.com", "кто.рф"
    Must match regex: /^[a-zA-Z0-9а-яёА-ЯЁ.-]+$/
    Do NOT include: http://, https://, www., paths, or query parameters
  - region (string, optional): Search engine region. Default: 'msk' (Moscow Yandex).
    Available regions: ${Object.keys(REGIONS).join(", ")}
    Format: lowercase code (e.g., 'msk', 'spb', 'rus', 'gmsk')
  - num (number, optional): Number of results to return. Range: 1-1,000,000. Default: 250.
  - format ('txt' | 'json' | 'csv' | 'tsv', optional): Output format. Default: 'json'.
  - result_count (boolean, optional): If true, return only total count. Default: false.

Returns:
  Response format depends on 'format' and 'result_count' parameters.
  
  If result_count=true:
  - Text: "Total keywords found for {domain}: {count}"
  - Structured: { "total": number, "domain": string }
  
  If result_count=false and format='json':
  {
    "data": [
      [keyword, words_count, chars_count, search_results_count, broad_frequency, exact_frequency, position],
      ...
    ]
  }
  Where array indices:
  - [0]: keyword (string) - Keyword phrase
  - [1]: words_count (number) - Number of words in phrase
  - [2]: chars_count (number) - Number of characters
  - [3]: search_results_count (number) - Search results count in Yandex/Google
  - [4]: broad_frequency (number) - Broad frequency worldwide
  - [5]: exact_frequency (number) - Exact frequency worldwide
  - [6]: position (number) - Position in search results (1-based)

Examples:
  - "Get keywords for wildberries.ru" -> { domain: "wildberries.ru", num: 50 }
  - "Find keywords for subdomain" -> { domain: "shop.example.com" }
  - "Get keywords for SPb region" -> { domain: "example.com", region: "spb" }
  - "Count only" -> { domain: "example.com", result_count: true }
  - "Cyrillic domain" -> { domain: "кто.рф" } (automatically encoded)

Error Handling:
  - 400: "Error: Invalid request" - Domain format incorrect (includes protocol/path)
  - 401: "Error: Authentication failed" - Check BUKVARIX_API_KEY
  - 402: "Error: Limit exceeded" - Reduce 'num' parameter
  - 429: "Error: Rate limit exceeded" - Wait before retrying
  - Other errors: See bukvarix_search_keywords error handling`,
    inputSchema: GetDomainKeywordsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    return await getDomainKeywords(params);
  }
);

server.registerTool(
  "bukvarix_compare_domains",
  {
    title: "Compare Domains",
    description: `Compare keywords between multiple domains.

This tool compares keywords across 2-10 domains (free API limit: 10 domains).
For 2 domains, you can specify comparison type (common, unique to first, unique to second).
For 3+ domains, always returns common keywords (intersection).

Args:
  - domains (string[], required): List of domains to compare. Minimum 2, maximum 10 for free API.
    Each domain must match format: /^[a-zA-Z0-9а-яёА-ЯЁ.-]+$/ (no protocol/path).
    Domains beyond limit are ignored.
  - comparison_type ('intersect' | 'domain1_uniq' | 'domain2_uniq', optional): Comparison type.
    Only works for exactly 2 domains. Default: 'intersect'.
    - 'intersect': Common keywords for all domains (default, always used for 3+ domains)
    - 'domain1_uniq': Keywords unique to first domain (only for 2 domains)
    - 'domain2_uniq': Keywords unique to second domain (only for 2 domains)
  - region (string, optional): Search engine region. Default: 'msk' (Moscow Yandex).
    Available regions: ${Object.keys(REGIONS).join(", ")}
  - num (number, optional): Number of results to return. Range: 1-1,000,000. Default: 250.
  - format ('txt' | 'json' | 'csv' | 'tsv', optional): Output format. Default: 'json'.
  - result_count (boolean, optional): If true, return only total count. Default: false.

Returns:
  Response format depends on 'format' and 'result_count' parameters.
  
  If result_count=true:
  - Text: "Total keywords found: {count}"
  - Structured: { "total": number, "domains": string[], "comparison_type": string }
  
  If result_count=false and format='json':
  {
    "data": [
      [keyword, words_count, chars_count, search_results_count, broad_frequency, exact_frequency, position1, position2],
      ...
    ],
    "domains": ["domain1.com", "domain2.com"],
    "comparison_type": "intersect"
  }
  Where array indices:
  - [0]: keyword (string) - Keyword phrase
  - [1]: words_count (number) - Number of words in phrase
  - [2]: chars_count (number) - Number of characters
  - [3]: search_results_count (number) - Search results count in Yandex/Google
  - [4]: broad_frequency (number) - Broad frequency worldwide
  - [5]: exact_frequency (number) - Exact frequency worldwide
  - [6]: position1 (number) - Position for first domain (1-based)
  - [7]: position2 (number) - Position for second domain (1-based, only for 2 domains comparison)
  
  Note: For 3+ domains comparison, only position1 is present (position for first domain).

Examples:
  - "Compare 2 domains (common)" -> { domains: ["wildberries.ru", "lamoda.ru"], comparison_type: "intersect" }
  - "Find unique to first" -> { domains: ["wildberries.ru", "lamoda.ru"], comparison_type: "domain1_uniq" }
  - "Compare 3+ domains" -> { domains: ["domain1.com", "domain2.com", "domain3.com"] }
  - "With region" -> { domains: ["d1.com", "d2.com"], region: "rus" }
  - "Count only" -> { domains: ["d1.com", "d2.com"], result_count: true }

Note: comparison_type is ignored when comparing 3+ domains (always uses intersection).

Error Handling:
  - 400: "Error: Invalid request" - Domain format incorrect or less than 2 domains
  - 402: "Error: Limit exceeded" - More than 10 domains or 'num' too large
  - 429: "Error: Rate limit exceeded" - Wait before retrying
  - Other errors: See bukvarix_search_keywords error handling`,
    inputSchema: CompareDomainsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    return await compareDomains(params);
  }
);

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bukvarix MCP server running via stdio");
}

runStdio().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
