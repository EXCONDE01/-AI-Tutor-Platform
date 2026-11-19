"use client";

import * as React from "react";
import { Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (joinCode: string) => Promise<{ success: boolean; className?: string; error?: string }>;
}

export function JoinClassDialog({ open, onOpenChange, onJoin }: JoinClassDialogProps) {
  const [joinCode, setJoinCode] = React.useState("");
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;

    setJoining(true);
    setError(null);

    try {
      const result = await onJoin(code);
      if (result.success) {
        setJoinCode("");
        onOpenChange(false);
        // Success toast handled by parent
      } else {
        setError(result.error || "Failed to join class");
      }
    } catch {
      setError("Failed to join class");
    } finally {
      setJoining(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s+/g, "");
    setJoinCode(value);
    if (error) setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
          <DialogDescription>
            Enter the join code provided by your teacher. Codes are typically 8-12 characters.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Join Code</Label>
            <div className="relative">
              <Input
                id="join-code"
                value={joinCode}
                onChange={handleChange}
                placeholder="e.g. ABC123XY"
                maxLength={12}
                required
                disabled={joining}
                className="pr-10 text-center text-lg tracking-widest"
                autoComplete="off"
                autoFocus
              />
              {joining && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={joining}>
              Cancel
            </Button>
            <Button type="submit" disabled={joining || !joinCode.trim()}>
              {joining ? "Joining..." : "Join Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}