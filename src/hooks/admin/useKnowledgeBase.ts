import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listKnowledgeDocuments,
  getKnowledgeBaseStats,
  setKnowledgeDocumentActive,
  syncKnowledgeBase,
  type KnowledgeDocumentListParams,
  type KnowledgeSyncSource,
} from "@/services/knowledge-base.service";

const knowledgeBaseKeys = {
  documents: (params: KnowledgeDocumentListParams) => ["admin", "knowledge-base", "documents", params] as const,
  stats: ["admin", "knowledge-base", "stats"] as const,
};

export function useKnowledgeDocuments(params: KnowledgeDocumentListParams = {}) {
  return useQuery({
    queryKey: knowledgeBaseKeys.documents(params),
    queryFn: () => listKnowledgeDocuments(params),
  });
}

export function useKnowledgeBaseStats() {
  return useQuery({
    queryKey: knowledgeBaseKeys.stats,
    queryFn: getKnowledgeBaseStats,
  });
}

export function useSetKnowledgeDocumentActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setKnowledgeDocumentActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "knowledge-base"] });
    },
  });
}

export function useSyncKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sources?: KnowledgeSyncSource[]) => syncKnowledgeBase(sources),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "knowledge-base"] });
    },
  });
}
