/**
 * The graveyard: one tombstone per card in the active crypt, a ghost over each
 * overdue card, fog, moon and crow. Everything reads from store signals, so the
 * scene updates as cards are reviewed.
 *
 * Scope: shows the cards of `deckId` when given, otherwise the active crypt,
 * otherwise every card.
 */
import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { activeDeckId, cards, overdueCards, type Card } from '../../store';
import type { DeckId } from '../../scheduler/types';
import { t } from '../../i18n';

import { BackdropBack, BackdropFront } from './Backdrop';
import { CardDetailPanel } from './CardDetailPanel';
import { CrowKeeper } from './CrowKeeper';
import { FogLayer } from './FogLayer';
import { Ghost, GhostDefs } from './Ghost';
import { MoonPhase } from './MoonPhase';
import { Tombstone } from './Tombstone';
import { useDocumentHidden } from './useDocumentHidden';
import {
  GATE_X,
  GATE_Y,
  layoutYard,
  MOON_CX,
  MOON_CY,
  MOON_RADIUS,
  YARD_HEIGHT,
  YARD_WIDTH,
} from './visuals';

import './graveyard.css';

export interface GraveyardSceneProps {
  /** Crypt to show. Omit to follow the active crypt (all cards when none is active). */
  deckId?: DeckId | null;
}

export function GraveyardScene(props: GraveyardSceneProps): h.JSX.Element {
  const scopeId = props.deckId !== undefined ? props.deckId : activeDeckId.value;
  const visible: Card[] =
    scopeId === null ? cards.value : cards.value.filter((c) => c.deckId === scopeId);
  const overdueIds = new Set(overdueCards.value.map((c) => c.id));

  const layout = layoutYard(visible.length);
  const now = new Date();
  const hidden = useDocumentHidden();

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Roving tabindex: one grave is the Tab stop, arrow keys move between graves.
  const [stopId, setStopId] = useState<string | null>(null);
  const stopIndex = Math.max(0, visible.findIndex((c) => c.id === stopId));
  const selected = selectedId === null ? null : (cards.value.find((c) => c.id === selectedId) ?? null);

  function closePanel(): void {
    const id = selectedId;
    setSelectedId(null);
    if (id !== null) focusGrave(id);
  }

  function focusGrave(id: string): void {
    const graves = svgRef.current?.querySelectorAll<SVGGElement>('[data-card-id]');
    graves?.forEach((g) => {
      if (g.getAttribute('data-card-id') === id) g.focus();
    });
  }

  function onSceneKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const id = e.target instanceof Element ? e.target.getAttribute('data-card-id') : null;
    if (id === null) return;
    const index = visible.findIndex((c) => c.id === id);
    if (index < 0) return;
    const last = visible.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = index + 1;
        break;
      case 'ArrowLeft':
        next = index - 1;
        break;
      case 'ArrowDown':
        next = index + layout.columns;
        break;
      case 'ArrowUp':
        next = index - layout.columns;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const target = visible[Math.min(last, Math.max(0, next))];
    if (target !== undefined) focusGrave(target.id);
  }

  // Fog sits in front of the back and middle rows and behind the last two rows
  // (the last row when there are fewer than four rows). DOM order of the graves
  // stays equal to card order: the back set is a prefix of `visible`.
  const frontRows = layout.rows >= 4 ? 2 : 1;
  const frontStart = Math.max(0, layout.rows - frontRows) * layout.columns;

  function renderGrave(card: Card, i: number): h.JSX.Element | null {
    const pos = layout.positions[i];
    return pos === undefined ? null : (
      <Tombstone
        key={card.id}
        card={card}
        x={pos.x}
        y={pos.y}
        scale={pos.scale}
        tilt={pos.tilt}
        shade={pos.shade}
        tabStop={i === stopIndex}
        onFocus={(c) => setStopId(c.id)}
        onOpen={(c) => setSelectedId(c.id)}
      />
    );
  }

  return (
    <section class="gr-graveyard">
      <h2 class="gr-graveyard__title">{t('graveyard.title')}</h2>
      {visible.length === 0 && <p class="gr-graveyard__empty">{t('graveyard.noCards')}</p>}
      {visible.length > 0 && (
        <p id="gr-graveyard-hint" class="gr-graveyard__hint">
          {t('graveyard.keyboardHint')}
        </p>
      )}
      <div class="gr-stage-scroll">
        <div class="gr-stage">
          <svg
            ref={svgRef}
            class={hidden ? 'gr-scene gr-scene--hidden' : 'gr-scene'}
            viewBox={`0 0 ${YARD_WIDTH} ${YARD_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={t('graveyard.title')}
            aria-describedby={visible.length > 0 ? 'gr-graveyard-hint' : undefined}
            onKeyDown={onSceneKeyDown}
          >
            <GhostDefs />
            <BackdropBack />
            <MoonPhase cx={MOON_CX} cy={MOON_CY} r={MOON_RADIUS} />
            <CrowKeeper x={GATE_X} y={GATE_Y} />
            {visible.map((card, i) => (i < frontStart ? renderGrave(card, i) : null))}
            <FogLayer width={YARD_WIDTH} height={YARD_HEIGHT} />
            {visible.map((card, i) => (i < frontStart ? null : renderGrave(card, i)))}
            <BackdropFront />
            {visible.map((card, i) => {
              const pos = layout.positions[i];
              return pos === undefined || !overdueIds.has(card.id) ? null : (
                <Ghost key={card.id} card={card} x={pos.x} y={pos.y} scale={pos.scale} now={now} />
              );
            })}
          </svg>
        </div>
      </div>
      {selected !== null && <CardDetailPanel card={selected} now={now} onClose={closePanel} />}
    </section>
  );
}
