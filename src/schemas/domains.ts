import { z } from "zod";
import { FORMATS, REGIONS, COMPARISON_TYPES, MAX_NUM, DEFAULT_NUM, MAX_DOMAINS_COMPARE, type Region } from "../constants.js";

const regionKeys = Object.keys(REGIONS) as [Region, ...Region[]];
const RegionEnum = z.enum(regionKeys);

export const GetDomainKeywordsSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain must not be empty")
    .regex(/^[a-zA-Z0-9а-яёА-ЯЁ.-]+$/, "Domain must not include protocol or path")
    .describe("Домен или поддомен (без протокола, например: example.com или subdomain.example.com)"),
  region: RegionEnum
    .optional()
    .describe("Регион поисковой машины (по умолчанию: msk - Москва Яндекс)"),
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
  result_count: z
    .boolean()
    .default(false)
    .describe("Если true, вернуть только общее количество результатов без данных"),
}).strict();

export const CompareDomainsSchema = z.object({
  domains: z
    .array(z.string().min(1, "Domain must not be empty").regex(/^[a-zA-Z0-9а-яёА-ЯЁ.-]+$/, "Domain must not include protocol or path"))
    .min(2, "At least 2 domains are required")
    .max(MAX_DOMAINS_COMPARE, `Free API allows maximum ${MAX_DOMAINS_COMPARE} domains`)
    .describe(`Список доменов для сравнения (от 2 до ${MAX_DOMAINS_COMPARE} для бесплатного API)`),
  comparison_type: z
    .enum(COMPARISON_TYPES)
    .default("intersect")
    .describe("Тип сравнения: 'intersect' (общие), 'domain1_uniq' (уникальные для первого), 'domain2_uniq' (уникальные для второго)"),
  region: RegionEnum
    .optional()
    .describe("Регион поисковой машины (по умолчанию: msk - Москва Яндекс)"),
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
  result_count: z
    .boolean()
    .default(false)
    .describe("Если true, вернуть только общее количество результатов без данных"),
}).strict();

export type GetDomainKeywordsInput = z.infer<typeof GetDomainKeywordsSchema>;
export type CompareDomainsInput = z.infer<typeof CompareDomainsSchema>;
