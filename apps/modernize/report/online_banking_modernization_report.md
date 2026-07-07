# Oracle Forms Modernization Report
## Module: `online_banking` — AI-Assisted Analysis & Extraction

**Generated:** 2026-07-07  
**Analyst:** Claude Code (claude-sonnet-4-6) via SQLcl MCP  
**Target platform:** Oracle APEX (Always Free tier, Autonomous DB 23ai)  
**Source:** Student-built Oracle Forms application — 12 modules, authentic `.fmb` XML exports

---

## 1. Module Summary Table

| # | Module (file) | FormModule Name | Purpose | Complexity | DB Tables | Business Logic Extracted | Package Generated |
|---|--------------|-----------------|---------|------------|-----------|--------------------------|-------------------|
| 1 | G1_HOMEPAGE | G1_HOMEPAGE | Top-level navigation | Trivial | None | None | No — pure navigation |
| 2 | G1_CUSTOMERHOMEPAGE | G1_CUSTOMERHOMEPAGE | Customer menu | Trivial | None | None | No — pure navigation |
| 3 | G1_MANAGERLOGINPAGE | G1_MANAGERLOGINPAGE | Manager auth | Low | None | **Hardcoded credentials — flagged** | No — security issue |
| 4 | G1_LOGIN | G1_LOGIN | Customer login | Low | GRP1_REGISTEREDINFO | Password check, error messaging | Yes — `pkg_ob_login` |
| 5 | G1_ACCOUNTOPENING | G1_ACCOUNTOPENING | Account application | Medium | GROUP1_ACCOUNTREQUEST | Phone/email validation, auto-ID, INSERT | Yes — `pkg_ob_accountopening` |
| 6 | G1_ONLINEREGISTRATION | G1_ONLINEREGISTRATION | Online banking enrollment | Medium | GRP1_REGISTEREDINFO | Duplicate check, password validation, UPDATE | Yes — `pkg_ob_onlineregistration` |
| 7 | G1_MANAGERAPPROVAL | G1_MANAGERAPPROVAL | Account approval workflow | **High** | Both account tables | Approve/reject, account# generation algorithm | Yes — `pkg_ob_managerapproval` |
| 8 | G1_TRANSACTIONENTRY | G1_TRANSACTIONENTRY | Submit transaction | Medium | GRP1_TRANSACTIONINFO | Amount/cheque validation, auto-ID, INSERT | Yes — `pkg_ob_transactionentry` |
| 9 | G1_TRANSACTIONDETAILS | G1_TRANSACTIONDETAILS | Transaction history | Low | GRP1_TRANSACTIONINFO | Date range validation, parameterised query | Yes — `pkg_ob_transactiondetails` |
| 10 | G1_INTERESTCALCULATOR | G1_SIMPLEINTEREST | Loan interest calculator | Medium | None | Rate table, eligibility ranges, SI formula | Yes — `pkg_ob_interestcalculator` |
| 11 | G1_CHECKSTATUS | G1_CHECKSTATUS1 | Application status lookup | Low | Both account tables | Status query + conditional messaging | Yes — `pkg_ob_checkstatus` |
| 12 | G1_CUSTOMERDETAIL | G1_CUSTOMERDETAIL | Manager: view request details | Trivial | GROUP1_ACCOUNTREQUEST | Read-only SELECT | No — single query, no logic |

**Packages generated:** 8 of 12 modules  
**Modules with no package:** 4 (2 navigation-only, 1 security issue, 1 read-only view)

---

## 2. Schema Analysis

### Tables Created in Autonomous DB

Three tables were loaded into the `formsproto` Autonomous Database via SQLcl MCP:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `GROUP1_ACCOUNTREQUEST` | Account application requests | RequestId (PK), Branch, AccountType, FirstName, LastName, DOB, WorkPhone, HomePhone, Address, State, Zip, Email, Status |
| `GRP1_REGISTEREDINFO` | Approved accounts + login credentials | Account_Number (PK, varchar2(15)), RequestId (FK), Online_registration, password11 |
| `GRP1_TRANSACTIONINFO` | Transaction records | TransactionId (PK), Account_Number (FK), Amount, ChequeNo, Transaction_Type |

### Schema vs. Forms Mismatches — Critical Findings

These are genuine defects in the original student project, found by cross-referencing the SQL script against the Forms XML. All were corrected when loading to the DB.

