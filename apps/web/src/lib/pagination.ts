export type Pagination = {
  totalPages: number;
  page: number;
  offset: number;
};

export function paginate(totalItems: number, pageSize: number, requested: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requested), totalPages);

  return { totalPages, page, offset: (page - 1) * pageSize };
}
