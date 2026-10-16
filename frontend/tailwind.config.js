/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{js,jsx}'], darkMode: 'class', theme: { extend: { colors: { ink: '#101d2c', paper: '#f6f8fb', teal: '#22c7ae', amber: '#ffb454' }, fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] }, boxShadow: { soft: '0 16px 48px rgba(16,29,44,.08)' } } }, plugins: [] }
