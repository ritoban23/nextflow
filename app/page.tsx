"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

const REVEAL_DELAYS: Record<string, string> = {
  "hero-title": "0ms",
  "hero-subtitle": "120ms",
  "hero-cta": "240ms",
  "mission-title": "0ms",
  "mission-copy": "100ms",
  "logo-1": "0ms",
  "logo-2": "120ms",
  "logo-3": "220ms",
  "logo-4": "320ms",
  "works-title": "0ms",
  "card-1": "0ms",
  "card-2": "160ms",
};

function formatClock(now: Date) {
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({
    "hero-title": false,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatClock(new Date()));
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        const next = window.scrollY;
        setScrolled(next > 48);
        setScrollY(next);
        ticking = false;
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds((current) => {
          const next = { ...current };
          let changed = false;

          for (const entry of entries) {
            const targetId = (entry.target as HTMLElement).dataset.revealId;
            if (!targetId || !entry.isIntersecting || next[targetId]) {
              continue;
            }

            next[targetId] = true;
            changed = true;
          }

          return changed ? next : current;
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    const elements = document.querySelectorAll<HTMLElement>("[data-reveal-id]");
    for (const element of elements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const heroOffset = Math.min(scrollY * 0.26, 190);
  const heroOpacity = Math.max(1 - scrollY / 620, 0.15);
  const cardUpOffset = Math.max(scrollY * -0.06, -150);
  const cardDownOffset = Math.min(scrollY * 0.06, 150);

  const revealClass = (id: string) =>
    visibleIds[id]
      ? "translate-y-0 opacity-100"
      : "translate-y-8 opacity-0";

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#ff4500] selection:text-white">
      <style jsx global>{`
        @keyframes float-left {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(1.5deg); }
        }
        @keyframes float-right {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(18px) rotate(-1.5deg); }
        }
        .floating-left {
          animation: float-left 12s ease-in-out infinite;
        }
        .floating-right {
          animation: float-right 14s ease-in-out infinite;
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.06]"
        style={{
          backgroundImage: "url(https://grainy-gradients.vercel.app/noise.svg)",
          mixBlendMode: "overlay",
        }}
      />

      <nav
        className={`fixed left-0 right-0 top-0 z-40 border-b transition-all duration-500 ${
          scrolled
            ? "border-white/10 bg-[#050505]/85 py-4 backdrop-blur-lg"
            : "border-transparent bg-transparent py-7"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-2xl tracking-tight text-[#ffe9df]">
            Nextflow.
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#expertise" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Expertise
            </a>
            <a href="#works" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Works
            </a>
            <a href="#perspectives" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Perspective
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={isSignedIn ? "/workflow" : "/sign-in"}
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-100 transition-all hover:border-white/30 hover:bg-white/5"
            >
              {isSignedIn ? "Open Builder" : "Sign In"}
            </Link>
            <Link
              href={isSignedIn ? "/workflow" : "/sign-up"}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-all hover:scale-[1.03] hover:bg-zinc-100"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 pb-20 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-65 mix-blend-screen">
            <Image
              src="https://framerusercontent.com/images/9zvwRJAavKKacVyhFCwHyXW1U.png?width=1536&height=1024"
              alt=""
              fill
              unoptimized
              className="object-cover object-center opacity-70"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]" />
        </div>

        <div className="floating-left pointer-events-none absolute -left-[10%] -top-[8%] z-10 w-[48vw] max-w-[760px] opacity-75 mix-blend-hard-light md:-left-[4%] md:-top-[14%]">
          <Image
            src="https://framerusercontent.com/images/KNhiA5A2ykNYqNkj04Hk6BVg5A.png?width=1540&height=1320"
            alt=""
            width={1540}
            height={1320}
            unoptimized
            className="h-auto w-full object-contain"
          />
        </div>
        <div className="floating-right pointer-events-none absolute -bottom-[8%] -right-[10%] z-10 w-[44vw] max-w-[680px] opacity-75 mix-blend-hard-light md:-bottom-[4%] md:-right-[4%]">
          <Image
            src="https://framerusercontent.com/images/X89VFCABCEjjZ4oLGa3PjbOmsA.png?width=1542&height=1002"
            alt=""
            width={1542}
            height={1002}
            unoptimized
            className="h-auto w-full object-contain"
          />
        </div>

        <div
          className="relative z-20 mx-auto max-w-4xl text-center transition-all duration-500"
          style={{ transform: `translateY(${heroOffset}px)`, opacity: heroOpacity }}
        >
          <h1
            data-reveal-id="hero-title"
            className={`font-serif text-5xl leading-[1.08] tracking-tight text-[#ffe0e0] drop-shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-all duration-700 md:text-7xl ${revealClass("hero-title")}`}
            style={{ transitionDelay: REVEAL_DELAYS["hero-title"] }}
          >
            Nextflow.
            <br />
            <span className="font-light italic">The workflow design agent.</span>
          </h1>

          <p
            data-reveal-id="hero-subtitle"
            className={`mx-auto mt-7 max-w-2xl text-base font-light leading-relaxed tracking-wide text-[#ffe0e0]/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] transition-all duration-700 md:text-lg ${revealClass("hero-subtitle")}`}
            style={{ transitionDelay: REVEAL_DELAYS["hero-subtitle"] }}
          >
            Build multimodal AI workflows with visual nodes, fast iteration, and production-ready orchestration.
          </p>

          <div
            data-reveal-id="hero-cta"
            className={`mt-12 flex flex-col items-center gap-6 transition-all duration-700 ${revealClass("hero-cta")}`}
            style={{ transitionDelay: REVEAL_DELAYS["hero-cta"] }}
          >
            <Link
              href={isSignedIn ? "/workflow" : "/sign-in"}
              className="group relative inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <span className="absolute inset-0 rounded-full bg-[#ff4500]/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60" />
              <span className="relative z-10">Enter the Builder</span>
              <ArrowRight className="relative z-10 h-4 w-4" />
            </Link>

            <div className="mt-3 flex items-center gap-4 text-[11px] uppercase tracking-[0.25em] text-white/45">
              <span>{clock}</span>
              <span className="h-3 w-px bg-white/20" />
              <span>Realtime Node Studio</span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-44 bg-gradient-to-b from-transparent via-[#050505]/70 to-[#050505]" />
      </section>

      <div className="pointer-events-none relative z-10 -mt-20 h-24 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(255,69,0,0.18)_0%,rgba(255,69,0,0.05)_40%,transparent_70%)] blur-2xl" />

      <section id="expertise" className="relative py-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#050505] to-transparent" />
        <div className="mx-auto max-w-6xl px-6">
          <h2
            data-reveal-id="mission-title"
            className={`mx-auto max-w-4xl text-center font-serif text-3xl leading-tight text-white/90 transition-all duration-700 md:text-5xl ${revealClass("mission-title")}`}
            style={{ transitionDelay: REVEAL_DELAYS["mission-title"] }}
          >
            We design the execution layer where your product ideas become living systems.
          </h2>
          <p
            data-reveal-id="mission-copy"
            className={`mx-auto mt-8 max-w-3xl text-center text-xl font-light leading-relaxed text-zinc-400 transition-all duration-700 md:text-2xl ${revealClass("mission-copy")}`}
            style={{ transitionDelay: REVEAL_DELAYS["mission-copy"] }}
          >
            Fewer dashboards. More outcomes. Connect media, prompts, and transformations in one visual runtime.
          </p>

          <div className="mt-24 grid grid-cols-2 place-items-center gap-8 opacity-45 grayscale transition-all duration-500 hover:grayscale-0 md:grid-cols-4">
            <div data-reveal-id="logo-1" className={`text-xl font-semibold tracking-[0.22em] text-zinc-300 transition-all duration-700 ${revealClass("logo-1")}`} style={{ transitionDelay: REVEAL_DELAYS["logo-1"] }}>OPENAI</div>
            <div data-reveal-id="logo-2" className={`text-xl font-semibold tracking-[0.22em] text-zinc-300 transition-all duration-700 ${revealClass("logo-2")}`} style={{ transitionDelay: REVEAL_DELAYS["logo-2"] }}>ANTHROPIC</div>
            <div data-reveal-id="logo-3" className={`text-xl font-semibold tracking-[0.22em] text-zinc-300 transition-all duration-700 ${revealClass("logo-3")}`} style={{ transitionDelay: REVEAL_DELAYS["logo-3"] }}>GEMINI</div>
            <div data-reveal-id="logo-4" className={`text-xl font-semibold tracking-[0.22em] text-zinc-300 transition-all duration-700 ${revealClass("logo-4")}`} style={{ transitionDelay: REVEAL_DELAYS["logo-4"] }}>REPLICATE</div>
          </div>
        </div>
      </section>

      <section id="works" className="relative overflow-hidden py-36">
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #2a2a2a 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <h2
            data-reveal-id="works-title"
            className={`mb-20 text-center font-serif text-5xl leading-[0.95] tracking-tight transition-all duration-700 md:text-7xl ${revealClass("works-title")}`}
            style={{ transitionDelay: REVEAL_DELAYS["works-title"] }}
          >
            Design your
            <br />
            <span className="font-light italic">AI execution engine</span>
          </h2>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <article
              data-reveal-id="card-1"
              className={`rounded-3xl bg-[#ff4500] p-8 shadow-2xl transition-all duration-700 hover:shadow-[0_20px_50px_rgba(255,69,0,0.32)] md:p-12 ${revealClass("card-1")}`}
              style={{
                transform: `translate3d(0, ${cardDownOffset}px, 0)`,
                transitionDelay: REVEAL_DELAYS["card-1"],
                willChange: "transform",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/10">
                  <Star className="h-6 w-6 text-black" />
                </div>
                <span className="rounded-full border border-black/20 px-3 py-1 text-sm text-black">01</span>
              </div>
              <h3 className="mt-10 font-serif text-4xl leading-[0.95] text-black md:text-5xl">From Idea to Workflow</h3>
              <p className="mt-4 text-lg leading-snug text-black/75">
                Start from a concept and convert it into connected, runnable nodes in minutes.
              </p>
              <div className="mt-10 h-px w-full bg-black/15" />
            </article>

            <article
              data-reveal-id="card-2"
              className={`rounded-3xl border border-white/10 bg-[#111111] p-8 shadow-2xl transition-all duration-700 hover:border-[#ff4500]/55 md:mt-24 md:p-12 ${revealClass("card-2")}`}
              style={{
                transform: `translate3d(0, ${cardUpOffset}px, 0)`,
                transitionDelay: REVEAL_DELAYS["card-2"],
                willChange: "transform",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-zinc-400">02</span>
              </div>
              <h3 className="mt-10 font-serif text-4xl leading-[0.95] text-white md:text-5xl">From Prototype to Production</h3>
              <p className="mt-4 text-lg leading-snug text-zinc-400">
                Run experiments, inspect history, and ship the exact flow your team can trust.
              </p>
              <div className="mt-10 h-px w-full bg-white/10" />
            </article>
          </div>
        </div>
      </section>

      <footer id="perspectives" className="relative overflow-hidden border-t border-white/5 bg-[#050505] py-20">
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 md:flex-row md:items-end md:justify-between">
          <h2 className="select-none text-[10vw] font-bold leading-[0.8] tracking-tight text-white/10">NEXTFLOW.</h2>
          <div className="flex flex-col items-start gap-6 md:items-end">
            <div className="flex flex-col gap-3 text-zinc-400 md:text-right">
              <a href="#" className="transition-colors hover:text-white">Instagram</a>
              <a href="#" className="transition-colors hover:text-white">Twitter</a>
              <a href="#" className="transition-colors hover:text-white">LinkedIn</a>
            </div>
            <p className="text-sm text-zinc-600">© 2026 Nextflow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
