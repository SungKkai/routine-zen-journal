import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type Category,
} from "@/lib/data";

export const CATEGORY_SWATCHES = [
  "#c2410c",
  "#b45309",
  "#4d7c0f",
  "#0f766e",
  "#1d4ed8",
  "#6d28d9",
  "#be123c",
  "#475569",
];

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onCreated?: (category: Category) => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_SWATCHES[0]!);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? CATEGORY_SWATCHES[0]!);
  }, [open, category]);

  const saving = createCategory.isPending || updateCategory.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, name: name.trim(), color });
        toast.success("Category updated.");
      } else {
        const created = await createCategory.mutateAsync({ name: name.trim(), color });
        toast.success("Category added.");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that category.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Name it and pick a colour for the calendar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Study"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use colour ${swatch}`}
                  onClick={() => setColor(swatch)}
                  className={`size-7 rounded-full border-2 transition-transform ${
                    color === swatch ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
              <Input
                type="color"
                aria-label="Custom colour"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 p-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {category && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await deleteCategory.mutateAsync(category.id);
                    toast.success("Category deleted.");
                    onOpenChange(false);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : category ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
