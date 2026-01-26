import { pgTable, text, serial, integer, boolean, timestamp, numeric, unique, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const userRoleEnum = ["OWNER", "ADMIN", "STAFF"] as const;
export const payrollStatusEnum = ["DRAFT", "PROCESSING", "COMPLETED", "LOCKED"] as const;

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ORGANIZATIONS ===
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ORGANIZATION MEMBERS ===
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  role: text("role", { enum: userRoleEnum }).notNull().default("STAFF"),
}, (t) => ({
  uniqueMember: unique().on(t.userId, t.organizationId),
}));

// === COMPANIES ===
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code"), // Optional unique code
  createdAt: timestamp("created_at").defaultNow(),
});

// === EMPLOYEES ===
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  employeeCode: text("employee_code").notNull(),
  designation: text("designation"),
  email: text("email"),
  phone: text("phone"),
  dateOfJoining: timestamp("date_of_joining"),
  isActive: boolean("is_active").default(true),
  
  // Bank Details
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  
  // Statutory Info
  uan: text("uan"),
  esicIpNumber: text("esic_ip_number"),
  isPfApplicable: boolean("is_pf_applicable").default(false),
  isEsiApplicable: boolean("is_esi_applicable").default(false),
  
  // Salary Structure (Monthly Fixed Components)
  fixedBasicSalary: numeric("fixed_basic_salary").notNull().default("0"),
  fixedHra: numeric("fixed_hra").notNull().default("0"),
  fixedSpecialAllowance: numeric("fixed_special_allowance").notNull().default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// === PAYROLL RUNS ===
export const payrollRuns = pgTable("payroll_runs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  month: text("month").notNull(), // Format: YYYY-MM
  status: text("status", { enum: payrollStatusEnum }).notNull().default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === PAYROLL ITEMS ===
export const payrollItems = pgTable("payroll_items", {
  id: serial("id").primaryKey(),
  payrollRunId: integer("payroll_run_id").notNull().references(() => payrollRuns.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  
  // Work days
  daysWorked: numeric("days_worked").notNull().default("0"),
  totalDays: numeric("total_days").notNull().default("30"), // Days in month
  lopDays: numeric("lop_days").notNull().default("0"),
  
  // Salary Snapshot (from employee at time of run creation)
  basicSalary: numeric("basic_salary").notNull().default("0"),
  hra: numeric("hra").notNull().default("0"),
  specialAllowance: numeric("special_allowance").notNull().default("0"),
  
  // Calculated Financials
  grossSalary: numeric("gross_salary").notNull().default("0"),
  netSalary: numeric("net_salary").notNull().default("0"),
  
  // Deductions
  pfEmployee: numeric("pf_employee").notNull().default("0"),
  pfEmployer: numeric("pf_employer").notNull().default("0"),
  esiEmployee: numeric("esi_employee").notNull().default("0"),
  esiEmployer: numeric("esi_employer").notNull().default("0"),
  otherDeductions: numeric("other_deductions").notNull().default("0"),
});

// === PAYSLIPS ===
// Stores a snapshot of the payroll item for historical accuracy
export const payslips = pgTable("payslips", {
  id: serial("id").primaryKey(),
  payrollItemId: integer("payroll_item_id").notNull().references(() => payrollItems.id),
  snapshot: jsonb("snapshot").notNull(), // JSON snapshot of the payroll item + employee details
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  companies: many(companies),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  organization: one(organizations, { fields: [companies.organizationId], references: [organizations.id] }),
  employees: many(employees),
  payrollRuns: many(payrollRuns),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, { fields: [employees.companyId], references: [companies.id] }),
  payrollItems: many(payrollItems),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  company: one(companies, { fields: [payrollRuns.companyId], references: [companies.id] }),
  items: many(payrollItems),
}));

export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
  run: one(payrollRuns, { fields: [payrollItems.payrollRunId], references: [payrollRuns.id] }),
  employee: one(employees, { fields: [payrollItems.employeeId], references: [employees.id] }),
}));

// === ZOD SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({ id: true, createdAt: true });
export const insertPayrollItemSchema = createInsertSchema(payrollItems).omit({ id: true }); // Usually updated by system, but allow manual overrides

// Types
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollItem = typeof payrollItems.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
