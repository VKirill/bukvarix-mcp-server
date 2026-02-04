import { makeApiRequest, encodePercentEncoding, parseResponse } from "../services/api-client.js";
import { GetDomainKeywordsSchema, CompareDomainsSchema, type GetDomainKeywordsInput, type CompareDomainsInput } from "../schemas/domains.js";
import { CHARACTER_LIMIT } from "../constants.js";

export async function getDomainKeywords(params: GetDomainKeywordsInput): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: any }> {
  try {
    const encodedDomain = encodePercentEncoding(params.domain);
    const endpoint = `/v1/site/`;

    const requestParams: Record<string, string | number | boolean> = {
      q: encodedDomain,
      num: params.num,
      format: params.format,
      result_count: params.result_count ? 1 : 0,
    };

    if (params.region) {
      requestParams.region = params.region;
    }

    const response = await makeApiRequest<string | object>(
      endpoint,
      "GET",
      undefined,
      requestParams
    );

    if (params.result_count) {
      const count = typeof response === "string" ? parseInt(response, 10) : (typeof response === "number" ? response : parseInt(String(response), 10));
      return {
        content: [{
          type: "text",
          text: `Total keywords found for ${params.domain}: ${count}`,
        }],
        structuredContent: { total: count, domain: params.domain },
      };
    }

    const parsed = parseResponse(response, params.format);
    const textContent = formatDomainResponse(parsed, params.format, params.domain, params.region);

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

export async function compareDomains(params: CompareDomainsInput): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: any }> {
  try {
    const isTwoDomains = params.domains.length === 2;
    const endpoint = isTwoDomains ? `/v1/site_cmp/` : `/v1/site_mcmp/`;

    if (params.result_count) {
      const requestParams: Record<string, string | number | boolean> = {
        result_count: 1,
        format: params.format,
      };

      if (isTwoDomains) {
        requestParams.q = encodePercentEncoding(params.domains[0]);
        requestParams.q2 = encodePercentEncoding(params.domains[1]);
        if (params.comparison_type) {
          requestParams.comparison_type = params.comparison_type;
        }
      } else {
        requestParams.q = params.domains.map(d => encodePercentEncoding(d)).join("\r\n");
      }

      if (params.region) {
        requestParams.region = params.region;
      }

      const response = await makeApiRequest<string | object>(
        endpoint,
        isTwoDomains ? "GET" : "POST",
        isTwoDomains ? undefined : requestParams as Record<string, string>,
        isTwoDomains ? requestParams : undefined
      );

      const count = typeof response === "string" ? parseInt(response, 10) : (typeof response === "number" ? response : parseInt(String(response), 10));
      return {
        content: [{
          type: "text",
          text: `Total keywords found: ${count}`,
        }],
        structuredContent: { total: count, domains: params.domains, comparison_type: params.comparison_type },
      };
    }

    let response: string | object;
    if (isTwoDomains) {
      const requestParams: Record<string, string | number | boolean> = {
        q: encodePercentEncoding(params.domains[0]),
        q2: encodePercentEncoding(params.domains[1]),
        num: params.num,
        format: params.format,
        comparison_type: params.comparison_type,
      };
      if (params.region) {
        requestParams.region = params.region;
      }
      response = await makeApiRequest<string | object>(endpoint, "GET", undefined, requestParams);
    } else {
      const postData: Record<string, string> = {
        q: params.domains.map(d => encodePercentEncoding(d)).join("\r\n"),
        num: String(params.num),
        format: params.format,
      };
      if (params.region) {
        postData.region = params.region;
      }
      response = await makeApiRequest<string | object>(endpoint, "POST", postData);
    }

    const parsed = parseResponse(response, params.format);
    const textContent = formatComparisonResponse(parsed, params.format, params.domains, params.comparison_type, params.region);

    return {
      content: [{
        type: "text",
        text: textContent.length > CHARACTER_LIMIT
          ? textContent.substring(0, CHARACTER_LIMIT) + `\n\n[Response truncated. Use 'num' parameter to limit results.]`
          : textContent,
      }],
      structuredContent: { ...parsed, domains: params.domains, comparison_type: params.comparison_type },
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

function formatDomainResponse(data: any, format: string, domain: string, region?: string): string {
  const regionText = region ? ` (${region})` : "";

  if (format === "json") {
    if (Array.isArray(data)) {
      return `# Domain Keywords: ${domain}${regionText}\n\nFound ${data.length} keywords:\n\n${data.map((kw, i) => {
        const keyword = kw.keyword || kw[0] || kw;
        const position = kw.position !== undefined ? kw.position : kw[5];
        const broad = kw.broad_frequency || kw[4] || "N/A";
        const exact = kw.exact_frequency || kw[5] || "N/A";
        return `${i + 1}. ${keyword} - Position: ${position}, Broad: ${broad}, Exact: ${exact}`;
      }).join("\n")}`;
    }
    return `# Domain Keywords: ${domain}${regionText}\n\n${JSON.stringify(data, null, 2)}`;
  }

  if (format === "txt") {
    if (Array.isArray(data)) {
      return `# Domain Keywords: ${domain}${regionText}\n\nFound ${data.length} keywords:\n\n${data.join("\n")}`;
    }
    return `# Domain Keywords: ${domain}${regionText}\n\n${String(data)}`;
  }

  if (format === "csv" || format === "tsv") {
    if (data.headers && data.rows) {
      return `# Domain Keywords: ${domain}${regionText}\n\nFound ${data.rows.length} keywords:\n\n| ${data.headers.join(" | ")} |\n|${data.headers.map(() => "---").join("|")}|\n${data.rows.map((row: Record<string, string>) => `| ${data.headers.map((h: string) => row[h] || "").join(" | ")} |`).join("\n")}`;
    }
  }

  return `# Domain Keywords: ${domain}${regionText}\n\n${JSON.stringify(data, null, 2)}`;
}

function formatComparisonResponse(data: any, format: string, domains: string[], comparisonType: string, region?: string): string {
  const regionText = region ? ` (${region})` : "";
  const comparisonText = comparisonType === "intersect" ? "Common" : comparisonType === "domain1_uniq" ? "Unique to first" : "Unique to second";

  if (format === "json") {
    if (Array.isArray(data)) {
      return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${comparisonText} keywords (${data.length}):\n\n${data.map((kw, i) => {
        const keyword = kw.keyword || kw[0] || kw;
        const position = kw.position !== undefined ? kw.position : kw[5];
        const broad = kw.broad_frequency || kw[4] || "N/A";
        const exact = kw.exact_frequency || kw[5] || "N/A";
        return `${i + 1}. ${keyword} - Position: ${position}, Broad: ${broad}, Exact: ${exact}`;
      }).join("\n")}`;
    }
    return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${JSON.stringify(data, null, 2)}`;
  }

  if (format === "txt") {
    if (Array.isArray(data)) {
      return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${comparisonText} keywords (${data.length}):\n\n${data.join("\n")}`;
    }
    return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${String(data)}`;
  }

  if (format === "csv" || format === "tsv") {
    if (data.headers && data.rows) {
      return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${comparisonText} keywords (${data.rows.length}):\n\n| ${data.headers.join(" | ")} |\n|${data.headers.map(() => "---").join("|")}|\n${data.rows.map((row: Record<string, string>) => `| ${data.headers.map((h: string) => row[h] || "").join(" | ")} |`).join("\n")}`;
    }
  }

  return `# Domain Comparison: ${domains.join(" vs ")}${regionText}\n\n${JSON.stringify(data, null, 2)}`;
}
