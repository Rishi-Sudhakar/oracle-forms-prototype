-- Module: G1_ACCOUNTOPENING
-- Source: G1_ACCOUNTOPENING_fmb.xml
-- Purpose: Collects and submits a new account application request
-- APEX equivalent: APEX form page with page-level validations + process (DML)
--
-- Table note: Forms reference G1_ACCOUNTREQUEST; actual table is GROUP1_ACCOUNTREQUEST.
-- RequestId strategy: Forms uses MAX(REQUESTID)+10 on WHEN-NEW-FORM-INSTANCE.
--   APEX replacement: use a sequence (safer under concurrency).

CREATE OR REPLACE PACKAGE pkg_ob_accountopening AS

    -- Validates a phone number: must be exactly 10 digits.
    FUNCTION validate_phone(p_phone IN NUMBER) RETURN BOOLEAN;

    -- Validates an email address: must contain '@' and end with '.com'.
    FUNCTION validate_email(p_email IN VARCHAR2) RETURN BOOLEAN;

    -- Returns the next RequestId using the Forms-original algorithm (MAX+10).
    -- In production APEX use a sequence instead.
    FUNCTION get_next_request_id RETURN NUMBER;

    -- Submits a new account request after full validation.
    -- Returns TRUE on success. p_error_msg contains the first validation failure.
    FUNCTION submit_account_request(
        p_request_id   IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_branch       IN  GROUP1_ACCOUNTREQUEST.Branch%TYPE,
        p_account_type IN  GROUP1_ACCOUNTREQUEST.AccountType%TYPE,
        p_title        IN  GROUP1_ACCOUNTREQUEST.Title%TYPE,
        p_first_name   IN  GROUP1_ACCOUNTREQUEST.FirstName%TYPE,
        p_last_name    IN  GROUP1_ACCOUNTREQUEST.LastName%TYPE,
        p_dob          IN  GROUP1_ACCOUNTREQUEST.DOB%TYPE,
        p_work_phone   IN  GROUP1_ACCOUNTREQUEST.WorkPhone%TYPE,
        p_home_phone   IN  GROUP1_ACCOUNTREQUEST.HomePhone%TYPE,
        p_address      IN  GROUP1_ACCOUNTREQUEST.Address%TYPE,
        p_state        IN  GROUP1_ACCOUNTREQUEST.State%TYPE,
        p_zip          IN  GROUP1_ACCOUNTREQUEST.Zip%TYPE,
        p_email        IN  GROUP1_ACCOUNTREQUEST.Email%TYPE,
        p_error_msg    OUT VARCHAR2
    ) RETURN BOOLEAN;

END pkg_ob_accountopening;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_accountopening AS

    FUNCTION validate_phone(p_phone IN NUMBER) RETURN BOOLEAN IS
    BEGIN
        -- Original: IF NOT LENGTH(:WORK_PHONE) = 10 THEN ... END IF
        RETURN LENGTH(TO_CHAR(p_phone)) = 10;
    END validate_phone;

    FUNCTION validate_email(p_email IN VARCHAR2) RETURN BOOLEAN IS
    BEGIN
        -- Original: IF email_input NOT LIKE '%@%.com' THEN ... END IF
        RETURN p_email LIKE '%@%.com';
    END validate_email;

    FUNCTION get_next_request_id RETURN NUMBER IS
        v_max NUMBER;
    BEGIN
        -- Original WHEN-NEW-FORM-INSTANCE:
        -- SELECT MAX(REQUESTID) INTO V FROM G1_ACCOUNTREQUEST; :REQUESTID := V + 10;
        SELECT NVL(MAX(RequestId), 0) + 10
          INTO v_max
          FROM GROUP1_ACCOUNTREQUEST;
        RETURN v_max;
    END get_next_request_id;

    FUNCTION submit_account_request(
        p_request_id   IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_branch       IN  GROUP1_ACCOUNTREQUEST.Branch%TYPE,
        p_account_type IN  GROUP1_ACCOUNTREQUEST.AccountType%TYPE,
        p_title        IN  GROUP1_ACCOUNTREQUEST.Title%TYPE,
        p_first_name   IN  GROUP1_ACCOUNTREQUEST.FirstName%TYPE,
        p_last_name    IN  GROUP1_ACCOUNTREQUEST.LastName%TYPE,
        p_dob          IN  GROUP1_ACCOUNTREQUEST.DOB%TYPE,
        p_work_phone   IN  GROUP1_ACCOUNTREQUEST.WorkPhone%TYPE,
        p_home_phone   IN  GROUP1_ACCOUNTREQUEST.HomePhone%TYPE,
        p_address      IN  GROUP1_ACCOUNTREQUEST.Address%TYPE,
        p_state        IN  GROUP1_ACCOUNTREQUEST.State%TYPE,
        p_zip          IN  GROUP1_ACCOUNTREQUEST.Zip%TYPE,
        p_email        IN  GROUP1_ACCOUNTREQUEST.Email%TYPE,
        p_error_msg    OUT VARCHAR2
    ) RETURN BOOLEAN IS
    BEGIN
        -- Required-field checks (mirrors SUBMIT button null checks in original form)
        IF p_branch IS NULL THEN
            p_error_msg := 'Branch is required'; RETURN FALSE;
        END IF;
        IF p_account_type IS NULL THEN
            p_error_msg := 'Account Type is required'; RETURN FALSE;
        END IF;
        IF p_title IS NULL THEN
            p_error_msg := 'Title is required'; RETURN FALSE;
        END IF;
        IF p_first_name IS NULL THEN
            p_error_msg := 'First Name is required'; RETURN FALSE;
        END IF;
        IF p_last_name IS NULL THEN
            p_error_msg := 'Last Name is required'; RETURN FALSE;
        END IF;
        IF p_dob IS NULL THEN
            p_error_msg := 'Date of Birth is required'; RETURN FALSE;
        END IF;

        -- Phone validation
        IF NOT validate_phone(p_work_phone) THEN
            p_error_msg := 'ENTER VALID NUMBER (Work Phone must be 10 digits)';
            RETURN FALSE;
        END IF;
        IF NOT validate_phone(p_home_phone) THEN
            p_error_msg := 'ENTER VALID NUMBER (Home Phone must be 10 digits)';
            RETURN FALSE;
        END IF;

        IF p_address IS NULL THEN
            p_error_msg := 'Address is required'; RETURN FALSE;
        END IF;
        IF p_state IS NULL THEN
            p_error_msg := 'State is required'; RETURN FALSE;
        END IF;
        IF p_zip IS NULL THEN
            p_error_msg := 'Zip is required'; RETURN FALSE;
        END IF;

        -- Email validation
        IF NOT validate_email(p_email) THEN
            p_error_msg := 'Please enter a valid email address!';
            RETURN FALSE;
        END IF;

        -- Original SUBMIT INSERT:
        -- INSERT INTO G1_ACCOUNTREQUEST VALUES(:requestid,:branch,:account_type,
        --   :title,:firstname,:lastname,TO_DATE(:dob,'dd-mon-yy'),
        --   :work_phone,:home_phone,:address,:state,:zip,:email)
        INSERT INTO GROUP1_ACCOUNTREQUEST (
            RequestId, Branch, AccountType, Title, FirstName, LastName,
            DOB, WorkPhone, HomePhone, Address, State, Zip, Email
        ) VALUES (
            p_request_id, p_branch, p_account_type, p_title, p_first_name, p_last_name,
            p_dob, p_work_phone, p_home_phone, p_address, p_state, p_zip, p_email
        );

        COMMIT;
        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END submit_account_request;

END pkg_ob_accountopening;
/
