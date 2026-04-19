import { useParams } from 'react-router-dom'
import LiveStreamRoom from '../components/LiveStreamRoom'

export default function AdminLiveViewerPage() {
  const { streamId } = useParams()

  return <LiveStreamRoom role="admin" initialRoomId={streamId || ''} autoStart={Boolean(streamId)} />
}
