# Dhanix - Indian Payroll SaaS Application

## Overview

Dhanix is a full-stack multi-tenant SaaS web application for Indian payroll management with PF (Provident Fund) and ESI (Employee State Insurance) compliance support. The application enables payroll consultancies and companies to manage multiple client organizations, process employee salaries, and generate compliant payroll reports.

The core workflow involves:
1. Users register and create/join Organizations (typically consultancies)
2. Organizations contain multiple Companies (client entities)
3. Companies have Employees with salary configurations
4. Payroll Runs are created monthly to process salaries and generate payslips

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with React plugin

The frontend follows a page-based structure under `client/src/pages/` with shared components in `client/src/components/`. Custom hooks in `client/src/hooks/` encapsulate API interactions using React Query patterns.

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API under `/api` prefix
- **Authentication**: Passport.js with local strategy (email/password)
- **Session Management**: Express-session with PostgreSQL store (connect-pg-simple)
- **Password Security**: scrypt with random salt for password hashing

Routes are defined in `server/routes.ts` and follow the API contract specified in `shared/routes.ts`. The shared routes file uses Zod schemas for input validation and response typing, providing end-to-end type safety.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (provisioned via Replit)
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Schema Validation**: drizzle-zod for generating Zod schemas from database tables

### Multi-Tenancy Model
The application implements a hierarchical multi-tenant structure:
- **User**: Authentication account
- **Organization**: Top-level tenant (consultancy/umbrella company)
- **OrganizationMember**: Links users to organizations with roles (OWNER, ADMIN, STAFF)
- **Company**: Client entity within an organization
- **Employee**: Workers within a company
- **PayrollRun/PayrollItem/Payslip**: Monthly payroll processing entities

### Build System
- Development uses Vite's dev server with HMR proxied through Express
- Production build uses esbuild for server bundling and Vite for client
- Server dependencies are selectively bundled to optimize cold start times
- Build output goes to `dist/` with client assets in `dist/public/`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage in PostgreSQL

### Authentication & Security
- **Passport.js + passport-local**: Email/password authentication strategy
- **express-session**: Session middleware with configurable stores
- **crypto (Node.js built-in)**: scrypt for password hashing

### UI Component Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled components built on Radix
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database migration tooling
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production server bundling

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Express session secret (optional, has default for development)