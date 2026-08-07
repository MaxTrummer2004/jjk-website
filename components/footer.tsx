import { ArrowUpRight, Instagram, Youtube, Facebook } from "lucide-react";
import { siteConfig, nav } from "@/lib/config";

const hours = [
  { d: "Mon – Fri", h: "07:00 – 22:00" },
  { d: "Saturday", h: "10:00 – 14:00" },
  { d: "Sunday", h: "Open mat 11:00" },
];

const programs = ["Fundamentals", "Advanced Gi", "No-Gi", "Kids & Teens", "Women's Class"];

export function Footer() {
  return (
    <footer id="contact" className="bg-neutral-950 text-neutral-100">
      {/* Top CTA */}
      <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-24 sm:px-8 lg:px-12 lg:pt-32">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Come train with us
        </p>
        <a
          href={`mailto:${siteConfig.email}`}
          className="font-display mt-4 block text-4xl leading-[0.95] tracking-tight transition-colors hover:text-accent sm:text-6xl lg:text-7xl"
        >
          {siteConfig.email}
        </a>
        <a
          href="#pricing"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-base font-semibold text-accent-foreground transition-transform active:scale-95"
        >
          Book your free trial class
          <ArrowUpRight className="h-5 w-5" />
        </a>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="h-px w-full bg-white/10" />
      </div>

      {/* Columns */}
      <div className="mx-auto grid max-w-[1500px] gap-12 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
        <div>
          <span className="font-display flex items-center gap-2 text-3xl">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-lg text-accent-foreground">
              大
            </span>
            JJK
          </span>
          <p className="mt-4 max-w-xs text-neutral-400">{siteConfig.tagline}</p>
        </div>

        <div>
          <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Visit
          </h4>
          <a
            href={siteConfig.address.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-colors hover:text-accent"
          >
            {siteConfig.address.street}
            <br />
            {siteConfig.address.city}
          </a>
          <a
            href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
            className="mt-4 block text-neutral-400 transition-colors hover:text-white"
          >
            {siteConfig.phone}
          </a>
        </div>

        <div>
          <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Opening hours
          </h4>
          <ul className="space-y-2">
            {hours.map((h) => (
              <li key={h.d} className="flex justify-between gap-6 text-sm">
                <span className="text-neutral-400">{h.d}</span>
                <span className="text-neutral-100">{h.h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Programs
          </h4>
          <ul className="space-y-2">
            {programs.map((p) => (
              <li key={p}>
                <a href="#programs" className="text-neutral-300 transition-colors hover:text-accent">
                  {p}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="h-px w-full bg-white/10" />
        <div className="flex flex-col items-center justify-between gap-6 py-8 sm:flex-row">
          <div className="flex items-center gap-5">
            {nav.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-neutral-400 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 transition-colors hover:border-accent hover:text-accent">
              <Instagram className="h-5 w-5" />
            </a>
            <a href={siteConfig.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 transition-colors hover:border-accent hover:text-accent">
              <Youtube className="h-5 w-5" />
            </a>
            <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 transition-colors hover:border-accent hover:text-accent">
              <Facebook className="h-5 w-5" />
            </a>
          </div>

          <p className="text-sm text-neutral-500">
            © 2026 {siteConfig.fullName}
          </p>
        </div>
      </div>
    </footer>
  );
}
