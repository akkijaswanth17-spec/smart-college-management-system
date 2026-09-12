import { useCallback, useEffect, useState } from "react";
import { PaginationMeta } from "../types";
import { getErrorMessage } from "../services/api";

type Fetcher<T> = (params: Record<string, unknown>) => Promise<{ data: T[]; meta: PaginationMeta }>;

export function usePaginatedList<T>(fetcher: Fetcher<T>, filters: Record<string, unknown> = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetcher({ ...filters, page });
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return { items, meta, page, setPage, loading, error, reload: load };
}
