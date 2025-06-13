// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // Dark mode
    primary: {
      main: '#0288d1' // Mavi ton
    },
    secondary: {
      main: '#cddc39' // Yeşilimsi
    },
    background: {
      default: '#121212', // arka plan
      paper: '#1d1d1d'    // Card vb.
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif'
  }
});

export default theme;
