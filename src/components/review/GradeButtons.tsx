/**
 * Again / Hard / Good / Easy. Rendered only while the card is face-up (AC-13.2).
 * Keys 1 to 4 map to grades 0 to 3 (AC-14.2). The "Again" button takes focus on
 * mount, which is the moment the card flips (AC-15.3).
 */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import type { Grade } from '../../scheduler/types';
import { t } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

import { isSeanceKeyEvent } from './keys';

import './review.css';

interface GradeDefinition {
  grade: Grade;
  key: string;
  label: TranslationKey;
  aria: TranslationKey;
  modifier: 'again' | 'hard' | 'good' | 'easy';
}

const GRADES: readonly GradeDefinition[] = [
  { grade: 0, key: '1', label: 'seance.again', aria: 'a11y.gradeAgain', modifier: 'again' },
  { grade: 1, key: '2', label: 'seance.hard', aria: 'a11y.gradeHard', modifier: 'hard' },
  { grade: 2, key: '3', label: 'seance.good', aria: 'a11y.gradeGood', modifier: 'good' },
  { grade: 3, key: '4', label: 'seance.easy', aria: 'a11y.gradeEasy', modifier: 'easy' },
];

export interface GradeButtonsProps {
  onGrade: (grade: Grade) => void;
  /** Id of the element holding the answer; read out when "Again" receives focus. */
  describedBy?: string;
}

export function GradeButtons(props: GradeButtonsProps): h.JSX.Element {
  const { onGrade, describedBy } = props;
  const againRef = useRef<HTMLButtonElement>(null);
  const onGradeRef = useRef(onGrade);
  onGradeRef.current = onGrade;
  // True between a Space keydown and keyup on a grade button.
  const spaceArmed = useRef(false);

  useEffect(() => {
    againRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.repeat || !isSeanceKeyEvent(e)) return;
      const def = GRADES.find((g) => g.key === e.key);
      if (def === undefined) return;
      e.preventDefault();
      onGradeRef.current(def.grade);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Space that flipped the card is still down when focus lands on "Again".
  // Browsers click a button on Space keyup, which would grade the card
  // "Again" by accident. Swallow a Space keyup that did not start on the button.
  function onButtonKeyDown(e: KeyboardEvent): void {
    if (e.key !== ' ') return;
    if (e.repeat) e.preventDefault();
    else spaceArmed.current = true;
  }
  function onButtonKeyUp(e: KeyboardEvent): void {
    if (e.key !== ' ') return;
    if (!spaceArmed.current) e.preventDefault();
    spaceArmed.current = false;
  }

  return (
    <div class="gr-grades">
      {GRADES.map((def) => (
        <button
          key={def.grade}
          ref={def.grade === 0 ? againRef : undefined}
          type="button"
          class={`gr-grade gr-grade--${def.modifier}`}
          aria-label={t(def.aria)}
          aria-keyshortcuts={def.key}
          aria-describedby={def.grade === 0 ? describedBy : undefined}
          onClick={() => onGrade(def.grade)}
          onKeyDown={onButtonKeyDown}
          onKeyUp={onButtonKeyUp}
        >
          <span class="gr-grade__label">{t(def.label)}</span>
          <kbd class="gr-grade__key" aria-hidden="true">
            {def.key}
          </kbd>
        </button>
      ))}
    </div>
  );
}
