
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
export function useAdminLeads(params?: unknown) {
    return { data: { data: [], count: 0 }, isLoading: false };
}
export function useLeadMutations() {
    return {
        create: useMutation({ mutationFn: async (vars: unknown) => ({}) }),
        update: useMutation({ mutationFn: async (vars: unknown) => ({}) })
    };
}
export function useBulkUpdateLeadStatus() {
    return useMutation({ mutationFn: async (vars: unknown) => ({}) });
}
export function useBulkAssignLeads() {
    return useMutation({ mutationFn: async (vars: unknown) => ({}) });
}
export function useLeadStatusHistory(leadId: string) {
    return { data: [], isLoading: false };
}
