import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

export function usePayrollRuns(companyId: number) {
  return useQuery({
    queryKey: [api.payroll.listRuns.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.payroll.listRuns.path, { companyId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payroll runs");
      return api.payroll.listRuns.responses[200].parse(await res.json());
    },
    enabled: !!companyId,
  });
}

export function usePayrollRun(id: number) {
  return useQuery({
    queryKey: [api.payroll.getRun.path, id],
    queryFn: async () => {
      const url = buildUrl(api.payroll.getRun.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payroll run details");
      return api.payroll.getRun.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ companyId, ...data }: { companyId: number } & z.infer<typeof api.payroll.createRun.input>) => {
      const url = buildUrl(api.payroll.createRun.path, { companyId });
      const res = await fetch(url, {
        method: api.payroll.createRun.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create payroll run");
      return api.payroll.createRun.responses[201].parse(await res.json());
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.payroll.listRuns.path, vars.companyId] });
      toast({ title: "Payroll run created" });
    },
  });
}

export function useCalculatePayrollRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.payroll.calculateRun.path, { id });
      const res = await fetch(url, { method: api.payroll.calculateRun.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to calculate payroll");
      return api.payroll.calculateRun.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.payroll.getRun.path, id] });
      toast({ title: "Calculations updated" });
    },
  });
}

export function useUpdatePayrollItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & z.infer<typeof api.payroll.updateItem.input>) => {
      const url = buildUrl(api.payroll.updateItem.path, { id });
      const res = await fetch(url, {
        method: api.payroll.updateItem.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return api.payroll.updateItem.responses[200].parse(await res.json());
    },
    onSuccess: (_, vars) => {
      // Invalidate the run that this item belongs to. Ideally we'd know the run ID here.
      // For now, we rely on refetching the details view which will re-load the items.
      queryClient.invalidateQueries({ queryKey: [api.payroll.getRun.path] });
      toast({ title: "Item updated" });
    },
  });
}

export function useLockPayrollRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.payroll.lockRun.path, { id });
      const res = await fetch(url, { method: api.payroll.lockRun.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to lock payroll run");
      return api.payroll.lockRun.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.payroll.listRuns.path] });
      queryClient.invalidateQueries({ queryKey: [api.payroll.getRun.path, id] });
      toast({ title: "Payroll run finalized and locked" });
    },
  });
}

export function useProcessPayrollRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.payroll.processRun.path, { id });
      const res = await fetch(url, { method: api.payroll.processRun.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to process payroll");
      return api.payroll.processRun.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.payroll.listRuns.path] });
      queryClient.invalidateQueries({ queryKey: [api.payroll.getRun.path, id] });
      toast({ title: "Payroll processed successfully", description: "All calculations are saved and the run is marked as completed." });
    },
  });
}
