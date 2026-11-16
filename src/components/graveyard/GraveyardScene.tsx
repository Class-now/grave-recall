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
import { layoutGraves, SKY_HEIGHT } from './visuals';

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

  const layout = layoutGraves(visible.length);
  const now = new Date();
  const hidden = useDocumentHidden();

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId === null ? null : (cards.value.find((c) => c.id === selectedId) ?? null);

  function closePanel(): void {
    const id = selectedId;
    setSelectedId(null);
    if (id === null) return;
    const graves = svgRef.current?.querySelectorAll<SVGGElement>('[data-card-id]');
    graves?.forEach((g) => {
      if (g.getAttribute('data-card-id') === id) g.focus();
    });
  }

  return (
    <section class="gr-graveyard">
      <h2 class="gr-graveyard__title">{t('graveyard.title')}</h2>
      {visible.length === 0 && <p class="gr-graveyard__empty">{t('graveyard.noCards')}</p>}
      <svg
        ref={svgRef}
        class={hidden ? 'gr-scene gr-scene--hidden' : 'gr-scene'}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="group"
        aria-label={t('graveyard.title')}
      >
        <rect class="gr-scene__sky" x="0" y="0" width={layout.width} height={layout.height} />
        <rect
          class="gr-scene__ground"
          x="0"
          y={SKY_HEIGHT}
          width={layout.width}
          height={layout.height - SKY_HEIGHT}
        />
        <MoonPhase />
        <CrowKeeper x={layout.width - 80} y={SKY_HEIGHT - 66} />
        {visible.map((card, i) => {
          const pos = layout.positions[i];
          return pos === undefined ? null : (
            <Tombstone key={card.id} card={card} x={pos.x} y={pos.y} onOpen={(c) => setSelectedId(c.id)} />
          );
        })}
        {visible.map((card, i) => {
          const pos = layout.positions[i];
          return pos === undefined || !overdueIds.has(card.id) ? null : (
            <Ghost key={card.id} card={card} x={pos.x} y={pos.y} now={now} />
          );
        })}
        <FogLayer width={layout.width} height={layout.height} />
      </svg>
      {selected !== null && <CardDetailPanel card={selected} now={now} onClose={closePanel} />}
    </section>
  );
}
