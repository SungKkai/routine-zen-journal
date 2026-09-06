import { toast } from "sonner";
import { shareUrl, useCreateGoalShare, useGoalShares, useRevokeGoalShare } from "@/lib/share";
import { Button } from "@/components/ui/button";

/** Creates, copies and revokes a read-only public link for one goal. */
export function GoalShare({ goalId }: { goalId: string }) {
  const { data: shares = [] } = useGoalShares();
  const create = useCreateGoalShare();
  const revoke = useRevokeGoalShare();
  const share = shares.find((s) => s.goal_id === goalId);

  async function copy(token: string) {
    const url = shareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.message(url);
    }
  }

  async function enable() {
    try {
      const created = await create.mutateAsync(goalId);
      await copy(created.token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create a link.");
    }
  }

  if (!share) {
    return (
      <Button size="sm" variant="ghost" onClick={() => void enable()} disabled={create.isPending}>
        Share
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => void copy(share.token)}>
        Copy link
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() =>
          revoke
            .mutateAsync(goalId)
            .then(() => toast.success("Link revoked."))
            .catch((e: unknown) =>
              toast.error(e instanceof Error ? e.message : "Couldn't revoke that link."),
            )
        }
      >
        Revoke
      </Button>
    </span>
  );
}
