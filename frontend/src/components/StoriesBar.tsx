import React from 'react';
import { Link } from 'react-router-dom';
import { FramedImg } from './FramedImg';

export interface Story {
  id: string;
  name: string;
  href: string;
  image?: string | null;
}

/** Instagram-style story bubbles for collections (mobile). */
export const StoriesBar: React.FC<{ stories: Story[] }> = ({ stories }) => {
  if (!stories.length) return null;
  return (
    <div className="md:hidden flex gap-4 overflow-x-auto no-scrollbar px-4 py-4">
      {stories.map((s) => (
        <Link key={s.id} to={s.href} className="shrink-0 w-[68px] text-center">
          <span className="block w-[64px] h-[64px] mx-auto rounded-full p-[2px] bg-[conic-gradient(#000,#888,#000)]">
            <span className="block w-full h-full rounded-full border-2 border-[#EFEFEF] overflow-hidden bg-neutral-300">
              {s.image && <FramedImg src={s.image} alt="" loading="lazy" />}
            </span>
          </span>
          <span className="block mt-1.5 text-[9.5px] font-semibold uppercase leading-tight line-clamp-2">{s.name}</span>
        </Link>
      ))}
    </div>
  );
};
