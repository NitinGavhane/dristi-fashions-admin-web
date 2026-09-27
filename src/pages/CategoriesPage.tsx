/**
 * Category tree — a port of dristi-admin-app/lib/screens/categories_screen.dart.
 *
 * Flattened into a table where children sit indented under their parent, so the
 * hierarchy is still legible but every row is scannable and sortable-free. The
 * gender of a category resolves the way the backend does: its own gender when
 * it is a real one, otherwise the parent's.
 */
import { useMemo, useState } from 'react';
import { Indent, MoreHorizontal, NavCategories, Pencil, Plus, Trash } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise, imageUrl } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import {
  SPECIFIC_GENDERS,
  isMainCategoryName,
  isParentCategory,
  type AdminCategory,
} from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader, Toolbar } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, DropdownMenu, MenuItem } from '../components/primitives';
import { FilterChips, SafeImage, SearchInput } from '../components/ui';
import type { PageProps } from './types';

const GENDER_FILTERS = [
  { value: '', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
];

/** `_genderFor` — an explicit real gender wins, else inherit from the parent. */
function genderFor(cat: AdminCategory, all: AdminCategory[]): string {
  const own = cat.gender?.toLowerCase() ?? '';
  if ((SPECIFIC_GENDERS as readonly string[]).includes(own)) return own;

  if (cat.parentId) {
    const parent = all.find(c => c.id === cat.parentId);
    if (parent) {
      const pg = parent.gender?.toLowerCase() ?? '';
      if ((SPECIFIC_GENDERS as readonly string[]).includes(pg)) return pg;
      if (isMainCategoryName(parent.name)) return parent.name.toLowerCase();
    }
  }
  return own;
}

/** A category plus its depth, so the table can indent it. */
interface Row {
  cat: AdminCategory;
  depth: number;
  childCount: number;
}

export function CategoriesPage({ onNavigate }: PageProps) {
  const [gender, setGender] = useState('');
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => api.getCategories({ gender: gender || undefined }),
    [gender],
  );

  const categories = data ?? [];

  /**
   * Parents first, each followed by its own children — so a child never floats
   * away from the row it belongs under once the list is filtered.
   */
  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const childrenOf = (id: string) => categories.filter(c => c.parentId === id);
    const matches = (c: AdminCategory) => !q || c.name.toLowerCase().includes(q);

    const out: Row[] = [];
    for (const parent of categories.filter(isParentCategory)) {
      const children = childrenOf(parent.id);
      const keptChildren = children.filter(matches);
      // Keep a parent whose children match, so the hierarchy stays intact.
      if (matches(parent) || keptChildren.length > 0) {
        out.push({ cat: parent, depth: 0, childCount: children.length });
        for (const child of matches(parent) ? children : keptChildren) {
          out.push({ cat: child, depth: 1, childCount: 0 });
        }
      }
    }

    // Anything whose parent is not in the list would otherwise vanish.
    const shown = new Set(out.map(r => r.cat.id));
    for (const c of categories) {
      if (!shown.has(c.id) && matches(c)) out.push({ cat: c, depth: c.parentId ? 1 : 0, childCount: 0 });
    }
    return out;
  }, [categories, query]);

  const remove = async (cat: AdminCategory, childCount: number) => {
    const ok = await confirm({
      message: `Remove "${cat.name}"?${childCount > 0 ? '\nIts subcategories will also be removed.' : ''}`,
    });
    if (!ok) return;
    try {
      await api.deleteCategory(cat.id);
      toast('Category removed', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  const columns: Column<Row>[] = [
    {
      id: 'name',
      header: 'Category',
      cell: ({ cat, depth, childCount }) => (
        <div className="flex items-center gap-3" style={{ paddingLeft: depth * 22 }}>
          {depth > 0 && (
            <span className="shrink-0 text-subtle-foreground">
              <Indent size={14} />
            </span>
          )}
          {cat.imageUrl ? (
            <SafeImage
              src={imageUrl(cat.imageUrl)}
              alt=""
              className="size-8 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-hover text-[12px] font-semibold text-muted-foreground">
              {cat.name[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{cat.name}</p>
            {childCount > 0 && (
              <p className="text-[11.5px] text-subtle-foreground">
                {childCount} subcategor{childCount === 1 ? 'y' : 'ies'}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'slug',
      header: 'Slug',
      secondary: true,
      cell: ({ cat }) => <span className="font-mono text-[12px] text-muted-foreground">{cat.slug}</span>,
    },
    {
      id: 'gender',
      header: 'Gender',
      cell: ({ cat }) => {
        const g = genderFor(cat, categories);
        return g ? <Badge>{capitalise(g)}</Badge> : <span className="text-subtle-foreground">—</span>;
      },
    },
    {
      id: 'level',
      header: 'Level',
      secondary: true,
      cell: ({ depth }) => (
        <span className="text-[12.5px] text-muted-foreground">{depth === 0 ? 'Top level' : 'Subcategory'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ cat }) => (
        <Badge variant="dot" color={cat.isActive ? 'var(--color-success)' : 'var(--color-subtle-foreground)'}>
          {cat.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Categories"
        description={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} across the catalogue.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => onNavigate('/categories/new')}>
            New category
          </Button>
        }
      />

      <Toolbar>
        <SearchInput hint="Search categories..." value={query} onChange={setQuery} className="w-full sm:w-64" />
        <FilterChips options={GENDER_FILTERS} active={gender} onSelect={setGender} />
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={r => r.cat.id}
        loading={loading}
        onRowClick={r => onNavigate(`/categories/${r.cat.id}`)}
        pageSize={0}
        rowActions={r => (
          <DropdownMenu
            label={`Actions for ${r.cat.name}`}
            trigger={
              <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                <MoreHorizontal size={16} />
              </span>
            }
          >
            <MenuItem icon={Pencil} onSelect={() => onNavigate(`/categories/${r.cat.id}`)}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash} destructive onSelect={() => remove(r.cat, r.childCount)}>
              Delete
            </MenuItem>
          </DropdownMenu>
        )}
        empty={{
          icon: NavCategories,
          title: error ? 'Could not load categories' : 'No categories yet',
          description: error ?? 'Create Men, Women or Kids to start the catalogue tree.',
          action: error ? undefined : (
            <Button variant="primary" icon={Plus} onClick={() => onNavigate('/categories/new')}>
              New category
            </Button>
          ),
        }}
      />
    </PageBody>
  );
}
