import React from 'react';
import { Role, User } from '../types';
import { DEMO_USERS } from '../api';
import { ShoppingBag, Zap, Shield, Bot, Radio, Database, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSelectRole: (role: Role) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isSocketConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectRole,
  activeTab,
  onSelectTab,
  isSocketConnected,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ShopFast
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROD v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">High-Performance E-Commerce & AI Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectTab('products')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Sản phẩm & Mua hàng</span>
          </button>

          <button
            onClick={() => onSelectTab('tracking')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'tracking'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Theo dõi Realtime (F02)</span>
          </button>

          <button
            onClick={() => onSelectTab('ai-chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ai-chat'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>AI Support Agent (F01)</span>
          </button>

          <button
            onClick={() => onSelectTab('queues')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'queues'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>BullMQ & Cron (F05)</span>
          </button>
        </nav>

        {/* Role Switcher & Live Connection Status */}
        <div className="flex items-center gap-3">
          {/* Socket Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span>WebSocket Live</span>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <Shield className="h-3.5 w-3.5 text-emerald-400 ml-1.5" />
            <select
              value={currentUser.role}
              onChange={(e) => onSelectRole(e.target.value as Role)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none pr-2 cursor-pointer"
            >
              <option value="CUSTOMER" className="bg-slate-900 text-white">Khách hàng (CUSTOMER)</option>
              <option value="AGENT" className="bg-slate-900 text-white">CSKH (AGENT - Phê duyệt HITL)</option>
              <option value="WAREHOUSE" className="bg-slate-900 text-white">Thủ kho (WAREHOUSE)</option>
              <option value="ADMIN" className="bg-slate-900 text-white">Quản trị viên (ADMIN)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
