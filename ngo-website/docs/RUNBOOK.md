# SAMATA SAINIK DAL (SSD) DIGITAL COMMAND PLATFORM
## Production Operations, Monitoring & Disaster Recovery Runbook

---

### 1. Platform Architecture Overview

The **Samata Sainik Dal (SSD) Digital Command Platform** operates as a robust modular monolith:
- **Frontend**: Next.js App Router (React 19 + Turbopack) & Vanilla CSS with high-contrast accessibility.
- **Backend API**: Next.js API Routes & Node.js services with Zod schema validation.
- **Authoritative Database**: PostgreSQL hosted on **Supabase** with 21 relational tables, strict foreign keys, check constraints, Row Level Security (RLS), and tamper triggers.
- **Authentication**: Argon2id password hashing, rotating JWT session identifiers stored in HttpOnly secure cookies, and RFC 6238 TOTP multi-factor authentication (MFA).
- **Security & Authorization**: Role-Based Access Control (RBAC) integrated with a multi-tier territorial Jurisdiction Security Guard (Central Command $\rightarrow$ State $\rightarrow$ Region $\rightarrow$ District $\rightarrow$ Taluka $\rightarrow$ Chapter).
- **Transactions & Integrity**: Multi-step approvals and financial accounting execute strictly inside ACID transactions with append-only audit event logging.

---

### 2. Routine Operational Procedures

#### 2.1 Starting Development Environment
```bash
# Start Next.js development server with live reload
npm run dev:next

# Or start the unified Express Gateway & static server
npm run dev
```

#### 2.2 Running Automated Test Suites
Run the comprehensive 54-test validation suite covering API routes, security matrix, database constraints, auth/MFA, and the complete end-to-end domain pipeline:
```bash
npm run test:all
```

Individual test targets:
```bash
npm run test:api        # 17 Express API integration tests
npm run test:security   # 9 Argon2id, TOTP, RBAC & Jurisdiction tests
npm run test:db         # 7 Supabase DDL migrations & ID generator tests
npm run test:auth       # 7 Session rotation & MFA tests
npm run test:pipeline   # 14 Full lifecycle domain pipeline tests
```

#### 2.3 Executing Database Migrations
```bash
# Apply schema and initial seed data to Supabase
npm run migrate:supabase
```

---

### 3. Multi-Tier Jurisdiction Operations

Officials are assigned territorial scopes defined in `user_jurisdictions`:
- **Super Admin (`super_admin`) & Central Admin (`central_admin`)**: National authority across all states and districts.
- **State Official (`state_official`)**: Scoped to assigned `state_id`. Can review and recommend applications within the state.
- **Regional Official (`regional_official`)**: Scoped to assigned `region_id`.
- **District Official (`district_official`)**: Strictly isolated to assigned `district_id`. Any attempt to view or act upon an application from a different district returns HTTP 403 Forbidden and records an audit security event.

#### Assigning Jurisdiction to an Official:
```sql
INSERT INTO user_jurisdictions (user_id, role_id, state_id, district_id, is_primary)
VALUES ('user_uuid_here', 'district_official', 'state_mh', 'dist_mh_nagpur', true);
```

---

### 4. Database Backup & Disaster Recovery

#### 4.1 Daily Automated Backup
Run the backup script manually or via cron:
```bash
./scripts/db-backup.sh
```
This script:
1. Dumps all relational tables from `DATABASE_URL` via `pg_dump`.
2. Compresses the dump with gzip.
3. Generates a SHA-256 integrity checksum (`.sha256`).
4. Prunes backups older than 30 days.

#### 4.2 Recommended Cron Schedule (Daily at 02:00 AM UTC):
```cron
0 2 * * * cd /var/www/ssd && ./scripts/db-backup.sh >> /var/log/ssd_backup.log 2>&1
```

#### 4.3 Disaster Recovery Restoration
To restore from a verified backup:
```bash
./scripts/db-restore.sh ./backups/ssd_backup_20261005_120000.sql.gz
```
The script requires explicit verification of the SHA-256 checksum and operator confirmation (`RESTORE-CONFIRM`).

---

### 5. Security Incident Response

#### 5.1 Unauthorized Cross-Jurisdiction Attempts
When an official attempts to access a record outside their territory, the system:
1. Rejects the request with HTTP 403 Forbidden.
2. Logs a `UNAUTHORIZED_JURISDICTION_ACCESS` security event to `security_events` table with IP, actor email, and target territorial scope.

To inspect recent security incidents:
```sql
SELECT * FROM security_events 
WHERE severity IN ('HIGH', 'CRITICAL') 
ORDER BY created_at DESC 
LIMIT 50;
```

#### 5.2 Compromised Officer Account
1. Immediately suspend the account:
   ```sql
   UPDATE users SET status = 'SUSPENDED' WHERE email = 'compromised.officer@ssd.org.in';
   ```
2. Reset credentials and revoke active sessions:
   - The session token verification invalidates the session upon user suspension.
   - Require MFA re-enrollment before re-activating.

---

### 6. Production Health Checks & Tracing

- **Health Check Endpoint**: `GET /api` returns HTTP 200 with service metadata.
- **Request Tracing**: All requests receive an `X-Request-Id` correlation header. In case of unexpected server errors, the request ID is returned in the API error body for immediate log tracing:
  ```json
  {
    "success": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected internal error occurred...",
      "requestId": "req_1791200109_abc12"
    }
  }
  ```
