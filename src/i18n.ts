export const UI_LANGUAGES = [
  { code: "es", short: "ES", name: "Español", locale: "es-CO" },
  { code: "en", short: "EN", name: "English", locale: "en-US" },
  { code: "pt", short: "PT", name: "Português", locale: "pt-BR" },
  { code: "fr", short: "FR", name: "Français", locale: "fr-FR" },
  { code: "de", short: "DE", name: "Deutsch", locale: "de-DE" },
  { code: "it", short: "IT", name: "Italiano", locale: "it-IT" },
  { code: "pl", short: "PL", name: "Polski", locale: "pl-PL" },
  { code: "tr", short: "TR", name: "Türkçe", locale: "tr-TR" },
  { code: "ru", short: "RU", name: "Русский", locale: "ru-RU" },
  { code: "ja", short: "JA", name: "日本語", locale: "ja-JP" },
  { code: "ko", short: "KO", name: "한국어", locale: "ko-KR" },
  { code: "zh", short: "ZH", name: "简体中文", locale: "zh-CN" },
] as const;

export type UiLanguage = typeof UI_LANGUAGES[number]["code"];
const SUPPORTED = new Set<string>(UI_LANGUAGES.map((item) => item.code));
export function isUiLanguage(value: unknown): value is UiLanguage { return typeof value === "string" && SUPPORTED.has(value); }
export function localeForLanguage(language: UiLanguage) { return UI_LANGUAGES.find((item) => item.code === language)?.locale ?? "en-US"; }

