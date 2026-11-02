import React, { useState } from 'react';

export type HeadingTone =
  | 'brand'
  | 'violet'
  | 'plum'
  | 'orange'
  | 'cyan'
  | 'blue'
  | 'copper'
  | 'teal'
  | 'amber';
type HeadingEmphasis = 'lavender' | 'orange';
const BRAND_GRADIENT_MIDPOINT = 50;

interface AnimatedHeadingLine {
  text: string;
  accent?: boolean;
  highlights?: Record<string, HeadingEmphasis>;
  className?: string;
}

interface AnimatedHeadingProps {
  as?: 'h1' | 'h2';
  id?: string;
  lines: AnimatedHeadingLine[];
  tone: HeadingTone;
  className?: string;
  reverseGradient?: boolean;
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  as: HeadingTag = 'h1',
  id,
  lines,
  tone,
  className = '',
  reverseGradient = false,
}) => {
  let delayOffset = 0;
  const totalCharacters = lines.reduce(
    (total, line) => total + Array.from(line.text).length,
    0,
  );
  const [isWaveActive, setIsWaveActive] = useState(false);

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLHeadingElement>) => {
    if (event.target instanceof HTMLElement && event.target.dataset.waveEnd === 'true') {
      setIsWaveActive(false);
    }
  };

  return (
    <HeadingTag
      id={id}
      data-tone={tone}
      className={`animated-heading${isWaveActive ? ' is-animating' : ''} ${className}`}
      onMouseEnter={() => setIsWaveActive(true)}
      onAnimationEnd={handleAnimationEnd}
    >
      {lines.map((line, lineIndex) => {
        const tokens = line.text.split(/(\s+)/).filter(Boolean);

        return (
          <span
            key={`${lineIndex}-${line.text}`}
            className={`animated-heading-line${line.accent ? ' animated-heading-line-accent' : ''}${line.className ? ` ${line.className}` : ''}`}
          >
            {tokens.map((token, tokenIndex) => {
              const characters = Array.from(token);
              if (/^\s+$/.test(token)) {
                delayOffset += characters.length;
                return <React.Fragment key={`${lineIndex}-space-${tokenIndex}`}>{token}</React.Fragment>;
              }

              const wordOffset = delayOffset;
              delayOffset += characters.length;
              const isLastWord = lineIndex === lines.length - 1 && tokenIndex === tokens.length - 1;

              return (
                <span
                  key={`${lineIndex}-word-${tokenIndex}`}
                  className="animated-heading-word"
                  data-emphasis={line.highlights?.[token]}
                >
                  <span className="sr-only">{token}</span>
                  <span aria-hidden="true">
                    {characters.map((character, characterIndex) => {
                      const characterOffset = wordOffset + characterIndex;
                      const accentPercent = Math.round(
                        (characterOffset / Math.max(totalCharacters - 1, 1)) * 100,
                      );
                      const gradientPercent = reverseGradient ? 100 - accentPercent : accentPercent;
                      const letterColor =
                        tone === 'brand'
                          ? gradientPercent <= BRAND_GRADIENT_MIDPOINT
                            ? `color-mix(in srgb, var(--heading-text-start) ${100 - (gradientPercent / BRAND_GRADIENT_MIDPOINT) * 100}%, var(--heading-text-middle) ${(gradientPercent / BRAND_GRADIENT_MIDPOINT) * 100}%)`
                            : `color-mix(in srgb, var(--heading-text-middle) ${100 - ((gradientPercent - BRAND_GRADIENT_MIDPOINT) / (100 - BRAND_GRADIENT_MIDPOINT)) * 100}%, var(--heading-text-accent) ${((gradientPercent - BRAND_GRADIENT_MIDPOINT) / (100 - BRAND_GRADIENT_MIDPOINT)) * 100}%)`
                          : `color-mix(in srgb, var(--heading-text-start) ${100 - gradientPercent}%, var(--heading-text-accent) ${gradientPercent}%)`;

                      return (
                        <span
                          key={`${character}-${characterIndex}`}
                          className="animated-heading-letter"
                          data-wave-end={isLastWord && characterIndex === characters.length - 1 ? 'true' : undefined}
                          style={{
                            animationDelay: `${characterOffset * 24}ms`,
                            ...(line.highlights?.[token]
                              ? {}
                              : {
                                  color: letterColor,
                                }),
                          }}
                        >
                          {character}
                        </span>
                      );
                    })}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </HeadingTag>
  );
};
