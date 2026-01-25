import { db } from "./db";
import { 
  users, organizations, organizationMembers, companies, employees, payrollRuns, payrollItems, payslips,
  type User, type InsertUser,
  type Organization, type OrganizationMember, 
  type Company, type Employee, 
  type PayrollRun, type PayrollItem, type Payslip
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Organizations
  getOrganizationsForUser(userId: number): Promise<(Organization & { role: string })[]>;
  createOrganization(userId: number, org: Partial<Organization>): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;

  // Companies
  getCompanies(orgId: number): Promise<Company[]>;
  createCompany(company: Partial<Company>): Promise<Company>;
  getCompany(id: number): Promise<Company | undefined>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company>;

  // Employees
  getEmployees(companyId: number): Promise<Employee[]>;
  createEmployee(employee: Partial<Employee>): Promise<Employee>;
  getEmployee(id: number): Promise<Employee | undefined>;
  updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee>;

  // Payroll
  getPayrollRuns(companyId: number): Promise<PayrollRun[]>;
  createPayrollRun(run: Partial<PayrollRun>): Promise<PayrollRun>;
  getPayrollRun(id: number): Promise<PayrollRun | undefined>;
  updatePayrollRun(id: number, run: Partial<PayrollRun>): Promise<PayrollRun>;
  
  getPayrollItems(runId: number): Promise<PayrollItem[]>;
  getPayrollItem(id: number): Promise<PayrollItem | undefined>;
  createPayrollItem(item: Partial<PayrollItem>): Promise<PayrollItem>;
  updatePayrollItem(id: number, item: Partial<PayrollItem>): Promise<PayrollItem>;
  
  // Bulk operations for payroll calculation
  deletePayrollItems(runId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getOrganizationsForUser(userId: number): Promise<(Organization & { role: string })[]> {
    const results = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        createdAt: organizations.createdAt,
        role: organizationMembers.role
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
    return results;
  }

  async createOrganization(userId: number, org: Partial<Organization>): Promise<Organization> {
    // Transaction to create org and add creator as owner
    return await db.transaction(async (tx) => {
      const [newOrg] = await tx.insert(organizations).values(org as any).returning();
      await tx.insert(organizationMembers).values({
        userId,
        organizationId: newOrg.id,
        role: "OWNER"
      });
      return newOrg;
    });
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getCompanies(orgId: number): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.organizationId, orgId));
  }

  async createCompany(company: Partial<Company>): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company as any).returning();
    return newCompany;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    const [updated] = await db.update(companies).set(company).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getEmployees(companyId: number): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.companyId, companyId));
  }

  async createEmployee(employee: Partial<Employee>): Promise<Employee> {
    const [newEmp] = await db.insert(employees).values(employee as any).returning();
    return newEmp;
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee> {
    const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
    return updated;
  }

  async getPayrollRuns(companyId: number): Promise<PayrollRun[]> {
    return await db.select().from(payrollRuns).where(eq(payrollRuns.companyId, companyId)).orderBy(desc(payrollRuns.createdAt));
  }

  async createPayrollRun(run: Partial<PayrollRun>): Promise<PayrollRun> {
    const [newRun] = await db.insert(payrollRuns).values(run as any).returning();
    return newRun;
  }

  async getPayrollRun(id: number): Promise<PayrollRun | undefined> {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return run;
  }

  async updatePayrollRun(id: number, run: Partial<PayrollRun>): Promise<PayrollRun> {
    const [updated] = await db.update(payrollRuns).set(run).where(eq(payrollRuns.id, id)).returning();
    return updated;
  }

  async getPayrollItems(runId: number): Promise<PayrollItem[]> {
    return await db.select().from(payrollItems).where(eq(payrollItems.payrollRunId, runId));
  }

  async getPayrollItem(id: number): Promise<PayrollItem | undefined> {
    const [item] = await db.select().from(payrollItems).where(eq(payrollItems.id, id));
    return item;
  }

  async createPayrollItem(item: Partial<PayrollItem>): Promise<PayrollItem> {
    const [newItem] = await db.insert(payrollItems).values(item as any).returning();
    return newItem;
  }

  async updatePayrollItem(id: number, item: Partial<PayrollItem>): Promise<PayrollItem> {
    const [updated] = await db.update(payrollItems).set(item).where(eq(payrollItems.id, id)).returning();
    return updated;
  }

  async deletePayrollItems(runId: number): Promise<void> {
    await db.delete(payrollItems).where(eq(payrollItems.payrollRunId, runId));
  }
}

export const storage = new DatabaseStorage();
