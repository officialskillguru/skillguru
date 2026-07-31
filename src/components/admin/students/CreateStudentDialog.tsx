import { useId, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useStudentMutations } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateStudentResult } from "@/services/students.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateStudentDialog() {
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreateStudentResult | null>(null);

  const mutations = useStudentMutations();

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNameError(null);
    setEmailError(null);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    let hasError = false;
    if (!trimmedName) {
      setNameError("Full name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      hasError = true;
    } else {
      setEmailError(null);
    }
    if (hasError) return;

    mutations.create.mutate(
      { name: trimmedName, email: trimmedEmail, phone: phone.trim() || undefined },
      {
        onSuccess: (result) => {
          toast.success(`Student "${trimmedName}" added successfully.`);
          setOpen(false);
          resetForm();
          setCreatedCredentials(result);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create student."),
      }
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" className="gap-2">
            <Plus className="size-4" aria-hidden="true" />
            Add Student
          </Button>
        </DialogTrigger>
        <DialogContent onCloseAutoFocus={(e) => { if (createdCredentials) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Add a New Student</DialogTitle>
            <DialogDescription>
              Creates a real login account. There&apos;s no email delivery configured yet, so you&apos;ll need to share the generated credentials with the student directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={nameId}>Full Name</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                required
                aria-required="true"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? `${nameId}-error` : undefined}
              />
              {nameError && (
                <p id={`${nameId}-error`} role="alert" className="text-xs font-semibold text-destructive-text">
                  {nameError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={emailId}>Email Address</Label>
              <Input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                aria-required="true"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
              />
              {emailError && (
                <p id={`${emailId}-error`} role="alert" className="text-xs font-semibold text-destructive-text">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={phoneId}>Phone (optional)</Label>
              <Input
                id={phoneId}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutations.create.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={mutations.create.isPending}
              aria-busy={mutations.create.isPending}
              className="gap-2"
            >
              {mutations.create.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creating student…
                </>
              ) : (
                "Add Student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={(next) => { if (!next) setCreatedCredentials(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Account Created</DialogTitle>
            <DialogDescription>
              There is no email delivery configured yet — share these credentials with{" "}
              <span className="font-bold text-foreground">{createdCredentials?.fullName}</span> directly. This password will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials && (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Email</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">{createdCredentials.email}</span>
                  <button
                    type="button"
                    onClick={() => { void navigator.clipboard.writeText(createdCredentials.email); toast.success("Email copied"); }}
                    aria-label="Copy email address"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Temporary Password</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
                  <span className="flex-1 truncate font-mono text-sm font-semibold text-foreground">{createdCredentials.temporaryPassword}</span>
                  <button
                    type="button"
                    onClick={() => { void navigator.clipboard.writeText(createdCredentials.temporaryPassword); toast.success("Password copied"); }}
                    aria-label="Copy temporary password"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setCreatedCredentials(null)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
