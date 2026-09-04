import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  CircleDollarSign,
  LayoutDashboard,
  Loader2,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Workflow,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { listStudents } from "@/services/students.service"
import { listMentors } from "@/services/mentors.service"
import { listCourses } from "@/services/courses.service"
import { crmService } from "@/services/crm.service"
import { paymentService } from "@/services/payment.service"

/** Debounces a fast-changing value so search queries don't fire on every keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const navigate = useNavigate()
  const searchEnabled = debouncedQuery.length >= 2

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    setQuery("")
    command()
  }, [])

  const studentsQuery = useQuery({
    queryKey: ["universal-search", "students", debouncedQuery],
    queryFn: () => listStudents({ search: debouncedQuery, pageSize: 5 }),
    enabled: searchEnabled,
  })
  const mentorsQuery = useQuery({
    queryKey: ["universal-search", "mentors", debouncedQuery],
    queryFn: () => listMentors({ search: debouncedQuery, pageSize: 5 }),
    enabled: searchEnabled,
  })
  const coursesQuery = useQuery({
    queryKey: ["universal-search", "courses", debouncedQuery],
    queryFn: () => listCourses({ search: debouncedQuery, pageSize: 5 }),
    enabled: searchEnabled,
  })
  const leadsQuery = useQuery({
    queryKey: ["universal-search", "leads", debouncedQuery],
    queryFn: () => crmService.listLeads({ search: debouncedQuery, pageSize: 5 }),
    enabled: searchEnabled,
  })
  const paymentsQuery = useQuery({
    queryKey: ["universal-search", "payments", debouncedQuery],
    queryFn: () => paymentService.getAdminPayments(1, 5, debouncedQuery),
    enabled: searchEnabled,
  })

  const isSearching =
    searchEnabled &&
    (studentsQuery.isFetching || mentorsQuery.isFetching || coursesQuery.isFetching || leadsQuery.isFetching || paymentsQuery.isFetching)

  const students = studentsQuery.data?.data ?? []
  const mentors = mentorsQuery.data?.data ?? []
  const courses = coursesQuery.data?.data ?? []
  const leads = leadsQuery.data?.success ? leadsQuery.data.data.data : []
  const payments = paymentsQuery.data?.success ? paymentsQuery.data.data.data : []

  const hasAnyResults =
    students.length > 0 || mentors.length > 0 || courses.length > 0 || leads.length > 0 || payments.length > 0
  const resultCount = students.length + mentors.length + courses.length + leads.length + payments.length

  const searchStatusMessage = !searchEnabled
    ? ""
    : isSearching && !hasAnyResults
      ? "Searching…"
      : !isSearching && !hasAnyResults
        ? "No results found."
        : !isSearching && hasAnyResults
          ? `${resultCount} result${resultCount === 1 ? "" : "s"} found.`
          : ""

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        placeholder="Search students, mentors, courses, payments, leads..."
        value={query}
        onValueChange={setQuery}
      />
      <div role="status" aria-live="polite" className="sr-only">
        {searchStatusMessage}
      </div>
      <CommandList>
        {searchEnabled ? (
          <>
            {isSearching && !hasAnyResults && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" aria-hidden="true">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Searching...
              </div>
            )}
            {!isSearching && !hasAnyResults && <CommandEmpty>No results found.</CommandEmpty>}

            {students.length > 0 && (
              <CommandGroup heading="Students">
                {students.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => { runCommand(() => { void navigate(`/admin/students?search=${encodeURIComponent(s.full_name || s.email)}`) }) }}
                  >
                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{s.full_name || "Unnamed student"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {mentors.length > 0 && (
              <CommandGroup heading="Teachers">
                {mentors.map((m) => (
                  <CommandItem
                    key={m.id}
                    onSelect={() => { runCommand(() => { void navigate(`/admin/users/teachers?search=${encodeURIComponent(m.name || m.email || "")}`) }) }}
                  >
                    <BriefcaseBusiness className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{m.name || "Unnamed teacher"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {courses.length > 0 && (
              <CommandGroup heading="Courses">
                {courses.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => { runCommand(() => { void navigate(`/admin/courses?search=${encodeURIComponent(c.title)}`) }) }}
                  >
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{c.title}</span>
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{c.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {leads.length > 0 && (
              <CommandGroup heading="CRM Leads">
                {leads.map((l) => (
                  <CommandItem
                    key={l.id}
                    onSelect={() => { runCommand(() => { void navigate("/admin/crm/leads") }) }}
                  >
                    <Workflow className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{l.name}</span>
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{l.status.replace("_", " ")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {payments.length > 0 && (
              <CommandGroup heading="Payments & Orders">
                {payments.map((p) => (
                  <CommandItem
                    key={p.id as string}
                    onSelect={() => { runCommand(() => { void navigate("/admin/commerce/payments") }) }}
                  >
                    <CircleDollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span className="font-mono text-xs">{((p.razorpay_payment_id as string) ?? (p.id as string))?.slice(0, 18)}</span>
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{p.status as string}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Quick Access">
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin"); }); }}>
                <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Admin Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users"); }); }}>
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Manage Users</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/courses"); }); }}>
                <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Courses</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Management">
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users/teachers"); }); }}>
                <BriefcaseBusiness className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Teachers</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users/counsellors"); }); }}>
                <UserCog className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Counsellors</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/students"); }); }}>
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Students</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/analytics"); }); }}>
                <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Analytics</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="System">
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/settings"); }); }}>
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Settings</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users/roles"); }); }}>
                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Roles & Permissions</span>
              </CommandItem>
              <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/students/certificates"); }); }}>
                <Award className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Certificates</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
