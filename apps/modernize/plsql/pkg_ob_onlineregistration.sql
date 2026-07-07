-- Module: G1_ONLINEREGISTRATION
-- Source: G1_ONLINEREGISTRATION_fmb.xml
-- Purpose: Enroll an approved account for online banking (set a password)
-- APEX equivalent: APEX form page with validations + DML process
--
-- Column note: Forms UPDATE column PASSWORD11; schema corrected to PASSWORD11 to match.
-- Table note: Forms reference G1_REGISTEREDINFO; actual table is GRP1_REGISTEREDINFO.

CREATE OR REPLACE PACKAGE pkg_ob_onlineregistration AS

    -- Registers an account for online banking.
    -- Validates: account exists + approved, not already registered,
    --            password >= 6 chars, passwords match.
    -- Returns TRUE on success; p_error_msg contains failure reason.
    FUNCTION register_online(
        p_account_number  IN  GRP1_REGISTEREDINFO.Account_Number%TYPE,
        p_password        IN  VARCHAR2,
        p_confirm_password IN VARCHAR2,
        p_error_msg       OUT VARCHAR2
    ) RETURN BOOLEAN;

END pkg_ob_onlineregistration;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_onlineregistration AS

    FUNCTION register_online(
        p_account_number  IN  GRP1_REGISTEREDINFO.Account_Number%TYPE,
        p_password        IN  VARCHAR2,
        p_confirm_password IN VARCHAR2,
        p_error_msg       OUT VARCHAR2
    ) RETURN BOOLEAN IS
        v_online_reg GRP1_REGISTEREDINFO.Online_registration%TYPE;
    BEGIN
        -- PRE-TEXT-ITEM equivalent: check if account exists and is not already registered.
        -- Original: SELECT ONLINE_REGISTRATION INTO temp FROM G1_REGISTEREDINFO
        --           WHERE ACCOUNT_NUMBER = :T3
        --           IF temp = 'Y' THEN RAISE FORM_TRIGGER_FAILURE
        BEGIN
            SELECT Online_registration
              INTO v_online_reg
              FROM GRP1_REGISTEREDINFO
             WHERE Account_Number = p_account_number;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                p_error_msg := 'Account not found. Account must be approved before online registration.';
                RETURN FALSE;
        END;

        IF v_online_reg = 'Y' THEN
            p_error_msg := 'This account is already registered for online banking.';
            RETURN FALSE;
        END IF;

        -- Password length check (original: 6-char minimum, inferred from form field maxlen)
        IF LENGTH(p_password) < 6 THEN
            p_error_msg := 'Password must be at least 6 characters.';
            RETURN FALSE;
        END IF;

        -- Password match check
        -- Original REGISTER button: IF NOT :T2 = :T1 THEN FND_MESSAGE.SET_STRING('PASSWORD IS NOT MATCHING')
        IF p_password != p_confirm_password THEN
            p_error_msg := 'PASSWORD IS NOT MATCHING';
            RETURN FALSE;
        END IF;

        -- Original UPDATE:
        -- UPDATE G1_REGISTEREDINFO SET ONLINE_REGISTRATION='Y', PASSWORD11=:T1
        -- WHERE ACCOUNT_NUMBER=:T3
        UPDATE GRP1_REGISTEREDINFO
           SET Online_registration = 'Y',
               password11          = p_password
         WHERE Account_Number = p_account_number;

        COMMIT;
        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END register_online;

END pkg_ob_onlineregistration;
/
