-- Module: G1_INTERESTCALCULATOR (FormModule: G1_SIMPLEINTEREST)
-- Source: G1_INTERESTCALCULATOR_fmb.xml
-- Purpose: Simple interest calculator for loan products
-- APEX equivalent: APEX Dynamic Action or page computation (all client-side eligible)
--
-- No DB interaction in original form. All logic is trigger-based UI calculation.
-- Rate table and eligibility ranges extracted verbatim from WHEN-LIST-CHANGED trigger.

CREATE OR REPLACE PACKAGE pkg_ob_interestcalculator AS

    -- Loan type constants (as they appear in the Forms list item)
    C_HOME_LOAN        CONSTANT VARCHAR2(20) := 'HOME LOAN';
    C_EDUCATION_LOAN   CONSTANT VARCHAR2(20) := 'EDUCATION LOAN';
    C_AGRICULTURE_LOAN CONSTANT VARCHAR2(20) := 'AGRICULTURE LOAN';
    C_TWO_WHEELER      CONSTANT VARCHAR2(20) := 'TWO WHEELER LOAN';
    C_FOUR_WHEELER     CONSTANT VARCHAR2(20) := 'FOUR WHEELER LOAN';
    C_GOLD_LOAN        CONSTANT VARCHAR2(20) := 'GOLD LOAN';
    C_PERSONAL_LOAN    CONSTANT VARCHAR2(20) := 'PERSONAL LOAN';

    -- Returns the annual interest rate (%) for the given loan type.
    -- Returns NULL for an unrecognised type.
    FUNCTION get_rate(p_loan_type IN VARCHAR2) RETURN NUMBER;

    -- Validates whether the principal amount is within the eligible range
    -- for the given loan type. Returns TRUE if eligible.
    FUNCTION validate_amount(
        p_loan_type IN VARCHAR2,
        p_amount    IN NUMBER
    ) RETURN BOOLEAN;

    -- Calculates simple interest: SI = (P * R * T) / 100
    -- p_principal: loan amount; p_rate: annual % rate; p_years: tenure in years.
    -- Does not access the database.
    FUNCTION calculate_si(
        p_principal IN NUMBER,
        p_rate      IN NUMBER,
        p_years     IN NUMBER
    ) RETURN NUMBER;

    -- End-to-end: validate loan type + amount, compute SI.
    -- Returns the interest amount on success; raises exception on invalid input.
    FUNCTION calculate_loan_interest(
        p_loan_type IN  VARCHAR2,
        p_principal IN  NUMBER,
        p_years     IN  NUMBER,
        p_error_msg OUT VARCHAR2
    ) RETURN NUMBER;

END pkg_ob_interestcalculator;
/

CREATE OR REPLACE PACKAGE BODY pkg_ob_interestcalculator AS

    FUNCTION get_rate(p_loan_type IN VARCHAR2) RETURN NUMBER IS
    BEGIN
        -- Rates extracted verbatim from WHEN-LIST-CHANGED trigger
        CASE UPPER(p_loan_type)
            WHEN 'HOME LOAN'        THEN RETURN 8;
            WHEN 'EDUCATION LOAN'   THEN RETURN 6;
            WHEN 'AGRICULTURE LOAN' THEN RETURN 6;
            WHEN 'TWO WHEELER LOAN' THEN RETURN 11;
            WHEN 'FOUR WHEELER LOAN' THEN RETURN 12;
            WHEN 'GOLD LOAN'        THEN RETURN 10;
            WHEN 'PERSONAL LOAN'    THEN RETURN 11;
            ELSE RETURN NULL;
        END CASE;
    END get_rate;

    FUNCTION validate_amount(
        p_loan_type IN VARCHAR2,
        p_amount    IN NUMBER
    ) RETURN BOOLEAN IS
    BEGIN
        -- Amount eligibility ranges from WHEN-VALIDATE-ITEM trigger (verbatim)
        CASE UPPER(p_loan_type)
            WHEN 'HOME LOAN'         THEN RETURN p_amount BETWEEN 100000  AND 10000000;
            WHEN 'EDUCATION LOAN'    THEN RETURN p_amount BETWEEN 50000   AND 1500000;
            WHEN 'AGRICULTURE LOAN'  THEN RETURN p_amount BETWEEN 10000   AND 500000;
            WHEN 'TWO WHEELER LOAN'  THEN RETURN p_amount BETWEEN 20000   AND 200000;
            WHEN 'FOUR WHEELER LOAN' THEN RETURN p_amount BETWEEN 100000  AND 2000000;
            WHEN 'GOLD LOAN'         THEN RETURN p_amount BETWEEN 10000   AND 500000;
            WHEN 'PERSONAL LOAN'     THEN RETURN p_amount BETWEEN 10000   AND 500000;
            ELSE RETURN FALSE;
        END CASE;
    END validate_amount;

    FUNCTION calculate_si(
        p_principal IN NUMBER,
        p_rate      IN NUMBER,
        p_years     IN NUMBER
    ) RETURN NUMBER IS
    BEGIN
        -- Original formula: :T4 := (:T1 * :T2 * :T3) / 100
        RETURN (p_principal * p_rate * p_years) / 100;
    END calculate_si;

    FUNCTION calculate_loan_interest(
        p_loan_type IN  VARCHAR2,
        p_principal IN  NUMBER,
        p_years     IN  NUMBER,
        p_error_msg OUT VARCHAR2
    ) RETURN NUMBER IS
        v_rate NUMBER;
    BEGIN
        v_rate := get_rate(p_loan_type);

        IF v_rate IS NULL THEN
            p_error_msg := 'Unknown loan type: ' || p_loan_type;
            RETURN NULL;
        END IF;

        IF NOT validate_amount(p_loan_type, p_principal) THEN
            p_error_msg := 'Amount is outside the eligible range for ' || p_loan_type;
            RETURN NULL;
        END IF;

        p_error_msg := NULL;
        RETURN calculate_si(p_principal, v_rate, p_years);
    END calculate_loan_interest;

END pkg_ob_interestcalculator;
/