| # | Mismatch | Original SQL Script | Forms XML Reference | Correction Applied |
|---|----------|--------------------|--------------------|-------------------|
| 1 | Table name | `GROUP1_ACCOUNTREQUEST` | `G1_ACCOUNTREQUEST` | Kept original SQL name; flagged in packages |
| 2 | Table name | `GRP1_REGISTEREDINFO` | `G1_REGISTEREDINFO` | Kept original SQL name; flagged in packages |
| 3 | Column name | `password` | `PASSWORD11` | Schema corrected to `password11` (Forms is authoritative for runtime behaviour) |
| 4 | Column type | `Account_Number NUMBER(6)` | Account# generated as varchar e.g. `'CUJoh00001'` | Schema corrected to `VARCHAR2(15)` — **original schema would fail at INSERT** |
| 5 | FK target | `FOREIGN KEY … REFERENCES GRP1_ACCOUNTREQUEST` | — | Corrected to `GROUP1_ACCOUNTREQUEST` — original DDL would fail to create |

**Note on correction 4:** This is the most significant schema bug. The approval workflow generates an alphanumeric account number (`AccountType(2) || FirstName(3) || seq(5)`) and inserts it into `Account_Number`. If the column type had been left as `NUMBER(6)`, every approval would throw `ORA-01722: invalid number`. The original application would have been broken in production.

---

## 3. Deep Notes — Modules with Significant Business Logic

### 3.1 G1_MANAGERAPPROVAL — Account Approval Workflow

This is the most complex module and the most valuable extraction target.

**What it does:**
- Displays pending requests (Status='ENTERED') in a multi-record DB block
- Manager can Approve, Reject, or view full Details per request
- On Approve: updates status, generates a unique account number, inserts into REGISTEREDINFO with a default password

**Account number generation algorithm (extracted verbatim):**
```sql
-- Step 1: find next sequence number from existing account numbers
SELECT lpad(max(substr(Account_Number,6,5)+1), 5, 0)
  INTO A FROM G1_REGISTEREDINFO;

-- Step 2: first 3 chars of applicant's first name
SELECT substr(FirstName,1,3) INTO B
  FROM G1_ACCOUNTREQUEST WHERE RequestId=:T1;

-- Step 3: account type (full string — first 2 chars used in concatenation)
SELECT ACCOUNTTYPE INTO C
  FROM G1_ACCOUNTREQUEST WHERE RequestId=:T1;

-- Step 4: K := C || B || A
-- Example: AccountType='CURRENT', FirstName='Johnson' → 'CUJoh00001'
```

This algorithm is implemented faithfully in `pkg_ob_managerapproval.generate_account_number()`.

**Concerns:**
- The algorithm is not collision-safe: two applicants named "John Smith" with the same account type opening accounts simultaneously would both try to insert `CUJoh00001`. The Forms app is single-user thick-client so this never mattered; a web-based APEX app needs a proper sequence.
- The `LPAD(MAX(SUBSTR(...)+1),5,0)` expression returns NULL if the table is empty — triggering a NUL account number on the first approval. The package wraps this with `NVL(...,0)+1`.

**APEX rebuild recommendation:** Replace `generate_account_number` with an Oracle sequence for the numeric suffix. Keep the type+name prefix if the business wants human-readable account numbers. Use `SELECT seq_acct.NEXTVAL INTO v_seq FROM DUAL` instead of `MAX(SUBSTR(...))`.

---

### 3.2 G1_ACCOUNTOPENING — Application Form

**Business logic extracted:**
- Phone validation: `LENGTH(phone) = 10` (not a regex — any 10-digit number passes)
- Email validation: `email LIKE '%@%.com'` — bare minimum; misses `.net`, `.org`, `.co.in`, etc.
- RequestId generation: `MAX(REQUESTID) + 10` — gap of 10 between IDs is deliberate in the original (allows manual insertion in gaps). Likely a student workaround, not intentional design.

**APEX rebuild recommendation:** Replace MAX+10 with a sequence. Strengthen the email regex to use `REGEXP_LIKE` in both the APEX validation and the PL/SQL package.

---

### 3.3 G1_ONLINEREGISTRATION — Online Banking Enrollment

**Business logic extracted:**
- Checks `Online_registration = 'Y'` before allowing registration (prevents double-registration)
- Password minimum length: 6 characters
- Password confirmation match check
- Updates `Online_registration` flag and sets the account password

