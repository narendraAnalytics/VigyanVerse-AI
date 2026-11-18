'use client';

// A narrated explainer video printed on the page like a plate in a textbook. Shows the poster with a play
// button first; the video file is only fetched when the student presses play (saves bandwidth and data).
// On a turning leaf (preview) it is just the poster, inert.
import { useState } from 'react';
import { Play } from 'lucide-react';
import { usePreview } from '@/components/book/page-context';
import { explainerUrl, type Explainer } from '@/lib/explainers';

export function ExplainerVideo({ explainer, color }: { explainer: Explainer; color: string }) {
  const preview = usePreview();
  const [playing, setPlaying] = useState(false);
  const poster = explainerUrl(explainer.poster);

  return (
    <figure className="m-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-[#1d1720] shadow-[0_10px_24px_-14px_rgba(34,30,23,0.55)] ring-1 ring-gold/60">
        {playing && !preview ? (
          <video
            className="h-full w-full"
            src={explainerUrl(explainer.video)}
            poster={poster}
            controls
            autoPlay
            playsInline
            preload="auto"
            aria-label={`${explainer.title} explainer video`}
          />
        ) : (
          <button
            type="button"
            tabIndex={preview ? -1 : undefined}
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 block h-full w-full cursor-pointer"
            aria-label={`Play the ${explainer.title} video, ${explainer.seconds} seconds`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" decoding="async" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span
                className="grid h-16 w-16 place-items-center rounded-full text-paper shadow-lg ring-4 ring-paper/70 transition-transform duration-300 group-hover:scale-110"
                style={{ background: color }}
              >
                <Play className="ml-1 h-7 w-7" fill="currentColor" strokeWidth={0} />
              </span>
            </span>
            <span aria-hidden className="absolute bottom-2.5 left-3 rounded-full bg-black/55 px-2.5 py-0.5 font-display text-sm text-paper">
              ▶ {explainer.seconds} s · with sound
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-ink-soft">
        <span className="font-display italic" style={{ color }}>{explainer.title}</span> in {explainer.seconds} seconds · {explainer.chapter}
      </figcaption>
    </figure>
  );
}
