import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Waves, Loader2, Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { gsap } from 'gsap';
import { supabase } from '../lib/supabase';
import { resolveApiUrl } from '../utils/apiClient';

interface LiveVoiceModalProps {
  onClose: () => void;
  language: string;
  voice: string;
}
type ConnectionState = 'connecting' | 'connected' | 'error';

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ onClose, language, voice }) => {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const roomRef = useRef<Room | null>(null);
  const closeRef = useRef(onClose);
  const audioMountRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  closeRef.current = onClose;

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (!orbRef.current) return;
      const tween = gsap.to(orbRef.current, {
        scale: 1.07,
        duration: 2.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      });
      return () => tween.kill();
    });
    return () => media.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let audioElements: HTMLMediaElement[] = [];
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio || !audioMountRef.current) return;
      const element = track.attach();
      audioElements = [...audioElements, element];
      element.autoplay = true;
      element.setAttribute('playsinline', 'true');
      audioMountRef.current.appendChild(element);
      void element.play().catch(() => setError('Tap the screen once to enable the speaker output.'));
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => {
        element.remove();
        audioElements = audioElements.filter((item) => item !== element);
      });
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) closeRef.current();
    });

    const connect = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase?.auth.getSession() ?? { data: { session: null }, error: null };
        if (sessionError) throw sessionError;
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error('Sign in from the left drawer before starting Live Voice.');
        const tokenUrl = resolveApiUrl('/api/livekit/token');
        if (tokenUrl.startsWith('/')) {
          throw new Error('Set the HTTPS API Base URL in Sukhan AI Settings before starting Live Voice.');
        }
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ language, voice }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Live voice is not configured on the backend.');
        if (cancelled) return;
        await room.connect(payload.serverUrl, payload.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setState('connected');
      } catch (err) {
        if (!cancelled) {
          setState('error');
          setError(err instanceof Error ? err.message : 'Could not connect to LiveKit.');
        }
      }
    };
    void connect();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      audioElements.forEach((element) => {
        element.pause();
        element.remove();
      });
      void room.disconnect();
      roomRef.current = null;
    };
  }, [language, voice]);

  const toggleMute = async () => {
    const next = !muted;
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch {
      setError('Microphone control failed. Check Android microphone permission.');
    }
  };

  const endCall = async () => {
    await roomRef.current?.disconnect();
    closeRef.current();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) void endCall(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[#08050B]/95 backdrop-blur-xl" />
        <Dialog.Content
          aria-describedby="sukhan-live-description"
          className="fixed inset-0 z-[91] flex flex-col items-center justify-between px-6 py-8 text-center text-[#F5EFE6] outline-none"
        >
          <div className="flex w-full max-w-xl items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF6A]">Sukhan AI · Live</p>
              <Dialog.Title className="mt-1 font-display text-2xl font-semibold">Live conversation</Dialog.Title>
            </div>
            <button type="button" onClick={() => void endCall()} aria-label="Close live conversation" className="rounded-full border border-white/15 p-2 text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="relative grid h-64 w-64 place-items-center sm:h-72 sm:w-72">
              <div className="absolute inset-0 rounded-full border border-[#D4AF6A]/20" />
              <div className="absolute inset-5 rounded-full border border-[#D4AF6A]/15" />
              <div ref={orbRef} className="sukhan-orb h-44 w-44 rounded-full sm:h-52 sm:w-52" />
              {state === 'connected' && !muted && (
                <div className="sukhan-wave absolute bottom-2 flex h-8 items-center gap-1" aria-hidden="true">
                  {Array.from({ length: 13 }, (_, index) => <span key={index} style={{ height: `${12 + (index % 5) * 5}px` }} />)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium">{state === 'connecting' ? 'Connecting to your poet…' : state === 'error' ? 'Connection needs attention' : muted ? 'Microphone muted' : 'Listening · speak naturally'}</p>
              <p id="sukhan-live-description" className="mx-auto max-w-sm text-sm leading-6 text-white/55">
                You can interrupt Sukhan while it speaks. Silero VAD and LiveKit turn handling stop the current speech when you begin a new turn.
              </p>
              {error && <p role="alert" className="max-w-md text-xs text-rose-300">{error}</p>}
            </div>
          </div>

          <div className="flex w-full max-w-sm items-center justify-center gap-5">
            <button type="button" onClick={() => void toggleMute()} disabled={state !== 'connected'} className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/15 bg-white/10 text-white disabled:opacity-40">
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span className="sr-only">{muted ? 'Unmute microphone' : 'Mute microphone'}</span>
            </button>
            <button type="button" onClick={() => void endCall()} className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500">
              <PhoneOff className="h-6 w-6" />
              <span className="sr-only">End call</span>
            </button>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75">
              {state === 'connecting' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Waves className="h-5 w-5" />}
            </div>
          </div>
          <div ref={audioMountRef} className="sr-only" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