**Concern:** Password is stored as plaintext `VARCHAR2(10)`. This is a security anti-pattern. APEX rebuild should use `APEX_UTIL.GET_HASH` or equivalent hashing before storage.

---

### 3.4 G1_INTERESTCALCULATOR — Simple Interest Calculator (FormModule: G1_SIMPLEINTEREST)

**Note on module naming:** The file is named `G1_INTERESTCALCULATOR_fmb.xml` but the FormModule inside is `G1_SIMPLEINTEREST`. The CUSTOMERHOMEPAGE navigates to `G1_SIMPLEINTEREST.fmx`. This discrepancy would cause a runtime failure if the compiled form is named differently from its module.

**Rates extracted (hardcoded in original trigger):**

| Loan Type | Rate (%) | Eligible Amount Range |
|-----------|----------|----------------------|
| HOME LOAN | 8 | ₹1,00,000 – ₹1,00,00,000 |
| EDUCATION LOAN | 6 | ₹50,000 – ₹15,00,000 |
| AGRICULTURE LOAN | 6 | ₹10,000 – ₹5,00,000 |
| TWO WHEELER LOAN | 11 | ₹20,000 – ₹2,00,000 |
| FOUR WHEELER LOAN | 12 | ₹1,00,000 – ₹20,00,000 |
| GOLD LOAN | 10 | ₹10,000 – ₹5,00,000 |
| PERSONAL LOAN | 11 | ₹10,000 – ₹5,00,000 |

Formula: `SI = (P × R × T) / 100` — standard simple interest, no compound interest.

**APEX rebuild recommendation:** Move rates to a database lookup table (`OB_LOAN_RATES`) rather than hardcoding in PL/SQL. This allows rates to be updated without a code change.

---

### 3.5 G1_LOGIN — Customer Login

**Key finding:** The column referenced in the SELECT is `PASSWORD11` — this differs from the original schema DDL which defines the column as `PASSWORD`. This mismatch would cause `ORA-00904: "PASSWORD11": invalid identifier` at runtime in the original application. The schema was corrected to `password11` during loading to match what the forms actually reference.

**Session state:** After successful login, the Forms app passes the account number to G1_TRANSACTIONENTRY via a Forms parameter list (`create_parameter_list`). In APEX, this becomes an APEX session state item (e.g. `APP_SESSION` scoped item `P_ACCOUNT_NUMBER`).

---

## 4. Forms-Specific Constructs with No APEX Equivalent

These constructs appear throughout the application and cannot be translated 1:1 to APEX. Each needs a specific APEX alternative.

| Forms Construct | Where Used | APEX Alternative |
|----------------|-----------|------------------|
| `CALL_FORM('path.fmx', ...)` | All navigation | APEX: Redirect to Page action (branch or button target) |
| `create_parameter_list` / `add_parameter` / `destroy_parameter_list` | LOGIN, MANAGERAPPROVAL, TRANSACTIONENTRY, CUSTOMERDETAIL | APEX: Set session state items before redirect |
| `FND_MESSAGE.SET_STRING` / `FND_MESSAGE.SHOW` | All modules | APEX: `apex_error.add_error` (validation) or `apex_application.g_print_success_message` |
| `APP_STANDARD.EVENT` | All modules (boilerplate) | Not applicable — EBS framework stub, delete |
| `APP_CUSTOM` | Several modules | Not applicable — EBS boilerplate, delete |
| `APPSTAND` package | Several modules | Not applicable — delete |
| `GO_BLOCK('block_name')` | TRANSACTIONDETAILS | APEX: not needed — Interactive Report refreshes on demand |
| `EXECUTE_QUERY` | TRANSACTIONDETAILS | APEX: Dynamic Action → Refresh Report region |
| `name_in('system.mode')` | MANAGERAPPROVAL | Not applicable — Forms runtime mode detection, no equivalent |
| `GET_ITEM_PROPERTY(..., CONCEAL_DATA)` | LOGIN (password toggle) | APEX: item type `Password` with show/hide toggle (built-in) |
| `SET_ITEM_PROPERTY` | LOGIN | APEX: Dynamic Action → Set Value / Set CSS Class |
| `RAISE FORM_TRIGGER_FAILURE` | ONLINEREGISTRATION | APEX: return from validation process with error, or `apex_error.add_error` |
| `SYNCHRONIZE` | Not present here, but common in Oracle Forms | Not applicable in APEX |

