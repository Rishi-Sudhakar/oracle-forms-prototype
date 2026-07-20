/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#EEF2FF',
                    100: '#E0E7FF',
                    200: '#C7D2FE',
                    300: '#A5B4FC',
                    400: '#818CF8',
                    500: '#6366F1',
                    600: '#4F46E5',
                    700: '#4338CA',
                    800: '#3730A3',
                    900: '#312E81',
                },
                // Oracle APEX Redwood Theme Colors
                redwood: {
                    // Neutral palette
                    neutral: {
                        50: '#FAFAF9',
                        100: '#F5F5F4',
                        200: '#E7E5E4',
                        300: '#D6D3D1',
                        400: '#A8A29E',
                        500: '#78716C',
                        600: '#57534E',
                        700: '#44403C',
                        800: '#292524',
                        900: '#1C1917',
                    },
                    // Brand colors
                    brand: '#C74634',  // Oracle Red
                    accent: '#312D2A',
                    link: '#0572CE',
                    success: '#1E8E3E',
                    warning: '#F29900',
                    danger: '#D14343',
                    info: '#0572CE',
                    // Page Designer specific
                    region: {
                        bg: '#FFFFFF',
                        border: '#E2E1DF',
                        header: '#F7F6F5',
                        title: '#201F1E',
                    },
                    field: {
                        bg: '#FFFFFF',
                        border: '#C9C7C5',
                        focus: '#0572CE',
                        label: '#201F1E',
                        placeholder: '#706D6A',
                    },
                    grid: {
                        header: '#F7F6F5',
                        row: '#FFFFFF',
                        rowAlt: '#FAFAF9',
                        border: '#E2E1DF',
                    }
                },
                apex: {
                    bg: '#F8FAFC',
                    surface: '#FFFFFF',
                    border: '#E2E8F0',
                    text: '#0F172A',
                    muted: '#64748B',
                }
            },
            fontFamily: {
                sans: ['Oracle Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'monospace'],
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'region': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'region-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1)',
                'field-focus': '0 0 0 3px rgba(5, 114, 206, 0.2)',
            },
            animation: {
                'region-highlight': 'regionHighlight 0.3s ease-out',
            },
            keyframes: {
                regionHighlight: {
                    '0%': { boxShadow: '0 0 0 2px rgba(5, 114, 206, 0.5)' },
                    '100%': { boxShadow: '0 0 0 0px rgba(5, 114, 206, 0)' },
                }
            }
        },
    },
    plugins: [],
}

