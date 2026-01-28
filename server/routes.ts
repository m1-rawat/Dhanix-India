import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport)
  setupAuth(app);

  // Middleware to ensure authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // === AUTH ===
  // Handled by setupAuth mostly, but adding explicit routes if needed for frontend consistency with api contract
  // 'setupAuth' usually sets up /api/register, /api/login, /api/logout, /api/user. 
  // We'll rely on setupAuth for implementation but ensure they match our API contract.

  // === ORGANIZATIONS ===
  app.get(api.organizations.list.path, requireAuth, async (req, res) => {
    const orgs = await storage.getOrganizationsForUser((req.user as any).id);
    res.json(orgs);
  });

  app.post(api.organizations.create.path, requireAuth, async (req, res) => {
    const input = api.organizations.create.input.parse(req.body);
    const org = await storage.createOrganization((req.user as any).id, input);
    res.status(201).json(org);
  });

  app.get(api.organizations.get.path, requireAuth, async (req, res) => {
    const org = await storage.getOrganization(Number(req.params.id));
    if (!org) return res.status(404).json({ message: "Organization not found" });
    // TODO: Check if user is member of org
    res.json(org);
  });

  // === DASHBOARD STATS ===
  app.get("/api/orgs/:orgId/dashboard-stats", requireAuth, async (req, res) => {
    const orgId = Number(req.params.orgId);
    const companies = await storage.getCompanies(orgId);
    
    let totalEmployees = 0;
    let pendingPayrolls = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    for (const company of companies) {
      const emps = await storage.getEmployees(company.id);
      totalEmployees += emps.filter(e => e.isActive).length;
      
      const runs = await storage.getPayrollRuns(company.id);
      const currentMonthRuns = runs.filter(r => r.month === currentMonth);
      const hasDraftOrProcessing = currentMonthRuns.some(r => r.status === "DRAFT" || r.status === "PROCESSING");
      const hasNoRun = currentMonthRuns.length === 0;
      if (hasDraftOrProcessing || hasNoRun) {
        pendingPayrolls++;
      }
    }
    
    res.json({
      totalCompanies: companies.length,
      totalEmployees,
      pendingPayrolls,
      currentMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    });
  });

  // === COMPANIES ===
  app.get(api.companies.list.path, requireAuth, async (req, res) => {
    const companies = await storage.getCompanies(Number(req.params.orgId));
    res.json(companies);
  });

  app.post(api.companies.create.path, requireAuth, async (req, res) => {
    const input = api.companies.create.input.parse(req.body);
    const company = await storage.createCompany({ ...input, organizationId: Number(req.params.orgId) });
    res.status(201).json(company);
  });

  app.get(api.companies.get.path, requireAuth, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  });

  app.patch(api.companies.update.path, requireAuth, async (req, res) => {
    const input = api.companies.update.input.parse(req.body);
    const company = await storage.updateCompany(Number(req.params.id), input);
    res.json(company);
  });

  // === EMPLOYEES ===
  app.get(api.employees.list.path, requireAuth, async (req, res) => {
    const employees = await storage.getEmployees(Number(req.params.companyId));
    // Filter by search if needed (simple in-memory filter for MVP)
    const search = req.query.search as string;
    if (search) {
      const lowerSearch = search.toLowerCase();
      const filtered = employees.filter(e => 
        e.firstName.toLowerCase().includes(lowerSearch) || 
        e.lastName.toLowerCase().includes(lowerSearch) ||
        e.employeeCode.toLowerCase().includes(lowerSearch)
      );
      return res.json(filtered);
    }
    res.json(employees);
  });

  app.post(api.employees.create.path, requireAuth, async (req, res) => {
    const body = { ...req.body };
    if (body.dateOfJoining && typeof body.dateOfJoining === 'string') {
      body.dateOfJoining = new Date(body.dateOfJoining);
    }
    const input = api.employees.create.input.parse(body);
    const employee = await storage.createEmployee({ ...input, companyId: Number(req.params.companyId) });
    res.status(201).json(employee);
  });

  app.get(api.employees.get.path, requireAuth, async (req, res) => {
    const employee = await storage.getEmployee(Number(req.params.id));
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.patch(api.employees.update.path, requireAuth, async (req, res) => {
    const body = { ...req.body };
    if (body.dateOfJoining && typeof body.dateOfJoining === 'string') {
      body.dateOfJoining = new Date(body.dateOfJoining);
    }
    const input = api.employees.update.input.parse(body);
    const employee = await storage.updateEmployee(Number(req.params.id), input);
    res.json(employee);
  });

  // === PAYROLL RUNS ===
  app.get(api.payroll.listRuns.path, requireAuth, async (req, res) => {
    const runs = await storage.getPayrollRuns(Number(req.params.companyId));
    res.json(runs);
  });

  app.post(api.payroll.createRun.path, requireAuth, async (req, res) => {
    const input = api.payroll.createRun.input.parse(req.body);
    
    // Create the run
    const run = await storage.createPayrollRun({ 
      ...input, 
      companyId: Number(req.params.companyId),
      status: "DRAFT"
    });

    // Populate with employees (Draft items)
    const employees = await storage.getEmployees(Number(req.params.companyId));
    
    for (const emp of employees) {
      // Only include active employees
      if (emp.isActive === false) continue;
      
      // Snapshot salary components from employee
      const basicSalary = emp.fixedBasicSalary || "0";
      const hra = emp.fixedHra || "0";
      const specialAllowance = emp.fixedSpecialAllowance || "0";
      
      await storage.createPayrollItem({
        payrollRunId: run.id,
        employeeId: emp.id,
        daysWorked: "30",
        totalDays: "30",
        lopDays: "0",
        basicSalary,
        hra,
        specialAllowance,
        grossSalary: "0",
        netSalary: "0",
        pfEmployee: "0",
        pfEmployer: "0",
        esiEmployee: "0",
        esiEmployer: "0",
        otherDeductions: "0",
      });
    }

    res.status(201).json(run);
  });

  app.get(api.payroll.getRun.path, requireAuth, async (req, res) => {
    const run = await storage.getPayrollRun(Number(req.params.id));
    if (!run) return res.status(404).json({ message: "Run not found" });
    
    const items = await storage.getPayrollItems(run.id);
    
    // Enrich items with employee data
    const itemsWithEmployees = await Promise.all(
      items.map(async (item) => {
        const employee = await storage.getEmployee(item.employeeId);
        return { ...item, employee };
      })
    );
    
    // Also get company info for navigation
    const company = await storage.getCompany(run.companyId);
    
    res.json({ ...run, items: itemsWithEmployees, company });
  });

  app.patch(api.payroll.updateItem.path, requireAuth, async (req, res) => {
    const input = api.payroll.updateItem.input.parse(req.body);
    // Convert numeric inputs to strings for storage
    const updateData: Record<string, string> = {};
    if (input.daysWorked !== undefined) updateData.daysWorked = String(input.daysWorked);
    if (input.lopDays !== undefined) updateData.lopDays = String(input.lopDays);
    if (input.otherDeductions !== undefined) updateData.otherDeductions = String(input.otherDeductions);
    
    const item = await storage.updatePayrollItem(Number(req.params.id), updateData);
    
    // Auto-recalculate? Or wait for "Calculate" button?
    // Let's auto-calculate single item here for better UX
    await calculatePayrollItem(item.id);
    const updatedItem = await storage.getPayrollItem(item.id);
    
    res.json(updatedItem);
  });

  app.post(api.payroll.calculateRun.path, requireAuth, async (req, res) => {
    const runId = Number(req.params.id);
    const items = await storage.getPayrollItems(runId);
    
    for (const item of items) {
      await calculatePayrollItem(item.id);
    }
    
    res.json({ message: "Calculation complete" });
  });
  
  app.post(api.payroll.lockRun.path, requireAuth, async (req, res) => {
    const run = await storage.updatePayrollRun(Number(req.params.id), { status: "LOCKED" });
    res.json(run);
  });

  app.post(api.payroll.processRun.path, requireAuth, async (req, res) => {
    const runId = Number(req.params.id);
    const items = await storage.getPayrollItems(runId);
    
    // Calculate all items with proper PF/ESI rules
    for (const item of items) {
      await calculatePayrollItem(item.id);
    }
    
    // Mark run as COMPLETED
    const run = await storage.updatePayrollRun(runId, { status: "COMPLETED" });
    res.json(run);
  });

  return httpServer;
}

// Helper for Calculation Logic with Indian PF/ESI rules
async function calculatePayrollItem(itemId: number) {
  const item = await storage.getPayrollItem(itemId);
  if (!item) return;
  const employee = await storage.getEmployee(item.employeeId);
  if (!employee) return;

  const paidDays = parseFloat(item.daysWorked as string) || 0;
  const totalDays = parseFloat(item.totalDays as string) || 30;
  
  // Use snapshotted salary components from payroll item
  const fixedBasic = parseFloat(item.basicSalary as string) || 0;
  const fixedHra = parseFloat(item.hra as string) || 0;
  const fixedSpecialAllowance = parseFloat(item.specialAllowance as string) || 0;
  
  // Pro-rating factor based on paid days
  const payoutRatio = totalDays > 0 ? paidDays / totalDays : 0;
  
  // Earned components
  const earnedBasic = fixedBasic * payoutRatio;
  const earnedHra = fixedHra * payoutRatio;
  const earnedSpecialAllowance = fixedSpecialAllowance * payoutRatio;
  const gross = earnedBasic + earnedHra + earnedSpecialAllowance;
  
  // PF Calculation (12% of Basic, but wages capped at 15000 as per Indian rules)
  let pfEmployee = 0;
  let pfEmployer = 0;
  if (employee.isPfApplicable) {
    // Cap the basic for PF calculation at 15000
    const pfWages = Math.min(earnedBasic, 15000 * payoutRatio);
    pfEmployee = pfWages * 0.12;
    pfEmployer = pfWages * 0.12;
  }
  
  // ESI Calculation (0.75% Employee on Gross, only if gross < 21000)
  let esiEmployee = 0;
  let esiEmployer = 0;
  if (employee.isEsiApplicable && gross < 21000) {
    esiEmployee = gross * 0.0075;
    esiEmployer = gross * 0.0325;
  }
  
  const otherDeductions = parseFloat(item.otherDeductions as string) || 0;
  const totalDeductions = pfEmployee + esiEmployee + otherDeductions;
  
  const net = gross - totalDeductions;
  
  await storage.updatePayrollItem(itemId, {
    grossSalary: gross.toFixed(2),
    netSalary: net.toFixed(2),
    pfEmployee: pfEmployee.toFixed(2),
    pfEmployer: pfEmployer.toFixed(2),
    esiEmployee: esiEmployee.toFixed(2),
    esiEmployer: esiEmployer.toFixed(2),
  });
}

// Seed Data
async function seedData() {
  const existingUser = await storage.getUserByUsername("demo@dhanix.com");
  if (existingUser) return;

  // Use the same hash logic as auth.ts or just rely on register endpoint.
  // Since we don't have access to hashPassword here without importing from auth.ts (which isn't exported),
  // we might want to skip auto-seeding user for now or export hashPassword.
  // Let's rely on manual registration as it's safer than duplicating hash logic.
  console.log("No seed data created. Please register a user.");
}

// Call seed in registerRoutes
seedData();
