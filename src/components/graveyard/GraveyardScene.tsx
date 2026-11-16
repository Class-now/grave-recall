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

import { CardDetailPanel } from './CardDetailPanel';
import { CrowKeeper } from './CrowKeeper';
import { FogLayer } from './FogLayer';
import { Ghost } from './Ghost';
import { MoonPhase } from './MoonPhase';
import { Tombstone } from './Tombstone';
import { useDocumentHidden } from './useDocumentHidden';
import { HORIZON_Y, layoutYard, YARD_HEIGHT, YARD_WIDTH } from './visuals';

import './graveyard.css';

const SKY_GRADIENT_ID = 'gr-sky-gradient';

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
            <defs>
              <linearGradient id={SKY_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop class="gr-scene__sky-stop gr-scene__sky-stop--top" offset="0" />
                <stop class="gr-scene__sky-stop gr-scene__sky-stop--horizon" offset="1" />
              </linearGradient>
            </defs>
            <rect
              class="gr-scene__sky"
              x="0"
              y="0"
              width={YARD_WIDTH}
              height={HORIZON_Y}
              fill={`url(#${SKY_GRADIENT_ID})`}
            />
            <rect
              class="gr-scene__ground"
              x="0"
              y={HORIZON_Y}
              width={YARD_WIDTH}
              height={YARD_HEIGHT - HORIZON_Y}
            />
            <MoonPhase cx={230} cy={130} r={40} />
            <CrowKeeper x={1060} y={270} />
            {visible.map((card, i) => {
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
            })}
            {visible.map((card, i) => {
              const pos = layout.positions[i];
              return pos === undefined || !overdueIds.has(card.id) ? null : (
                <Ghost key={card.id} card={card} x={pos.x} y={pos.y} scale={pos.scale} now={now} />
              );
            })}
            <FogLayer width={YARD_WIDTH} height={YARD_HEIGHT} />
          </svg>
        </div>
      </div>
      {selected !== null && <CardDetailPanel card={selected} now={now} onClose={closePanel} />}
    </section>
  );
}
