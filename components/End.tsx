'use client';

import React, { useState } from 'react';
import {
  Trophy,
  RotateCcw,
  LogOut,
  Skull,
  MessageSquare,
  Send,
  Eye,
  Award,
  Share2,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Avatar, Modal, RubberStamp } from './ui';
import { clearRoomData } from '@/lib/storage';
import {
  recordMatchCompletion,
  computeMatchAwards,
  renderShareCardToBlob,
  getPlayerStats,
  getPlayerAchievements,
  resetPlayerStats,
} from '@/lib/stats';

interface EndProps {
  gameView: ClientGameView;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
  onSendChat: (channel: 'dead', text: string) => void;
}

export function End({ gameView, isHost, onRematch, onLeave, onSendChat }: EndProps) {
  const [ghostChatInput, setGhostChatInput] = useState('');
  const [rematchConfirmOpen, setRematchConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { winner, players, secretLog, phase, me, chat, settings } = gameView;
  const isDead = me && !me.alive && !me.isGod;
  const isGameOver = phase === 'gameOver' || Boolean(winner);

  const handleSendGhostChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostChatInput.trim()) return;
    onSendChat('dead', ghostChatInput.trim());
    setGhostChatInput('');
  };

  const handleConfirmRematch = () => {
    setRematchConfirmOpen(false);
    onRematch();
  };

  const handleConfirmLeave = () => {
    setLeaveConfirmOpen(false);
    clearRoomData(gameView.code);
    onLeave();
  };

  // Record stats once when game concludes
  React.useEffect(() => {
    if (isGameOver && winner && me?.role) {
      const matchKey = `${gameView.code}_${gameView.round}_${winner}`;
      recordMatchCompletion(matchKey, winner, me.role, Boolean(me.alive));
    }
  }, [isGameOver, winner, me?.role, me?.alive, gameView.code, gameView.round]);

  const awards = React.useMemo(() => {
    return computeMatchAwards(players, gameView.log || [], secretLog, winner);
  }, [players, gameView.log, secretLog, winner]);

  const handleShareCard = async () => {
    setIsSharing(true);
    try {
      const blob = await renderShareCardToBlob(gameView, me?.name || 'Player', me?.role);
      if (!blob) return;

      const file = new File([blob], `mafia-dossier-${gameView.code}.png`, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mafia: Shadows of the City — Match Docket',
          text: `Case closed in Room #${gameView.code}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mafia-dossier-${gameView.code}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (_) {
    } finally {
      setIsSharing(false);
    }
  };

  const playerStats = getPlayerStats();
  const achievements = getPlayerAchievements();

  // Role color mappings
  const getRoleTopBorder = (role?: string) => {
    if (role === 'mafia' || role === 'godfather') return '#B3363B';
    if (role === 'doctor' || role === 'civilian') return '#5E8C7B';
    if (role === 'police') return '#5B7A99';
    if (role === 'vigilante') return '#D9A441';
    if (role === 'jester') return '#8C6FA0';
    return '#5E8C7B';
  };

  const getRoleInkColor = (role?: string) => {
    if (role === 'mafia' || role === 'godfather') return '#7E2327';
    if (role === 'doctor' || role === 'civilian') return '#3d6657';
    if (role === 'police') return '#2f4a66';
    if (role === 'vigilante') return '#8c651e';
    if (role === 'jester') return '#583a6b';
    return '#3d6657';
  };

  return (
    <div
      className="b relative w-full min-h-screen lg:h-[760px] max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden select-none flex flex-col justify-between py-6 px-5 sm:px-10 text-[#ECE6D8]"
      style={{
        background:
          winner === 'town'
            ? 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(94,140,123,.32), transparent 72%), #0A0B0E'
            : winner === 'jester'
            ? 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(140,111,160,.32), transparent 72%), #0A0B0E'
            : 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(179,54,59,.32), transparent 72%), #0A0B0E',
      }}
    >
      {/* Top Bar with Navigation & Phase Badge */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onLeave}
            className="hb flex items-center justify-center hover:border-bone transition-colors"
            aria-label="Back"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="hb flex items-center justify-center hover:border-bone transition-colors"
            aria-label="Toggle Case Timeline"
            title="View secret match timeline"
          >
            ≡
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="t text-xs tracking-widest uppercase px-3 py-1 bg-[#101216] border border-[#262A33] text-[#A39D90]">
            ROOM #{gameView.code}
          </span>
        </div>
      </div>

      {/* Hero Victory Banner */}
      <div className="text-center space-y-2 my-3">
        <div className="d text-2xl sm:text-4xl font-extrabold tracking-[6px] uppercase text-[#D9A441] select-none">
          CASE CLOSED · ROUND {gameView.round}
        </div>

        <h1
          className="d text-5xl sm:text-7xl lg:text-[110px] xl:text-[140px] font-black tracking-[3px] uppercase m-0 leading-none text-[#ECE6D8]"
          style={{ fontSize: 'clamp(44px, 9vw, 130px)' }}
        >
          {winner === 'mafia' ? (
            <>
              THE <span style={{ color: '#C2373D' }}>SYNDICATE</span> WINS
            </>
          ) : winner === 'town' ? (
            <>
              THE <span style={{ color: '#5E8C7B' }}>TOWN</span> PREVAILS
            </>
          ) : (
            <>
              THE <span style={{ color: '#8C6FA0' }}>JESTER</span> WINS
            </>
          )}
        </h1>

        <div className="text-base sm:text-[21px] text-[#A39D90] font-sans">
          {winner === 'mafia'
            ? 'Parity reached. Darkness reigns.'
            : winner === 'town'
            ? 'All syndicate operatives eliminated. Order restored.'
            : 'Deceived the town into execution. Chaos reigns.'}
        </div>
      </div>

      {/* Roster Revealed Cards Row (matching mockup 220×260px paper cards) */}
      <div className="w-full overflow-x-auto py-4">
        <div className="flex items-center justify-start lg:justify-center gap-5 sm:gap-7 min-w-max px-2 mx-auto">
          {players.map((p) => {
            const isSurvivor = p.alive;
            const topBorderColor = getRoleTopBorder(p.role);
            const inkColor = getRoleInkColor(p.role);
            const roleName = p.role ? p.role.toUpperCase() : 'UNKNOWN';
            const playerColor = p.color || '#ECE6D8';

            return (
              <div
                key={p.id}
                className="relative rounded-[4px] shadow-2xl transition-transform hover:-translate-y-1 duration-200"
                style={{
                  width: '220px',
                  height: '260px',
                  boxSizing: 'border-box',
                  padding: '20px',
                  background: isSurvivor ? '#ECE6D8' : '#cfc8b8',
                  color: '#15130f',
                  borderTop: `6px solid ${topBorderColor}`,
                  opacity: isSurvivor ? 1 : 0.85,
                }}
              >
                {/* Silhouette avatar with player color pin ring */}
                <div
                  className="av"
                  style={{ ['--c' as any]: playerColor }}
                />

                {/* Player Name */}
                <div className="font-semibold text-[20px] mt-3 truncate font-sans">
                  {p.name}
                </div>

                {/* Role Title in Big Shoulders Display */}
                <div
                  className="d text-[44px] font-extrabold leading-tight truncate uppercase"
                  style={{ color: inkColor }}
                >
                  {roleName}
                </div>

                {/* Bottom Left Rubber Stamp */}
                {isSurvivor ? (
                  <div
                    className="t absolute left-[20px] bottom-[22px] text-[13px] font-mono tracking-wider font-bold uppercase select-none pointer-events-none"
                    style={{
                      border: '2px solid #15130f',
                      padding: '2px 8px',
                      transform: 'rotate(-5deg)',
                      color: '#15130f',
                    }}
                  >
                    SURVIVED
                  </div>
                ) : (
                  <div
                    className="t absolute left-[20px] bottom-[22px] text-[13px] font-mono tracking-wider font-bold uppercase select-none pointer-events-none"
                    style={{
                      border: '2px solid #7E2327',
                      color: '#7E2327',
                      padding: '2px 8px',
                      transform: 'rotate(-5deg)',
                    }}
                  >
                    ELIMINATED · R{p.diedInRound || 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Awards & Citations Line (matching mockup Special Elite 15px gold) */}
      <div className="t text-center text-xs sm:text-[15px] text-[#D9A441] tracking-[1px] my-1 uppercase">
        {awards.length > 0 ? (
          awards.map((a, i) => (
            <span key={a.id} className="mx-2 sm:mx-4">
              {a.title} · {a.recipientName}
            </span>
          ))
        ) : (
          <span>HONORABLE ENGAGEMENT · ALL OPERATIVES</span>
        )}
      </div>

      {/* Action Buttons Row (matching mockup button styles) */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 my-2">
        {isHost ? (
          <button
            type="button"
            onClick={() => setRematchConfirmOpen(true)}
            className="h-[56px] px-8 sm:w-[270px] bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] font-semibold text-[18px] rounded-[4px] border-0 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play again</span>
          </button>
        ) : (
          <div className="h-[56px] px-6 bg-[#171A20] border border-[#262A33] text-[#A39D90] font-sans text-[16px] rounded-[4px] flex items-center justify-center gap-2">
            <span>Waiting for host to rematch...</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleShareCard}
          disabled={isSharing}
          className="h-[56px] px-6 bg-transparent hover:bg-[#171A20] text-[#ECE6D8] border border-[#8e8878] rounded-[4px] text-[16px] transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4 text-[#D9A441]" />
          <span>{isSharing ? 'Generating...' : 'Share match docket'}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatsModalOpen(true)}
          className="h-[56px] px-6 bg-transparent hover:bg-[#171A20] text-[#ECE6D8] border border-[#8e8878] rounded-[4px] text-[16px] transition-colors flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4" />
          <span>Career dossier</span>
        </button>

        <button
          type="button"
          onClick={() => setLeaveConfirmOpen(true)}
          className="text-[#A39D90] hover:text-[#ECE6D8] text-[16px] ml-3 transition-colors underline font-sans"
        >
          Leave room
        </button>
      </div>

      {/* Expandable Secret Match Timeline Drawer */}
      {showTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[560px] h-full bg-[#101216] border-l border-[#262A33] p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#D9A441]" />
                  <h3 className="d text-2xl font-bold uppercase tracking-wider text-[#ECE6D8] m-0">
                    MATCH CHRONICLE & TIMELINE
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimeline(false)}
                  className="hb flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Event Logs List */}
              <div className="space-y-2 font-mono text-xs">
                {gameView.log && gameView.log.length > 0 ? (
                  gameView.log.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 border leading-relaxed ${
                        entry.type === 'death'
                          ? 'bg-blood/10 border-blood/50 text-red-200'
                          : entry.type === 'vote'
                          ? 'bg-[#171A20] border-[#262A33] text-[#D9A441]'
                          : 'bg-[#101216] border-[#262A33] text-[#ECE6D8]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#A39D90] mb-1">
                        <span className="uppercase font-bold">ROUND {entry.round} · {entry.phase}</span>
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>{entry.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[#A39D90] py-12">
                    No timeline logs recorded for this operation.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#262A33] flex justify-end">
              <button
                type="button"
                onClick={() => setShowTimeline(false)}
                className="ob px-6 h-[44px]"
              >
                Close timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rematch Confirmation Modal */}
      <Modal
        isOpen={rematchConfirmOpen}
        onClose={() => setRematchConfirmOpen(false)}
        title="COMMENCE NEW OPERATION"
        subtitle="SYNDICATE REMATCH · REINITIALIZE BRIEFING"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <p className="text-sm leading-relaxed text-[#ECE6D8]">
            Return all operatives to the back room lobby with the existing case configuration?
          </p>
          <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] text-xs text-[#A39D90] leading-relaxed">
            All players will return to the table with their avatars and nicknames preserved.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setRematchConfirmOpen(false)}
              className="ob px-4 py-2 text-xs font-semibold rounded text-[#A39D90] hover:text-[#ECE6D8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRematch}
              className="px-6 py-2 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#F0D79A] shadow-lg transition-all"
            >
              Confirm Rematch
            </button>
          </div>
        </div>
      </Modal>

      {/* Leave Room Confirmation Modal */}
      <Modal
        isOpen={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title="EXIT ROOM"
        subtitle={`CASE #${gameView.code} · DISCONNECT`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-2">
            <div className="flex items-center gap-2.5 text-sm font-bold text-[#ECE6D8]">
              <span className="w-2 h-2 rounded-full bg-[#D9A441]" />
              <span>Leave Match Session?</span>
            </div>
            <p className="text-xs text-[#A39D90] leading-relaxed">
              Are you sure you want to exit room <strong className="text-[#D9A441] font-mono">{gameView.code}</strong>? You will be disconnected from the table and returned to headquarters.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setLeaveConfirmOpen(false)}>
              Stay in Room
            </Button>
            <Button variant="danger" onClick={handleConfirmLeave}>
              Exit Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* Career Dossier Modal */}
      <Modal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        title="CAREER DOSSIER & RECORD"
      >
        <div className="space-y-5 text-[#ECE6D8] font-mono p-2">
          {/* Lifetime stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-[#171A20] border border-[#262A33]">
              <div className="text-2xl font-bold text-[#D9A441]">{playerStats.gamesPlayed}</div>
              <div className="text-[10px] text-[#A39D90] uppercase mt-1">Operations</div>
            </div>
            <div className="p-3 bg-[#171A20] border border-[#262A33]">
              <div className="text-2xl font-bold text-emerald-400">{playerStats.wins}</div>
              <div className="text-[10px] text-[#A39D90] uppercase mt-1">Victories</div>
            </div>
            <div className="p-3 bg-[#171A20] border border-[#262A33]">
              <div className="text-2xl font-bold text-[#ECE6D8]">{playerStats.losses}</div>
              <div className="text-[10px] text-[#A39D90] uppercase mt-1">Defeats</div>
            </div>
            <div className="p-3 bg-[#171A20] border border-[#262A33]">
              <div className="text-2xl font-bold text-[#D9A441]">
                {playerStats.gamesPlayed > 0
                  ? `${Math.round((playerStats.wins / playerStats.gamesPlayed) * 100)}%`
                  : '0%'}
              </div>
              <div className="text-[10px] text-[#A39D90] uppercase mt-1">Win Rate</div>
            </div>
          </div>

          {/* Role Counts */}
          <div className="p-3 bg-[#171A20] border border-[#262A33] space-y-2">
            <span className="text-xs font-bold text-[#ECE6D8] uppercase tracking-wider block">
              Deployment Assignments
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div>
                <span className="text-[#A39D90] text-[10px] block">Mafia</span>
                <span className="font-bold text-red-300">{playerStats.roleCounts.mafia || 0}</span>
              </div>
              <div>
                <span className="text-[#A39D90] text-[10px] block">Doctor</span>
                <span className="font-bold text-emerald-300">{playerStats.roleCounts.doctor || 0}</span>
              </div>
              <div>
                <span className="text-[#A39D90] text-[10px] block">Police</span>
                <span className="font-bold text-blue-300">{playerStats.roleCounts.police || 0}</span>
              </div>
              <div>
                <span className="text-[#A39D90] text-[10px] block">Vigilante</span>
                <span className="font-bold text-[#D9A441]">{playerStats.roleCounts.vigilante || 0}</span>
              </div>
              <div>
                <span className="text-[#A39D90] text-[10px] block">Jester</span>
                <span className="font-bold text-purple-300">{playerStats.roleCounts.jester || 0}</span>
              </div>
              <div>
                <span className="text-[#A39D90] text-[10px] block">Civilian</span>
                <span className="font-bold text-[#ECE6D8]">{playerStats.roleCounts.civilian || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setStatsModalOpen(false)}
              className="ob px-4 py-1.5 text-xs uppercase"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
