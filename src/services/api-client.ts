import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../constants.js";
import { ApiError } from "../types.js";

const API_KEY = process.env.BUKVARIX_API_KEY || "free";

export function encodePercentEncoding(text: string): string {
  return encodeURIComponent(text);
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return `Error: Invalid request. ${typeof data === "string" ? data : "Check your parameters."}`;
        case 401:
          return `Error: Authentication failed. Check your API key (BUKVARIX_API_KEY environment variable).`;
        case 402:
          return `Error: Limit exceeded. Free API limits: max 100 queries, 250 exclusions, 10 domains for comparison. Try reducing the 'num' parameter or use filters.`;
        case 429:
          return `Error: Rate limit exceeded. Please wait before making more requests.`;
        case 500:
          return `Error: Internal server error. Please contact Bukvarix support.`;
        case 503:
          return `Error: Server maintenance in progress. Please try again later.`;
        default:
          return `Error: API request failed with status ${status}. ${typeof data === "string" ? data : ""}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Error: Cannot connect to Bukvarix API. Check your internet connection.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  data?: Record<string, string | number | boolean | string[]>,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: {
      method: "GET" | "POST";
      url: string;
      params?: Record<string, string | number | boolean>;
      data?: string;
      headers: Record<string, string>;
      timeout: number;
    } = {
      method,
      url,
      headers: {},
      timeout: 30000,
    };

    if (method === "POST" && data) {
      // For POST requests, api_key goes in form data, not params
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
      const formData = new URLSearchParams();
      formData.append("api_key", API_KEY);
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          formData.append(key, value.join("\r\n"));
        } else {
          formData.append(key, String(value));
        }
      }
      config.data = formData.toString();
    } else {
      // For GET requests, api_key goes in query params
      if (params) {
        config.params = { ...params, api_key: API_KEY };
      } else {
        config.params = { api_key: API_KEY };
      }
    }

    const response = await axios(config);

    // Handle response - axios may parse JSON automatically
    if (typeof response.data === "string") {
      return response.data as T;
    }
    return response.data as T;
  } catch (error) {
    const errorMessage = handleApiError(error);
    throw new Error(errorMessage);
  }
}

export function parseResponse(
  data: string | object,
  format: "txt" | "json" | "csv" | "tsv"
): any {
  // If data is already parsed (object), return as is for JSON format
  if (format === "json" && typeof data === "object" && data !== null) {
    return data;
  }

  // If data is string, parse it
  if (format === "json") {
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return { raw: data };
      }
    }
    return data;
  }

  // For txt, csv, tsv formats, data must be string
  const dataString = typeof data === "string" ? data : String(data);

  if (format === "txt") {
    return dataString.split("\n").filter((line: string) => line.trim());
  }

  if (format === "csv" || format === "tsv") {
    const lines = dataString.split("\n").filter((line: string) => line.trim());
    const delimiter = format === "csv" ? ";" : "\t";
    const headers = lines[0]?.split(delimiter) || [];
    const rows = lines.slice(1).map((line: string) => {
      const values = line.split(delimiter);
      const row: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        row[header.trim()] = values[index]?.trim().replace(/^"|"$/g, "") || "";
      });
      return row;
    });
    return { headers, rows };
  }

  return { raw: dataString };
}