---

## 5. Security Issues Found

These must be addressed in any production APEX rebuild and should be flagged to stakeholders.

### CRITICAL: Hardcoded Manager Credentials
**Module:** G1_MANAGERLOGINPAGE  
**Finding:** The manager password `ADMIN123` is embedded in plaintext inside a WHEN-BUTTON-PRESSED trigger in the compiled form binary. Anyone with access to decompile the `.fmb` or read the `.fmx` on the server can extract it.  
**APEX fix:** Use APEX built-in workspace authentication. Assign a MANAGER application role and apply page-level authorization schemes. Never store credentials in application code.

### HIGH: Plaintext Password Storage
**Module:** G1_ONLINEREGISTRATION, G1_LOGIN  
**Finding:** Customer passwords are stored in `GRP1_REGISTEREDINFO.password11` as plaintext `VARCHAR2(10)`.  
**APEX fix:** Hash passwords using `APEX_UTIL.GET_HASH` before storage. Or use APEX's built-in End User Account management (`APEX_UTIL.CREATE_USER`) which handles hashing automatically.

### MEDIUM: Default Password for New Accounts
**Module:** G1_MANAGERAPPROVAL  
**Finding:** Every newly approved account is inserted with `password11 = '0000'`. All customers share the same initial password.  
**APEX fix:** Generate a random temporary password and email it to the customer on approval. Force a password change on first login.

### LOW: Sequential ID Generation Under Concurrency
**Modules:** G1_ACCOUNTOPENING (RequestId), G1_TRANSACTIONENTRY (TransactionId)  
**Finding:** Both use `MAX(id)+N` — safe for a single-user thick client, but will produce duplicate key errors under concurrent APEX web sessions.  
**APEX fix:** Replace with Oracle sequences (`CREATE SEQUENCE`).

---

## 6. What Was Cleanly Extracted vs. What Needs Human Review

### Cleanly Extracted (high confidence)
- Simple Interest formula and loan rate table (`pkg_ob_interestcalculator`)
- All validation rules: phone length, email format, password length, amount limits, date range checks
- Account approval and rejection status updates
- Transaction INSERT with all validated fields
- Check status query logic and conditional messaging
- Account number generation algorithm (extracted verbatim, including the NVL edge case fix)

### Needs Human Review Before Production Use
| Item | Why |
|------|-----|
| Account number generation | Collision risk under concurrency; sequence should replace MAX() |
| Password storage | Plaintext — needs hashing before any APEX deployment |
| Manager authentication | Must be replaced entirely with APEX role-based auth |
| Email validation | `LIKE '%@%.com'` is too narrow for real email addresses |
| Error message content | FND_MESSAGE strings translated directly — verify they match the business's intended UX copy |
| G1_MANAGERAPPROVAL DB block behaviour | The original auto-queries and scrolls a 5-record window. APEX Interactive Report behaviour differs; scroll/pagination UX needs manual adjustment |

### Could Not Be Automatically Extracted (inherent limits)
- **Inter-form navigation flow** — CALL_FORM call chains define the application's navigation graph. This was mapped manually (see notes per module) but generating APEX page flow requires a human architect to decide page numbering, branching, and session state strategy.
- **Forms runtime state** — several triggers use `name_in('system.mode')`, `GET_ITEM_PROPERTY`, and implicit block-record cursors. These interact with the Forms runtime engine in ways that have no direct APEX equivalent. The extracted PL/SQL packages omit these — they must be handled in APEX page/region design.
- **Multi-record DB block UX** — G1_MANAGERAPPROVAL's scrollable 5-record block (with per-row action buttons) is a Forms-specific UI construct. In APEX it becomes an Interactive Grid or Interactive Report; row-level Approve/Reject buttons require custom column links or row actions, which must be built manually.

---

## 7. Recommended APEX Rebuild Sequence

Given the module analysis, the recommended build order for an APEX prototype:

### Phase 1 — Core Data Flow (highest value for demo)
1. **Account Opening** (APEX form page) → calls `pkg_ob_accountopening.submit_account_request`
2. **Manager Approval** (Interactive Report + row actions) → calls `pkg_ob_managerapproval.approve_request` / `reject_request`
3. **Check Status** (simple search page) → calls `pkg_ob_checkstatus.check_request_status`

These three cover the complete account lifecycle and demonstrate the AI extraction value clearly.

