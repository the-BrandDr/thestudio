'use client';

import * as React from 'react';

// Words paired across the signature Lavie Studios accent palette
const WORDS = [
  { text: 'unforgettable', color: 'text-[#e55130]' },                 // Vibrant Red/Orange
  { text: 'intentional',   color: 'text-[#c7cb2d] dark:text-[#c7cb2d]' }, // Citrus Lime Accent
  { text: 'extraordinary', color: 'text-[#f2a01e]' },                 // Warm Amber/Gold
  { text: 'captivating',   color: 'text-[#c7cb2d] dark:text-[#c7cb2d]' }, // Citrus Lime Accent
  { text: 'impactful',     color: 'text-[#e55130]' },                 // Vibrant Red/Orange
];

export default function RotatingWord() {
  const [index, setIndex] = React.useState(0);
  const [fade, setFade] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // Smooth fade/slide out
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % WORDS.length);
        setFade(true); // Fade back in with the new word and brand color
      }, 300);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const current = WORDS[index];

  return (
    <span
      className={`inline-block italic font-serif font-normal transition-all duration-300 ease-out transform ${current.color} ${
        fade
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-2 scale-95'
      }`}
    >
      {current.text}.
    </span>
  );
}