-- Module: G1_CHECKSTATUS (FormModule: G1_CHECKSTATUS1)
-- Source: G1_CHECKSTATUS_fmb.xml
-- Purpose: Customer self-service: check account application status by RequestId
-- APEX equivalent: APEX page with a search field and display-only items

CREATE OR REPLACE PACKAGE pkg_ob_checkstatus AS

    -- Result type for status check
    TYPE t_status_result IS RECORD (
        status         GROUP1_ACCOUNTREQUEST.Status%TYPE,
        account_number GRP1_REGISTEREDINFO.Account_Number%TYPE,  -- populated if APPROVED
        message        VARCHAR2(200)
    );

    -- Returns the status and a human-readable message for the given RequestId.
    -- Mirrors the CHECK button logic from G1_CHECKSTATUS1 form.
    FUNCTION check_request_status(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_result     OUT t_status_result,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN;

END pkg_ob_checkstatus;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_checkstatus AS

    FUNCTION check_request_status(
        p_request_id IN  GROUP1_ACCOUNTREQUEST.RequestId%TYPE,
        p_result     OUT t_status_result,
        p_error_msg  OUT VARCHAR2
    ) RETURN BOOLEAN IS
        v_status GROUP1_ACCOUNTREQUEST.Status%TYPE;
        v_acct   GRP1_REGISTEREDINFO.Account_Number%TYPE;
    BEGIN
        -- Original CHECK button:
        -- SELECT status INTO v FROM G1_ACCOUNTREQUEST WHERE requestid=:T1
        BEGIN
            SELECT Status
              INTO v_status
              FROM GROUP1_ACCOUNTREQUEST
             WHERE RequestId = p_request_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                p_error_msg := 'No application found for Request ID: ' || p_request_id;
                RETURN FALSE;
        END;

        p_result.status := v_status;

        IF v_status = 'APPROVED' THEN
            -- Original: SELECT Account_Number INTO a FROM G1_REGISTEREDINFO WHERE requestid=:T1
            SELECT Account_Number
              INTO v_acct
              FROM GRP1_REGISTEREDINFO
             WHERE RequestId = p_request_id;

            p_result.account_number := v_acct;
            p_result.message        := 'Your account has been approved. Account Number: ' || v_acct;

        ELSIF v_status = 'ENTERED' THEN
            p_result.account_number := NULL;
            p_result.message        := 'Your application is pending review.';

        ELSIF v_status = 'REJECTED' THEN
            p_result.account_number := NULL;
            p_result.message        := 'Your application has been rejected.';

        ELSE
            p_result.account_number := NULL;
            p_result.message        := 'Unknown status: ' || v_status;
        END IF;

        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END check_request_status;

END pkg_ob_checkstatus;
/
