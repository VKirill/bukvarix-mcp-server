import { makeApiRequest, encodePercentEncoding, parseResponse } from "../services/api-client.js";
import { SearchKeywordsSchema, SearchKeywordsBatchSchema, type SearchKeywordsInput, type SearchKeywordsBatchInput } from "../schemas/keywords.js";
import { CHARACTER_LIMIT } from "../constants.js";

export async function searchKeywords(params: SearchKeywordsInput): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: any }> {
  try {
    const encodedQuery = encodePercentEncoding(params.query);
    const endpoint = `/v1/keywords/`;

    const response = await makeApiRequest<string | object>(
      endpoint,
      "GET",
      undefined,
      {
        q: encodedQuery,
        num: params.num,
        format: params.format,
        report_type: params.report_type,
        result_count: params.result_count ? 1 : 0,
      }
    );

    if (params.result_count) {
      const count = typeof response === "string" ? parseInt(response, 10) : (typeof response === "number" ? response : parseInt(String(response), 10));
      return {
        content: [{
          type: "text",
          text: `Total results found: ${count}`,
        }],
        structuredContent: { total: count },
      };
    }

    const parsed = parseResponse(response, params.format);
    const textContent = formatKeywordsResponse(parsed, params.format, params.query);

    return {
      content: [{
        type: "text",
        text: textContent.length > CHARACTER_LIMIT
          ? textContent.substring(0, CHARACTER_LIMIT) + `\n\n[Response truncated. Use 'num' parameter to limit results.]`
          : textContent,
      }],
      structuredContent: parsed,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}

export async function searchKeywordsBatch(params: SearchKeywordsBatchInput): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: any }> {
  try {
    const endpoint = `/v1/mkeywords/`;
    const queriesText = params.queries.join("\r\n");
    const exclusionsText = params.exclusions?.join("\r\n") || "";

    const postData: Record<string, string> = {
      q: queriesText,
    };

    if (exclusionsText) {
      postData.q2 = exclusionsText;
    }

    const response = await makeApiRequest<string | object>(
      endpoint,
      "POST",
      {
        ...postData,
        num: String(params.num),
        format: params.format,
      }
    );

    const parsed = parseResponse(response, params.format);
    const textContent = formatKeywordsResponse(parsed, params.format, `Batch search (${params.queries.length} queries)`);

    return {
      content: [{
        type: "text",
        text: textContent.length > CHARACTER_LIMIT
          ? textContent.substring(0, CHARACTER_LIMIT) + `\n\n[Response truncated. Use 'num' parameter to limit results.]`
          : textContent,
      }],
      structuredContent: parsed,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}

function formatKeywordsResponse(data: any, format: string, query: string): string {
  if (format === "json") {
    if (Array.isArray(data)) {
      return `# Keywords Search Results: "${query}"\n\nFound ${data.length} keywords:\n\n${data.map((kw, i) => `${i + 1}. ${kw.keyword || kw[0] || kw} - Broad: ${kw.broad_frequency || kw[1] || "N/A"}, Exact: ${kw.exact_frequency || kw[2] || "N/A"}`).join("\n")}`;
    }
    return `# Keywords Search Results: "${query}"\n\n${JSON.stringify(data, null, 2)}`;
  }

  if (format === "txt") {
    if (Array.isArray(data)) {
      return `# Keywords Search Results: "${query}"\n\nFound ${data.length} keywords:\n\n${data.join("\n")}`;
    }
    return `# Keywords Search Results: "${query}"\n\n${String(data)}`;
  }

  if (format === "csv" || format === "tsv") {
    if (data.headers && data.rows) {
      return `# Keywords Search Results: "${query}"\n\nFound ${data.rows.length} keywords:\n\n| ${data.headers.join(" | ")} |\n|${data.headers.map(() => "---").join("|")}|\n${data.rows.map((row: Record<string, string>) => `| ${data.headers.map((h: string) => row[h] || "").join(" | ")} |`).join("\n")}`;
    }
  }

  return `# Keywords Search Results: "${query}"\n\n${JSON.stringify(data, null, 2)}`;
}
