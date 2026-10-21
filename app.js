'use strict';
(() => {
  const {rows:soloRows, friendRows, friendDpsRows, friendDefenderRows, friendAllyRows, friendBalancedRows, bosses, items, pack, journey, release} = window.GUIDE;
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
  const roleNames={damage:'Урон',balanced:'Сбалансированно',defender:'Защитник'};
  const partyModes=['tank','damage','balanced','custom'];
  const defaultParty=mode=>({members:[{id:'p1',cls:'melee',role:mode==='tank'?'defender':mode==='balanced'?'balanced':'damage'},{id:'p2',cls:'magic',role:mode==='balanced'?'balanced':'damage'},{id:'p3',cls:'rogue',role:mode==='balanced'?'balanced':'damage'}],activeId:'p1'});
  function cleanParty(party){
    if(!party || !Array.isArray(party.members) || party.members.length<2 || party.members.length>16)return null;
    const ids=new Set();
    for(const member of party.members){if(!member || typeof member.id!=='string' || !/^[a-z0-9_-]{1,40}$/i.test(member.id) || ids.has(member.id) || !classes.some(c=>c.id===member.cls) || !Object.hasOwn(roleNames,member.role))return null;ids.add(member.id);}
    return {members:party.members.map(m=>({id:m.id,cls:m.cls,role:m.role})),activeId:ids.has(party.activeId)?party.activeId:null};
  }
  const state = {cls:'summon',phase:'pre',profile:'solo',partyMode:'tank',party:defaultParty('tank'),profiles:{solo:[],friends:[]},upgrades:{solo:[],friends:[]}};
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
      if (partyModes.includes(saved.partyMode)) state.partyMode=saved.partyMode;
      state.party=cleanParty(saved.party)||defaultParty(state.partyMode);
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
  function viewedPlayer(){return state.party.members.find(m=>m.id===state.party.activeId && m.cls===state.cls)||state.party.members.find(m=>m.cls===state.cls);}
  function viewedRole(cls=state.cls){return (state.party.members.find(m=>m.id===state.party.activeId && m.cls===cls)||state.party.members.find(m=>m.cls===cls))?.role || 'balanced';}
  function hasDefender(){return state.party.members.some(m=>m.role==='defender');}
  function activeRows(){if(state.profile==='solo')return soloRows;const role=viewedRole();return role==='defender'?friendDefenderRows:role==='balanced'?friendBalancedRows:hasDefender()?friendAllyRows:friendDpsRows;}
  function applyPartyMode(mode){
    state.partyMode=mode;
    if(mode==='custom')return;
    const defender=state.party.members.find(m=>m.role==='defender')?.id || state.party.members[0].id;
    for(const member of state.party.members)member.role=mode==='balanced'?'balanced':mode==='tank' && member.id===defender?'defender':'damage';
  }
  function renderParty(){
    $('partyControls').hidden=state.profile!=='friends';$('partyMode').value=state.partyMode;
    const roster=$('partyRoster');roster.replaceChildren();
    state.party.members.forEach((member,index)=>{
      const block=element('fieldset',undefined,'party-member');block.append(element('legend','Игрок '+(index+1)));
      const label=element('label','Класс');label.htmlFor='member-class-'+member.id;
      const select=element('select');select.id=label.htmlFor;
      for(const c of classes){const option=element('option',c.name);option.value=c.id;select.append(option);}select.value=member.cls;
      select.addEventListener('change',()=>{member.cls=select.value;state.partyMode='custom';if(state.party.activeId===member.id)state.cls=member.cls;save();render();});
      const roleLabel=element('label','Роль');roleLabel.htmlFor='member-role-'+member.id;
      const role=element('select');role.id=roleLabel.htmlFor;
      for(const [key,name] of Object.entries(roleNames)){const option=element('option',name);option.value=key;role.append(option);}role.value=member.role;
      role.addEventListener('change',()=>{member.role=role.value;state.partyMode='custom';save();render();});
      const view=element('button',viewedPlayer()?.id===member.id?'Комплект открыт':'Смотреть комплект','secondary');view.type='button';view.setAttribute('aria-pressed',String(viewedPlayer()?.id===member.id));
      view.addEventListener('click',()=>{state.party.activeId=member.id;state.cls=member.cls;save();render();});
      const remove=element('button','Убрать','text-button');remove.type='button';remove.setAttribute('aria-label','Убрать игрока '+(index+1));remove.disabled=state.party.members.length<=2;
      remove.addEventListener('click',()=>{state.party.members=state.party.members.filter(m=>m.id!==member.id);if(state.party.activeId===member.id){state.party.activeId=state.party.members[0].id;state.cls=state.party.members[0].cls;}state.partyMode='custom';save();render();});
      block.append(label,select,roleLabel,role,view,remove);roster.append(block);
    });
    $('addPartyMember').disabled=state.party.members.length>=16;
    const counts=new Map();for(const m of state.party.members)counts.set(m.cls,(counts.get(m.cls)||0)+1);
    const composition=[...counts].map(([key,count])=>classes.find(c=>c.id===key).name+(count>1?' × '+count:'')).join(' · ');
    const defenders=state.party.members.filter(m=>m.role==='defender');
    const current=viewedPlayer();const advice=['Игроков: '+state.party.members.length+' · '+composition];if(current)advice.push('Открыт комплект игрока '+(state.party.members.findIndex(m=>m.id===current.id)+1)+' · '+roleNames[current.role]+'.');
    advice.push(defenders.length?'Защитник может быть любого класса: используются его классовые предметы и универсальные аксессуары агрессии. Общие атаки и смена цели всё равно требуют личного уклонения.':'Выделенного защитника нет. Урон не опирается на снижение агрессии ради передней линии; каждый игрок готовится самостоятельно переживать смену цели.');
    if(defenders.length>1)advice.push('Несколько защитников: заранее распределите, кто уводит босса и куда отступают остальные. Агрессия не гарантирует постоянную цель.');
    if(state.party.members.length===2)advice.push('В дуо после гибели союзника остаётся один игрок. Сохраняйте мобильность и запас личной защиты.');
    if([...counts.values()].some(n=>n>1))advice.push('Одинаковые классы допустимы. Дроп и расходники нужны каждому, а одинаковые командные баффы не суммируются.');
    if(!viewedPlayer())advice.push('Просматриваемого класса нет в составе: показан сбалансированный комплект. Добавьте игрока этого класса, чтобы назначить ему роль.');
    const missingDamage=[];if(!counts.has('melee') && !counts.has('rogue'))missingDamage.push('воин или разбойник');for(const key of ['ranged','magic','summon'])if(!counts.has(key))missingDamage.push(classes.find(c=>c.id===key).name);
    if(missingDamage.length)advice.push('Для классовых фаз Лунного лорда в Мазохисте подготовьте запасное оружие: '+missingDamage.join('; ')+'. Его можно взять из соответствующей карточки перед этим боссом.');
    advice.push('Кнопка «Смотреть комплект» выбирает конкретного игрока, в том числе среди одинаковых классов. Все варианты команды используют одни отметки прогресса.');
    $('partySummary').textContent=advice.slice(0,2).join(' ');$('partyHint').replaceChildren(...advice.slice(2).map(text=>element('p',text)));
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
      button.addEventListener('click',()=>{state.cls=c.id;if(!state.party.members.some(m=>m.id===state.party.activeId && m.cls===c.id))state.party.activeId=state.party.members.find(m=>m.cls===c.id)?.id || null;save();render();});nav.append(button);
    });
  }
  function itemDetails(key) {
    const item=items[key];
    const detail=element('details',undefined,'item-detail');
    const summary=element('summary',item.name);detail.append(summary);
    if(item.purpose?.length){summary.dataset.purpose=item.purpose.join(' · ');summary.setAttribute('aria-description',item.purpose.join(', '));}
    const content=element('div',undefined,'item-description');
    content.append(element('p',item.how));
    if(item.purpose?.length)content.append(element('p','Назначение: '+item.purpose.join(' · '),'equipment-purpose'));
    if(item.equipmentNotes?.length){const notes=element('div',undefined,'equipment-notes');notes.append(element('strong','Совместимость и ограничения'));const list=element('ul');for(const note of item.equipmentNotes)list.append(element('li',note));notes.append(list);content.append(notes);}
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
    if(item.wikiNote) content.append(element('p',item.wikiNote,'item-prerequisites'));
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
  const weaponReforgeShort={melee:'«Легендарный»; для исключений — «Божественный» / «Демонический»',ranged:'«Нереальный»; для исключений — «Божественный» / «Демонический»',magic:'«Мифический»; для исключений — «Божественный» / «Демонический»',rogue:'«Безупречный»',summon:'посохи — «Безжалостный», хлысты — «Легендарный»'};
  function classReforge(cls) {
    const section=element('div',undefined,'reforge-class');const advice=reforgeAdvice[cls];
    section.append(element('h4',classes.find(c=>c.id===cls).name));
    if(state.profile==='friends') section.append(element('p',viewedRole(cls)==='balanced'?'Сбалансированная роль: сочетать «Охранный» и классовый урон, увеличивая защиту при частых смертях.':viewedRole(cls)==='defender'?'Командная роль защитника: базовая перековка аксессуаров — «Охранный». Урон добавлять после уверенного выживания под повышенной агрессией.':'Командная роль урона: базовая перековка — «Грозный»; магу при нехватке маны подойдёт «Загадочный», разбойнику для скрытных ударов — «Безмолвный». При частых смертях вернуть часть «Охранных».','team-advice'));
    section.append(element('p','Аксессуары — защита: «Охранный» (+4 защиты) на каждом боевом предмете. Подходит всем классам, когда главная задача — пережить бой.'));
    section.append(element('p','Аксессуары — урон: '+advice.damage),element('p',advice.alternative));
    section.append(element('strong','Перековка оружия'),element('p',advice.weapon));return section;
  }
  function reforgeRules() {
    const content=element('div',undefined,'reforge-rules');
    content.append(element('p','Каждый надетый боевой аксессуар перековывается отдельно: ботинки, эмблемы, щиты, усиления и крылья, если предмет допускает перековку и его бонус работает в этом слоте. У предмета может быть только один модификатор; броня у гоблина не перековывается.'));
    content.append(element('p',state.profile==='friends' && !hasDefender()?'В команде без защитника начать с классовых перековок на урон, сохраняя запас защиты по необходимости. Каждый игрок должен самостоятельно переживать атаки и смену цели.':state.profile==='friends'?'В команде защитник начинает с «Охранных», остальные — с классовых перековок на урон с запасом защиты по необходимости. Повышенная агрессия не отменяет общие атаки и смену цели: любой игрок должен переживать отдельные попадания.':'Для освоения Мастера + Мазохиста можно начать с «Охранного» на всех аксессуарах, затем перевести два предмета на классовый вариант для урона. Если выживаемости хватает, увеличивать долю урона; при частых смертях вернуть защиту. Это отправная точка, а не универсально лучший набор.'));
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
  function wornGear(row) {
    const pact=state.upgrades[state.profile].includes('mutants-pact')?row.pactItem:null;
    const normal=row.accessories.filter(k=>!row.expertAccessories.includes(k) && k!==pact);
    if(pact && row.pactBonus)normal.push(row.pactBonus);
    return {weapons:row.weapons,armor:row.armor,accessories:normal,wings:row.wings,expert:row.expertAccessories,pact:pact?[pact]:[],support:row.supportWeapons || []};
  }
  function nextStep(row,next) {
    if(!next)return null;
    const before=wornGear(row),after=wornGear(next);
    const labels={weapons:'Оружие — варианты',armor:'Броня',accessories:'Обычные аксессуары',wings:'Отдельный слот крыльев',expert:'Слот эксперта',pact:'Слот Договора',support:'Поддержка команды'};
    const changes=Object.keys(labels).map(key=>({key,add:after[key].filter(k=>!before[key].includes(k)),remove:before[key].filter(k=>!after[key].includes(k))})).filter(change=>change.add.length || change.remove.length);
    const detail=element('details',undefined,'next-step');
    detail.append(element('summary',(row.target==='start'?'Следующий этап: ':'После победы · следующий этап: ')+next.stage));
    const content=element('div',undefined,'next-step-content');
    content.append(element('p',row.target==='start'?'Изменения относительно стартового комплекта.':'Сначала пройти «'+row.stage+'». Ниже — изменения для следующего этапа, а не снаряжение для первого боя с текущим боссом.','item-prerequisites'));
    if(!changes.length)content.append(element('p','Основной комплект сохраняется. Перед следующим боем подготовить арену и расходники.'));
    for(const change of changes) {
      const block=element('div',undefined,'gear-change');block.append(element('strong',labels[change.key]));
      if(change.add.length)block.append(element('p','Добавить / выбрать: '+change.add.map(k=>items[k].name).join('; '),'gear-added'));
      if(change.remove.length)block.append(element('p','Убрать из основного набора: '+change.remove.map(k=>items[k].name).join('; '),'gear-removed'));
      content.append(block);
    }
    content.append(element('p','Оружие перечислено как варианты. Полные рецепты и получение — в следующем комплекте. Перенос между слотами учитывает отметку Договора в текущем режиме.','item-prerequisites'));
    const button=element('button','Открыть комплект: '+next.stage,'secondary next-stage-button');button.type='button';
    button.addEventListener('click',()=>{
      state.phase=next.phase;$('search').value=next.stage;$('reachedOnly').checked=false;save();render();
      const card=$(next.id);card.tabIndex=-1;card.focus({preventScroll:true});card.scrollIntoView?.({behavior:scrollBehavior(),block:'start'});
    });content.append(button);detail.append(content);return detail;
  }
  function lootFallbacks(row) {
    if(!row.lootFallbacks?.length)return null;
    const detail=element('details',undefined,'loot-fallbacks');detail.append(element('summary','Если не выпало или не нашлось ('+row.lootFallbacks.length+')'));
    const content=element('div',undefined,'fallback-content');
    content.append(element('p','Необязательные замены для этого этапа. Выбирается один вариант; дополнительные слоты они не занимают. Запасной вариант может потребовать свой фарм и не обещает равного урона.','item-prerequisites'));
    for(const choice of row.lootFallbacks) {
      const block=element('section',undefined,'loot-fallback');
      block.append(element('h4',choice.reason),element('p','Вместо «'+items[choice.replace].name+'» → «'+items[choice.item].name+'»','fallback-pair'),element('p',choice.tradeoff));
      block.append(itemDetails(choice.item));content.append(block);
    }
    detail.append(content);return detail;
  }
  function renderCard(row,index,next) {
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
    body.children[0].append(element('p','Перековка оружия: '+weaponReforgeShort[row.cls]+'. Только если предмет допускает модификатор; подробности — в пункте о гоблине. Выбор оружейного модификатора общий для соло и команды.','item-prerequisites weapon-reforge'));
    if(row.supportWeapons?.length) {
      const support=cell('ДОПОЛНИТЕЛЬНО / ПОДДЕРЖКА КОМАНДЫ',row.supportWeapons);
      support.append(element('p',row.supportNote,'item-prerequisites'));body.children[0].append(support);
    }
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
    if(row.teamRole) {
      foot.prepend(element('strong','С ДРУЗЬЯМИ / '+row.teamRole),element('p',row.teamNote,'team-advice'));
      for(const change of row.teamChanges || []) foot.append(element('p',change,'team-advice'));
    }
    const missing=row.requires.filter(id=>!state.profiles[state.profile].includes(id));
    if(missing.length) {
      const req=element('details',undefined,'route-requirements');
      req.append(element('summary','До этого комплекта: '+missing.length+' неотмеченных условий'));
      req.append(element('p',missing.map(id=>bosses.find(b=>b.id===id)?.name || id).join(' · ')));
      foot.append(req);
    }
    card.append(head,body);
    for(const choice of row.kitAlternatives || []) {
      const kit=element('details',undefined,'kit-alternative');kit.append(element('summary',choice.label || 'Другой комплект: жучья броня + орихалковое усиление'));
      kit.append(element('p',choice.note,'item-prerequisites'));
      const pair=element('div',undefined,'kit-alternative-body');pair.append(cell('ЗАМЕНА БРОНИ',choice.armor),cell('ВМЕСТО «'+items[choice.replace].name+'»',[choice.item]));kit.append(pair);card.append(kit);
    }
    const fallback=lootFallbacks(row);if(fallback)card.append(fallback);
    const upcoming=nextStep(row,next);if(upcoming)card.append(upcoming);
    const report=element('button','Сообщить об ошибке в этой карточке','text-button report-button');report.type='button';report.addEventListener('click',()=>openReport(row));foot.append(report);
    card.append(foot);return card;
  }
  function render() {
    renderClasses();updateProgress();
    const rows=activeRows();
    const c=classes.find(c=>c.id===state.cls);
    $('classTitle').textContent=c.name;
    $('classKicker').textContent=`КЛАСС ${String(classes.indexOf(c)+1).padStart(2,'0')} / ${c.en}`;
    $('classNote').textContent=state.profile==='friends'?'С друзьями: '+rows.find(r=>r.cls===c.id).teamRole:c.note+' · Соло: самостоятельная выживаемость и урон.';
    renderParty();
    $('legacyNotice').hidden=true;
    $('profile').value=state.profile;
    document.querySelectorAll('[data-profile]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.profile===state.profile)));
    $('playModeHint').textContent=state.profile==='friends'?'Ниже выберите классы и роли игроков — комплекты учтут состав команды.':'Выберите «С друзьями», чтобы настроить классы и роли команды.';
    document.querySelectorAll('[data-phase]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.phase===state.phase)));
    const query=$('search').value.trim().toLocaleLowerCase('ru');
    const exactStage=query && rows.some(row=>row.cls===state.cls && row.stage.toLocaleLowerCase('ru')===query);
    const selected=rows.filter(row=>row.cls===state.cls && (query || row.phase===state.phase) && (!query || (exactStage ? row.stage.toLocaleLowerCase('ru')===query : [row.stage,...row.cells,...row.notes,...[...row.weapons,...row.armor,...row.accessories,...row.wings,...(row.supportWeapons || []),...(row.accessoryAlternatives || []).map(a=>a.item),...(row.lootFallbacks || []).map(a=>a.item)].map(k=>items[k].name+' '+items[k].how)].join(' ').toLocaleLowerCase('ru').includes(query))) && (!$('reachedOnly').checked || reached(row)));
    const target=$('loadouts');target.replaceChildren();
    const route=rows.filter(row=>row.cls===state.cls);
    const following=new Map(route.map((row,index)=>[row.id,route[index+1]]));
    selected.forEach((row,index)=>target.append(renderCard(row,index,following.get(row.id))));
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
  let reportContext=null;
  function updateReport() {
    if(!reportContext)return;
    const {row,profile,partyMode,party,role}=reportContext;
    const key=$('reportItem').value;
    const mode=profile==='solo'?'Соло':'С друзьями: '+(partyMode==='damage'?'все через урон':partyMode==='balanced'?'все сбалансированно':'свои роли')+'; роль: '+roleNames[role];
    const description=$('reportNotes').value.trim();
    const draft=['Ошибка в гайде Calamity × Fargo',
      'Класс: '+classes.find(c=>c.id===row.cls).name,'Этап: '+row.stage,'Режим: '+mode,
      'Предмет: '+(key?items[key].name:'Вся карточка'),...(profile==='friends'?['Состав: '+party.members.map((m,i)=>(i+1)+'. '+classes.find(c=>c.id===m.cls).name+' — '+roleNames[m.role]).join('; ')]:[]),'Версия гайда: '+release.version,
      'Сборка: Calamity 2.2.4; Souls 1.7.3.9; Crossmod 1.2.0.28; Мастер + Мазохист.',
      '', 'Что не совпало:',description || '(описать рецепт, условие получения или поведение)',
      '', 'Ожидаемый результат / подтверждение:', '(можно дописать на GitHub)'].join('\n');
    $('reportDraft').value=draft;
    const url=new URL('https://github.com/ISpeed2/-alamity-fargo-guide/issues/new');
    url.searchParams.set('title',row.stage+' / '+classes.find(c=>c.id===row.cls).name+(key?' / '+items[key].name:''));url.searchParams.set('body',draft);
    if(url.href.length>7500){url.searchParams.delete('body');$('reportStatus').textContent='Длинный черновик: скопируйте текст и вставьте его в форму на GitHub.';}else $('reportStatus').textContent='';
    $('reportGithub').href=url.href;
  }
  function openReport(row) {
    reportContext={row,profile:state.profile,partyMode:state.partyMode,role:viewedRole(),party:JSON.parse(JSON.stringify(state.party))};
    const select=$('reportItem');select.replaceChildren(element('option','Вся карточка'));select.options[0].value='';
    const keys=[...new Set([...row.weapons,...row.armor,...row.accessories,...row.wings,...(row.supportWeapons || []),...(row.accessoryAlternatives || []).map(a=>a.item),...(row.lootFallbacks || []).map(a=>a.item),...(row.pactBonus?[row.pactBonus]:[])])];
    for(const key of keys){const option=element('option',items[key].name);option.value=key;select.append(option);}
    $('reportNotes').value='';$('reportStatus').textContent='';updateReport();$('errorDialog').showModal();
  }
  function renderRelease() {
    const date=iso=>new Date(iso+'T12:00:00+03:00').toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'});
    $('guideVersion').textContent='Версия гайда '+release.version+' · обновлено '+date(release.date);
    for(const [index,entry] of release.history.entries()){
      const detail=element('details',undefined,'update-entry');detail.open=index===0;
      detail.append(element('summary',date(entry.date)+' · '+entry.title));
      const list=element('ul');for(const change of entry.changes)list.append(element('li',change));detail.append(list);$('updateList').append(detail);
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
        if(task.url) block.append(link('Вики '+(task.url.includes('fargosmods')?'Fargo':'Calamity')+' ↗',task.url));section.append(block);
      });target.append(section);
    });
  }
  $('phases').addEventListener('click',event=>{const button=event.target.closest('button[data-phase]');if(!button)return;state.phase=button.dataset.phase;$('search').value='';save();render();});
  function setProfile(profile){state.profile=profile;save();render();renderChecklist();renderJourney();}
  $('profile').addEventListener('change',()=>setProfile($('profile').value));
  document.querySelectorAll('[data-profile]').forEach(button=>button.addEventListener('click',()=>setProfile(button.dataset.profile)));
  $('partyMode').addEventListener('change',()=>{applyPartyMode($('partyMode').value);save();render();renderJourney();});
  $('addPartyMember').addEventListener('click',()=>{if(state.party.members.length>=16)return;let n=1;while(state.party.members.some(m=>m.id==='p'+n))n++;state.party.members.push({id:'p'+n,cls:state.cls,role:'balanced'});state.partyMode='custom';save();render();});
  $('closeError').addEventListener('click',()=>$('errorDialog').close());
  $('reportItem').addEventListener('change',updateReport);$('reportNotes').addEventListener('input',updateReport);
  $('copyReport').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('reportDraft').value);$('reportStatus').textContent='Текст скопирован.';}catch{$('reportDraft').focus();$('reportDraft').select();$('reportStatus').textContent='Текст выделен. Скопируйте его сочетанием клавиш или через меню браузера.';}});
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
    const blob=new Blob([JSON.stringify({version:1,profiles:state.profiles,upgrades:state.upgrades,partyMode:state.partyMode,party:state.party},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='calamity-fargo-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('storageMessage').textContent='Файл содержит боссов, памятку обоих профилей и состав команды. Его можно передать друзьям.';
  });
  $('importProgress').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>100000)throw Error('Файл слишком большой.');
      const data=JSON.parse(await file.text());
      if(data.version!==1||!data.profiles||!['solo','friends'].every(key=>Array.isArray(data.profiles[key])&&data.profiles[key].every(id=>bossIds.has(id))))throw Error('Это не файл прогресса этого гайда.');
      if(data.upgrades!==undefined && (!data.upgrades || !['solo','friends'].every(key=>Array.isArray(data.upgrades[key])&&data.upgrades[key].every(id=>upgradeIds.has(id)))))throw Error('Некорректные отметки памятки.');
      if(data.partyMode!==undefined && !partyModes.includes(data.partyMode))throw Error('Некорректный состав команды.');
      if(data.party!==undefined && !cleanParty(data.party))throw Error('Некорректные игроки или роли команды.');
      if(!window.confirm('Заменить прогресс обоих профилей данными из файла?'))return;
      for(const key of ['solo','friends']){state.profiles[key]=cleanList(data.profiles[key]);if(data.upgrades)state.upgrades[key]=cleanUpgrades(data.upgrades[key]);}if(data.party){state.party=cleanParty(data.party);state.partyMode=data.partyMode || 'custom';const active=state.party.members.find(m=>m.id===state.party.activeId);if(active)state.cls=active.cls;}else if(data.partyMode)applyPartyMode(data.partyMode);save();render();renderChecklist();renderJourney();$('storageMessage').textContent=data.upgrades?'Оба профиля и памятки загружены.':'Боссы загружены. Старый файл не содержит памятку: её отметки сохранены.';
    }catch(error){$('storageMessage').textContent='Не удалось загрузить прогресс: '+error.message;}
    finally{e.target.value='';}
  });
  pack.mods.forEach(mod=>$('modList').append(element('li',`${mod.id} — ${mod.version}`)));
  renderRelease();render();
  if(!storageAvailable) document.querySelector('.local-note').textContent='Сохранение в браузере недоступно. Используй скачивание прогресса в окне отметок.';
})();
