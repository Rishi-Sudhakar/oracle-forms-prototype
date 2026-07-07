-- Module: G1_TRANSACTIONENTRY
-- Source: G1_TRANSACTIONENTRY_fmb.xml
-- Purpose: Submit a bank transaction (debit/credit/cheque)
-- APEX equivalent: APEX form page with validations + DML process
--
-- Table note: Forms reference G1_TRANSACTIONINFO → GRP1_TRANSACTIONINFO.
-- TransactionId: Forms use MAX+1 (race-prone). APEX replacement: use a sequence.
-- Account number received as parameter P1 from G1_LOGIN (CALL_FORM).
--   APEX replacement: read from APEX session state (e.g. APP_USER context or prior page item).

CREATE OR REPLACE PACKAGE pkg_ob_transactionentry AS

    -- Returns next TransactionId using the Forms-original MAX+1 algorithm.
    -- In production APEX, use a sequence.
    FUNCTION get_next_transaction_id RETURN NUMBER;

    -- Submits a transaction after validation.
    -- Validates: amount > 0 and <= 9999999 (7 digits = 10 lakh limit),
    --            cheque number exactly 6 digits, transaction type not null.
    -- Returns TRUE on success.
    FUNCTION submit_transaction(
        p_transaction_id   IN  GRP1_TRANSACTIONINFO.TransactionId%TYPE,
        p_account_number   IN  GRP1_TRANSACTIONINFO.Account_Number%TYPE,
        p_transaction_date IN  GRP1_TRANSACTIONINFO.TransactionDate%TYPE,
        p_amount           IN  GRP1_TRANSACTIONINFO.Amount%TYPE,
        p_cheque_no        IN  GRP1_TRANSACTIONINFO.ChequeNo%TYPE,
        p_transaction_type IN  GRP1_TRANSACTIONINFO.Transaction_Type%TYPE,
        p_error_msg        OUT VARCHAR2
    ) RETURN BOOLEAN;

END pkg_ob_transactionentry;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_transactionentry AS

    FUNCTION get_next_transaction_id RETURN NUMBER IS
        v_max NUMBER;
    BEGIN
        -- Original WHEN-NEW-FORM-INSTANCE:
        -- SELECT MAX(TransactionId) INTO V FROM G1_TRANSACTIONINFO; V:=V+1; :T1:=V;
        SELECT NVL(MAX(TransactionId), 0) + 1
          INTO v_max
          FROM GRP1_TRANSACTIONINFO;
        RETURN v_max;
    END get_next_transaction_id;

    FUNCTION submit_transaction(
        p_transaction_id   IN  GRP1_TRANSACTIONINFO.TransactionId%TYPE,
        p_account_number   IN  GRP1_TRANSACTIONINFO.Account_Number%TYPE,
        p_transaction_date IN  GRP1_TRANSACTIONINFO.TransactionDate%TYPE,
        p_amount           IN  GRP1_TRANSACTIONINFO.Amount%TYPE,
        p_cheque_no        IN  GRP1_TRANSACTIONINFO.ChequeNo%TYPE,
        p_transaction_type IN  GRP1_TRANSACTIONINFO.Transaction_Type%TYPE,
        p_error_msg        OUT VARCHAR2
    ) RETURN BOOLEAN IS
    BEGIN
        -- Amount validation
        -- Original WHEN-VALIDATE-ITEM: amount > 0 and LENGTH(amount) <= 7 (10 lakh cap)
        IF p_amount IS NULL OR p_amount <= 0 THEN
            p_error_msg := 'Amount must be greater than 0';
            RETURN FALSE;
        END IF;
        IF p_amount > 9999999 THEN
            p_error_msg := 'Amount cannot exceed 9,999,999 (10 lakh limit)';
            RETURN FALSE;
        END IF;

        -- Cheque number validation: exactly 6 digits
        -- Original: IF LENGTH(:T5) <> 6 THEN ...
        IF LENGTH(TO_CHAR(p_cheque_no)) != 6 THEN
            p_error_msg := 'Cheque number must be exactly 6 digits';
            RETURN FALSE;
        END IF;

        -- Transaction type required
        IF p_transaction_type IS NULL THEN
            p_error_msg := 'Transaction type is required';
            RETURN FALSE;
        END IF;

        -- Original SUBMIT button:
        -- INSERT INTO G1_TRANSACTIONINFO VALUES(:T1,:T3,:T2,:T4,:T5,:T6)
        -- Column order from schema: TransactionId, TransactionDate, Account_Number,
        --                           Amount, ChequeNo, Transaction_Type
        INSERT INTO GRP1_TRANSACTIONINFO (
            TransactionId, TransactionDate, Account_Number,
            Amount, ChequeNo, Transaction_Type
        ) VALUES (
            p_transaction_id,
            NVL(p_transaction_date, SYSDATE),
            p_account_number,
            p_amount,
            p_cheque_no,
            p_transaction_type
        );

        COMMIT;
        p_error_msg := NULL;
        RETURN TRUE;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_error_msg := SQLERRM;
            RETURN FALSE;
    END submit_transaction;

END pkg_ob_transactionentry;
/
