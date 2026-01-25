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
    const input = api.employees.create.input.parse(req.body);
    const employee = await storage.createEmployee({ ...input, companyId: Number(req.params.companyId) });
    res.status(201).json(employee);
  });

  app.get(api.employees.get.path, requireAuth, async (req, res) => {
    const employee = await storage.getEmployee(Number(req.params.id));
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.patch(api.employees.update.path, requireAuth, async (req, res) => {
    const input = api.employees.update.input.parse(req.body);
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
      // Default to 30 days or calculate based on month? 
      // MVP: Default to 30 days total, 0 worked (user must enter) or default to 30 worked?
      // Let's default to full attendance
      await storage.createPayrollItem({
        payrollRunId: run.id,
        employeeId: emp.id,
        daysWorked: "30",
        totalDays: "30",
        lopDays: "0",
        basicSalary: emp.basicSalary, // Snapshot current salary
        // Init with 0 calculations
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
    const item = await storage.updatePayrollItem(Number(req.params.id), input);
    
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

  return httpServer;
}

// Helper for Calculation Logic
async function calculatePayrollItem(itemId: number) {
  const item = await storage.getPayrollItem(itemId);
  if (!item) return;
  const employee = await storage.getEmployee(item.employeeId);
  if (!employee) return;

  const daysWorked = parseFloat(item.daysWorked as string) || 0;
  const totalDays = parseFloat(item.totalDays as string) || 30;
  const lopDays = parseFloat(item.lopDays as string) || 0;
  
  const basic = parseFloat(employee.basicSalary as string) || 0;
  const allowances = parseFloat(employee.otherAllowances as string) || 0;
  
  // Pro-rating factor
  const effectiveDays = Math.max(0, daysWorked - lopDays); // Simple logic: Days Worked is what matters. 
  // Usually LOP is derived from Total - Worked. Let's assume Days Worked is the input source of truth.
  
  const payoutRatio = totalDays > 0 ? daysWorked / totalDays : 0;
  
  const earnedBasic = basic * payoutRatio;
  const earnedAllowances = allowances * payoutRatio;
  const gross = earnedBasic + earnedAllowances;
  
  // PF (12% of Basic, capped at 15k usually, but ignoring caps for MVP as per prompt)
  let pfEmployee = 0;
  let pfEmployer = 0;
  if (employee.isPfApplicable) {
    pfEmployee = earnedBasic * 0.12;
    pfEmployer = earnedBasic * 0.12;
  }
  
  // ESI (0.75% Employee, 3.25% Employer on Gross)
  let esiEmployee = 0;
  let esiEmployer = 0;
  if (employee.isEsiApplicable) {
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
