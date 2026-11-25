// Только подписи и 3D-цвета. Цены здесь НЕ хранятся: их считает сервер (/api/quote).
export const NAME = 'Сумрак';
export const SERVICES = { booking: 'Бронирование', tint: 'Тонирование', removal: 'Растонирование' };
export const TYPES = { kei: 'Кей-кар', coupe: 'Купе', sedan: 'Седан', wagon: 'Универсал', suv: 'Внедорожник', pickup: 'Пикап', van: 'Минивэн', other: 'Другое' };
export const WINDOWS = { front: 'Лобовое', rear: 'Заднее', fs: 'Передние боковые', rs: 'Задние боковые' };
export const LIGHTS = { headlights: 'Фары', taillights: 'Задние фонари' };
export const REMOVAL_ELEMENTS = { ...WINDOWS, ...LIGHTS };
export const VLT = { 5: '5%', 15: '15%', 30: '30%', 50: '50%', 70: '70%', ath: 'Атермальная 80%' };
export const COLORS = { green: ['Зелёный', 0x2fbf6a], blue: ['Синий', 0x2f7bff], yellow: ['Жёлтый', 0xf2c230], violet: ['Фиолетовый', 0x8e55e6] };
export const normalizeColor = key => Object.prototype.hasOwnProperty.call(COLORS, key) ? key : 'green';
export const rub = n => n.toLocaleString('ru-RU') + ' ₽';
export const label = c => {
  const service = c.service || 'tint';
  if (service === 'booking' || service === 'removal') {
    const type = TYPES[c.type] ? `${TYPES[c.type]}, ` : '';
    return `${SERVICES[service]}: ${type}${(c.elements || []).map(element => REMOVAL_ELEMENTS[element]).join(', ')}`;
  }
  if (c.type === 'other') return `${SERVICES.tint}: Другое — ${c.note || 'без описания'}`;
  const targets = [
    ...(c.windows || []).map(window => WINDOWS[window]),
    ...(c.lights || []).map(light => LIGHTS[light]),
  ];
  const film = c.vlt === 'ath' ? 'атермальная ' + COLORS[normalizeColor(c.color)][0].toLowerCase() : VLT[c.vlt];
  return `${SERVICES.tint}: ${TYPES[c.type]}, ${targets.join(', ')}, ${film}`;
};
export async function api(path, opt) {
  let r; try { r = await fetch('/api' + path, opt); } catch { throw Object.assign(new Error('Нет связи с сервером. Повторите попытку.'), { fields: {} }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Ошибка сервера'), { fields: j.errors || {}, status: r.status });
  return j;
}
