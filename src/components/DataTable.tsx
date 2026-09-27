/**
 * The data table.
 *
 * This is the change that moves the console off its phone shape: a list of
 * records belongs in aligned, sortable, scannable columns, not in a stack of
 * cards. Money right-aligns and sits on tabular figures, so an admin can
 * compare a column at a glance instead of reading each row.
 *
 * It handles sorting, row selection with bulk actions, loading skeletons, empty
 * state and client-side pagination. Below `md` each row collapses to a stacked
 * card, because columns genuinely do not work at 390px — the shape follows the
 * viewport rather than being one compromise for both.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, type Icon } from './icons';
import { Button, Checkbox, EmptyState, Skeleton, cx } from './primitives';

export interface Column<T> {
  /** Stable key — also the sort key when `sortable`. */
  id: string;
  header: ReactNode;
  /** Cell contents for a row. */
  cell: (row: T) => ReactNode;
  /** Returns the value to sort on. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  /** Tailwind width utility, e.g. `w-[12rem]`. */
  width?: string;
  /** Hidden below `lg` — secondary columns that would crowd a laptop. */
  secondary?: boolean;
  /** Skipped in the mobile card layout (an action column renders separately). */
  hideOnCard?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Rendered at the right of every row — usually a DropdownMenu. */
  rowActions?: (row: T) => ReactNode;
  /** Enables checkboxes; receives the currently selected rows. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  empty: { icon: Icon; title: string; description?: string; action?: ReactNode };
  /** Rows per page. 0 disables pagination. */
  pageSize?: number;
  /** Column id to sort by on first render. */
  initialSort?: { id: string; dir: 'asc' | 'desc' };
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading = false,
  onRowClick,
  rowActions,
  bulkActions,
  empty,
  pageSize = 25,
  initialSort,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find(c => c.id === sort.id);
    if (!column?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    // Copy first — sorting the prop array in place would mutate the caller's data.
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [rows, columns, sort]);

  const pageCount = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1;
  // A filter that shrinks the list can strand the viewer on a page that no
  // longer exists; clamp rather than showing an empty table.
  const current = Math.min(page, Math.max(0, pageCount - 1));
  const visible = pageSize > 0 ? sorted.slice(current * pageSize, current * pageSize + pageSize) : sorted;

  const selectedRows = rows.filter(r => selected.has(rowKey(r)));
  const allVisibleSelected = visible.length > 0 && visible.every(r => selected.has(rowKey(r)));
  const someVisibleSelected = visible.some(r => selected.has(rowKey(r)));

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach(r => next.delete(rowKey(r)));
      else visible.forEach(r => next.add(rowKey(r)));
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    setSort(prev =>
      prev?.id === column.id
        ? { id: column.id, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { id: column.id, dir: 'asc' },
    );
  };

  const align = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  if (loading) return <TableSkeleton columns={columns} withSelection={!!bulkActions} />;

  if (rows.length === 0) {
    return (
      <div className="elevated rounded-xl">
        <EmptyState {...empty} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar — only present once something is selected. */}
      {bulkActions && selectedRows.length > 0 && (
        <div className="elevated animate-pop flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">
            {selectedRows.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions(selectedRows, clearSelection)}
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="elevated overflow-hidden rounded-xl">
        {/* ── Desktop: a real table ─────────────────────────────────────── */}
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-hover/40">
                {bulkActions && (
                  <th scope="col" className="w-10 px-4 py-2.5">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && someVisibleSelected}
                      onChange={toggleAll}
                      label="Select all rows on this page"
                    />
                  </th>
                )}
                {columns.map(column => {
                  const active = sort?.id === column.id;
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cx(
                        'px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground',
                        align(column.align),
                        column.width,
                        column.secondary && 'hidden lg:table-cell',
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className={cx(
                            'inline-flex items-center gap-1 transition-colors duration-150 hover:text-foreground',
                            active && 'text-foreground',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {column.header}
                          <ChevronDown
                            size={12}
                            className={cx(
                              'transition-transform duration-200',
                              active ? (sort.dir === 'asc' ? 'rotate-180' : '') : 'opacity-0',
                            )}
                          />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
                {rowActions && <th scope="col" className="w-12 px-4 py-2.5" />}
              </tr>
            </thead>

            <tbody>
              {visible.map(row => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cx(
                      'border-b border-border last:border-0 transition-colors duration-150',
                      isSelected ? 'bg-primary/[0.07]' : 'hover:bg-hover',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {bulkActions && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          label="Select row"
                        />
                      </td>
                    )}
                    {columns.map(column => (
                      <td
                        key={column.id}
                        className={cx(
                          'px-4 py-3 text-[13.5px] text-foreground',
                          align(column.align),
                          column.secondary && 'hidden lg:table-cell',
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile: stacked cards, because columns do not work at 390px ── */}
        <div className="divide-y divide-border md:hidden">
          {visible.map(row => {
            const key = rowKey(row);
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx('flex items-start gap-3 p-4', onRowClick && 'cursor-pointer active:bg-hover')}
              >
                {bulkActions && (
                  <div className="pt-0.5">
                    <Checkbox
                      checked={selected.has(key)}
                      onChange={() => toggleRow(key)}
                      label="Select row"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  {columns
                    .filter(c => !c.hideOnCard)
                    .map(column => (
                      <div key={column.id} className="text-[13.5px] text-foreground">
                        {column.cell(row)}
                      </div>
                    ))}
                </div>
                {rowActions && <div onClick={e => e.stopPropagation()}>{rowActions(row)}</div>}
              </div>
            );
          })}
        </div>

        {/* ── Footer: count + pagination ─────────────────────────────────── */}
        {pageSize > 0 && sorted.length > pageSize && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
            <p className="text-[12.5px] text-muted-foreground">
              <span className="tnum">{current * pageSize + 1}</span>–
              <span className="tnum">{Math.min((current + 1) * pageSize, sorted.length)}</span> of{' '}
              <span className="tnum">{sorted.length}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                icon={ChevronLeftGlyph}
              >
                Prev
              </Button>
              <span className="px-2 text-[12.5px] text-muted-foreground">
                <span className="tnum">{current + 1}</span> / <span className="tnum">{pageCount}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                iconRight={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ChevronRight, mirrored — avoids vendoring a second glyph for one button. */
const ChevronLeftGlyph: Icon = ({ size = 18, className }) => (
  <ChevronRight size={size} className={cx('rotate-180', className)} />
);

function TableSkeleton<T>({ columns, withSelection }: { columns: Column<T>[]; withSelection: boolean }) {
  return (
    <div className="elevated overflow-hidden rounded-xl">
      <div className="border-b border-border bg-hover/40 px-4 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
          {withSelection && <Skeleton className="size-4 shrink-0 rounded" />}
          {columns.slice(0, 4).map((column, i) => (
            <Skeleton
              key={column.id}
              className={cx('h-3.5', i === 0 ? 'w-1/3' : 'w-20')}
              // Stagger the widths so it reads as content, not as a loading bar.
            />
          ))}
        </div>
      ))}
    </div>
  );
}
