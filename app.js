'use strict';
(() => {
  const {rows, bosses, items, pack} = window.GUIDE;
  const classes = [
    {id:'melee',name:'Воин',en:'ВОИН',icon:'⚔',note:'Дальний удар и выживаемость'},
    {id:'ranged',name:'Стрелок',en:'СТРЕЛОК',icon:'➶',note:'Оружие, патроны и пробитие'},
    {id:'magic',name:'Маг',en:'МАГ',icon:'✦',note:'Мана и контроль цели'},
    {id:'rogue',name:'Разбойник',en:'РАЗБОЙНИК',icon:'◇',note:'Спам и скрытные удары'},
    {id:'summon',name:'Призыватель',en:'ПРИЗЫВАТЕЛЬ',icon:'♧',note:'Миньоны, хлысты и условия получения'}
  ];
  const phaseNames = {pre:'До хардмода',hard:'Хардмод',post:'После Лунного лорда'};
  const $ = id => document.getElementById(id);
  const storageKey = 'calamity-fargo-guide-v1';
  const state = {cls:'summon',phase:'pre',profile:'solo',profiles:{solo:[],friends:[]}};
  let storageAvailable = true;
  const bossIds = new Set(bosses.map(b => b.id));
  const cleanList = list => Array.isArray(list) ? [...new Set(list.filter(id => typeof id==='string' && bossIds.has(id)))] : [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved) {
      for (const key of ['solo','friends']) state.profiles[key] = cleanList(saved.profiles?.[key]);
      if (classes.some(c=>c.id===saved.cls)) state.cls=saved.cls;
      if (phaseNames[saved.phase]) state.phase=saved.phase;
      if (['solo','friends'].includes(saved.profile)) state.profile=saved.profile;
    }
  } catch { storageAvailable=false; }
  function save() {
    try {localStorage.setItem(storageKey,JSON.stringify(state));}
    catch {storageAvailable=false; $('storageMessage').textContent='Браузер не разрешает сохранение. Скачай прогресс, чтобы сохранить его в файл.';}
  }
  function element(tag,text,className) {
    const el=document.createElement(tag);
    if (text!==undefined) el.textContent=text;
    if (className) el.className=className;
    return el;
  }
  function link(label,url) {
    const el=element('a',label); el.href=url; el.target='_blank'; el.rel='noopener noreferrer'; return el;
  }
  function reached(row) {
    const done = new Set(state.profiles[state.profile]);
    return row.requires.every(id=>done.has(id));
  }
  function updateProgress() {
    const count=state.profiles[state.profile].length;
    $('progressCount').textContent=`${count} / ${bosses.length}`;
    $('progress').max=bosses.length; $('progress').value=count;
    $('dialogTitle').textContent=`Прогресс: ${state.profile==='solo'?'соло':'с друзьями'}`;
  }
  function renderClasses() {
    const nav=$('classes'); nav.replaceChildren();
    classes.forEach(c=> {
      const button=element('button',undefined,'class-button');button.type='button';button.setAttribute('aria-pressed',String(c.id===state.cls));
      const icon=element('span',c.icon,'class-icon');icon.setAttribute('aria-hidden','true');
      button.append(icon,element('span',c.name),element('span','›','class-arrow'));
      button.addEventListener('click',()=>{state.cls=c.id;save();render();});nav.append(button);
    });
  }
  function itemDetails(key) {
    const item=items[key];
    const detail=element('details',undefined,'item-detail');
    const summary=element('summary',item.name);detail.append(summary);
    const content=element('div',undefined,'item-description');
    content.append(element('p',item.how));
    const recipes=item.recipes || (item.recipe?[item.recipe]:[]);
    recipes.forEach(recipe=> {
      if(recipe.part) content.append(element('strong',recipe.part,'recipe-part'));
      content.append(element('p','Состав: '+recipe.text+'.','recipe-content'));
      content.append(element('p','Станция: '+recipe.station+'.','recipe-content'));
    });
    for(const method of item.otherWays || []) {
      content.append(element('strong',method.label+' — отдельный способ','recipe-part'));
      content.append(element('p',method.text,'recipe-content'));
      if(method.requires.length) content.append(element('p','Для этого способа: '+method.requires.map(id=>bosses.find(b=>b.id===id)?.name || id).join(', ')+'.','item-prerequisites'));
    }
    if(item.requires.length) {
      const names=item.requires.map(id=>bosses.find(b=>b.id===id)?.name || id);
      content.append(element('p',(item.otherWays?.length ? 'Для основного способа: ' : 'Сначала: ')+names.join(', ')+'.','item-prerequisites'));
    }
    content.append(link(item.wikiLabel || 'Страница предмета ↗',item.url));
    detail.append(content);return detail;
  }
  function cell(label,keys) {
    const section=element('div');section.append(element('h4',label,'cell-label'));
    keys.forEach(key=>section.append(itemDetails(key)));return section;
  }
  function reforgeDetails(row) {
    const detail=element('details',undefined,'reforge-advice');
    detail.append(element('summary','Перековка аксессуаров у гоблина'));
    const content=element('div',undefined,'item-description');
    content.append(element('p',row.before.includes('goblins') ? 'После победы над армией гоблинов найди и освободи связанного гоблина под землёй: перековка доступна у него.' : 'Когда победишь армию гоблинов и освободишь связанного гоблина под землёй, сможешь перековывать аксессуары. До этого нужные модификаторы не обязательны.'));
    content.append(element('p','Для освоения боёв на Мастере + Мазохисте начни с «Охранного» (+4 защиты) на боевых аксессуарах. Если уверенно выживаешь, постепенно меняй их на урон. Это рекомендация для прохождения, а не измеренный максимум урона.'));
    const advice={
      melee:'Воин: для урона — «Грозный» (+4% урона). «Везучий» (+4 процентных пункта шанса крита) — альтернатива для оружия, которое может критовать. «Жестокий» (+4% скорости ближнего боя) выбирай под конкретное оружие: скорость не одинаково полезна всем мечам и снарядам.',
      ranged:'Стрелок: для урона — «Грозный» (+4% урона). Можно смешивать с «Везучим» (+4 процентных пункта шанса крита), пока шанс крита ниже 100%. Точное соотношение зависит от оружия, брони и усилений.',
      magic:'Маг: для урона — «Грозный» (+4% урона). Если не хватает маны, попробуй «Загадочный»: в вашей версии он даёт +20 маны, +2% магического урона и −2% расхода маны. «Везучий» (+4 процентных пункта шанса крита) — ещё одна альтернатива, если оружие критует и шанс ниже 100%.',
      rogue:'Разбойник: при непрерывных бросках — «Грозный» (+4% урона). Для игры через полную скрытность попробуй «Безмолвный» (+8% к скорости накопления скрытности). Сравни удобство восстановления скрытности между бросками; универсального лучшего соотношения этих перековок нет.',
      summon:'Призыватель: для урона миньонов — «Грозный» (+4% урона); для освоения боя — «Охранный». «Везучий» не бери по умолчанию: обычные миньоны не получают обычный крит как оружие других классов. Особые эффекты критов проверяй отдельно по их описанию; «Жестокий» не ускоряет атаки самих миньонов.'
    };
    content.append(element('p',advice[row.cls]));
    content.append(element('p','Выбор относится ко всем надетым боевым аксессуарам, включая крылья и экспертный слот, если предмет допускает перековку и бонус работает в этом слоте. У каждого аксессуара один модификатор. Броню у гоблина не перековывают. На старте сохрани деньги: хорошие промежуточные бонусы можно оставить до замены предмета.'));
    content.append(element('p','Названия взяты из русификатора вашей сборки. В другом переводе «Охранный» может называться «Оберегающий», «Грозный» — «Угрожающий», «Везучий» — «Счастливый». Сверяй бонус в описании.'));
    detail.append(content);return detail;
  }
  function renderCard(row,index) {
    const card=element('article',undefined,'loadout');card.id=row.id;
    const head=element('div',undefined,'loadout-head');
    const title=element('div',undefined,'stage-title');title.append(element('h3',row.stage));
    title.append(element('span',row.target==='start'?'Начало прохождения':row.target==='final'?'После Мутанта':'Комплект ДО первого убийства','stage-timing'));
    const done=reached(row);
    const killed=state.profiles[state.profile].includes(row.target);
    const statusText=killed?'Босс / событие пройдено':done?'Можно готовиться':'Нужны предыдущие победы';
    head.append(element('span',String(index+1).padStart(2,'0'),'stage-number'),title,element('span',statusText,'stage-status'+(done?' done':'')));
    const body=element('div',undefined,'loadout-body');
    body.append(cell('01 / ОРУЖИЕ',row.weapons),cell(row.armor.length>1?'02 / БРОНЯ — ВЫБЕРИ ОДИН КОМПЛЕКТ':'02 / БРОНЯ',row.armor),cell('03 / АКСЕССУАРЫ',row.accessories.filter(k=>!row.expertAccessories.includes(k))));
    for(const choice of row.accessoryAlternatives || []) {
      body.children[2].append(cell('ДЛЯ ЛУКА — ВМЕСТО «'+items[choice.replace].name+'»',[choice.item]));
    }
    if(row.expertAccessories.length) body.children[2].append(cell('ДОПОЛНИТЕЛЬНЫЙ СЛОТ ЭКСПЕРТА',row.expertAccessories));
    body.children[2].append(reforgeDetails(row));
    if(row.wings.length) body.children[1].append(cell('КРЫЛЬЯ / ОТДЕЛЬНЫЙ СЛОТ',row.wings));
    const foot=element('div',undefined,'loadout-note');foot.append(element('p',row.cells[3]));
    const missing=row.requires.filter(id=>!state.profiles[state.profile].includes(id));
    if(missing.length) {
      const req=element('details',undefined,'route-requirements');
      req.append(element('summary','До этого комплекта: '+missing.length+' неотмеченных условий'));
      req.append(element('p',missing.map(id=>bosses.find(b=>b.id===id)?.name || id).join(' · ')));
      foot.append(req);
    }
    card.append(head,body,foot);return card;
  }
  function render() {
    renderClasses();updateProgress();
    const c=classes.find(c=>c.id===state.cls);
    $('classTitle').textContent=c.name;
    $('classKicker').textContent=`КЛАСС ${String(classes.indexOf(c)+1).padStart(2,'0')} / ${c.en}`;
    $('classNote').textContent=c.note;
    $('legacyNotice').hidden=true;
    $('profile').value=state.profile;
    document.querySelectorAll('[data-phase]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.phase===state.phase)));
    const query=$('search').value.trim().toLocaleLowerCase('ru');
    const exactStage=query && rows.some(row=>row.cls===state.cls && row.stage.toLocaleLowerCase('ru')===query);
    const selected=rows.filter(row=>row.cls===state.cls && (query || row.phase===state.phase) && (!query || (exactStage ? row.stage.toLocaleLowerCase('ru')===query : [row.stage,...row.cells,...row.notes,...[...row.weapons,...row.armor,...row.accessories,...row.wings,...(row.accessoryAlternatives || []).map(a=>a.item)].map(k=>items[k].how)].join(' ').toLocaleLowerCase('ru').includes(query))) && (!$('reachedOnly').checked || reached(row)));
    const target=$('loadouts');target.replaceChildren();
    selected.forEach((row,index)=>target.append(renderCard(row,index)));
    if(!selected.length) {
      const empty=element('div',undefined,'empty');empty.append(element('h3','Комплекты не найдены'),element('p','Измени поиск или отключи фильтр доступных по прогрессу комплектов.'));target.append(empty);
    }
    $('resultsCount').textContent=`${selected.length} ${selected.length===1?'комплект':'комплектов'} · ${query?'все этапы':phaseNames[state.phase]}`;
  }
  function renderChecklist() {
    const target=$('bossChecklist');target.replaceChildren();
    for (const [phase,name] of Object.entries(phaseNames)) {
      target.append(element('h3',name));const grid=element('div',undefined,'boss-grid');
      bosses.filter(b=>b.phase===phase).forEach(b=>{
        const label=element('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=state.profiles[state.profile].includes(b.id);checkbox.dataset.boss=b.id;
        checkbox.addEventListener('change',()=>{
          const checked=new Set(state.profiles[state.profile]);checkbox.checked?checked.add(b.id):checked.delete(b.id);state.profiles[state.profile]=[...checked];save();render();
        });label.append(checkbox,element('span',b.name));grid.append(label);
      });target.append(grid);
    }
  }
  $('phases').addEventListener('click',event=>{const button=event.target.closest('button[data-phase]');if(!button)return;state.phase=button.dataset.phase;$('search').value='';save();render();});
  $('profile').addEventListener('change',()=>{state.profile=$('profile').value;save();render();renderChecklist();});
  $('search').addEventListener('input',render);
  $('reachedOnly').addEventListener('change',render);
  $('openChecklist').addEventListener('click',()=>{renderChecklist();$('checklistDialog').showModal();});
  $('closeChecklist').addEventListener('click',()=>$('checklistDialog').close());
  $('checklistDialog').addEventListener('click',e=>{if(e.target===$('checklistDialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
  $('resetProgress').addEventListener('click',()=>{if(window.confirm(`Сбросить отмеченные этапы профиля «${state.profile==='solo'?'Соло':'С друзьями'}»?`)){state.profiles[state.profile]=[];save();render();renderChecklist();$('storageMessage').textContent='Прогресс этого профиля сброшен.';}});
  $('exportProgress').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,profiles:state.profiles},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='calamity-fargo-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('storageMessage').textContent='Файл содержит оба профиля. Его можно передать друзьям.';
  });
  $('importProgress').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>100000)throw Error('Файл слишком большой.');
      const data=JSON.parse(await file.text());
      if(data.version!==1||!data.profiles||!['solo','friends'].every(key=>Array.isArray(data.profiles[key])&&data.profiles[key].every(id=>bossIds.has(id))))throw Error('Это не файл прогресса этого гайда.');
      if(!window.confirm('Заменить прогресс обоих профилей данными из файла?'))return;
      for(const key of ['solo','friends'])state.profiles[key]=cleanList(data.profiles[key]);save();render();renderChecklist();$('storageMessage').textContent='Оба профиля загружены.';
    }catch(error){$('storageMessage').textContent='Не удалось загрузить прогресс: '+error.message;}
    finally{e.target.value='';}
  });
  pack.mods.forEach(mod=>$('modList').append(element('li',`${mod.id} — ${mod.version}`)));
  render();
  if(!storageAvailable) document.querySelector('.local-note').textContent='Сохранение в браузере недоступно. Используй скачивание прогресса в окне отметок.';
})();
