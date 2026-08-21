import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useProfile,
  useUpdateProfile,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Kronos" },
      { name: "description", content: "Manage your profile and task categories." },
      { property: "og:title", content: "Settings — Kronos" },
      { property: "og:description", content: "Manage your profile and task categories." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const DEFAULT_COLOR = "#c2410c";

function SettingsPage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [displayName, setDisplayName] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({ display_name: displayName.trim() || null });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that.");
    }
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newName.trim(), color: newColor });
      setNewName("");
      setNewColor(DEFAULT_COLOR);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add that category.");
    }
  }

  return (
    <div className="enter max-w-2xl space-y-12">
      <header>
        <p className="label-mono text-accent">(04) Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Settings</h1>
      </header>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="label-mono text-muted-foreground">Profile</h2>
        <form onSubmit={saveProfile} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex"
            />
          </div>
          <Button type="submit" disabled={updateProfile.isPending}>
            Save
          </Button>
        </form>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="label-mono text-muted-foreground">Categories</h2>
        <ul className="divide-y divide-border border-y border-border">
          {categories.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No categories yet.</li>
          )}
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 py-3">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: category.color ?? DEFAULT_COLOR }}
              />
              <span className="flex-1 text-sm">{category.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void deleteCategory.mutateAsync(category.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>

        <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="category-name">New category</Label>
            <Input
              id="category-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Study"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-color">Color</Label>
            <Input
              id="category-color"
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-10 w-16 p-1"
            />
          </div>
          <Button type="submit" disabled={createCategory.isPending}>
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}
