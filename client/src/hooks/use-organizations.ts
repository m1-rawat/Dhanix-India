import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

export function useOrganizations() {
  return useQuery({
    queryKey: [api.organizations.list.path],
    queryFn: async () => {
      const res = await fetch(api.organizations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return api.organizations.list.responses[200].parse(await res.json());
    },
  });
}

export function useOrganization(id: number) {
  return useQuery({
    queryKey: [api.organizations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.organizations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch organization");
      return api.organizations.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.organizations.create.input>) => {
      const res = await fetch(api.organizations.create.path, {
        method: api.organizations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create organization");
      return api.organizations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizations.list.path] });
      toast({ title: "Organization created" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
