# In-App 1:1 Video Calling Options for Next.js/PWA on Vercel (Free Tier Focus)

**Date:** 2026-11-19  
**Stack:** Next.js App Router (Vercel), Neon Postgres, Neon Auth, PWA/Capacitor, OpenRouter (free) for AI  
**Use Case:** Teacher-student 1:1 tutoring calls, MVP English-only, post-call AI guidance needs transcript/recording

---

## Executive Summary

| Provider | Free Tier (Monthly) | Best For MVP? | Transcript/Recording (Free) | Key Risk |
|----------|---------------------|---------------|----------------------------|----------|
| **LiveKit Cloud** | 5,000 WebRTC min, 1,000 agent min, 100 concurrent | ✅ **Top pick** | Recording: 1,000 min; Agent session recording included | Agent-focused pricing; WebRTC minutes generous |
| **Daily.co** | 10,000 participant-min | ✅ Strong contender | Recording: 300 min; Post-call transcription: 300 min | Recording/transcription limits low |
| **100ms** | 10,000 conferencing min | ✅ Strong contender | Recording: 300 min; Live transcription: 300 min; Post-call: 300 min; AI Summary: 300 min | Best bundled free transcription/recording |
| **Agora RTC** | 10,000 combined min | ✅ Good option | Recording: included in 10k min; STT: 300 min free | Complex pricing; STT separate product |
| **JaaS (8x8/Jitsi)** | ~3,000-10,000 min* (unclear) | ⚠️ Unclear pricing | Recording via Jibri (self-managed) | Pricing page behind auth; limits uncertain |
| **Self-hosted Jitsi** | Unlimited (your infra) | ❌ Not for MVP | Recording via Jibri (complex); Transcription via Jigasi (Google Cloud/Vosk/Whisper) | **High ops burden**: TURN, scaling, SSL, monitoring |
| **Whereby Embedded** | Unknown (site broken) | ❓ Unknown | Unknown | Site inaccessible; can't verify |
| **Raw WebRTC + TURN** | TURN: ~$0.04/GB (Twilio) | ❌ Too complex | Build everything yourself | **Not recommended** for small team |

\* JaaS pricing not publicly accessible (behind auth). Historical data suggests ~3,000-10,000 free minutes/month but unconfirmed.

---

## Detailed Provider Comparison

### 1. LiveKit Cloud (Recommended Top Pick)

**Free Tier (Build Plan - $0/mo):**
- **5,000 WebRTC participant-minutes/month** (end-user connections)
- **1,000 agent session minutes/month** (for AI agents)
- 100 concurrent connections
- 50 GB downstream data transfer
- 1 free US phone number (telephony)
- 50 minutes voice isolation (Krisp)
- **Agent session recordings: 1,000 min included**
- Agent observability events: 100k entries
- $2.50 inference credits (~50 min of LLM/STT/TTS)
- Community support

**Recording/Transcription:**
- Cloud recording/export: pay-as-you-go after free tier (not explicitly listed in Build plan)
- **Agent sessions include recording** (1,000 min free)
- STT/TTS via LiveKit Inference (pay-per-minute, models from Deepgram, AssemblyAI, OpenAI, Google, Cartesia, etc.)
- Can use OpenRouter for LLM but STT/TTS would be LiveKit Inference or self-managed

**Integration with Next.js/Vercel:**
- `@livekit/components-react` - prebuilt React components
- `@livekit/client-sdk-js` - low-level SDK
- Server SDK: `livekit-server-sdk` (Node.js) for token generation
- **Works great with Vercel serverless** - token generation in API routes
- WebRTC signaling via LiveKit's global edge network (no TURN management)
- PWA/Capacitor: React Native SDK available (`@livekit/client-sdk-react-native`)

**Tradeoffs:**
- ✅ Most generous WebRTC free tier (5,000 min)
- ✅ Built-in TURN/STUN, global edge network
- ✅ Agent framework if you want AI participants later
- ✅ Recording included for agent sessions
- ⚠️ Recording for *human-only* calls not clearly free (check if "recording and export" is separate)
- ⚠️ Pricing shifts to agent-centric; human video pricing less transparent
- ⚠️ STT/TTS costs extra via LiveKit Inference

