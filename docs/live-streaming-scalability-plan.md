# Live Streaming Scalability Plan

This document defines a safe migration path from the current low-latency WebRTC setup to large-scale live delivery with Hybrid SFU and HLS.

## Current state (implemented)

- WebRTC-based live streaming rooms
- Real-time comments via WebSockets
- Likes, emoji reactions, and live viewer count
- Authenticated joins and verified-user/admin streaming controls
- Moderator comment removal support

## Target architecture

### Mode 1: `webrtc` (current default)

- Best for interactive, smaller audiences
- Lowest latency
- Limited by peer-to-peer scaling

### Mode 2: `hybrid` (next)

- Broadcasters publish to SFU (e.g., LiveKit/mediasoup/Janus)
- Viewers subscribe through SFU (no mesh fan-out)
- WebSockets remain for chat/reactions/likes
- Recommended for medium scale and interactive live rooms

### Mode 3: `hls` (large scale)

- Broadcast published once to ingest
- Audience watches via HLS playback/CDN
- Chat/reactions stay real-time via WebSockets
- Recommended for very high concurrent viewers

## Environment switches

Configured in `backend/.env`:

- `STREAMING_MODE=webrtc|hybrid|hls`
- `ADAPTIVE_QUALITY_ENABLED=true|false`
- `SFU_URL`, `SFU_API_KEY`, `SFU_API_SECRET`
- `HLS_INGEST_URL`, `HLS_PLAYBACK_BASE_URL`, `HLS_SIGNING_KEY`

Backend health endpoint (`GET /api/health`) now reports streaming mode and readiness flags.

## Migration phases

### Phase A — Stabilize current WebRTC (done)

- ✅ Live auth guard
- ✅ Global live notifications
- ✅ Comment moderation
- ✅ Engagement signals (likes/reactions)
- ✅ Client quality presets

### Phase B — Introduce SFU adapters

- Add provider adapter service (`services/streamTransportService.js`)
- On stream start:
  - Create SFU room and publisher token
- On join:
  - Issue subscriber token
- Keep `join code`, chat, and reaction logic unchanged

### Phase C — Add HLS playback path

- On stream start:
  - Request ingest endpoint/stream key from provider
- Store playback URL per stream record
- Viewer page chooses player by `STREAMING_MODE`:
  - `webrtc`/`hybrid` => RTC path
  - `hls` => HLS.js player + low-latency config

### Phase D — hardening and scale

- Redis adapter for Socket.IO horizontal scale
- Dedicated pub/sub channel for stream events
- Comment moderation queue and audit trail
- Rate-limits per room and per user for reactions/comments
- Autoscaling policies for stream nodes

## Security requirements

- Require auth token for joining/engaging
- Enforce role checks server-side (never trust UI)
- Signed tokens for SFU/HLS playback
- Optional geo/IP constraints for sensitive streams
- Abuse controls (reaction spam, comment flood)

## Recommended provider options

- **SFU:** LiveKit (managed/self-host), mediasoup (self-host), Janus
- **HLS:** Mux, Cloudflare Stream, AWS IVS/MediaLive+CloudFront

## Success metrics

- Time to first frame (TTFF)
- End-to-end latency by mode
- Peak concurrent viewers per stream
- Socket event round-trip times
- Comment/reaction delivery success rate
- Stream failure/reconnect rates

## Backward compatibility strategy

- Keep existing stream codes (`streamId`) as the universal join key
- Preserve current routes (`/live/:streamId`)
- Add transport-specific metadata to stream records only when mode requires it
- Keep WebSocket event contracts stable for frontend reuse
