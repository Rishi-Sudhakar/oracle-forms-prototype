export type PkgStatus = 'extracted' | 'none' | 'flagged'
export type Complexity = 'Trivial' | 'Low' | 'Medium' | 'High'

export interface Module {
  file: string
  alias?: string
  purpose: string
  complexity: Complexity
  pkgStatus: PkgStatus
  pkg?: string
  logic: string[]
  tables: string[]
  note?: string
}

export const MODULES: Module[] = [
  {
    file: 'G1_HOMEPAGE', purpose: 'Top-level navigation hub. Two buttons routing to Customer or Manager flows.',
    complexity: 'Trivial', pkgStatus: 'none', logic: [], tables: [],
    note: 'No DB interaction. No extractable logic. APEX: static page with 2 button redirects. No PL/SQL needed.',
  },
  {
    file: 'G1_CUSTOMERHOMEPAGE', purpose: 'Customer navigation menu. Five buttons routing to all customer-facing sub-forms.',
    complexity: 'Trivial', pkgStatus: 'none', logic: [], tables: [],
    note: 'No DB interaction. APEX: static page with 5 button redirects. No PL/SQL needed.',
  },
  {
    file: 'G1_CUSTOMERDETAIL', purpose: 'Read-only manager view of a customer application. Launched from approval screen via parameter P5=RequestId.',
    complexity: 'Trivial', pkgStatus: 'none',
    logic: ['DB block on GROUP1_ACCOUNTREQUEST filtered by param P5 (RequestId)', 'Manually populates all fields on WHEN-NEW-FORM-INSTANCE', 'BACK button returns to MANAGERAPPROVAL passing P1=RequestId'],
    tables: ['GROUP1_ACCOUNTREQUEST'],
    note: 'Single SELECT, no logic to extract. APEX: read-only form sourced from GROUP1_ACCOUNTREQUEST.',
  },
  {
    file: 'G1_MANAGERLOGINPAGE', purpose: 'Manager authentication gate before the approval workflow.',
    complexity: 'Low', pkgStatus: 'flagged',
    logic: ["IF :USERNAME='MANAGER' AND :PASSWORD='ADMIN123' THEN CALL_FORM(approval)", 'No DB lookup; credentials entirely hardcoded in trigger body'],
    tables: [],
    note: 'Package intentionally NOT generated. Moving hardcoded creds to PL/SQL is not an improvement. Must be replaced with APEX role-based auth.',
  },
  {
    file: 'G1_LOGIN', purpose: 'Customer login. Validates account number + password against DB, then navigates to transaction entry.',
    complexity: 'Low', pkgStatus: 'extracted', pkg: 'pkg_ob_login',
    logic: ['SELECT password11 FROM GRP1_REGISTEREDINFO WHERE Account_Number=:T1', 'Compare entered password -- match/reject', 'Pass account number as CALL_FORM parameter P1 to G1_TRANSACTIONENTRY'],
    tables: ['GRP1_REGISTEREDINFO'],
    note: 'APEX: authenticate_customer() called from APEX login page. CALL_FORM param -> APEX session state item.',
  },
  {
    file: 'G1_CHECKSTATUS', alias: 'G1_CHECKSTATUS1', purpose: 'Customer self-service: check account application status by Request ID.',
    complexity: 'Low', pkgStatus: 'extracted', pkg: 'pkg_ob_checkstatus',
    logic: ['SELECT Status FROM GROUP1_ACCOUNTREQUEST WHERE RequestId=:T1', 'If APPROVED -- also SELECT Account_Number FROM GRP1_REGISTEREDINFO', 'Three-branch conditional message: APPROVED / ENTERED / REJECTED'],
    tables: ['GROUP1_ACCOUNTREQUEST', 'GRP1_REGISTEREDINFO'],
    note: 'File G1_CHECKSTATUS_fmb.xml contains FormModule G1_CHECKSTATUS1; naming mismatch flagged.',
  },
  {
    file: 'G1_TRANSACTIONDETAILS', purpose: 'Date-range transaction history report for a customer account.',
    complexity: 'Low', pkgStatus: 'extracted', pkg: 'pkg_ob_transactiondetails',
    logic: ['Validate: to_date <= SYSDATE', 'Validate: from_date <= to_date', 'WHERE Account_Number=P1 AND TransactionDate BETWEEN from_date AND to_date', 'APEX: expose as Interactive Report REF CURSOR source'],
    tables: ['GRP1_TRANSACTIONINFO'],
    note: 'Account number passed as CALL_FORM parameter P1 from login flow.',
  },
  {
    file: 'G1_ACCOUNTOPENING', purpose: 'New account application. Collects full personal details, validates, and submits request.',
    complexity: 'Medium', pkgStatus: 'extracted', pkg: 'pkg_ob_accountopening',
    logic: ["Auto-generate RequestId: MAX(RequestId)+10 on form open (concurrency risk, use sequence in APEX)", "Validate phone: LENGTH(phone) = 10", "Validate email: value LIKE '%@%.com'", 'INSERT INTO GROUP1_ACCOUNTREQUEST on SUBMIT'],
    tables: ['GROUP1_ACCOUNTREQUEST'],
    note: 'Email validation is minimal (no regex). MAX+10 ID is race-prone. APEX rebuild should use Oracle sequences.',
  },
  {
    file: 'G1_ONLINEREGISTRATION', purpose: 'Online banking enrollment. Sets a login password for an already-approved account.',
    complexity: 'Medium', pkgStatus: 'extracted', pkg: 'pkg_ob_onlineregistration',
    logic: ["Check Online_registration != 'Y' (prevents double enrollment)", 'Validate password length >= 6 characters', 'Validate password = confirm_password match', "UPDATE GRP1_REGISTEREDINFO SET Online_registration='Y', password11=?"],
    tables: ['GRP1_REGISTEREDINFO'],
    note: 'Passwords stored plaintext; flag for APEX rebuild with APEX_UTIL.GET_HASH.',
  },
  {
    file: 'G1_TRANSACTIONENTRY', purpose: 'Submit a bank transaction (debit, credit, or cheque payment).',
    complexity: 'Medium', pkgStatus: 'extracted', pkg: 'pkg_ob_transactionentry',
    logic: ['Validate amount > 0 AND amount <= 9,999,999 (explicit 10-lakh cap)', 'Validate LENGTH(cheque_no) = 6 exactly', 'Auto-increment TransactionId: MAX+1 (race-prone, use sequence)', 'INSERT INTO GRP1_TRANSACTIONINFO'],
    tables: ['GRP1_TRANSACTIONINFO'],
    note: 'Account number received as CALL_FORM parameter P1 from login flow -> APEX session state.',
  },
  {
    file: 'G1_INTERESTCALCULATOR', alias: 'G1_SIMPLEINTEREST', purpose: 'Simple interest calculator for 7 loan product types. Hardcoded rate table. No DB interaction.',
    complexity: 'Medium', pkgStatus: 'extracted', pkg: 'pkg_ob_interestcalculator',
    logic: ['7 types: HOME(8%), EDUCATION(6%), AGRICULTURE(6%), TWO WHEELER(11%), FOUR WHEELER(12%), GOLD(10%), PERSONAL(11%)', 'Per-type eligible amount range validated on entry', 'Formula: SI = (P x R x T) / 100, extracted verbatim'],
    tables: [],
    note: 'FormModule name G1_SIMPLEINTEREST differs from file name G1_INTERESTCALCULATOR, which would cause runtime .fmx load failure. Rates should move to a DB table in APEX rebuild.',
  },
  {
    file: 'G1_MANAGERAPPROVAL', purpose: 'Manager workflow: view all ENTERED requests, approve (generating account number) or reject each.',
    complexity: 'High', pkgStatus: 'extracted', pkg: 'pkg_ob_managerapproval',
    logic: ["DB block: GROUP1_ACCOUNTREQUEST WHERE Status='ENTERED', 5-record scrollable view", "APPROVE: UPDATE status -> generate acct# -> INSERT into GRP1_REGISTEREDINFO", "Account# algorithm: AccountType(2) || FirstName(3) || lpad(MAX_seq+1,5,'0'), e.g. CUJoh00001", "REJECT: UPDATE Status='REJECTED'", 'DETAILS: navigate to G1_CUSTOMERDETAIL passing P5=RequestId'],
    tables: ['GROUP1_ACCOUNTREQUEST', 'GRP1_REGISTEREDINFO'],
    note: "Most complex module. Account# generation has collision risk under concurrent web sessions. Replace MAX() with a sequence in APEX. Default password '0000' inserted on approval; a security issue.",
  },
]
