import React, { type ReactNode } from 'react';
import { AnimatedHeading, type HeadingTone } from './AnimatedHeading';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  tone: HeadingTone;
  meta?: ReactNode;
  actions?: ReactNode;
}

export const PageHero: React.FC<PageHeroProps> = ({
  eyebrow,
  title,
  accent,
  description,
  tone,
  meta,
  actions,
}) => (
  <section className="relative flex min-h-[18rem] flex-col justify-end py-10 sm:min-h-[20rem] sm:py-12 lg:min-h-[24rem]">
    <div className="flex flex-col justify-end gap-8 sm:gap-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="h-1 w-6 rounded-full bg-indigo-400" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300 sm:text-xs">
            {eyebrow}
          </span>
          {meta && <span className="text-xs text-neutral-400">{meta}</span>}
        </div>

        <AnimatedHeading
          tone={tone}
          className="mt-6 w-fit max-w-full text-3xl font-bold leading-tight tracking-tight text-neutral-100 sm:mt-8 sm:text-4xl lg:text-5xl"
          lines={[
            { text: title },
            { text: accent, accent: true, className: 'mt-2 sm:mt-3' },
          ]}
        />
        <div className="mt-6 max-w-2xl border-l-2 border-indigo-500/50 pl-4 sm:mt-8 sm:pl-5">
          <p className="text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
            {description}
          </p>
        </div>
      </div>

      {actions && (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap md:justify-end">
          {actions}
        </div>
      )}
    </div>
  </section>
);
