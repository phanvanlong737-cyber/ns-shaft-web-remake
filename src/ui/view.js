const symbols = { normal: '━', spike: '▴▴', conveyorLeft: '≪', conveyorRight: '≫', fake: '⌁', spring: '↟' };
const names = { normal: '普通平台', spike: '尖刺平台', conveyorLeft: '左传送带', conveyorRight: '右传送带', fake: '易碎平台', spring: '弹簧平台' };
const hints = { normal: '安全落地 · 回复生命', spike: '落地扣血 · 站立不连扣', conveyorLeft: '向左推送 · 离开解除', conveyorRight: '向右推送 · 离开解除', fake: '落地300ms后塌陷', spring: '压缩蓄力 · 向上弹射' };

export function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export class View {
  constructor(root) {
    root.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <a class="brand" href="#" aria-label="下100层首页" data-action="menu"><span class="brand-icon">↓</span><span>下<span class="brand-number">100</span>层<span class="brand-tag">WEB REMAKE</span></span></a>
          <nav aria-label="主导航"><button data-action="leaderboard">排行榜 <span>↗</span></button><button data-action="settings">设置</button><button data-action="credits">制作信息</button></nav>
          <span class="edition"><i></i> CLASSIC / 01</span>
        </header>
        <main class="layout">
          <section class="intro" aria-label="游戏介绍">
            <span class="eyebrow"><span class="line"></span> THE DESCENT</span>
            <h1>向下，<br>再<span class="accent">向下。</span></h1>
            <p class="intro-copy">一场只需左右的冒险。<br>避开尖刺，抓住下一块平台。<br>第 100 层，等你抵达。</p>
            <div class="goal"><span>你的目标</span><strong>100<span>层</span></strong><div class="goal-rule"></div><small>抵达之后，探索仍将继续</small></div>
            <div class="control-note"><span class="key">←</span><span class="key">→</span><p>左右移动 <span>也支持 A / D</span></p></div>
            <div class="control-note"><span class="key wide">SPACE</span><p>暂停 / 继续 <span>没有跳跃键</span></p></div>
            <span class="intro-foot">KEEP FALLING. KEEP GOING.</span>
          </section>
          <section class="game-column" aria-label="Classic游戏">
            <div class="hud"><div><span class="hud-label">当前层数</span><strong id="floor">000</strong></div><div class="life"><span class="hud-label">生命 <b id="hp-label">10 / 10</b></span><div id="hp" role="meter" aria-label="生命值" aria-valuemin="0" aria-valuemax="10">${'<i></i>'.repeat(10)}</div></div><button class="pause-icon" data-action="pause" aria-label="暂停游戏">Ⅱ</button></div>
            <div class="viewport">
              <canvas id="game" width="720" height="960" aria-label="下100层游戏画面"></canvas>
              <div class="viewport-corners" aria-hidden="true"></div>
              <div class="overlay" id="menu-screen"><span class="pill"><i></i> CLASSIC MODE</span><h2>下<span>100</span>层</h2><p>保持节奏。寻找落脚点。</p><button class="primary" data-action="start">开始下潜 <span>↓</span></button><small>方向键移动 · Space 暂停</small></div>
              <div class="overlay" id="pause-screen" hidden><span class="pill">TAKE A BREATH</span><h2>稍作停留</h2><p>世界已暂停，下一层还在等你。</p><button class="primary" data-action="resume">继续下潜 <span>→</span></button><button class="secondary" data-action="restart">重新开始</button><div class="overlay-links"><button data-action="settings">设置</button><button data-action="menu">返回菜单</button></div></div>
              <div class="overlay" id="result-screen" hidden><span class="pill" id="result-badge">DESCENT COMPLETE</span><h2 class="result-number"><span id="result-floor">000</span><small>层</small></h2><p id="result-message"></p><div class="result-meta"><span>用时 <b id="result-time">00:00</b></span><span>最佳 <b id="result-best">000</b></span></div><form id="score-form"><label class="sr-only" for="nickname">排行榜昵称</label><input id="nickname" name="nickname" maxlength="32" placeholder="留下你的名字" autocomplete="nickname"><button id="submit-score" type="submit">记录成绩</button></form><button class="primary" data-action="restart">再试一次 <span>↻</span></button><button class="text-button" data-action="menu">返回菜单</button></div>
              <div id="milestone" role="status" hidden><span>100 FLOOR REACHED</span><strong>经典挑战完成</strong><small>继续向下，刷新你的纪录。</small></div>
            </div>
            <div class="game-footer"><span><i></i> CLASSIC</span><span id="run-time">00:00</span><span>360 × 480</span></div>
            <div class="touch-controls" aria-label="触屏操作"><button id="touch-left" aria-label="向左移动">← <span>向左</span></button><button data-action="pause" aria-label="触屏暂停">Ⅱ</button><button id="touch-right" aria-label="向右移动"><span>向右</span> →</button></div>
          </section>
          <aside class="sidebar" aria-label="纪录与平台说明">
            <div class="record"><span class="eyebrow">PERSONAL BEST</span><div><strong id="best">000</strong><span>层</span></div><p>每一次下潜，都能走得更远。</p><button data-action="leaderboard">查看本机排行榜 <span>↗</span></button></div>
            <div class="platform-guide"><div class="section-label"><h2>认识你的落脚点</h2><span>06 TYPES</span></div>${Object.keys(names).map(type => `<div class="legend"><span class="platform-symbol ${type}">${symbols[type]}</span><div><strong>${names[type]}</strong><small>${hints[type]}</small></div></div>`).join('')}</div>
            <div class="tip"><span>↳ 小提示</span><p>别在同一块平台停留太久。<br>抬头是危险，向下是机会。</p></div>
          </aside>
        </main>
        <footer class="page-footer"><button data-action="credits" aria-label="查看制作信息">经典玩法 · 原创重制 ↗</button><span>专注于下一次落地 <i>↓</i></span><span>LOCAL SCORES / NO ACCOUNT</span></footer>
      </div>
      <dialog id="panel" aria-labelledby="panel-title"><div class="dialog-top"><span class="eyebrow" id="panel-kicker"></span><button data-action="close" class="close-button" aria-label="关闭面板">×</button></div><h2 id="panel-title"></h2><div id="panel-content"></div></dialog>
      <div id="toast" role="status" hidden></div>`;
    this.canvas = root.querySelector('#game');
    this.dialog = root.querySelector('#panel');
    this.root = root;
    this.lastState = '';
    this.lastHp = -1;
    this.dialog.addEventListener('click', event => { if (event.target === this.dialog) this.dialog.close(); });
  }

  update(snapshot, saved) {
    const $ = id => this.root.querySelector(`#${id}`);
    $('floor').textContent = snapshot.floor.toString().padStart(3, '0');
    $('best').textContent = Math.max(snapshot.floor, saved.bestFloor).toString().padStart(3, '0');
    $('run-time').textContent = formatTime(snapshot.runTime);
    if (snapshot.hp !== this.lastHp) {
      $('hp-label').textContent = `${snapshot.hp} / 10`;
      $('hp').setAttribute('aria-valuenow', snapshot.hp);
      [...$('hp').children].forEach((bar, index) => bar.classList.toggle('empty', index >= snapshot.hp));
      $('hp').classList.toggle('critical', snapshot.hp <= 3);
      this.lastHp = snapshot.hp;
    }
    this.root.querySelector('.pause-icon').disabled = !['playing', 'paused'].includes(snapshot.state);
    if (snapshot.state !== this.lastState) {
      $('menu-screen').hidden = snapshot.state !== 'menu';
      $('pause-screen').hidden = snapshot.state !== 'paused';
      $('result-screen').hidden = snapshot.state !== 'result';
      if (snapshot.state === 'result') {
        $('result-floor').textContent = snapshot.floor.toString().padStart(3, '0');
        $('result-time').textContent = formatTime(snapshot.runTime);
        $('result-best').textContent = Math.max(saved.bestFloor, snapshot.floor).toString().padStart(3, '0');
        $('result-message').textContent = snapshot.reason === 'ceiling' ? '碰到了顶部尖刺。下一次，及时向下。' :
          snapshot.reason === 'fall' ? '这次没抓住平台。下次，再深一点。' : '生命耗尽了。休整一下，再出发。';
        $('result-badge').textContent = snapshot.completed ? '100层挑战已完成' : '本次下潜结束';
        $('nickname').value = saved.nickname === '玩家' ? '' : saved.nickname;
        $('submit-score').disabled = false;
        $('submit-score').textContent = '记录成绩';
      }
      this.lastState = snapshot.state;
    }
  }

  panel(type, store) {
    const title = this.root.querySelector('#panel-title');
    const kicker = this.root.querySelector('#panel-kicker');
    const content = this.root.querySelector('#panel-content');
    if (type === 'leaderboard') {
      title.textContent = '下潜纪录'; kicker.textContent = 'LOCAL TOP 10';
      content.innerHTML = '<p class="panel-description">只属于这台设备的探索轨迹。</p><ol class="leaderboard"></ol><p class="panel-footnote">同层数按记录时间排序 · 不包含云端排行</p>';
      const list = content.querySelector('ol');
      if (!store.data.leaderboard.length) {
        content.querySelector('ol').insertAdjacentHTML('beforebegin', '<div class="empty-state"><span>↓</span><p>下一条纪录，由你开启。</p></div>');
      }
      store.data.leaderboard.forEach((entry, index) => {
        const row = document.createElement('li');
        const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(index + 1).padStart(2, '0');
        const name = document.createElement('strong'); name.textContent = entry.nickname;
        const time = document.createElement('small'); time.textContent = formatTime(entry.runTime);
        const floor = document.createElement('b'); floor.textContent = `${entry.floor} 层`;
        row.append(rank, name, time, floor); list.append(row);
      });
    } else if (type === 'settings') {
      title.textContent = '调整你的节奏'; kicker.textContent = 'SETTINGS';
      content.innerHTML = '<p class="panel-description">设置会保存在本机，不影响游戏规则。</p>';
      for (const [key, label] of [['masterVolume', '主音量'], ['musicVolume', '背景音乐'], ['sfxVolume', '音效']]) {
        const row = document.createElement('label'); row.className = 'setting-row';
        row.innerHTML = `<span>${label}</span><input type="range" min="0" max="1" step="0.05" name="${key}" aria-label="${label}"><output></output>`;
        row.querySelector('input').value = store.data.settings[key];
        row.querySelector('output').textContent = `${Math.round(store.data.settings[key] * 100)}%`;
        content.append(row);
      }
      for (const [key, label] of [['mute', '静音'], ['shake', '屏幕震动'], ['reducedMotion', '减少动画']]) {
        const row = document.createElement('label'); row.className = 'setting-row toggle';
        row.innerHTML = `<span>${label}</span><input type="checkbox" name="${key}"><span class="switch" aria-hidden="true"></span>`;
        row.querySelector('input').checked = store.data.settings[key]; content.append(row);
      }
      const note = document.createElement('p'); note.className = 'panel-footnote';
      note.textContent = '游戏暂停时音乐也会暂停。音频从首次点击开始启用。'; content.append(note);
    } else {
      title.textContent = '经典，重新出发'; kicker.textContent = 'ABOUT THE REMAKE';
      content.innerHTML = `<p class="panel-description">《下100层：Web重制版》是课程软件工程项目。以经典下楼梯玩法为基础，用原创矢量美术、独立规则核心与现代网页界面重新呈现。</p><div class="credits-block"><h3>行为与工程参考</h3><a href="https://github.com/iPel/NS-SHAFT" target="_blank" rel="noreferrer">iPel / NS-SHAFT ↗</a><p>参考固定版本，独立实现。Apache-2.0许可文本随源码提供。</p></div><div class="credits-block"><h3>原创内容</h3><p>角色、平台、界面、背景与动画由本项目制作；音乐及音效为原创程序合成。系统字体，不加载外部字体。</p></div><div class="credits-block"><h3>规则修正</h3><p>加入1秒受伤保护、基础可达性保底和进度不回退；100层之后继续无尽挑战。不是4399官方版本。</p></div>`;
    }
    if (!store.available) {
      const warning = document.createElement('p'); warning.className = 'storage-warning';
      warning.textContent = '当前无法保存到浏览器，纪录与设置仅在本次页面中保留。'; content.append(warning);
    }
    if (!this.dialog.open) this.dialog.showModal();
  }

  toast(message) {
    const toast = this.root.querySelector('#toast');
    toast.textContent = message; toast.hidden = false;
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  milestone() {
    const banner = this.root.querySelector('#milestone');
    banner.hidden = false;
    clearTimeout(this.milestoneTimer); this.milestoneTimer = setTimeout(() => { banner.hidden = true; }, 4000);
  }

  clearMilestone() {
    clearTimeout(this.milestoneTimer);
    this.root.querySelector('#milestone').hidden = true;
  }
}
