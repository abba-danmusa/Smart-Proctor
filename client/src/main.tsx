import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
// import "@fontsource/inter/variable.css";
import App from './App.tsx'
import { Provider } from "@/components/ui/provider"
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "./theme";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <Provider>
        <App />
      </Provider>
    </ChakraProvider>
  </StrictMode>,
)
