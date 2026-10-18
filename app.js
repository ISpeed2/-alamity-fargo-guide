'use strict';
(() => {
  const {rows, bosses, items, pack, journey} = window.GUIDE;
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
  const state = {cls:'summon',phase:'pre',profile:'solo',profiles:{solo:[],friends:[]},upgrades:{solo:[],friends:[]}};
  let storageAvailable = true;
  const bossIds = new Set(bosses.map(b => b.id));
  const upgradeIds = new Set(journey.flatMap(s=>s.tasks.map(t=>t.id)));
  const cleanUpgrades = list => Array.isArray(list) ? [...new Set(list.filter(id=>typeof id==='string' && upgradeIds.has(id)))] : [];
  const cleanList = list => Array.isArray(list) ? [...new Set(list.filter(id => typeof id==='string' && bossIds.has(id)))] : [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved) {
      for (const key of ['solo','friends']) state.profiles[key] = cleanList(saved.profiles?.[key]);
      for (const key of ['solo','friends']) state.upgrades[key] = cleanUpgrades(saved.upgrades?.[key]);
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
  const reforgeAdvice={
    melee:{
      damage:'Для урона — «Грозный» (+4% урона) на боевых аксессуарах. Это основной вариант для воина, играющего через урон.',
      alternative:'«Везучий» (+4 процентных пункта шанса крита и +0,05 удачи в Каламити 2.2.4) подходит как альтернатива, пока шанс крита используемого оружия ниже 100%. «Жестокий» (+4% скорости ближнего боя) имеет смысл для оружия, которое действительно выигрывает от этой скорости. Он не одинаково ускоряет все мечи и их снаряды.',
      weapon:'Мечи и другое оружие с доступной перековкой на скорость и размер — «Легендарный». Для оружия, которое не получает этот модификатор, например части йо-йо и метательного оружия ближнего боя, — «Божественный» или «Демонический» из доступных. Выбор зависит от конкретного оружия, а не только от класса.'
    },
    ranged:{
      damage:'Для урона — «Грозный» (+4% урона). Это базовый вариант и для луков, и для огнестрельного оружия.',
      alternative:'«Везучий» (+4 процентных пункта шанса крита и +0,05 удачи в Каламити 2.2.4) можно сочетать с «Грозным», если оружие критует и шанс ещё ниже 100%. «Жестокий» повышает скорость ближнего боя: для ускорения стрельбы его брать не следует.',
      weapon:'Луки и огнестрельное оружие — «Нереальный», если предмет его допускает. Для исключений без подходящих характеристик — «Божественный» или «Демонический» из доступных. На аксессуарах нужен свой модификатор: «Нереальный» относится к оружию.'
    },
    magic:{
      damage:'Если с маной проблем нет — «Грозный» (+4% урона). При нехватке маны начать с одного-двух аксессуаров на «Загадочный», остальные оставить на урон или защиту.',
      alternative:'В Каламити 2.2.4 «Загадочный» даёт +20 маны, +2% магического урона и −2% расхода маны на каждый аксессуар. Это компромисс между уроном и удобством. «Везучий» — альтернатива для крита: +4 процентных пункта и +0,05 удачи; при уже достигнутых 100% крита ориентироваться на урон и расход маны.',
      weapon:'Магические посохи, книги и другие магические оружия — «Мифический», если предмет его допускает. У оружия, не получающего этот модификатор, выбрать доступный вариант на урон, например «Божественный» или «Демонический». Проверять также расход маны и фактическую скорость использования.'
    },
    rogue:{
      damage:'При непрерывных бросках — «Грозный» (+4% урона). Для игры через скрытные удары — «Безмолвный» на части аксессуаров: +8% скорости накопления скрытности на предмет.',
      alternative:'Для начала можно заменить один-два «Грозных» на «Безмолвные» и проверить, успевает ли восстанавливаться полная скрытность между атаками. Если броски идут без ожидания полной шкалы, предпочтительнее бонус урона. Остальные слоты — «Грозный» или «Охранный» по выживаемости; единого лучшего соотношения для всего оружия нет.',
      weapon:'Оружие разбойника — «Безупречный», если предмет можно перековать. Модификатор повышает обычный урон, скорость использования, шанс крита, скорость снарядов и урон скрытного удара. Расходуемое оружие допускает перековку только при соответствующей поддержке у самого предмета.'
    },
    summon:{
      damage:'для урона миньонов — «Грозный» (+4% урона) на боевых аксессуарах. Для освоения боя — «Охранный»; по мере уверенного выживания менять отдельные предметы на «Грозные».',
      alternative:'«Везучий» не нужен по умолчанию: обычные миньоны не используют обычный крит так же, как оружие других классов. Особые эффекты критов оцениваются отдельно. «Жестокий» не ускоряет атаки миньонов; он может быть полезен для скорости подходящего хлыста, если основной упор сделан именно на хлыст.',
      weapon:'Посохи миньонов и турелей — «Безжалостный» для урона, если доступен. «Мифический» — альтернатива с меньшим расходом маны при призыве; его скорость использования не ускоряет атаки уже призванных миньонов. Хлысты перековываются отдельно — обычно на «Легендарный», если он доступен. Для исключений сверяться со страницей конкретного оружия.'
    }
  };
  function classReforge(cls) {
    const section=element('div',undefined,'reforge-class');const advice=reforgeAdvice[cls];
    section.append(element('h4',classes.find(c=>c.id===cls).name));
    section.append(element('p','Аксессуары — защита: «Охранный» (+4 защиты) на каждом боевом предмете. Подходит всем классам, когда главная задача — пережить бой.'));
    section.append(element('p','Аксессуары — урон: '+advice.damage),element('p',advice.alternative));
    section.append(element('strong','Перековка оружия'),element('p',advice.weapon));return section;
  }
  function reforgeRules() {
    const content=element('div',undefined,'reforge-rules');
    content.append(element('p','Каждый надетый боевой аксессуар перековывается отдельно: ботинки, эмблемы, щиты, усиления и крылья, если предмет допускает перековку и его бонус работает в этом слоте. У предмета может быть только один модификатор; броня у гоблина не перековывается.'));
    content.append(element('p','Для освоения Мастера + Мазохиста можно начать с «Охранного» на всех аксессуарах, затем перевести два предмета на классовый вариант для урона. Если выживаемости хватает, увеличивать долю урона; при частых смертях вернуть защиту. Это отправная точка, а не универсально лучший набор.'));
    content.append(element('p','Не обязательно сразу тратить все монеты на идеальную перековку промежуточной вещи. Модификатор оружия выбирается из тех, которые поддерживает конкретный предмет. Специальные модификаторы через купоны Каламити не считаются обычным случайным результатом гоблина.'));
    return content;
  }
  function reforgeDetails(row) {
    const detail=element('details',undefined,'reforge-advice');
    detail.append(element('summary','Перековка оружия и аксессуаров у гоблина'));
    const content=element('div',undefined,'item-description');
    content.append(element('p',row.before.includes('goblins') ? 'Перековка доступна в меню освобождённого Гоблина-инженера после армии гоблинов. Мастерская инженера нужна для крафта, а не для самой перековки.' : 'Перековка откроется после победы над армией гоблинов и освобождения Гоблина-инженера в пещерах. До этого модификаторы из рекомендаций не обязательны.'));
    content.append(classReforge(row.cls),reforgeRules());
    content.append(element('p','Названия взяты из русификатора сборки. В другом переводе «Охранный» может называться «Оберегающий», «Грозный» — «Угрожающий», «Везучий» — «Счастливый». Сверяй бонус в описании.'));
    content.append(link('Модификаторы Каламити ↗','https://calamitymod.wiki.gg/wiki/Modifiers'));
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
    const pactItem=state.upgrades[state.profile].includes('mutants-pact') ? row.pactItem : null;
    const ordinary=row.accessories.filter(k=>!row.expertAccessories.includes(k) && k!==pactItem);
    if(pactItem && row.pactBonus)ordinary.push(row.pactBonus);
    body.append(cell('01 / ОРУЖИЕ',row.weapons),cell(row.armor.length>1?'02 / БРОНЯ — ВЫБЕРИ ОДИН КОМПЛЕКТ':'02 / БРОНЯ',row.armor),cell(`03 / ОБЫЧНЫЕ АКСЕССУАРЫ · ${ordinary.length}/${row.normalAccessorySlots}`,ordinary));
    const pactSlot=pactItem ? cell('СЛОТ ДОГОВОРА МУТАНТА',[pactItem]) : null;
    for(const choice of row.accessoryAlternatives || []) {
      const option=cell(choice.label || 'ДЛЯ ЛУКА — ВМЕСТО «'+items[choice.replace].name+'»',[choice.item]);
      if(choice.note) option.append(element('p',choice.note,'item-prerequisites'));
      (choice.replace===pactItem ? pactSlot : body.children[2]).append(option);
    }
    if(row.expertAccessories.length) body.children[2].append(cell('ДОПОЛНИТЕЛЬНЫЙ СЛОТ ЭКСПЕРТА',row.expertAccessories));
    if(pactItem) {
      pactSlot.classList.add('pact-slot');
      pactSlot.append(element('p','Этот предмет перенесён из обычного слота. Вместо него в обычный слот добавлен аксессуар «'+items[row.pactBonus].name+'». Указанные замены по-прежнему заменяют подписанный предмет.','item-prerequisites'));
      body.children[2].append(pactSlot);
    } else if(row.pactItem) {
      const hint=element('button','Договор уже съеден? Отметь в памятке','text-button pact-hint');hint.type='button';
      hint.addEventListener('click',()=>{renderJourney();$('journeyDialog').showModal();$('task-mutants-pact').scrollIntoView?.({block:'center'});});body.children[2].append(hint);
    }
    body.children[2].append(reforgeDetails(row));
    if(row.wings.length) body.children[1].append(cell(row.wings.some(k=>['MoonWalkers','VoidStriders','SeraphTracers'].includes(k))?'БЕГ И ПОЛЁТ / ОТДЕЛЬНЫЙ СЛОТ КРЫЛЬЕВ':'КРЫЛЬЯ / ОТДЕЛЬНЫЙ СЛОТ',row.wings));
    const foot=element('div',undefined,'loadout-note');foot.append(element('p',row.cells[3]));
    const missing=row.requires.filter(id=>!state.profiles[state.profile].includes(id));
    if(missing.length) {
      const req=element('details',undefined,'route-requirements');
      req.append(element('summary','До этого комплекта: '+missing.length+' неотмеченных условий'));
      req.append(element('p',missing.map(id=>bosses.find(b=>b.id===id)?.name || id).join(' · ')));
      foot.append(req);
    }
    card.append(head,body);
    for(const choice of row.kitAlternatives || []) {
      const kit=element('details',undefined,'kit-alternative');kit.append(element('summary','Другой комплект: жучья броня + орихалковое усиление'));
      kit.append(element('p',choice.note,'item-prerequisites'));
      const pair=element('div',undefined,'kit-alternative-body');pair.append(cell('ЗАМЕНА БРОНИ',choice.armor),cell('ВМЕСТО «'+items[choice.replace].name+'»',[choice.item]));kit.append(pair);card.append(kit);
    }
    card.append(foot);return card;
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
  function renderJourney() {
    const target=$('journeyChecklist');target.replaceChildren();
    const jump=$('journeyJump');jump.replaceChildren(element('option','Перейти к этапу…'));jump.options[0].value='';
    const consumed=new Set(state.upgrades[state.profile]);const done=new Set(state.profiles[state.profile]);
    $('journeyTitle').textContent='Памятка: '+(state.profile==='solo'?'соло':'с друзьями');
    $('journeyProgress').textContent=`Выполнено ${consumed.size} из ${upgradeIds.size} · отметки персонажа`;
    journey.forEach((stage,index)=>{
      const section=element('section',undefined,'journey-stage');section.id='journey-stage-'+stage.id;
      const option=element('option',stage.title);option.value=section.id;jump.append(option);
      const complete=stage.tasks.every(task=>consumed.has(task.id));const available=stage.requires.every(id=>done.has(id));
      section.append(element('div',`${String(index+1).padStart(2,'0')} / ${complete?'ВЫПОЛНЕНО':available?'МОЖНО ГОТОВИТЬСЯ':'ПОСЛЕ НУЖНЫХ ПОБЕД'}`,'eyebrow'),element('h3',stage.title));
      if(stage.requires.length) section.append(element('p','Условие: '+stage.requires.map(id=>bosses.find(b=>b.id===id).name).join(' · '),'item-prerequisites'));
      if(stage.note) section.append(element('p',stage.note,'dialog-note'));
      stage.tasks.forEach(task=>{
        const block=element('div',undefined,'journey-task');block.id='task-'+task.id;
        const label=element('label',undefined,'journey-task-label');const check=element('input');check.type='checkbox';check.dataset.upgrade=task.id;check.checked=consumed.has(task.id);
        check.addEventListener('change',()=>{
          const checked=new Set(state.upgrades[state.profile]);check.checked?checked.add(task.id):checked.delete(task.id);state.upgrades[state.profile]=[...checked];save();render();
          // Update labels without rebuilding the focused checkbox or scrolling the dialog.
          $('journeyProgress').textContent=`Выполнено ${checked.size} из ${upgradeIds.size} · отметки персонажа`;
          section.querySelector('.eyebrow').textContent=`${String(index+1).padStart(2,'0')} / ${stage.tasks.every(t=>checked.has(t.id))?'ВЫПОЛНЕНО':available?'МОЖНО ГОТОВИТЬСЯ':'ПОСЛЕ НУЖНЫХ ПОБЕД'}`;
        });
        label.append(check,element('span',task.title));block.append(label,element('p',task.text));
        if(task.conditional) block.append(element('p','Условно: дроп зависит от режима Мести / Смерти Calamity.','item-prerequisites'));
        if(task.recipe) block.append(element('p','Состав: '+task.recipe.text+'.','recipe-content'),element('p','Станция: '+task.recipe.station+'.','recipe-content'));
        for(const key of task.equipmentItems || []) block.append(itemDetails(key));
        if(task.reforges) {
          block.append(reforgeRules());
          for(const cls of classes) block.append(classReforge(cls.id));
        }
        for(const choice of task.classItems || []) {
          const option=element('div',undefined,'essence-choice');option.append(element('strong',choice.cls),itemDetails(choice.item));block.append(option);
        }
        block.append(link('Вики '+(task.url.includes('fargosmods')?'Fargo':'Calamity')+' ↗',task.url));section.append(block);
      });target.append(section);
    });
  }
  $('phases').addEventListener('click',event=>{const button=event.target.closest('button[data-phase]');if(!button)return;state.phase=button.dataset.phase;$('search').value='';save();render();});
  $('profile').addEventListener('change',()=>{state.profile=$('profile').value;save();render();renderChecklist();renderJourney();});
  $('search').addEventListener('input',render);
  $('reachedOnly').addEventListener('change',render);
  const scrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const updateBackToTop=()=>{$('backToStages').hidden=window.scrollY<480;};
  window.addEventListener('scroll',updateBackToTop,{passive:true});updateBackToTop();
  $('backToStages').addEventListener('click',()=>{$('guideControls').scrollIntoView({behavior:scrollBehavior(),block:'start'});document.querySelector('[data-phase][aria-pressed="true"]').focus({preventScroll:true});});
  $('journeyBackToTop').addEventListener('click',()=>{$('journeyDialog').scrollTo({top:0,behavior:scrollBehavior()});$('journeyJump').value='';});
  $('journeyJump').addEventListener('change',()=>{const section=$( $('journeyJump').value );if(section)section.scrollIntoView({behavior:scrollBehavior(),block:'start'});});
  $('openChecklist').addEventListener('click',()=>{renderChecklist();$('checklistDialog').showModal();});
  $('closeChecklist').addEventListener('click',()=>$('checklistDialog').close());
  $('openJourney').addEventListener('click',()=>{renderJourney();$('journeyDialog').showModal();});
  $('closeJourney').addEventListener('click',()=>$('journeyDialog').close());
  $('journeyDialog').addEventListener('click',e=>{if(e.target===$('journeyDialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
  $('checklistDialog').addEventListener('click',e=>{if(e.target===$('checklistDialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
  $('resetProgress').addEventListener('click',()=>{if(window.confirm(`Сбросить боссов и отметки памятки профиля «${state.profile==='solo'?'Соло':'С друзьями'}»?`)){state.profiles[state.profile]=[];state.upgrades[state.profile]=[];save();render();renderChecklist();renderJourney();$('storageMessage').textContent='Прогресс этого профиля сброшен.';}});
  $('exportProgress').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,profiles:state.profiles,upgrades:state.upgrades},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='calamity-fargo-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('storageMessage').textContent='Файл содержит боссов и памятку обоих профилей. Его можно передать друзьям.';
  });
  $('importProgress').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>100000)throw Error('Файл слишком большой.');
      const data=JSON.parse(await file.text());
      if(data.version!==1||!data.profiles||!['solo','friends'].every(key=>Array.isArray(data.profiles[key])&&data.profiles[key].every(id=>bossIds.has(id))))throw Error('Это не файл прогресса этого гайда.');
      if(data.upgrades!==undefined && (!data.upgrades || !['solo','friends'].every(key=>Array.isArray(data.upgrades[key])&&data.upgrades[key].every(id=>upgradeIds.has(id)))))throw Error('Некорректные отметки памятки.');
      if(!window.confirm('Заменить прогресс обоих профилей данными из файла?'))return;
      for(const key of ['solo','friends']){state.profiles[key]=cleanList(data.profiles[key]);if(data.upgrades)state.upgrades[key]=cleanUpgrades(data.upgrades[key]);}save();render();renderChecklist();renderJourney();$('storageMessage').textContent=data.upgrades?'Оба профиля и памятки загружены.':'Боссы загружены. Старый файл не содержит памятку: её отметки сохранены.';
    }catch(error){$('storageMessage').textContent='Не удалось загрузить прогресс: '+error.message;}
    finally{e.target.value='';}
  });
  pack.mods.forEach(mod=>$('modList').append(element('li',`${mod.id} — ${mod.version}`)));
  render();
  if(!storageAvailable) document.querySelector('.local-note').textContent='Сохранение в браузере недоступно. Используй скачивание прогресса в окне отметок.';
})();
