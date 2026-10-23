// Встроенное 3D-окно для r-bureau.ru (23.10.2026): поворот, цвет каркаса, пластик Repanel, AR, «Скачать».
// Подключение на любой странице: <script src="https://3d.r-bureau.ru/assets/js/rb3d.js" defer></script>
// Открыть: RB3D.open('element') — имя папки модели в каталоге; или ссылка <a data-rb3d="element">.
// Список моделей — assets/data/models.json (собирает Макеты/pro/catalog3d.py). Модель и просмотрщик грузятся только при открытии.
(() => {
  if (window.RB3D) return;
  const BASE = new URL('../../', document.currentScript ? document.currentScript.src : location.href).href;
  const MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  const COLORS = [['#212122', 'RAL 9005 чёрный'], ['#f6f6f6', 'RAL 9016 белый'], ['#005387', 'RAL 5005 синий'], ['#4d5741', 'RAL 6003 оливковый'],
    ['#662625', 'RAL 3011 красно-коричневый'], ['#798079', 'RAL 7038 агатовый серый'], ['#f9a800', 'RAL 1003 жёлтый'], ['#e75200', 'RAL 2009 оранжевый']];
  const PLASTIC = [['rb_plastic_colored.jpg', 'Цветной'], ['rb_plastic_white.jpg', 'Белый'], ['rb_plastic_black.jpg', 'Чёрный']];
  let models = null, box = null, mv = null, cur = null;

  const css = `
.rb3d{position:fixed;inset:0;z-index:99999;background:#f4f4f3;display:none;font-family:"PN",Helvetica,Arial,sans-serif;color:#1c1a1b}
.rb3d.on{display:block}
.rb3d [hidden]{display:none!important}
.rb3d model-viewer{position:absolute;inset:0;width:100%;height:100%;background:#f4f4f3;--poster-color:#f4f4f3}
.rb3d-top{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;align-items:flex-start;gap:16px;padding:16px}
.rb3d-name{margin:0;font:700 40px/1 "PN",Helvetica,Arial,sans-serif;letter-spacing:-.03em;text-transform:uppercase}
.rb3d-x{margin-left:auto;width:44px;height:44px;border:1px solid #1c1a1b;background:#fff;cursor:pointer;font:400 26px/1 Arial,sans-serif;color:#1c1a1b}
.rb3d-x:hover{background:#1c1a1b;color:#fff}
.rb3d-bot{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;padding:16px}
.rb3d-grp{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:rgba(255,255,255,.96);border:1px solid #d9d7d2}
.rb3d-lb{font:600 15px/16px "PNCo","PN",sans-serif;letter-spacing:.04em;text-transform:uppercase}
.rb3d-sw{display:flex;gap:6px;flex-wrap:wrap}
.rb3d-sw button{width:26px;height:26px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0;background-size:cover;background-position:center}
.rb3d-sw button.on{outline:2px solid #1c1a1b;outline-offset:2px}
.rb3d-act{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.rb3d-btn{display:inline-flex;align-items:center;justify-content:space-between;gap:32px;height:44px;padding:0 16px;border:1px solid #1c1a1b;background:#1c1a1b;color:#fff;font:600 16px/1 "PN",sans-serif;text-decoration:none;cursor:pointer}
.rb3d-btn.ol{background:#fff;color:#1c1a1b}
.rb3d-btn:hover{background:#fff;color:#1c1a1b}.rb3d-btn.ol:hover{background:#1c1a1b;color:#fff}
.rb3d-hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;font:600 15px/16px "PNCo","PN",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#6e6b68;pointer-events:none}
.rb3d-hint[hidden]{display:none}
@media (max-width:700px){.rb3d-name{font-size:26px}.rb3d-act{margin-left:0;width:100%}.rb3d-btn{flex:1}}`;

  const hex = h => [1, 3, 5].map(i => Math.pow(parseInt(h.substr(i, 2), 16) / 255, 2.2)).concat(1);   // sRGB → линейный
  const load = (src, mod) => new Promise((ok, no) => { const s = document.createElement('script'); if (mod) s.type = 'module'; s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  function build() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div'); box.className = 'rb3d'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = `<div class="rb3d-top"><h2 class="rb3d-name"></h2><button class="rb3d-x" aria-label="Закрыть">×</button></div>
<p class="rb3d-hint">Загружаем модель…</p>
<div class="rb3d-bot"><div class="rb3d-grp rb3d-fr"><span class="rb3d-lb">Каркас</span><div class="rb3d-sw"></div></div>
<div class="rb3d-grp rb3d-pl"><span class="rb3d-lb">Пластик</span><div class="rb3d-sw"></div></div>
<div class="rb3d-act"><button class="rb3d-btn ol rb3d-ar" hidden>Смотреть в AR <span>→</span></button><a class="rb3d-btn rb3d-dl" download>Скачать модель <span>↓</span></a></div></div>`;
    document.body.appendChild(box);
    box.querySelector('.rb3d-x').onclick = close;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
    box.querySelector('.rb3d-fr .rb3d-sw').innerHTML = COLORS.map(([c, t], i) => `<button style="background:${c}" title="${t}" aria-label="${t}" data-i="${i}"${i ? '' : ' class="on"'}></button>`).join('');
    box.querySelector('.rb3d-pl .rb3d-sw').innerHTML = PLASTIC.map(([f, t], i) => `<button style="background-image:url(${BASE}assets/textures/${f})" title="${t}" aria-label="Пластик: ${t}" data-i="${i}"${i ? '' : ' class="on"'}></button>`).join('');
    box.querySelectorAll('.rb3d-fr button').forEach(b => b.onclick = () => { pick(b); frame(COLORS[b.dataset.i][0]); });
    box.querySelectorAll('.rb3d-pl button').forEach(b => b.onclick = () => { pick(b); plastic(PLASTIC[b.dataset.i][0]); });
    box.querySelector('.rb3d-ar').onclick = () => mv && mv.activateAR();
  }
  const pick = b => { b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  function frame(c) { if (mv && mv.model && cur) { const m = mv.model.materials[cur.frame]; if (m) m.pbrMetallicRoughness.setBaseColorFactor(hex(c)); } }
  async function plastic(f) {
    if (!mv || !mv.model || !cur || !cur.plastic) return;
    const t = await mv.createTexture(BASE + 'assets/textures/' + f), m = mv.model.materials[0];
    m.pbrMetallicRoughness.baseColorTexture.setTexture(t);
  }
  function close() { box.classList.remove('on'); document.documentElement.style.overflow = ''; if (mv) mv.removeAttribute('src'); }

  async function open(id) {
    if (!box) build();
    box.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    const hint = box.querySelector('.rb3d-hint'); hint.hidden = false; hint.textContent = 'Загружаем модель…';
    try {
      if (!models) models = await (await fetch(BASE + 'assets/data/models.json')).json();
      if (!customElements.get('model-viewer')) await load(MV, true);
    } catch (e) { hint.textContent = 'Не удалось загрузить 3D. Попробуйте позже.'; return; }
    cur = models[id]; if (!cur) { hint.textContent = 'Модель не найдена'; return; }
    box.querySelector('.rb3d-name').textContent = cur.name;
    const dl = box.querySelector('.rb3d-dl'); dl.href = `${BASE}${id}/${cur.zip}`;
    box.querySelector('.rb3d-pl').hidden = !cur.plastic;
    if (!mv) {
      mv = document.createElement('model-viewer');
      Object.entries({ 'camera-controls': '', 'touch-action': 'pan-y', ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'shadow-intensity': '0.6',
        exposure: '1', 'tone-mapping': 'neutral', 'interaction-prompt': 'none', 'field-of-view': '30deg' }).forEach(([k, v]) => mv.setAttribute(k, v));
      mv.addEventListener('load', () => {
        hint.hidden = true;
        frame(COLORS[+box.querySelector('.rb3d-fr button.on').dataset.i][0]);
        if (cur.plastic) plastic(PLASTIC[+box.querySelector('.rb3d-pl button.on').dataset.i][0]);
        box.querySelector('.rb3d-ar').hidden = !mv.canActivateAR;
      });
      mv.addEventListener('error', () => { hint.hidden = false; hint.textContent = 'Не удалось загрузить модель'; });
      box.insertBefore(mv, box.firstChild);
    }
    mv.setAttribute('camera-orbit', cur.orbit);
    mv.setAttribute('alt', cur.name);
    mv.src = `${BASE}${id}/${cur.glb}`;
  }

  window.RB3D = { open, close, base: BASE };
  document.addEventListener('click', e => { const a = e.target.closest('[data-rb3d]'); if (a) { e.preventDefault(); open(a.dataset.rb3d); } });
})();
