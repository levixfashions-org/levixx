import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { apiClient } from '../services/api';
import { Collection } from '../types';
import { ArrowRight } from 'lucide-react';

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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-8 space-y-10">
      <div className="border-b border-black/10 pb-6">
        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-black">
          Brand Collections
        </h1>
        <p className="text-xs text-neutral-600 mt-2 max-w-xl">
          Explore architectural capsule drops, cinematic licensed collaborations, and high-density streetwear releases.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="aspect-[4/3] bg-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-neutral-900 block shadow-md"
            >
              <img
                src={col.bannerImageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'}
                alt={col.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-6">
                <div className="space-y-1">
                  <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight">
                    {col.name}
                  </h2>
                  <p className="text-xs text-neutral-300 line-clamp-1">{col.description}</p>
                  <span className="text-[11px] text-[#FF5400] font-mono font-bold uppercase tracking-widest pt-2 flex items-center gap-1">
                    <span>Explore Capsule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
