"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

const allTestimonials = [
  {
    quote:
      "I walked in unable to touch my toes and terrified of sparring. A year later I'm a blue belt with the best group of friends I've ever had.",
    name: "Jonas R.",
    title: "Blue Belt · 1.5 years",
    avatar:
      "https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "The coaching detail here is unreal. Every round I learn something new. My kids trained here first — now the whole family is on the mats.",
    name: "Priya M.",
    title: "Purple Belt · 3 years",
    avatar:
      "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "I came for self-defense and stayed for the team. Lost 14 kg, gained a spine. JJK genuinely changed my life.",
    name: "Deniz A.",
    title: "White Belt · 8 months",
    avatar:
      "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "As a woman starting martial arts at 34, I was nervous. The women's class made it feel like home from day one.",
    name: "Sofia L.",
    title: "Blue Belt · 2 years",
    avatar:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Six months in and I can already see how BJJ rewires your thinking. The patience and problem-solving on the mat carries into every part of life.",
    name: "Marco K.",
    title: "White Belt · 6 months",
    avatar:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Rafael's eye for technique is something else. He spotted a flaw in my guard pass in five seconds that I'd had for years. Improved overnight.",
    name: "Anna S.",
    title: "Brown Belt · 6 years",
    avatar:
      "https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Competition prep with Marina is intense but incredible. She broke down my entire game and rebuilt it stronger for the podium.",
    name: "Patrick H.",
    title: "Blue Belt · 2 years",
    avatar:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "My 8-year-old daughter went from shy to confident in three months. Lucas runs the kids program like a superpower factory.",
    name: "Lena R.",
    title: "Parent · Kids program",
    avatar:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Dropped in with zero experience on a Tuesday night. Got paired with a purple belt who took the time to walk me through everything. Signed up the next day.",
    name: "Tobias M.",
    title: "White Belt · 4 months",
    avatar:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "I've trained at five gyms across Europe. The culture here — no ego, just technique — is rare. Found my mat home.",
    name: "Sarah K.",
    title: "Blue Belt · 3 years",
    avatar:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Open mat on Sundays is worth it alone. High-level rollers who actually slow down and explain what they're doing. You learn more in one session than elsewhere in a month.",
    name: "Felix B.",
    title: "White Belt · 9 months",
    avatar:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&auto=format&fit=crop",
  },
  {
    quote:
      "Ana's fundamentals class rebuilt my base from scratch. I thought I knew the basics after two years at another gym. I didn't. Now I do.",
    name: "Nina L.",
    title: "Purple Belt · 4 years",
    avatar:
      "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&auto=format&fit=crop",
  },
];

const testimonials = [
  allTestimonials.slice(0, 4),
  allTestimonials.slice(4, 8),
  allTestimonials.slice(8, 12),
];

export default function SocialProof4() {
  const marquee1Ref = useRef<HTMLDivElement>(null);
  const marquee2Ref = useRef<HTMLDivElement>(null);
  const marquee3Ref = useRef<HTMLDivElement>(null);
  const marqueeMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marquee1 = marquee1Ref.current;
    const marquee2 = marquee2Ref.current;
    const marquee3 = marquee3Ref.current;
    const marqueeMobile = marqueeMobileRef.current;

    let offset1 = 0;
    let offset2 = 0;
    let offset3 = 0;
    let offsetMobile = 0;

    const animate = () => {
      if (marqueeMobile) {
        offsetMobile += 0.5;
        if (offsetMobile >= marqueeMobile.scrollHeight / 2) offsetMobile = 0;
        marqueeMobile.style.transform = `translateY(-${offsetMobile}px)`;
      }
      if (marquee1) {
        offset1 += 0.5;
        if (offset1 >= marquee1.scrollHeight / 2) offset1 = 0;
        marquee1.style.transform = `translateY(-${offset1}px)`;
      }
      if (marquee2) {
        offset2 += 0.6;
        if (offset2 >= marquee2.scrollHeight / 2) offset2 = 0;
        marquee2.style.transform = `translateY(-${offset2}px)`;
      }
      if (marquee3) {
        offset3 += 0.4;
        if (offset3 >= marquee3.scrollHeight / 2) offset3 = 0;
        marquee3.style.transform = `translateY(-${offset3}px)`;
      }
      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end lg:mb-16">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="font-display text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl"
          >
            Real people.
            <br />
            <span className="text-accent">Real change.</span>
          </motion.h2>

          <motion.a
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            href="#pricing"
            className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
          >
            Start your journey
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </div>

        {/* Mobile — single column */}
        <div className="relative sm:hidden">
          <div className="relative h-[600px] overflow-hidden">
            <div ref={marqueeMobileRef}>
              {[...allTestimonials, ...allTestimonials].map((t, i) => (
                <TestimonialCard key={`mob-${i}`} testimonial={t} />
              ))}
            </div>
            <GradientFade dir="top" />
            <GradientFade dir="bottom" />
          </div>
        </div>

        {/* Desktop — three columns */}
        <div className="relative hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          <Column ref={marquee1Ref} items={testimonials[0]} id="col1" />
          <Column ref={marquee2Ref} items={testimonials[1]} id="col2" />
          <Column ref={marquee3Ref} items={testimonials[2]} id="col3" />
        </div>
      </div>
    </section>
  );
}

type Testimonial = (typeof allTestimonials)[number];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="mb-4 rounded-2xl bg-card/60 p-1.5 shadow-sm backdrop-blur-md">
      <div className="rounded-[10px] border border-border/60 bg-card p-6 shadow-sm">
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="h-10 w-10 rounded-lg border border-border object-cover"
          />
          <div>
            <div className="text-sm font-semibold text-foreground">
              {testimonial.name}
            </div>
            <div className="text-xs text-muted-foreground">{testimonial.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { forwardRef } from "react";

const Column = forwardRef<
  HTMLDivElement,
  { items: Testimonial[]; id: string }
>(({ items, id }, ref) => (
  <div className="relative h-[600px] overflow-hidden">
    <div ref={ref}>
      {[...items, ...items].map((t, i) => (
        <TestimonialCard key={`${id}-${i}`} testimonial={t} />
      ))}
    </div>
    <GradientFade dir="top" />
    <GradientFade dir="bottom" />
  </div>
));
Column.displayName = "Column";

function GradientFade({ dir }: { dir: "top" | "bottom" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 h-24 ${
        dir === "top"
          ? "top-0 bg-linear-to-b from-background to-transparent"
          : "bottom-0 bg-linear-to-t from-background to-transparent"
      }`}
    />
  );
}
