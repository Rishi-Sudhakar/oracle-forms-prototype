-- Module: G1_TRANSACTIONDETAILS
-- Source: G1_TRANSACTIONDETAILS_fmb.xml
-- Purpose: Display transaction history for an account within a date range
-- APEX equivalent: Interactive Report with bind variables for account number + date range
--
-- The main query is a parameterised SELECT — no DML, no complex logic.
-- In APEX this becomes a report source query; this package exposes it as a REF CURSOR
-- for use in APEX REST services or page processes.

CREATE OR REPLACE PACKAGE pkg_ob_transactiondetails AS

    TYPE t_transaction_row IS RECORD (
        TransactionId   GRP1_TRANSACTIONINFO.TransactionId%TYPE,
        TransactionDate GRP1_TRANSACTIONINFO.TransactionDate%TYPE,
        Account_Number  GRP1_TRANSACTIONINFO.Account_Number%TYPE,
        Amount          GRP1_TRANSACTIONINFO.Amount%TYPE,
        ChequeNo        GRP1_TRANSACTIONINFO.ChequeNo%TYPE,
        Transaction_Type GRP1_TRANSACTIONINFO.Transaction_Type%TYPE
    );

    TYPE t_transaction_cursor IS REF CURSOR RETURN t_transaction_row;

    -- Validates the date range and returns a cursor over matching transactions.
    -- p_to_date must be <= SYSDATE and >= p_from_date.
    -- On validation failure returns NULL cursor and sets p_error_msg.
    PROCEDURE get_transactions(
        p_account_number IN  GRP1_TRANSACTIONINFO.Account_Number%TYPE,
        p_from_date      IN  DATE,
        p_to_date        IN  DATE,
        p_cursor         OUT t_transaction_cursor,
        p_error_msg      OUT VARCHAR2
    );

END pkg_ob_transactiondetails;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_transactiondetails AS

    PROCEDURE get_transactions(
        p_account_number IN  GRP1_TRANSACTIONINFO.Account_Number%TYPE,
        p_from_date      IN  DATE,
        p_to_date        IN  DATE,
        p_cursor         OUT t_transaction_cursor,
        p_error_msg      OUT VARCHAR2
    ) IS
    BEGIN
        -- Original date validation:
        -- IF :T2 > SYSDATE THEN fnd_message.set_string('PLEASE ENTER VALID DATE')
        -- IF :T1 > :T2     THEN fnd_message.set_string('FROM DATE SHOULD BE LESSER')
        IF p_to_date > SYSDATE THEN
            p_error_msg := 'To-date cannot be in the future';
            RETURN;
        END IF;

        IF p_from_date > p_to_date THEN
            p_error_msg := 'From-date must be on or before To-date';
            RETURN;
        END IF;

        -- Original WHERE clause from DB block:
        -- Account_Number = :T3 AND TransactionDate BETWEEN :T1 AND :T2
        OPEN p_cursor FOR
            SELECT TransactionId, TransactionDate, Account_Number,
                   Amount, ChequeNo, Transaction_Type
              FROM GRP1_TRANSACTIONINFO
             WHERE Account_Number   = p_account_number
               AND TransactionDate BETWEEN p_from_date AND p_to_date
             ORDER BY TransactionDate DESC;

        p_error_msg := NULL;

    EXCEPTION
        WHEN OTHERS THEN
            p_error_msg := SQLERRM;
    END get_transactions;

END pkg_ob_transactiondetails;
/
