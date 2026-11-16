import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { apiClient } from '../services/api';
import { Collection } from '../types';
import { ArrowRight } from 'lucide-react';
import { FramedImg } from '../components/FramedImg';

export const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const live = useLiveRefresh();

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/collections');
        // (re-runs silently when the admin edits collections)
        setCollections(res.data.collections || []);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [live]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div className="px-1">
        <p className="lx-eyebrow">Drops &amp; capsules</p>
        <h1 className="lx-h1 mt-1">Collections</h1>
        <p className="lx-sub mt-1.5 max-w-xl">Every LEVIX drop and capsule in one place.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="aspect-[4/3] rounded-[24px] bg-black/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-neutral-900 lx-keep block rounded-[24px] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] ring-1 ring-black/5"
            >
              <FramedImg
                src={col.bannerImageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'}
                alt={col.name}
                className="opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent flex items-end p-3 sm:p-4">
                <div className="w-full flex items-end justify-between gap-3 rounded-[18px] px-4 py-3 bg-white/15 border border-white/25 backdrop-blur-xl">
                  <div className="min-w-0">
                    <h2 className="text-white text-[20px] font-semibold tracking-[-0.02em] truncate">{col.name}</h2>
                    {col.description && <p className="text-[12.5px] text-white/80 line-clamp-1">{col.description}</p>}
                  </div>
                  <span className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
