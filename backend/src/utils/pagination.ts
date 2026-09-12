import { Request } from "express";

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function getPagination(req: Request, defaultPageSize = 20, maxPageSize = 100): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(String(req.query.pageSize ?? String(defaultPageSize)), 10) || defaultPageSize)
  );
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function buildMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
