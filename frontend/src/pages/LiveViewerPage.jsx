import { useParams } from 'react-router-dom'
import LiveStreamRoom from '../components/LiveStreamRoom'

export default function LiveViewerPage() {
  const { streamId } = useParams()
  return <LiveStreamRoom role="viewer" initialRoomId={streamId || ''} />
}