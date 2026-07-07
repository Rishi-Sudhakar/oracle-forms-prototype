-- Module: G1_LOGIN
-- Source: G1_LOGIN_fmb.xml
-- Purpose: Customer login — validates account number + password, returns session token
-- APEX equivalent: APEX authentication scheme or login page validation process
--
-- Schema note: Forms query column PASSWORD11; schema was corrected to PASSWORD11 to match.
-- Table note: Forms reference G1_REGISTEREDINFO; actual table is GRP1_REGISTEREDINFO.
-- Navigation note: CALL_FORM → G1_TRANSACTIONENTRY has no APEX equivalent.
--   In APEX, replace with: apex_util.set_session_state + redirect to target page.

CREATE OR REPLACE PACKAGE pkg_ob_login AS

    -- Authenticates a customer. Returns TRUE if valid, FALSE otherwise.
    -- On success, p_error_msg is NULL. On failure, contains the reason.
    FUNCTION authenticate_customer(
        p_account_number IN  GRP1_REGISTEREDINFO.Account_Number%TYPE,
        p_password       IN  VARCHAR2,
        p_error_msg      OUT VARCHAR2
    ) RETURN BOOLEAN;

END pkg_ob_login;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_login AS

    FUNCTION authenticate_customer(
        p_account_number IN  GRP1_REGISTEREDINFO.Account_Number%TYPE,
        p_password       IN  VARCHAR2,
        p_error_msg      OUT VARCHAR2
    ) RETURN BOOLEAN IS
        v_stored_password GRP1_REGISTEREDINFO.password11%TYPE;
    BEGIN
        -- Original Forms trigger: SELECT password11 INTO A FROM G1_REGISTEREDINFO
        --                         WHERE Account_Number = :T1
        SELECT password11
          INTO v_stored_password
          FROM GRP1_REGISTEREDINFO
         WHERE Account_Number = p_account_number;

        IF p_password = v_stored_password THEN
            p_error_msg := NULL;
            RETURN TRUE;
        ELSE
            p_error_msg := 'INVALID CREDENTIALS';
            RETURN FALSE;
        END IF;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            p_error_msg := 'INVALID CREDENTIALS';
            RETURN FALSE;
    END authenticate_customer;

END pkg_ob_login;
/
