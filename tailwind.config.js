import { heroui } from "@heroui/react";
import defaultTheme from "tailwindcss/defaultTheme";

const COLORS = {
  primary: {
    DEFAULT: "#ff541e",
    '50': '#fff4ed',
    '100': '#ffe6d4',
    '200': '#ffc8a8',
    '300': '#ffa270',
    '400': '#ff6f37',
    '500': '#ff541e',
    '600': '#f02e06',
    '700': '#c71e07',
    '800': '#9e1a0e',
    '900': '#7f190f',
    '950': '#450805',
  },
  secondary: {
    DEFAULT: "#0071bb",
    '50': '#f0f8ff',
    '100': '#e0f0fe',
    '200': '#b9e2fe',
    '300': '#7cccfd',
    '400': '#36b3fa',
    '500': '#0c9aeb',
    '600': '#0071bb',
    '700': '#0160a3',
    '800': '#065286',
    '900': '#0b446f',
    '950': '#072b4a',
  },
  background: {
    DEFAULT: "#e5e5e5",
    '50': '#FFFFFF',
    '100': '#ededed',
    '200': '#e5e5e5',
    '300': '#c8c8c8',
    '400': '#adadad',
    '500': '#999999',
    '600': '#888888',
    '700': '#7b7b7b',
    '800': '#676767',
    '900': '#545454',
    '950': '#363636',
  },
  danger: {
    DEFAULT: '#ff1e1e', 
    '50': '#fff1f1',
    '100': '#ffdfdf',
    '200': '#ffc5c5',
    '300': '#ff9d9d',
    '400': '#ff6464',
    '500': '#ff1e1e',
    '600': '#ed1515',
    '700': '#c80d0d',
    '800': '#a50f0f',
    '900': '#881414',
    '950': '#4b0404',
  },
  warning: {
    '50': '#fffbeb',
    '100': '#fff3c6',
    '200': '#ffe788',
    '300': '#fed34b',
    '400': '#fec431',
    '500': '#f89e08',
    '600': '#dc7603',
    '700': '#b65207',
    '800': '#943f0c',
    '900': '#79350e',
    '950': '#461a02',
    DEFAULT: '#fec431'
  },
  success: {
    '50': '#eafff4',
    '100': '#ccffe3',
    '200': '#9dfdce',
    '300': '#5ef7b5',
    '400': '#16d98c',
    '500': '#00d083',
    '600': '#00a96b',
    '700': '#00885a',
    '800': '#006b48',
    '900': '#00583d',
    '950': '#003223',
    DEFAULT: '#16D98C'
  },
  info: {
    '50': '#f0f3fe',
    '100': '#dde4fc',
    '200': '#c3d0fa',
    '300': '#9ab3f6',
    '400': '#6a8cf0',
    '500': '#3a5ae9',
    '600': '#3146df',
    '700': '#2934cc',
    '800': '#272ca6',
    '900': '#252a83',
    '950': '#1b1d50',
    DEFAULT: '#3A5AE9'
  },
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...COLORS,
      },
      fontFamily: {
        sans: ["'Univers'", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "light",
    }),
  ],
};
