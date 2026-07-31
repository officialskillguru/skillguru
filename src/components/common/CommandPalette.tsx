import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
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

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

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
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search students, courses, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Access">
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin"); }); }}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Admin Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users"); }); }}>
            <Users className="mr-2 h-4 w-4" />
            <span>Manage Users</span>
          </CommandItem>
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/courses"); }); }}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Courses</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Management">
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users/mentors"); }); }}>
            <BriefcaseBusiness className="mr-2 h-4 w-4" />
            <span>Mentors</span>
          </CommandItem>
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/students"); }); }}>
            <Users className="mr-2 h-4 w-4" />
            <span>Students</span>
          </CommandItem>
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/analytics"); }); }}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="System">
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/settings"); }); }}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => { runCommand(() => { void navigate("/admin/users/roles"); }); }}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>Roles & Permissions</span>
          </CommandItem>
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  )
}
