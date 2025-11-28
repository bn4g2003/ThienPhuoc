import { useQuery } from "@tanstack/react-query";
import { roleService, branchService } from "@/services/commonService";

export const ROLE_KEYS = {
  all: ["roles"] as const,
  lists: () => [...ROLE_KEYS.all, "list"] as const,
};

export const BRANCH_KEYS = {
  all: ["branches"] as const,
  lists: () => [...BRANCH_KEYS.all, "list"] as const,
};

// Hook để fetch tất cả roles
export function useRoles() {
  return useQuery({
    queryKey: ROLE_KEYS.lists(),
    queryFn: roleService.getAll,
  });
}

// Hook để fetch tất cả branches
export function useBranches() {
  return useQuery({
    queryKey: BRANCH_KEYS.lists(),
    queryFn: branchService.getAll,
  });
}
