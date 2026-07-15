import React from "react";
import { UserPlus, Download } from "lucide-react";
const AdminHeader = (props: { title: string; description?: string; action?: React.ReactNode }) => <div>{props.title}</div>;

export default function AdminCRMPage() {
  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AdminHeader
        title="CRM & Leads"
        description="Manage prospective students and sales pipeline"
        action={
          <div className="flex items-center gap-3">
            <button
              disabled
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              disabled
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Add Lead
            </button>
          </div>
        }
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
            <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">CRM Module Disabled</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The CRM features are currently unavailable as the underlying services and data models have been deprecated in this version.
          </p>
        </div>
      </div>
    </div>
  );
}
