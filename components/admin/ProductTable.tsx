"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import SaleModal from "./SaleModal";
import ColumnVisibilityMenu from "@/components/ui/ColumnVisibilityMenu";
import DarkModeToggle from "@/components/ui/DarkModeToggle";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";

import {
  ArrowUpDown,
  Trash,
  Edit,
  Image as ImageIcon,
  Check,
  X,
  Tag,
} from "lucide-react";

// ===================================================================
// MAIN START
// ===================================================================

export default function ProductTable() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [showSaleModal, setShowSaleModal] = useState<any>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Load products + categories ----------------------------
  const load = async () => {
    const { data: prod } = await supabase.from("products").select("*").order("id");
    const { data: cats } = await supabase
      .from("product_categories")
      .select("*")
      .order("sort_order");

    setProducts(prod || []);
    setCategories(cats || []);
  };

  useEffect(() => {
    load();
  }, []);

  // Group Level1 + Level2 ----------------------------------
  const groupedCats = useMemo(() => {
    const level1 = categories.filter((c) => c.parent_id === null);
    const map: Record<number, any[]> = {};

    level1.forEach((parent) => {
      map[parent.id] = categories.filter((c) => c.parent_id === parent.id);
    });

    return { level1, level2Map: map };
  }, [categories]);

  // Inline update helpers -----------------------------------
  const saveInline = async (id: number, field: string, value: any) => {
    await supabase.from("products").update({ [field]: value }).eq("id", id);
    load();
  };

  // Inline image upload -------------------------------------
  const pickImage = (id: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingId(id);

      // request signed URL
      const res = await fetch("/api/admin/products/sign-upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const { uploadUrl, publicUrl } = await res.json();

      // upload to S3
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // save DB
      await saveInline(id, "image_url", publicUrl);

      setUploadingId(null);
    };

    input.click();
  };

  // Bulk delete ---------------------------------------------
  const bulkDelete = async () => {
    await supabase.from("products").delete().in("id", selected);
    setSelected([]);
    load();
  };

  // Bulk remove sale ----------------------------------------
  const bulkRemoveSale = async () => {
    await supabase
      .from("products")
      .update({ is_on_sale: false, sale_price: null })
      .in("id", selected);

    load();
    setSelected([]);
  };

  // Table columns -------------------------------------------
  const columns: any[] = useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            onChange={(e) =>
              setSelected(
                e.target.checked ? products.map((p) => p.id) : []
              )
            }
            checked={selected.length === products.length && products.length > 0}
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            checked={selected.includes(row.original.id)}
            onChange={() => {
              const id = row.original.id;
              setSelected((prev) =>
                prev.includes(id)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id]
              );
            }}
          />
        ),
      },

      // IMAGE
      {
        accessorKey: "image_url",
        header: "Image",
        cell: ({ row }: any) => {
          const p = row.original;
          return (
            <div className="flex items-center">
              <button
                onClick={() => pickImage(p.id)}
                className="relative group"
              >
                {uploadingId === p.id ? (
                  <div className="w-14 h-14 rounded bg-gray-300 animate-pulse" />
                ) : p.image_url ? (
                  <img
                    src={p.image_url}
                    className="w-14 h-14 object-cover rounded border"
                  />
                ) : (
                  <div className="w-14 h-14 flex items-center justify-center rounded border">
                    <ImageIcon size={18} className="opacity-60" />
                  </div>
                )}
              </button>
            </div>
          );
        },
      },

      // NAME
      {
        accessorKey: "name",
        header: ({ column }: any) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Name <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ row }: any) => {
          const p = row.original;
          return (
            <input
              defaultValue={p.name}
              onBlur={(e) => saveInline(p.id, "name", e.target.value)}
              className="bg-transparent w-full border-b dark:border-gray-700 focus:outline-none"
            />
          );
        },
      },

      // PRICE
      {
        accessorKey: "price",
        header: ({ column }: any) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Price <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ row }: any) => {
          const p = row.original;
          return (
            <input
              type="number"
              defaultValue={p.price}
              onBlur={(e) =>
                saveInline(p.id, "price", Number(e.target.value))
              }
              className="bg-transparent w-20 border-b dark:border-gray-700 focus:outline-none"
            />
          );
        },
      },

      // CATEGORY (GROUPED DROPDOWN)
      {
        accessorKey: "category_id",
        header: "Category",
        cell: ({ row }: any) => {
          const p = row.original;

          return (
            <select
              defaultValue={p.category_id}
              onChange={(e) =>
                saveInline(p.id, "category_id", Number(e.target.value))
              }
              className="border dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1 text-sm"
            >
              <option value="">Select...</option>

              {groupedCats.level1.map((parent) => (
                <optgroup key={parent.id} label={parent.name}>
                  {groupedCats.level2Map[parent.id]?.map((child) => (
                    <option key={child.id} value={child.id}>
                      &nbsp;&nbsp;{child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          );
        },
      },

      // IN STOCK
      {
        accessorKey: "in_stock",
        header: "Stock",
        cell: ({ row }: any) => {
          const p = row.original;
          return (
            <button
              onClick={() =>
                saveInline(p.id, "in_stock", !p.in_stock)
              }
              className={`px-3 py-1 rounded text-white ${
                p.in_stock ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {p.in_stock ? "In" : "Out"}
            </button>
          );
        },
      },

      // ACTIONS
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => {
          const p = row.original;

          return (
            <div className="flex gap-2">
              <button
                className="p-1 bg-blue-600 text-white rounded"
                onClick={() => setShowSaleModal(p)}
              >
                <Tag size={16} />
              </button>

              <button
                className="p-1 bg-red-600 text-white rounded"
                onClick={() => setDeleteConfirm(p.id)}
              >
                <Trash size={16} />
              </button>
            </div>
          );
        },
      },
    ],
    [products, selected, groupedCats, uploadingId]
  );

  // Table instance -----------------------------------------
  const [sorting, setSorting] = useState([]);

const table = useReactTable({
  data: products,
  columns,
  state: {
    sorting,
    globalFilter: search,
  },
  onSortingChange: setSorting,
  onGlobalFilterChange: setSearch,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
});


  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="p-4 dark:text-white">
      {/* Header */}
      <div className="flex justify-between mb-4">
        <div className="flex gap-3">
          <input
            placeholder="Search..."
            className="border dark:border-gray-700 rounded px-3 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ColumnVisibilityMenu
            allColumns={table
              .getAllLeafColumns()
              .map((col) => ({
                id: col.id,
                label: col.id.toUpperCase(),
                visible: col.getIsVisible(),
                toggle: () => col.toggleVisibility(),
              }))}
          />
        </div>

        <DarkModeToggle />
      </div>

      {/* BULK ACTIONS */}
      {selected.length > 0 && (
        <div className="mb-3 flex gap-3">
          <button
            onClick={bulkDelete}
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            Delete Selected ({selected.length})
          </button>

          <button
            onClick={bulkRemoveSale}
            className="bg-yellow-600 text-white px-3 py-1 rounded"
          >
            Remove Sale ({selected.length})
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto border dark:border-gray-700 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-t dark:border-gray-700"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {showSaleModal && (
        <SaleModal
          product={showSaleModal}
          onClose={() => setShowSaleModal(null)}
          onSaved={load}
        />
      )}

      {deleteConfirm && (
        <DeleteDialog
          id={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            await supabase.from("products").delete().eq("id", deleteConfirm);
            setDeleteConfirm(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ===================================================================
// DELETE DIALOG
// ===================================================================

function DeleteDialog({ id, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded w-80 space-y-4 border dark:border-gray-700">
        <h2 className="text-lg font-semibold">Delete Product?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete product ID #{id}?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1 border rounded dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
