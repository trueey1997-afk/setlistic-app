import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './assets/fonts/fonts.css'
import App from './App'
import { applyStoredTheme } from './lib/theme'
import { system } from './theme/system'

applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <App />
    </ChakraProvider>
  </StrictMode>
)
