import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AI_LENGTHS,
  AI_TONES,
  useAiSettings,
  useDeleteAllJournalHistory,
  useSaveAiSettings,
} from "@/lib/wellbeing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AiSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: settings } = useAiSettings();
  const save = useSaveAiSettings();
  const wipe = useDeleteAllJournalHistory();

  const [name, setName] = useState("Counsel");
  const [tone, setTone] = useState<string>("grounded");
  const [directness, setDirectness] = useState(4);
  const [length, setLength] = useState<string>("short");
  const [instructions, setInstructions] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmWipe(false);
      return;
    }
    setName(settings?.assistant_name ?? "Counsel");
    setTone(settings?.tone ?? "grounded");
    setDirectness(settings?.directness ?? 4);
    setLength(settings?.reply_length ?? "short");
    setInstructions(settings?.custom_instructions ?? "");
  }, [open, settings]);

  async function submit() {
    try {
      await save.mutateAsync({
        assistant_name: name.trim() || "Counsel",
        tone,
        directness,
        reply_length: length,
        custom_instructions: instructions.trim() || null,
      });
      toast.success("Assistant updated.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save those settings.");
    }
  }

  async function wipeAll() {
    try {
      await wipe.mutateAsync();
      toast.success("All journal history deleted.");
      setConfirmWipe(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete history.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize your assistant</DialogTitle>
          <DialogDescription>
            Shapes how it talks to you in the journal and in weekly reflections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <Input
              className="mt-2"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Counsel"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Tone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                    tone === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Directness</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDirectness(v)}
                  className={`size-8 rounded-full border font-mono text-xs transition-colors ${
                    directness === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">1 = gentle · 5 = blunt</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Reply length</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_LENGTHS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                    length === l
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Custom instructions</p>
            <Textarea
              className="mt-2 min-h-24"
              maxLength={2000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should it know about you, and how should it push you?"
            />
          </div>

          <div className="rounded-lg border border-destructive/30 p-4">
            <p className="text-sm font-medium">Delete all journal history</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Removes every check-in and every conversation. This cannot be undone.
            </p>
            {confirmWipe ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={wipe.isPending}
                  onClick={() => void wipeAll()}
                >
                  Yes, delete everything
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmWipe(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setConfirmWipe(true)}
              >
                Delete history
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
