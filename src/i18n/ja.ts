/**
 * Japanese strings.
 */
import type { TranslationKey } from './types';

export const ja: Record<TranslationKey, string> = {
  // Navigation and views
  'nav.graveyard': '墓地',
  'nav.seance': '降霊会',
  'nav.stats': '死者之名簿',
  'nav.settings': '設定',
  'nav.crypts': '墓所',

  // Graveyard view
  'graveyard.title': '墓地',
  'graveyard.noCards': 'まだ墓がありません。カードを追加してください。',
  'graveyard.cardDue': '復習予定',
  'graveyard.cardOverdue': '期限切れ',
  'graveyard.cardNew': '新規',

  // Crypt list (deck management)
  'crypt.listTitle': 'あなたの墓所',
  'crypt.newCrypt': '新しい墓所',
  'crypt.rename': '名前を変更',
  'crypt.delete': '削除',
  'crypt.deleteConfirm': 'この墓所を削除しますか？すべてのカードが失われます。',
  'crypt.empty': 'まだ墓所がありません。作成してください。',
  'crypt.cardsCount': '{count}枚のカード',

  // Card editor
  'card.front': '表面',
  'card.back': '裏面',
  'card.example': '例文（任意）',
  'card.save': 'カードを保存',
  'card.cancel': 'キャンセル',
  'card.frontRequired': '表面は必須です',
  'card.backRequired': '裏面は必須です',
  'card.addCard': 'カードを追加',
  'card.editCard': 'カードを編集',
  'card.deleteCard': 'カードを削除',
  'card.exampleOptional': '例文',

  // Bulk import
  'import.title': '一括インポート',
  'import.paste': 'TSVまたはCSVデータを貼り付け',
  'import.submit': 'インポート',
  'import.success': '{count}枚のカードをインポートしました',
  'import.skipped': '{count}行をスキップしました',
  'import.error': 'インポート失敗: {error}',
  'import.tooMany': '1回のインポートは最大500枚まで',

  // Séance (review session)
  'seance.title': '降霊会',
  'seance.noCards': '復習するカードがありません',
  'seance.noCardsDesc': 'すべての魂は安らいでいます。また来てみましょう。',
  'seance.flip': 'スペースキーを押して確認',
  'seance.again': 'もう一度',
  'seance.hard': '難しい',
  'seance.good': '良い',
  'seance.easy': '簡単',
  'seance.remaining': '残り{count}枚',
  'seance.complete': '降霊会完了',
  'seance.completeDesc': '霊たちは鎮まりました。よくできました。',
  'seance.pressSpace': 'スペースキーを押して開始',

  // Stats (Ledger of the Dead)
  'stats.title': '死者之名簿',
  'stats.retention': '記憶率',
  'stats.reviewsToday': '今日の復習',
  'stats.streak': '連続日数',
  'stats.forecast': '予測',
  'stats.retentionRate': '{percent}%の記憶率',
  'stats.noData': 'データなし',
  'stats.days': '日',
  'stats.cards': '枚',

  // Settings
  'settings.title': '設定',
  'settings.audio': '音声',
  'settings.volume': '音量',
  'settings.cowardMode': '肝試しモード',
  'settings.cowardModeDesc': '恐ろしい音を優しいチャイムに置き換え',
  'settings.captions': 'キャプション表示',
  'settings.captionsDesc': '音声のテキストキャプションを表示',
  'settings.appearance': '外観',
  'settings.reducedMotion': 'モーション軽減',
  'settings.reducedMotionDesc': 'アニメーションを無効化',
  'settings.language': '言語',
  'settings.data': 'データ',
  'settings.export': 'データをエクスポート',
  'settings.import': 'データをインポート',
  'settings.exportSuccess': 'エクスポート成功',
  'settings.importSuccess': 'インポート成功',
  'settings.importError': 'インポート失敗: {error}',

  // Audio captions
  'caption.ghostScream': '幽霊が叫ぶ',
  'caption.softChime': '優しいチャイム',
  'caption.candleSeal': '蝋燭の封印が光る',
  'caption.hardThud': '重い衝撃音',
  'caption.pageTurn': 'ページがめくれる',
  'caption.crowCaw': 'カラスが鳴く',
  'caption.sessionEndToll': '鐘が鳴る',
  'caption.importSuccess': '新しい魂が到来',

  // Accessibility
  'a11y.tombstone': '{front}の墓',
  'a11y.ghost': '忘れられた言葉の幽霊',
  'a11y.fog': '忘却の霧',
  'a11y.moon': '月齢: {percent}%',
  'a11y.crow': 'カラス番人',
  'a11y.flipCard': 'カードの表面',
  'a11y.gradeAgain': 'もう一度と評価',
  'a11y.gradeHard': '難しいと評価',
  'a11y.gradeGood': '良いと評価',
  'a11y.gradeEasy': '簡単と評価',
  'a11y.closeDialog': 'ダイアログを閉じる',

  // Validation errors
  'error.required': 'この項目は必須です',
  'error.invalidJson': '無効なJSON形式です',
  'error.importFailed': 'インポート失敗',

  // Misc
  'app.name': '墓場召回',
  'common.yes': 'はい',
  'common.no': 'いいえ',
  'common.cancel': 'キャンセル',
  'common.confirm': '確認',
  'common.loading': '読み込み中...',
};