### Phase 2 — Banking Operations
4. **Login** (APEX login page) → calls `pkg_ob_login.authenticate_customer` or use APEX End User auth
5. **Transaction Entry** (APEX form) → calls `pkg_ob_transactionentry.submit_transaction`
6. **Transaction History** (Interactive Report) → sources `pkg_ob_transactiondetails.get_transactions` cursor

### Phase 3 — Self-Service & Tools
7. **Online Registration** → calls `pkg_ob_onlineregistration.register_online`
8. **Interest Calculator** → calls `pkg_ob_interestcalculator.calculate_loan_interest` (or implement as client-side JS — no DB needed)

### Skip / Rebuild from scratch
- **Homepage** and **Customer Homepage** — static APEX pages with navigation buttons, no PL/SQL
- **Manager Login** — replaced by APEX authentication + MANAGER role authorization scheme
- **Customer Detail** — read-only APEX form sourced from `GROUP1_ACCOUNTREQUEST` WHERE clause

---

## 8. Automation Limits — Honest Assessment for Stakeholders

This section is explicitly for the leadership presentation. Do not overstate what was automated.

**What AI did automatically:**
- Parsed all 12 Forms XML modules and identified blocks, items, triggers, and program units
- Cross-referenced all table and column names against the loaded schema — found 5 mismatches the developer missed
- Extracted all procedural logic from trigger code into structured PL/SQL packages with proper signatures
- Identified all Forms-specific constructs that need APEX alternatives
- Flagged 3 security issues not visible without reading the trigger code carefully
- Generated this report

**What required a human (me) in the loop:**
- Deciding which schema corrections to apply (e.g., whether to rename tables to match the forms, or vice versa)
- Interpreting ambiguous column naming (`password` vs `password11`) — the right answer required reading both files and making a judgment call
- Recognising that `Account_Number NUMBER(6)` was a type mismatch bug, not an intentional design choice
- Deciding that `pkg_ob_managerlogin` should NOT be generated (moving hardcoded creds to PL/SQL is not an improvement)
- Understanding that the module naming discrepancy (`G1_INTERESTCALCULATOR` file / `G1_SIMPLEINTEREST` form) would cause a runtime failure

**What AI cannot do and was not attempted:**
- Build the APEX pages — this requires the APEX Builder UI or APEX export format knowledge; packages are the input, not the output
- Test the extracted logic against real data — packages were written from trigger code but not executed
- Handle deeply stateful triggers where the correct output depends on the Forms runtime mode (`name_in('system.mode')`)
- Generate a migration that would "just work" — every package here is a starting point for a developer, not a finished drop-in replacement

**Bottom line for the presentation:** AI accelerates the analysis and extraction phase from days to hours, and produces a higher-quality extraction than manual reading (it catches things humans skim past, like the `password11` column mismatch). The APEX rebuild still requires a human developer. The correct framing is "AI-assisted modernization" — the AI does the archaeology and scaffolding; the developer does the construction.

---

## 9. Files Generated

```
apps/modernize/
├── input/online_banking/
│   ├── schema/online_banking_schema.sql   (source DDL — as provided)
│   └── forms_xml/                         (all 12 .xml exports)
├── plsql/
│   ├── pkg_ob_login.sql
│   ├── pkg_ob_accountopening.sql
│   ├── pkg_ob_onlineregistration.sql
│   ├── pkg_ob_managerapproval.sql         ← most complex; account# algorithm
│   ├── pkg_ob_transactionentry.sql
│   ├── pkg_ob_transactiondetails.sql
│   ├── pkg_ob_interestcalculator.sql      ← rate table + SI formula
│   ├── pkg_ob_checkstatus.sql
│   ├── pkg_ob_homepage.sql                (no-op — navigation only)
│   ├── pkg_ob_customerhomepage.sql        (no-op — navigation only)
│   ├── pkg_ob_managerlogin.sql            (no-op — hardcoded creds, security issue)
│   └── pkg_ob_customerdetail.sql          (no-op — read-only view)
└── report/
    └── online_banking_modernization_report.md   (this file)
```

**Database (formsproto Autonomous DB):**
- `GROUP1_ACCOUNTREQUEST` — created ✓
- `GRP1_REGISTEREDINFO` — created ✓ (with schema corrections: `password11`, `Account_Number VARCHAR2(15)`)
- `GRP1_TRANSACTIONINFO` — created ✓ (Account_Number FK type corrected to match)
