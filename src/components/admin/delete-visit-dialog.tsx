"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteVisit } from "@/lib/actions/visits";

interface Visit {
  id: string;
  staff_name: string;
  discipline: string;
  scheduled_date: string;
}

export function DeleteVisitDialog({ visit }: { visit: Visit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    setError(null);

    startTransition(async () => {
      try {
        await deleteVisit(visit.id);
        router.refresh();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message || "Failed to delete visit");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Visit</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this visit?
            <div className="mt-3 p-3 rounded-md bg-muted text-sm">
              <div><strong>Staff:</strong> {visit.staff_name}</div>
              <div><strong>Discipline:</strong> {visit.discipline}</div>
              <div><strong>Date:</strong> {new Date(visit.scheduled_date).toLocaleDateString()}</div>
            </div>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting..." : "Delete Visit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
