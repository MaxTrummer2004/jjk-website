# JJK — Jiu-Jitsu Kaisen Academy

Landing page for a fictional Brazilian Jiu-Jitsu gym in Berlin. Built with the
React Bits Pro template baseline (Next.js 16, React 19, Tailwind CSS v4, Motion,
Lenis smooth scroll, `next-themes`). Dark-first "combat academy" design with an
electric-blue accent and a gold championship highlight.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
# production:
npm run build && npm run start
```

## Structure

- `app/` — layout, metadata, global design tokens (`globals.css`), page assembly.
- `lib/config.ts` — **all site content** (nav, programs, schedule, coaches,
  pricing, testimonials, FAQs, contact). Edit here to change copy.
- `lib/metadata.ts` — SEO / Open Graph.
- `components/` — one file per section:
  `header · hero · marquee · about · programs · features · stats · schedule ·
  coaches · testimonials · pricing · faq · cta · footer`.

## The hero video

The hero (React Bits **Hero 12** style — background media with curved-corner
headline blocks) uses a real BJJ clip pulled from Pexels (free license, no
attribution required) and **self-hosted** in `public/video/`:

- `hero-bjj.mp4` — looping background footage (Pexels #8611719, ~29 MB, 1080p).
- `hero-poster.jpg` — first-frame poster (also the OG image).
- `img/about.jpg` — grappling still for the About section (Pexels #6765692).

The video is mounted only after first paint (poster shows instantly) so the
30 MB decode never blocks hydration, and it is paused for
`prefers-reduced-motion` users. For production you may want to transcode a
smaller 720p / WebM version to cut the payload.

To swap the clip, drop a new file in `public/video/hero-bjj.mp4` (+ a matching
`hero-poster.jpg`) — no code change needed.

## Notes

- Coach cards use belt-coloured monogram tiles instead of stock headshots (no
  fake faces). Add real photos in `components/coaches.tsx` if desired.
- Theme toggle lives bottom-right; default is dark.
