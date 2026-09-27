/**
 * Catalogue — a port of dristi-admin-app/lib/screens/products_screen.dart,
 * rebuilt as a data table.
 *
 * The gender chip is a server-side filter (it re-queries with `?gender=`) and
 * also filters locally, exactly as the Flutter screen does; the search box is
 * debounced client-side over title and SKU.
 */
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Package, Pencil, Plus, Trash } from '../components/icons';
import * as api from '../lib/api';
import { capitalise, imageUrl, money } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { errorMessage } from '../lib/apiClient';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader, Toolbar } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, DropdownMenu, MenuItem } from '../components/primitives';
import { FilterChips, SafeImage, SearchInput } from '../components/ui';
import type { AdminProduct } from '../types';
import type { PageProps } from './types';

const GENDER_FILTERS = [
  { value: '', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
];

export function ProductsPage({ onNavigate }: PageProps) {
  const [gender, setGender] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => api.getProducts({ gender: gender || undefined }),
    [gender],
  );

  // 250ms debounce, matching the Flutter screen's Timer.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(rawQuery), 250);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const products = data ?? [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (q && !p.title.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (gender && (p.gender ?? '').toLowerCase() !== gender) return false;
      return true;
    });
  }, [products, query, gender]);

  const remove = async (product: AdminProduct) => {
    const ok = await confirm({ message: `Remove "${product.title}"?` });
    if (!ok) return;
    try {
      await api.deleteProduct(product.id);
      toast('Product removed', { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  const removeMany = async (selected: AdminProduct[], clear: () => void) => {
    const ok = await confirm({
      message: `Remove ${selected.length} products? This cannot be undone.`,
      confirmLabel: `Remove ${selected.length}`,
    });
    if (!ok) return;
    // Sequential, not Promise.all: a burst of deletes against the admin API is
    // the kind of thing that trips a rate limit and half-succeeds.
    let removed = 0;
    for (const product of selected) {
      try {
        await api.deleteProduct(product.id);
        removed += 1;
      } catch (e) {
        toast(`${product.title}: ${errorMessage(e)}`, { error: true });
        break;
      }
    }
    if (removed) toast(`${removed} product${removed === 1 ? '' : 's'} removed`, { success: true });
    clear();
    reload();
  };

  const columns: Column<AdminProduct>[] = [
    {
      id: 'title',
      header: 'Product',
      sortValue: p => p.title,
      cell: p => (
        <div className="flex items-center gap-3">
          <SafeImage
            src={imageUrl(p.primaryImage)}
            alt=""
            className="size-9 shrink-0 rounded-lg border border-border object-cover"
            fallback={<Package size={15} />}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{p.title}</p>
            <p className="truncate font-mono text-[11.5px] text-subtle-foreground">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      secondary: true,
      sortValue: p => p.categoryName ?? '',
      cell: p => <span className="text-muted-foreground">{p.categoryName ?? '—'}</span>,
    },
    {
      id: 'gender',
      header: 'Gender',
      secondary: true,
      sortValue: p => p.gender ?? '',
      cell: p =>
        p.gender ? <Badge>{capitalise(p.gender)}</Badge> : <span className="text-subtle-foreground">—</span>,
    },
    {
      id: 'price',
      header: 'Price',
      align: 'right',
      sortValue: p => p.discountPrice ?? p.price,
      cell: p => (
        <div className="tnum">
          <span className="font-medium text-foreground">{money(p.discountPrice ?? p.price)}</span>
          {p.discountPrice != null && (
            <span className="ml-2 text-[12px] text-subtle-foreground line-through">{money(p.price)}</span>
          )}
        </div>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      sortValue: p => p.stock,
      cell: p => (
        <span
          className="tnum font-medium"
          style={{ color: p.stock > 5 ? 'var(--color-foreground)' : 'var(--color-destructive)' }}
        >
          {p.stock}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: p => (p.isActive ? 'active' : 'inactive'),
      cell: p => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="dot" color={p.isActive ? 'var(--color-success)' : 'var(--color-subtle-foreground)'}>
            {p.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {p.featured && <Badge color="var(--color-amber)">Featured</Badge>}
        </div>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Products"
        description={`${products.length} item${products.length === 1 ? '' : 's'} in the catalogue.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => onNavigate('/products/new')}>
            New product
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          hint="Search by title or SKU..."
          value={rawQuery}
          onChange={setRawQuery}
          className="w-full sm:w-72"
        />
        <FilterChips options={GENDER_FILTERS} active={gender} onSelect={setGender} />
        {rows.length !== products.length && (
          <span className="text-[12.5px] text-muted-foreground">
            {rows.length} of {products.length} shown
          </span>
        )}
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={p => p.id}
        loading={loading}
        onRowClick={p => onNavigate(`/products/${p.id}`)}
        initialSort={{ id: 'title', dir: 'asc' }}
        rowActions={p => (
          <DropdownMenu
            label={`Actions for ${p.title}`}
            trigger={
              <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                <MoreHorizontal size={16} />
              </span>
            }
          >
            <MenuItem icon={Pencil} onSelect={() => onNavigate(`/products/${p.id}`)}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash} destructive onSelect={() => remove(p)}>
              Delete
            </MenuItem>
          </DropdownMenu>
        )}
        bulkActions={(selected, clear) => (
          <Button size="sm" variant="destructive" icon={Trash} onClick={() => removeMany(selected, clear)}>
            Delete
          </Button>
        )}
        empty={{
          icon: Package,
          title: error ? 'Could not load products' : 'No products yet',
          description: error ?? 'Add your first catalogue item to get started.',
          action: error ? undefined : (
            <Button variant="primary" icon={Plus} onClick={() => onNavigate('/products/new')}>
              New product
            </Button>
          ),
        }}
      />
    </PageBody>
  );
}
