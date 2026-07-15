import type { Tables, Inserts, Updates } from "@/types/database";

export type CRMLead = Record<string, unknown>; // Stubbed for now since crm_leads table was removed
export type CRMLeadNote = Record<string, unknown>;

export type LeadFilters = {
  status?: string;
  source?: string;
  assigned_to?: string;
  search?: string;
};

export type PaginatedLeads = {
  data: CRMLead[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listLeads(
  page: number = 1,
  pageSize: number = 10,
  filters?: LeadFilters
): Promise<PaginatedLeads> {
  return {
    data: [],
    count: 0,
    page,
    pageSize,
    totalPages: 0,
  };
}

export async function getLead(id: string): Promise<CRMLead> {
  throw new Error("CRM not supported by current schema.");
}

export async function createLead(data: unknown): Promise<CRMLead> {
  throw new Error("CRM not supported by current schema.");
}

export async function updateLead(id: string, data: unknown): Promise<CRMLead> {
  throw new Error("CRM not supported by current schema.");
}

export async function getLeadNotes(leadId: string): Promise<CRMLeadNote[]> {
  return [];
}

export async function addLeadNote(leadId: string, note: string): Promise<CRMLeadNote> {
  throw new Error("CRM not supported by current schema.");
}

export type LeadListParams = Record<string, unknown>;


export const assignLead = async (id: string, userId: string) => {};
export const changeLeadStatus = async (id: string, status: string) => {};
