import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

export function useEmployees(companyId: number) {
  return useQuery({
    queryKey: [api.employees.list.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.employees.list.path, { companyId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return api.employees.list.responses[200].parse(await res.json());
    },
    enabled: !!companyId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ companyId, ...data }: { companyId: number } & z.infer<typeof api.employees.create.input>) => {
      const url = buildUrl(api.employees.create.path, { companyId });
      const res = await fetch(url, {
        method: api.employees.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add employee");
      return api.employees.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path, variables.companyId] });
      toast({ title: "Employee added successfully" });
    },
  });
}
