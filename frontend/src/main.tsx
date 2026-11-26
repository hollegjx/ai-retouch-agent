import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { ApiError } from '@/request'
import { ME_KEY } from '@/hooks/useAuth'
import '@/index.css'

const handleAuthError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(ME_KEY, null)
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
