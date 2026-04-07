
## Part 1: Training Manual Update
Add comprehensive arbitration section covering:
- Case management fee tiers ($500–$5,000)
- 7-phase arbitration procedure
- OS Pay integration for fee collection
- Arbitrator portal system (AMS)
- Case file packaging automation
- 7-day auto-assignment countdown
- Ruling distribution & blockchain anchoring
- Compliance recordkeeping

---

## Part 2: Admin Department Division Strategy

### Proposed Departments (based on current system responsibilities)

#### 1. **Executive Office** (Chief Admin / Rank 1)
- Full access to ALL modules
- Can enter any department team chat
- Staff management (hire, promote, demote, delete)
- Override authority (48-hour window)
- Final escalation point
- Platform analytics & reporting

#### 2. **Correspondence & Client Relations**
- Anonymous messaging (TL-Agent-XXXX) with buyers/vendors
- Shared inbox thread management
- Notification triage
- Client onboarding support
- Help center escalations
- **Only department (alongside Executive) with direct client messaging access**

#### 3. **Disputes & Arbitration**
- Dispute case management
- Arbitration fee verification
- Case file packaging & arbitrator portal management
- Ruling distribution & enforcement
- Evidence review
- Arbitrator directory management

#### 4. **Finance & Payouts**
- OS Pay oversight
- Payout processing & reconciliation
- Fee auditing (external fee tracker)
- Gas treasury management
- Tax remittance ledger
- Revenue analytics

#### 5. **Compliance & Risk**
- KYC/KYB review queue
- Sanctions screening oversight
- Document scanning & verification
- Compliance flag management
- Anti-structuring monitoring
- Travel rule enforcement

#### 6. **Operations & Workflow**
- Transaction monitoring & status updates
- Milestone verification
- Vendor/buyer account management
- Platform configuration
- Industry template management
- Blockchain proof oversight

### Implementation Plan

**Phase 1: Database Schema**
- Add `admin_departments` table (id, name, slug, description, access_modules)
- Add `department_id` column to `admin_accounts`
- Add `admin_department_access` table for module-level permissions

**Phase 2: Staff Management UI Updates**
- Department selector in "Add New Admin" form
- Department badge on staff list
- Department filter/grouping

**Phase 3: Access Control (RBAC by Department)**
- Sidebar modules filtered by department
- API-level access checks
- Cross-department isolation

**Phase 4: Team Chat Isolation**
- Department-scoped chat channels
- Executive transcendence (can join any channel)
- No cross-department messaging (hard rule)
- Client messaging restricted to Correspondence + Executive only

**Phase 5: Dashboard Personalization**
- Department-specific overview widgets
- Relevant quick actions per department
- Scoped notification routing