**Sources:** [livekit.io/pricing](https://livekit.io/pricing) (accessed 2026-11-19)

---

### 2. Daily.co (Strong Contender)

**Free Tier:**
- **10,000 participant-minutes/month** (video + audio combined)
- No time limit on calls
- Unlimited rooms
- Prebuilt UI (`Daily Prebuilt`) - drop-in iframe/component
- React hooks: `useDaily`, `useCallState`, etc.
- HIPAA eligible (BAA $500/mo add-on)

**Recording/Transcription (Free Tier):**
- **Cloud recording: 300 minutes/month** (then $0.01349/min)
- **Post-call transcription: 300 minutes/month** (then $0.0043/min)
- **Realtime transcription: $0.0059/unmuted participant-min** (not free)
- RTMP/HLS streaming: 300 min free
- Storage: $0.003/min additional

**Integration with Next.js/Vercel:**
- `@daily-co/daily-js` - client SDK
- `@daily-co/daily-react` - React hooks + prebuilt components
- **Daily Prebuilt** - complete call UI in `<DailyPrebuilt />` component
- Token generation via Daily REST API (serverless-friendly)
- **Works great with Vercel** - many Next.js examples
- PWA/Capacitor: Web SDK works in Capacitor WebView; React Native community wrapper exists

**Tradeoffs:**
- ✅ 10k free participant-min (2x LiveKit for human calls)
- ✅ Prebuilt UI = fastest to MVP
- ✅ Clear, simple per-participant-minute pricing
- ✅ Post-call transcription free tier (300 min) - **critical for your AI guidance use case**
- ⚠️ Recording only 300 min free (vs 1,000 for LiveKit agent sessions)
- ⚠️ Realtime transcription not free
- ⚠️ No built-in agent framework (but you use OpenRouter separately)

**Sources:** [daily.co/pricing/video-sdk](https://www.daily.co/pricing/video-sdk) (accessed 2026-11-19)

---

### 3. 100ms (Strong Contender - Best Bundled Free Transcription)

**Free Tier:**
- **10,000 conferencing minutes/month** (participant-minutes)
- **10,000 live streaming minutes/month** (viewer-minutes)
- **1,000 encoding minutes/month**
- **300 live transcription minutes/month**
- **300 recording minutes/month**
- **300 post-call transcription minutes/month**
- **300 AI-generated summary minutes/month**
- **300 external streaming (RTMP out) minutes/month**
- 75% off for audio-only

**Recording/Transcription:**
- **Best free bundled transcription/recording package** - all 300 min each
- Post-call transcription explicitly free (300 min)
- AI summary free (300 min) - could replace your OpenRouter call for basic summaries
- Recording: $0.0135/min after 300 min
- Post-call transcription: $0.004/min after 300 min
- Noise cancellation: free up to 299 min/mo

**Integration with Next.js/Vercel:**
- `@100mslive/hms-video-store` - React hooks (Redux-based)
- `@100mslive/react-sdk` - prebuilt components
- Prebuilt: `<HMSPrebuilt />` component
- Token generation via REST API (serverless-friendly)
- **HMSVideoStore** uses Redux - may need adjustment for Next.js App Router (client components)
- PWA/Capacitor: React Native SDK (`@100mslive/react-native-hms`)

**Tradeoffs:**
- ✅ **Most generous free transcription/recording/AI bundle** (300 min each)
- ✅ AI summary included free - could reduce OpenRouter usage
- ✅ Simple per-participant-minute pricing
- ✅ Prebuilt UI available
- ⚠️ Redux-based store may need `use client` in Next.js App Router
- ⚠️ Smaller community than Daily/LiveKit
- ⚠️ 10k conferencing min = participant-minutes (2 people × 30 min = 60 participant-min)

**Sources:** [100ms.live/pricing](https://www.100ms.live/pricing) (accessed 2026-11-19)

---

### 4. Agora RTC (Good Option)

**Free Tier:**
- **10,000 combined RTC minutes/month** (video + audio participant-minutes)
- **1 million signaling messages/month free**
- **300 combined language services minutes free** (STT + translation)
- **AI Noise Suppression: included in first 10k min**
- **3D Spatial Audio: included in first 10k min**
- **Interactive Whiteboard: included in first 10k min**
- **Flexible Classroom: 10,000 min free**
- Recording: **included in first 10,000 RTC minutes** (then $0.99/1000 min)
- Cloud transcoding, media push/pull: paid add-ons

**Recording/Transcription:**
- Recording: free within 10k RTC min quota
- **Real-time STT: 300 min free** (then $16.99/1000 min)
- Real-time translation: 300 min free (then $8.99/1000 min/language)
- **Post-call transcription not explicitly mentioned** (likely uses recording + STT)

**Integration with Next.js/Vercel:**
- `agora-rtc-react` - community React wrapper
- `agora-rtc-sdk-ng` - Web SDK v4 (TypeScript)
- Token generation via Agora REST API or dynamic key (serverless-friendly)
- **No official React hooks library** - more manual work
- PWA/Capacitor: React Native SDK (`agora-react-native-rtc`)

**Tradeoffs:**
- ✅ Recording included in generous 10k RTC min
- ✅ STT free tier (300 min) - but real-time only
- ✅ Many add-ons free within 10k min (noise suppression, whiteboard)
- ⚠️ Complex multi-product pricing (RTC, Signaling, STT, Recording separate)
- ⚠️ No official React hooks - more boilerplate
- ⚠️ Post-call transcription not a first-class product
- ⚠️ Documentation fragmented across products

**Sources:** [agora.io/pricing](https://www.agora.io/en/pricing) (accessed 2026-11-19)

---

### 5. JaaS (8x8 Jitsi as a Service) - Unclear Pricing

**Status:** Pricing page behind Auth0 login. Cannot verify current free tier.

**Historical/Community Info:**
- Previously offered ~3,000-10,000 free minutes/month
- JaaS = managed Jitsi (8x8 runs the infrastructure)
- Uses Jitsi Meet SDK (`@jitsi/react-sdk`, `@jitsi/js-api`)
- Recording via Jibri (separate infrastructure)
- Transcription via Jigasi (Google Cloud Speech, Vosk, Whisper)

**Integration:**
- `@jitsi/react-sdk` - React components
- Low-level `@jitsi/js-api` for iframe embedding
- Token generation: JWT-based (compatible with serverless)
- PWA/Capacitor: React Native Jitsi Meet SDK exists

**Risks:**
- ❌ **Cannot verify current free tier** - pricing page inaccessible
- ❌ Recording/transcription require additional components (Jibri/Jigasi) - may not be free
- ❌ 8x8 has deprecated some JaaS features recently
- ⚠️ If self-hosting Jitsi instead: see below

**Sources:** [jaas.8x8.vc](https://jaas.8x8.vc) (pricing behind auth), [jitsi.org](https://jitsi.org) (accessed 2026-11-19)

---

### 6. Self-Hosted Jitsi Meet (Not Recommended for MVP)

**Costs (Your Infrastructure):**
- **Compute:** ~$20-100+/mo for a decent VM (4-8 vCPU, 8-16GB RAM) for 50-100 concurrent 1:1 calls
- **TURN Server:** Required for NAT traversal - coturn on same VM or separate (~$10-50/mo) or managed TURN ($0.04-0.10/GB via Twilio/Cloudflare)
- **Domain + SSL:** Free (Let's Encrypt)
- **Monitoring/Logs:** Your responsibility
- **Recording (Jibri):** Requires separate Chrome + ffmpeg instance per recording (~2GB RAM each) - **does not scale**
- **Transcription (Jigasi):** Google Cloud Speech (paid), Vosk (self-hosted, lower accuracy), Whisper (self-hosted, GPU needed)

**Operational Burden:**
- Multiple containers: web, prosody (XMPP), jicofo, jvb, jibri, jigasi, transcriber
- UDP port 10000 must be open + TURN on 3478/5349
- **Jibri recording is notoriously fragile** - one recorder per recording, Chrome crashes, memory leaks
- Scaling JVB (videobridge) requires multiple nodes + load balancing
- No managed TURN - you handle NAT traversal
- Mobile apps need valid SSL certs (Let's Encrypt works)

**When It Makes Sense:**
- >10,000 participant-min/month consistently
- Team with DevOps capacity
- Need full data sovereignty / no third-party data processing
- Custom modifications to Jitsi core

**Sources:** [jitsi.github.io/handbook](https://jitsi.github.io/handbook/docs/devops-guide/) (accessed 2026-11-19)

---

### 7. Whereby Embedded - Cannot Verify

**Status:** Website loads but pricing pages timeout/block. Cannot verify current offerings.

**Historical:**
- Whereby Embedded API for custom UI
- Previously had free tier with limited minutes
- Simple iframe or React SDK
- Recording/transcription: paid add-ons

**Verdict:** Cannot recommend without verified pricing.

---

### 8. Raw WebRTC + Managed TURN (Not Recommended)

**Components You'd Build:**
- Signaling server (WebSocket) - on Vercel Functions or Neon Functions
- TURN/STUN: Twilio Network Traversal ($0.04/GB), Cloudflare Calls (new), or self-hosted coturn
- Media server: **Not needed for 1:1** (mesh works) but **required for 3+** (SFU)
- Recording: MediaRecorder API (client-side) or media server recording
- Transcription: Web Speech API (browser, limited) or send audio to STT API

**Costs:**
- Twilio TURN: ~$0.04/GB relayed
- Cloudflare Calls: new, pricing unclear
- Signaling: Vercel Functions (free tier generous)
- STT: OpenRouter (Whisper) or Deepgram/AssemblyAI (~$0.005-0.01/min)

**Verdict:** **Too much custom engineering** for 1:1 MVP. Only consider if you have unique requirements no provider meets.

---

## Feasibility for Small Pilot (1:1 Calls, Basic UI)

### Realistic Free-Tier Capacity (Monthly)

| Provider | 1:1 Calls (30 min each) | 1:1 Calls (60 min each) | Notes |
|----------|------------------------|------------------------|-------|
| **LiveKit** | ~83 calls (5,000 ÷ 60) | ~41 calls | 5,000 WebRTC participant-min |
| **Daily** | ~166 calls (10,000 ÷ 60) | ~83 calls | 10,000 participant-min |
| **100ms** | ~166 calls (10,000 ÷ 60) | ~83 calls | 10,000 conferencing min |
| **Agora** | ~166 calls (10,000 ÷ 60) | ~83 calls | 10,000 RTC min |
| **JaaS** | Unknown | Unknown | Pricing inaccessible |

**For a pilot of ~20-50 calls/month:** All free tiers are **more than sufficient**.

### Common Pitfalls & Mitigations

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| **TURN/NAT traversal** | Calls fail on corporate WiFi, mobile data, symmetric NAT | Use managed provider (LiveKit, Daily, 100ms, Agora) - they handle TURN |
| **Browser permissions in PWA/Capacitor** | Mic/camera prompts may not work in WebView | Test on iOS/Android Capacitor; use `cordova-plugin-iosrtc` or Capacitor plugins; request permissions before join |
| **Serverless signaling** | Vercel Functions timeout (10s/60s) for long-lived WebSockets | Use provider's signaling (all above) - don't host signaling yourself |
| **Recording storage** | Where do recordings go? | Daily/100ms/Agora: cloud storage included; LiveKit: export to S3/GCS; Self-hosted: your bucket |
| **Transcription accuracy** | Free STT may be lower quality | 100ms/Agora/Daily use Deepgram/AssemblyAI (good); LiveKit Inference offers multiple providers |
| **Mobile background** | iOS kills WebRTC in background | Use CallKit (iOS) / ConnectionService (Android) - provider SDKs may support |
| **Capacitor WebView quirks** | `navigator.mediaDevices` may be undefined | Ensure `android:hardwareAccelerated="true"`, test on real devices |
| **Free tier expiry** | Some free tiers are "trial" not perpetual | Daily, 100ms, Agora, LiveKit Build plan are **perpetual free tiers** |

---

## Session State & Data Modeling (Neon Postgres)

### Recommended Schema (Drizzle)

```typescript
// db/schema/video-sessions.ts
import { pgTable, uuid, varchar, timestamp, text, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users'; // your Neon Auth users table

export const videoSessions = pgTable('video_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: varchar('room_id', { length: 256 }).notNull().unique(), // provider room name
  provider: varchar('provider', { length: 50 }).notNull(), // 'livekit' | 'daily' | '100ms' | 'agora'
  providerRoomId: varchar('provider_room_id', { length: 256 }), // provider's internal room ID
  
  // Participants
  teacherId: uuid('teacher_id').references(() => users.id).notNull(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'), 
  // scheduled | live | ended | cancelled | failed
  
  // Call metadata
  durationSeconds: integer('duration_seconds'),
  participantCount: integer('participant_count').default(2),
  
  // Recording/Transcription
  recordingUrl: text('recording_url'),
  recordingDurationSeconds: integer('recording_duration_seconds'),
  recordingStatus: varchar('recording_status', { length: 30 }), // pending | ready | failed
  transcriptUrl: text('transcript_url'),
  transcriptStatus: varchar('transcript_status', { length: 30 }),
  transcriptLanguage: varchar('transcript_language', { length: 10 }).default('en'),
  
  // AI Post-call guidance
  aiSummary: text('ai_summary'),
  aiGuidance: jsonb('ai_guidance'), // structured feedback
  aiProcessedAt: timestamp('ai_processed_at', { withTimezone: true }),
  
  // Provider-specific metadata (tokens, settings)
  providerMetadata: jsonb('provider_metadata'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  teacherIdx: index('video_sessions_teacher_idx').on(table.teacherId),
  studentIdx: index('video_sessions_student_idx').on(table.studentId),
  statusIdx: index('video_sessions_status_idx').on(table.status),
  scheduledIdx: index('video_sessions_scheduled_idx').on(table.scheduledAt),
}));

// Join tokens table (short-lived, for audit)
export const videoSessionTokens = pgTable('video_session_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => videoSessions.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'teacher' | 'student' | 'observer'
  token: text('token').notNull(), // JWT from provider
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdx: index('video_session_tokens_session_idx').on(table.sessionId),
  userIdx: index('video_session_tokens_user_idx').on(table.userId),
}));
```

### Token Generation Flow (Serverless-Friendly)

```typescript
// app/api/video-sessions/[id]/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth'; // Neon Auth
import { db } from '@/db';
import { videoSessions, videoSessionTokens } from '@/db/schema/video-sessions';
import { eq } from 'drizzle-orm';

// Provider SDKs (pick one)
import { Daily } from '@daily-co/daily-js'; // or LiveKit, 100ms, Agora

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  const [videoSession] = await db.select()
    .from(videoSessions)
    .where(eq(videoSessions.id, id))
    .limit(1);
  
  if (!videoSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  // Verify user is participant
  const isTeacher = videoSession.teacherId === session.user.id;
  const isStudent = videoSession.studentId === session.user.id;
  if (!isTeacher && !isStudent) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Generate provider token
  let token: string;
  const role = isTeacher ? 'teacher' : 'student';
  
  if (videoSession.provider === 'daily') {
    const daily = new Daily(process.env.DAILY_API_KEY!);
    const { token: dailyToken } = await daily.createMeetingToken({
      room_name: videoSession.roomId,
      user_name: session.user.name,
      is_owner: isTeacher,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    });
    token = dailyToken;
  } else if (videoSession.provider === 'livekit') {
    // LiveKit: use AccessToken from livekit-server-sdk
  } // ... etc
  
  // Store token for audit
  await db.insert(videoSessionTokens).values({
    sessionId: id,
    userId: session.user.id,
    role,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  
  return NextResponse.json({ token, roomId: videoSession.roomId });
}
```

### Webhook Handling (Recording/Transcript Ready)

```typescript
// app/api/webhooks/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { videoSessions } from '@/db/schema/video-sessions';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  
  // Verify webhook signature (Daily: x-daily-signature header)
  // ...
  
  if (payload.event === 'recording.started') {
    await db.update(videoSessions)
      .set({ recordingStatus: 'recording' })
      .where(eq(videoSessions.roomId, payload.room_name));
  }
  
  if (payload.event === 'recording.completed') {
    await db.update(videoSessions)
      .set({
        recordingUrl: payload.recording.download_url,
        recordingDurationSeconds: payload.recording.duration,
        recordingStatus: 'ready',
      })
      .where(eq(videoSessions.roomId, payload.room_name));
  }
  
  if (payload.event === 'transcription.completed') {
    await db.update(videoSessions)
      .set({
        transcriptUrl: payload.transcription.download_url,
        transcriptStatus: 'ready',
      })
      .where(eq(videoSessions.roomId, payload.room_name));
    
    // Trigger AI post-call guidance (async)
    // await triggerAIGuidance(payload.room_name);
  }
  
  return NextResponse.json({ received: true });
}
```

---

## Transcript/Recording for Post-Call AI Guidance

### Your Requirement: "Post-call AI guidance based on the lecture of the call"

| Provider | Free Recording | Free Post-Call Transcript | Realtime Transcript | AI Summary | Best Fit |
|----------|----------------|---------------------------|---------------------|------------|----------|
| **100ms** | 300 min | **300 min** ✅ | 300 min | **300 min** ✅ | **Best bundled** |
| **Daily** | 300 min | **300 min** ✅ | $0.0059/min (paid) | ❌ | Good if you use OpenRouter for summary |
| **Agora** | In 10k RTC min | ❌ (use recording + STT) | 300 min | ❌ | Recording free, but post-call transcript manual |
| **LiveKit** | Agent: 1,000 min | Agent sessions only | Via Inference (paid) | Via Agents | Best if using LiveKit Agents |
| **JaaS** | Jibri (self-mgmt) | Jigasi (Google/Vosk) | Jigasi | ❌ | Complex setup |

### Recommended Approach for MVP

**Option A: 100ms (Easiest - All Free)**
- 300 min recording + 300 min post-call transcript + 300 min AI summary free
- Use their AI summary OR send transcript to OpenRouter for custom guidance
- Prebuilt UI = fastest to working pilot

**Option B: Daily + OpenRouter (Most Flexible)**
- 300 min recording + 300 min post-call transcript free
- Daily Prebuilt for UI
- When `transcription.completed` webhook fires → fetch transcript → send to OpenRouter (your existing AI) for custom teacher guidance
- More control over AI prompt/response

**Option C: LiveKit (If Building AI Agents Later)**
- Agent session recordings free (1,000 min)
- If you use LiveKit Agents for AI tutor participation, recording/transcript included
- For human-only: check if cloud recording export has free tier (not clear)

---

## Recommended Short List for MVP

### 1. 🥇 **100ms** - Best All-in-One Free Tier
**Choose if:** You want recording + transcription + AI summary all free, minimal setup
- Free: 10k min calls + 300 min each of recording, live transcript, post-call transcript, AI summary
- Prebuilt React component: `<HMSPrebuilt />`
- Token generation: REST API (serverless-friendly)
- Risk: Redux store needs `use client` in Next.js App Router; smaller community

### 2. 🥈 **Daily.co** - Best Developer Experience + Flexible AI
**Choose if:** You want best React integration, plan to use OpenRouter for custom AI guidance
- Free: 10k min calls + 300 min recording + 300 min post-call transcript
- Prebuilt: `<DailyPrebuilt />` - drop-in complete UI
- React hooks: `useDaily()`, `useCallState()` - excellent DX
- Token generation: REST API
- Risk: Realtime transcript not free; AI summary not included (use OpenRouter)

### 3. 🥉 **LiveKit Cloud** - Best If You Want AI Agents Later
**Choose if:** You may add AI tutor agents (voice/video) in Phase 2+
- Free: 5k WebRTC min + 1k agent min + 1k agent recording min
- Components: `@livekit/components-react` (flexible, not prebuilt)
- Agent framework: Python/Node for AI participants
- Risk: Human-call recording free tier unclear; pricing agent-centric

### 4. **Agora RTC** - Good If You Need Whiteboard/Noise Suppression Free
**Choose if:** You need interactive whiteboard, noise suppression, spatial audio in free tier
- Free: 10k RTC min includes recording, noise suppression, whiteboard, 3D audio
- STT: 300 min free (realtime only)
- Risk: No official React hooks; complex multi-product pricing; post-call transcript manual

---

## Next Steps / Validation

1. **Confirm free tier perpetuity** - All four (Daily, 100ms, Agora, LiveKit Build) offer perpetual free tiers, not trials. Verify at signup.

2. **Test PWA/Capacitor compatibility** - Create minimal test app with each provider's React SDK in Capacitor WebView on iOS/Android. Check:
   - Mic/camera permissions
   - Background handling (CallKit/ConnectionService)
   - Audio routing (earpiece vs speaker)

3. **Verify webhook reliability** - Test recording/transcript webhooks from each provider to your Vercel API routes.

4. **Estimate pilot volume** - If <50 calls/month (30 min each), any free tier works. If >200, Daily/100ms/Agora give more headroom.

5. **Decision matrix for your team:**
   - Fastest to working UI → **Daily Prebuilt** or **100ms Prebuilt**
   - Most free transcription/AI → **100ms**
   - Future AI agents → **LiveKit**
   - Whiteboard/noise suppression free → **Agora**

---

## Sources & Recency

| Source | URL | Accessed | Notes |
|--------|-----|----------|-------|
| LiveKit Pricing | livekit.io/pricing | 2026-11-19 | Build plan $0/mo, 5k WebRTC min |
| Daily Pricing | daily.co/pricing/video-sdk | 2026-11-19 | 10k free participant-min |
| 100ms Pricing | 100ms.live/pricing | 2026-11-19 | 10k conferencing + 300 each transcript/recording/AI |
| Agora Pricing | agora.io/en/pricing | 2026-11-19 | 10k RTC min + 300 STT min |
| Jitsi Self-Host | jitsi.github.io/handbook | 2026-11-19 | Docker deployment guide |
| JaaS Pricing | jaas.8x8.vc/pricing | 2026-11-19 | **Behind auth - inaccessible** |
| Whereby Pricing | whereby.com/pricing | 2026-11-19 | **Site broken - inaccessible** |

**Unknowns to Validate:**
- JaaS current free tier (requires account creation)
- Whereby Embedded current pricing (site issues)
- LiveKit human-call cloud recording free tier (vs agent recording)
- Capacitor iOS/Android WebRTC stability per provider (needs device testing)

---

## Appendix: Quick Start Code References

### Daily Prebuilt (Simplest UI)
```tsx
// components/VideoCall.tsx
'use client';
import { DailyPrebuilt } from '@daily-co/daily-react';

export function VideoCall({ roomUrl, token }: { roomUrl: string; token: string }) {
  return (
    <DailyPrebuilt
      roomUrl={roomUrl}
      token={token}
      config={{
        ui: { leaveButton: true, fullscreenButton: true },
        permissions: { send: 'all', recv: 'all' },
      }}
    />
  );
}
```

### 100ms Prebuilt
```tsx
// components/VideoCall.tsx
'use client';
import { HMSPrebuilt } from '@100mslive/react-sdk';

export function VideoCall({ roomCode, token }: { roomCode: string; token: string }) {
  return <HMSPrebuilt roomCode={roomCode} authToken={token} />;
}
```

### LiveKit Components (Build Your Own UI)
```tsx
// components/VideoCall.tsx
'use client';
import { LiveKitRoom, VideoConference, MediaDeviceSelect } from '@livekit/components-react';
import { Room } from 'livekit-client';

export function VideoCall({ token, serverUrl }: { token: string; serverUrl: string }) {
  const room = useMemo(() => new Room(), []);
  
  return (
    <LiveKitRoom room={room} token={token} serverUrl={serverUrl} connect={true}>
      <VideoConference />
    </LiveKitRoom>
  );
}
```

---

*This research is for planning purposes. Validate all free-tier details at signup as pricing can change.*