import { z } from 'zod';
import { 
  insertUserSchema, 
  insertOrganizationSchema, 
  insertCompanySchema, 
  insertEmployeeSchema, 
  insertPayrollRunSchema,
  insertPayrollItemSchema,
  users, organizations, companies, employees, payrollRuns, payrollItems, payslips, organizationMembers
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === AUTH ===
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },

  // === ORGANIZATIONS ===
  organizations: {
    list: {
      method: 'GET' as const,
      path: '/api/organizations',
      responses: {
        200: z.array(z.custom<typeof organizations.$inferSelect & { role: string }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/organizations',
      input: insertOrganizationSchema,
      responses: {
        201: z.custom<typeof organizations.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/organizations/:id',
      responses: {
        200: z.custom<typeof organizations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === COMPANIES ===
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/organizations/:orgId/companies',
      responses: {
        200: z.array(z.custom<typeof companies.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/organizations/:orgId/companies',
      input: insertCompanySchema.omit({ organizationId: true }),
      responses: {
        201: z.custom<typeof companies.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/companies/:id',
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/companies/:id',
      input: insertCompanySchema.partial(),
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
      },
    },
  },

  // === EMPLOYEES ===
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/employees',
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/employees',
      input: insertEmployeeSchema.omit({ companyId: true }),
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:id',
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/employees/:id',
      input: insertEmployeeSchema.partial(),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
      },
    },
    import: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/employees/import',
      input: z.object({ rows: z.array(z.any()) }),
      responses: {
        200: z.object({
          created: z.number(),
          updated: z.number(),
          failedCount: z.number(),
          failedRows: z.array(z.object({ row: z.any(), error: z.string() })),
        }),
      },
    },
  },

  // === PAYROLL RUNS ===
  payroll: {
    listRuns: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/payroll-runs',
      responses: {
        200: z.array(z.custom<typeof payrollRuns.$inferSelect>()),
      },
    },
    createRun: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/payroll-runs',
      input: insertPayrollRunSchema.omit({ companyId: true, status: true }),
      responses: {
        201: z.custom<typeof payrollRuns.$inferSelect>(),
      },
    },
    getRun: {
      method: 'GET' as const,
      path: '/api/payroll-runs/:id',
      responses: {
        200: z.custom<typeof payrollRuns.$inferSelect & { items: typeof payrollItems.$inferSelect[] }>(),
      },
    },
    calculateRun: {
      method: 'POST' as const,
      path: '/api/payroll-runs/:id/calculate',
      responses: {
        200: z.custom<{ message: string }>(),
      },
    },
    lockRun: {
      method: 'POST' as const,
      path: '/api/payroll-runs/:id/lock',
      responses: {
        200: z.custom<typeof payrollRuns.$inferSelect>(),
      },
    },
    processRun: {
      method: 'POST' as const,
      path: '/api/payroll-runs/:id/process',
      responses: {
        200: z.custom<typeof payrollRuns.$inferSelect>(),
      },
    },
    updateItem: {
      method: 'PATCH' as const,
      path: '/api/payroll-items/:id',
      input: z.object({
        daysWorked: z.number().or(z.string()).optional(),
        lopDays: z.number().or(z.string()).optional(),
        otherDeductions: z.number().or(z.string()).optional(),
        otherAllowances: z.number().or(z.string()).optional(),
      }),
      responses: {
        200: z.custom<typeof payrollItems.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
