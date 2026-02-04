import { z } from "zod";
import { FORMATS, REPORT_TYPES, MAX_NUM, DEFAULT_NUM, MAX_QUERIES_FREE, MAX_EXCLUSIONS_FREE } from "../constants.js";

export const SearchKeywordsSchema = z.object({
  query: z
    .string()
    .min(1, "Query must not be empty")
    .describe("Ключевое слово или фраза для поиска (поддерживает спецсимволы: *, !, ~)"),
  num: z
    .number()
    .int("Number must be an integer")
    .min(1, "Number must be at least 1")
    .max(MAX_NUM, `Number must not exceed ${MAX_NUM}`)
    .default(DEFAULT_NUM)
    .describe(`Количество строк в отчете (по умолчанию ${DEFAULT_NUM}, максимум ${MAX_NUM})`),
  format: z
    .enum(FORMATS)
    .default("json")
    .describe("Формат данных: 'txt' (список), 'json' (массив), 'csv' (точка с запятой), 'tsv' (табуляция)"),
  report_type: z
    .enum(REPORT_TYPES)
    .default("report")
    .describe("Тип отчета: 'report' (отчет) или 'word_analysis' (анализ)"),
  result_count: z
    .boolean()
    .default(false)
    .describe("Если true, вернуть только общее количество результатов без данных"),
}).strict();

export const SearchKeywordsBatchSchema = z.object({
  queries: z
    .array(z.string().min(1, "Query must not be empty"))
    .min(1, "At least one query is required")
    .max(MAX_QUERIES_FREE, `Free API allows maximum ${MAX_QUERIES_FREE} queries`)
    .describe(`Список ключевых слов для поиска (каждое с новой строки, максимум ${MAX_QUERIES_FREE} для бесплатного API)`),
  exclusions: z
    .array(z.string().min(1, "Exclusion must not be empty"))
    .max(MAX_EXCLUSIONS_FREE, `Free API allows maximum ${MAX_EXCLUSIONS_FREE} exclusions`)
    .optional()
    .describe(`Список слов-исключений (максимум ${MAX_EXCLUSIONS_FREE} для бесплатного API)`),
  num: z
    .number()
    .int("Number must be an integer")
    .min(1, "Number must be at least 1")
    .max(MAX_NUM, `Number must not exceed ${MAX_NUM}`)
    .default(DEFAULT_NUM)
    .describe(`Количество строк в отчете (по умолчанию ${DEFAULT_NUM}, максимум ${MAX_NUM})`),
  format: z
    .enum(FORMATS)
    .default("json")
    .describe("Формат данных: 'txt' (список), 'json' (массив), 'csv' (точка с запятой), 'tsv' (табуляция)"),
}).strict();

export type SearchKeywordsInput = z.infer<typeof SearchKeywordsSchema>;
export type SearchKeywordsBatchInput = z.infer<typeof SearchKeywordsBatchSchema>;
