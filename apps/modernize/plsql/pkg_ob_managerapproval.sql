-- Module: G1_MANAGERAPPROVAL
-- Source: G1_MANAGERAPPROVAL_fmb.xml
-- Purpose: Manager workflow — query pending requests, approve (generating account number) or reject
-- APEX equivalent: Interactive Report on GROUP1_ACCOUNTREQUEST filtered by Status='ENTERED',
--                  with row-level Approve/Reject buttons calling these procedures
--
-- Most complex module. Account number generation algorithm extracted verbatim from trigger.
-- Table notes: Forms use G1_ACCOUNTREQUEST → GROUP1_ACCOUNTREQUEST
--              Forms use G1_REGISTEREDINFO  → GRP1_REGISTEREDINFO
-- Security note: Manager auth is hardcoded credentials in G1_MANAGERLOGINPAGE — not in DB.
--   In APEX, replace with proper role-based access control.

CREATE OR REPLACE PACKAGE pkg_ob_managerapproval AS

    -- Approves a pending account request and creates the registered account record.
    -- Generates an account number using the original Forms algorithm:
    --   AccountType(2 chars) || FirstName(first 3 chars) || lpad(next_seq, 5, '0')
    -- Returns TRUE on success.
    FUNCTION approve_request(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN;

    -- Rejects a pending account request.
    FUNCTION reject_request(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN;

    -- Pure helper: generates an account number from the given request details.
    -- Exposed separately so it can be unit-tested without side effects.
    FUNCTION generate_account_number(
        p_account_type IN VARCHAR2,
        p_first_name   IN VARCHAR2
    ) RETURN VARCHAR2;

END pkg_ob_managerapproval;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_managerapproval AS

    FUNCTION generate_account_number(
        p_account_type IN VARCHAR2,
        p_first_name   IN VARCHAR2
    ) RETURN VARCHAR2 IS
        v_seq_part  VARCHAR2(5);
        v_type_part VARCHAR2(2);
        v_name_part VARCHAR2(3);
        v_max_seq   NUMBER;
    BEGIN
        -- Original APPROVE button logic (verbatim extraction):
        --   SELECT lpad(max(substr(Account_Number,6,5)+1),5,0)
        --     INTO A FROM G1_REGISTEREDINFO
        -- This extracts the numeric suffix starting at position 6, finds the max, adds 1,
        -- and zero-pads to 5 digits. First record seeds at '00001'.
        --
        -- NOTE: This only works correctly when Account_Number is varchar2 (not NUMBER).
        -- The original schema defined Account_Number as NUMBER(6) — a type mismatch
        -- that would fail at INSERT. Schema was corrected to VARCHAR2(15) when loaded.
        SELECT NVL(MAX(TO_NUMBER(SUBSTR(Account_Number, 6, 5))), 0) + 1
          INTO v_max_seq
          FROM GRP1_REGISTEREDINFO;

        v_seq_part  := LPAD(v_max_seq, 5, '0');
        v_type_part := SUBSTR(p_account_type, 1, 2);   -- first 2 chars of account type
        v_name_part := SUBSTR(p_first_name,   1, 3);   -- first 3 chars of first name

        -- Original: K := C || B || A  (type || name || seq)
        -- Example: AccountType='CURRENT', FirstName='John' → 'CUJoh00001'
        RETURN v_type_part || v_name_part || v_seq_part;
    END generate_account_number;

    FUNCTION approve_request(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN IS
        v_account_number VARCHAR2(15);
        v_first_name     GROUP1_ACCOUNTREQUEST.FirstName%TYPE;
        v_last_name      GROUP1_ACCOUNTREQUEST.LastName%TYPE;
        v_account_type   GROUP1_ACCOUNTREQUEST.AccountType%TYPE;
        v_branch         GROUP1_ACCOUNTREQUEST.Branch%TYPE;
        v_title          GROUP1_ACCOUNTREQUEST.Title%TYPE;
        v_dob            GROUP1_ACCOUNTREQUEST.DOB%TYPE;
        v_work_phone     GROUP1_ACCOUNTREQUEST.WorkPhone%TYPE;
        v_home_phone     GROUP1_ACCOUNTREQUEST.HomePhone%TYPE;
        v_address        GROUP1_ACCOUNTREQUEST.Address%TYPE;
        v_state          GROUP1_ACCOUNTREQUEST.State%TYPE;
        v_zip            GROUP1_ACCOUNTREQUEST.Zip%TYPE;
        v_email          GROUP1_ACCOUNTREQUEST.Email%TYPE;
    BEGIN
        -- Original APPROVE trigger step 1:
        -- UPDATE G1_ACCOUNTREQUEST SET STATUS='APPROVED' WHERE RequestId=:T1
        UPDATE GROUP1_ACCOUNTREQUEST
           SET Status = 'APPROVED'
         WHERE RequestId = p_request_id;

        IF SQL%ROWCOUNT = 0 THEN
            p_error_msg := 'Request not found: ' || p_request_id;
            RETURN FALSE;
        END IF;

        -- Fetch details needed for account number generation and REGISTEREDINFO insert
        SELECT FirstName, LastName, AccountType, Branch, Title,
               DOB, WorkPhone, HomePhone, Address, State, Zip, Email
          INTO v_first_name, v_last_name, v_account_type, v_branch, v_title,
               v_dob, v_work_phone, v_home_phone, v_address, v_state, v_zip, v_email
          FROM GROUP1_ACCOUNTREQUEST
         WHERE RequestId = p_request_id;

        -- Generate account number (original steps 2-4)
        v_account_number := generate_account_number(v_account_type, v_first_name);

        -- Original APPROVE trigger final step:
        -- INSERT INTO G1_REGISTEREDINFO VALUES(:T1, K, v.branch, v.accounttype,
        --   v.title, v.firstname, v.lastname, v.dob, v.workphone, v.homephone,
        --   v.address, v.state, v.zip, v.email, 'N', '0000')
        -- NOTE: Default password '0000' is a security issue — flag for APEX rebuild.
        INSERT INTO GRP1_REGISTEREDINFO (
            RequestId, Account_Number, Branch, Account_Type, Title,
            FirstName, LastName, DOB, WorkPhone, HomePhone,
            Address, State, Zip, Email, Online_registration, password11
        ) VALUES (
            p_request_id, v_account_number, v_branch, v_account_type, v_title,
            v_first_name, v_last_name, v_dob, v_work_phone, v_home_phone,
            v_address, v_state, v_zip, v_email, 'N', '0000'
        );

        COMMIT;
        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END approve_request;

    FUNCTION reject_request(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN IS
    BEGIN
        -- Original REJECT button: UPDATE G1_ACCOUNTREQUEST SET STATUS='REJECTED' WHERE RequestId=:T1
        UPDATE GROUP1_ACCOUNTREQUEST
           SET Status = 'REJECTED'
         WHERE RequestId = p_request_id;

        IF SQL%ROWCOUNT = 0 THEN
            p_error_msg := 'Request not found: ' || p_request_id;
            RETURN FALSE;
        END IF;

        COMMIT;
        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END reject_request;

END pkg_ob_managerapproval;
/
