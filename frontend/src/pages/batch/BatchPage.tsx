import { useParams } from 'react-router-dom'
import { Compose } from './components/BatchCompose'
import { Watch } from './components/BatchWatch'

export default function BatchPage() {
  const { runId = '' } = useParams()
  return runId ? <Watch runId={runId} /> : <Compose />
}