type TranslationRow = Partial<Record<Exclude<UiLanguage, "es" | "en">, string>>;
const CORE: Record<string, TranslationRow> = {
  Crate: { pt: "Caixa", fr: "Caisse", de: "Kiste", it: "Cassa", pl: "Skrzynia", tr: "Sandık", ru: "Ящик", ja: "クレート", ko: "상자", zh: "箱子" },
  Characters: { pt: "Personagens", fr: "Personnages", de: "Charaktere", it: "Personaggi", pl: "Postacie", tr: "Karakterler", ru: "Персонажи", ja: "キャラクター", ko: "캐릭터", zh: "角色" },
  "Visional Wheel": { pt: "Roda Visional", fr: "Roue visionnelle", de: "Visionsrad", it: "Ruota visionale", pl: "Koło wizji", tr: "Vizyon çarkı", ru: "Колесо видения", ja: "ヴィジョンホイール", ko: "비전 휠", zh: "幻视轮盘" },
  Devices: { pt: "Dispositivos", fr: "Appareils", de: "Geräte", it: "Dispositivi", pl: "Urządzenia", tr: "Cihazlar", ru: "Устройства", ja: "デバイス", ko: "기기", zh: "设备" },
  History: { pt: "Histórico", fr: "Historique", de: "Verlauf", it: "Cronologia", pl: "Historia", tr: "Geçmiş", ru: "История", ja: "履歴", ko: "기록", zh: "历史" },
  "Shiny Mods": { pt: "Mods Brilhantes", fr: "Mods Brillants", de: "Glänzende Mods", it: "Mod Brillanti", pl: "Błyszczące mody", tr: "Parlak Modlar", ru: "Блестящие моды", ja: "シャイニーMOD", ko: "샤이니 모드", zh: "闪耀模组" },
  Changes: { pt: "Alterações", fr: "Changements", de: "Änderungen", it: "Modifiche", pl: "Zmiany", tr: "Değişiklikler", ru: "Изменения", ja: "変更履歴", ko: "변경 사항", zh: "更新日志" },
  Settings: { pt: "Configurações", fr: "Paramètres", de: "Einstellungen", it: "Impostazioni", pl: "Ustawienia", tr: "Ayarlar", ru: "Настройки", ja: "設定", ko: "설정", zh: "设置" },
  Sync: { pt: "Sincronizar", fr: "Synchroniser", de: "Synchronisieren", it: "Sincronizza", pl: "Synchronizuj", tr: "Eşitle", ru: "Синхронизация", ja: "同期", ko: "동기화", zh: "同步" },
  "App language": { pt: "Idioma do aplicativo", fr: "Langue de l’application", de: "App-Sprache", it: "Lingua dell’app", pl: "Język aplikacji", tr: "Uygulama dili", ru: "Язык приложения", ja: "アプリの言語", ko: "앱 언어", zh: "应用语言" },
  Language: { pt: "Idioma", fr: "Langue", de: "Sprache", it: "Lingua", pl: "Język", tr: "Dil", ru: "Язык", ja: "言語", ko: "언어", zh: "语言" },
  "Live synchronization": { pt: "Sincronização ao vivo", fr: "Synchronisation en direct", de: "Live-Synchronisierung", it: "Sincronizzazione in tempo reale", pl: "Synchronizacja na żywo", tr: "Canlı eşitleme", ru: "Живая синхронизация", ja: "ライブ同期", ko: "실시간 동기화", zh: "实时同步" },
  "Connect to PC": { pt: "Conectar ao PC", fr: "Connecter au PC", de: "Mit PC verbinden", it: "Connetti al PC", pl: "Połącz z PC", tr: "PC'ye bağlan", ru: "Подключиться к ПК", ja: "PCに接続", ko: "PC에 연결", zh: "连接电脑" },
  Disconnect: { pt: "Desconectar", fr: "Déconnecter", de: "Trennen", it: "Disconnetti", pl: "Rozłącz", tr: "Bağlantıyı kes", ru: "Отключить", ja: "切断", ko: "연결 해제", zh: "断开连接" },
  Export: { pt: "Exportar", fr: "Exporter", de: "Exportieren", it: "Esporta", pl: "Eksportuj", tr: "Dışa aktar", ru: "Экспорт", ja: "エクスポート", ko: "내보내기", zh: "导出" },
  Import: { pt: "Importar", fr: "Importer", de: "Importieren", it: "Importa", pl: "Importuj", tr: "İçe aktar", ru: "Импорт", ja: "インポート", ko: "가져오기", zh: "导入" },
  "Local backup": { pt: "Backup local", fr: "Sauvegarde locale", de: "Lokale Sicherung", it: "Backup locale", pl: "Kopia lokalna", tr: "Yerel yedek", ru: "Локальная копия", ja: "ローカルバックアップ", ko: "로컬 백업", zh: "本地备份" },
  "Check now": { pt: "Verificar agora", fr: "Vérifier", de: "Jetzt prüfen", it: "Controlla ora", pl: "Sprawdź teraz", tr: "Şimdi kontrol et", ru: "Проверить", ja: "今すぐ確認", ko: "지금 확인", zh: "立即检查" },
  "Next activation": { pt: "Próxima ativação", fr: "Prochaine activation", de: "Nächste Aktivierung", it: "Prossima attivazione", pl: "Następna aktywacja", tr: "Sonraki etkinleşme", ru: "Следующая активация", ja: "次の開始", ko: "다음 활성화", zh: "下次激活" },
  active: { pt: "ativa", fr: "actif", de: "aktiv", it: "attiva", pl: "aktywne", tr: "aktif", ru: "активно", ja: "開催中", ko: "활성", zh: "进行中" },
  "No wheel": { pt: "Sem roda", fr: "Aucune roue", de: "Kein Rad", it: "Nessuna ruota", pl: "Brak koła", tr: "Çark yok", ru: "Нет колеса", ja: "ホイールなし", ko: "휠 없음", zh: "无轮盘" },
  CURRENT: { pt: "ATUAL", fr: "ACTUELLE", de: "AKTUELL", it: "ATTUALE", pl: "AKTUALNA", tr: "GÜNCEL", ru: "ТЕКУЩАЯ", ja: "最新", ko: "현재", zh: "当前" },
  ON: { pt: "ATIVA", fr: "ACTIVE", de: "AN", it: "ATTIVA", pl: "WŁ.", tr: "AÇIK", ru: "ВКЛ.", ja: "オン", ko: "켜짐", zh: "开启" },
  OFF: { pt: "DESLIGADA", fr: "ARRÊT", de: "AUS", it: "SPENTA", pl: "WYŁ.", tr: "KAPALI", ru: "ВЫКЛ.", ja: "オフ", ko: "꺼짐", zh: "关闭" },
};

export function translate(language: UiLanguage, spanish: string, english: string) {
  if (language === "es") return spanish;
  if (language === "en") return english;
  return CORE[english]?.[language] ?? english;
}
