import { useParams, useSearchParams } from 'react-router-dom'
import LiveStreamRoom from '../components/LiveStreamRoom'

export default function LiveViewerPage() {
  const { streamId } = useParams()
  const [searchParams] = useSearchParams()
  const accessCode = String(searchParams.get('code') || '').trim()

  return <LiveStreamRoom role="viewer" initialRoomId={streamId || ''} autoStart={Boolean(streamId)} accessCode={accessCode} />
}