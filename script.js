(function () {
  'use strict';
  var COLORS = { sky: '#8ec9f0', lilac: '#c5a8ec', mint: '#a9e4cf', peach: '#ffc9b0', butter: '#fbe29a', rose: '#f5b5cc', silver: '#c9d1da' };
  var OPTS = {
    head: ['round', 'square', 'shield'],
    color: Object.keys(COLORS),
    eyes: ['round', 'sleepy', 'cyclops'],
    hat: ['none', 'party', 'beanie', 'bow', 'crown'],
    necklace: ['none', 'chain', 'crochet'],
    shield: ['none', 'round', 'heater'],
    bracelet: ['none', 'crochet', 'chain'],
    socks: ['none', 'foot', 'knee'],
    extra: ['none', 'bow tie', 'antenna', 'blush', 'star badge']
  };
  var TITLES = { head: 'Head shape', color: 'Body color', eyes: 'Eyes', hat: 'Hat', necklace: 'Chain or necklace', shield: 'Shield', bracelet: 'Bracelet', socks: 'Socks', extra: 'Small extras' };
  var LABELS = { chain: 'metal chain', crochet: 'crochet', foot: 'foot socks', knee: 'knee socks', round: 'round', heater: 'shield-shaped', none: 'none' };
  var DEFAULT = { head: 'square', color: 'sky', eyes: 'round', hat: 'none', necklace: 'crochet', shield: 'none', bracelet: 'none', socks: 'none', extra: 'none' };
  var design = copy(DEFAULT);

  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---------- drawing ----------
  function buildSVG(d, size) {
    var c = COLORS[d.color], s = '';
    var stroke = ' stroke="#6f6585" stroke-width="3" stroke-linejoin="round"';
    var w = size ? ' width="' + size[0] + '" height="' + size[1] + '"' : '';
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360"' + w + '>';
    if (size) s += '<rect width="300" height="360" fill="#bfe3f7"/>';
    s += '<ellipse cx="150" cy="342" rx="82" ry="9" fill="#000" opacity=".1"/>';
    // antenna
    if (d.extra === 'antenna') s += '<path d="M150 48 V22" stroke="#6f6585" stroke-width="4"/><circle cx="150" cy="18" r="7" fill="#f5b5cc"' + stroke + '/>';
    // legs + socks
    s += '<rect x="118" y="248" width="26" height="72" rx="8" fill="' + c + '"' + stroke + '/><rect x="156" y="248" width="26" height="72" rx="8" fill="' + c + '"' + stroke + '/>';
    if (d.socks === 'knee') {
      [118, 156].forEach(function (x) {
        s += '<rect x="' + x + '" y="270" width="26" height="50" fill="#fff"' + stroke + '/>';
        s += '<rect x="' + x + '" y="276" width="26" height="9" fill="#c9a8ee"/><rect x="' + x + '" y="294" width="26" height="9" fill="#c9a8ee"/>';
      });
    }
    s += '<ellipse cx="128" cy="324" rx="22" ry="10" fill="' + c + '"' + stroke + '/><ellipse cx="172" cy="324" rx="22" ry="10" fill="' + c + '"' + stroke + '/>';
    if (d.socks === 'foot') {
      s += '<ellipse cx="128" cy="324" rx="22" ry="10" fill="#fff"' + stroke + '/><ellipse cx="172" cy="324" rx="22" ry="10" fill="#fff"' + stroke + '/>';
      s += '<path d="M110 322 H146 M154 322 H190" stroke="#f5b5cc" stroke-width="5"/>';
    }
    // arms
    s += '<rect x="82" y="162" width="24" height="70" rx="10" fill="' + c + '"' + stroke + '/><rect x="194" y="162" width="24" height="70" rx="10" fill="' + c + '"' + stroke + '/>';
    s += '<circle cx="94" cy="238" r="9" fill="#d5dbe3"' + stroke + '/><circle cx="206" cy="238" r="9" fill="#d5dbe3"' + stroke + '/>';
    if (d.bracelet !== 'none') {
      [82, 194].forEach(function (x) {
        if (d.bracelet === 'crochet') s += '<rect x="' + (x - 3) + '" y="214" width="30" height="12" rx="6" fill="#f5b5cc"' + stroke + '/><path d="M' + (x + 2) + ' 220 H' + (x + 22) + '" stroke="#fff" stroke-width="3" stroke-dasharray="3 4"/>';
        else s += '<rect x="' + (x - 3) + '" y="214" width="30" height="10" rx="5" fill="#e8ecf1"' + stroke + '/><path d="M' + (x + 2) + ' 219 H' + (x + 22) + '" stroke="#9aa4b2" stroke-width="2" stroke-dasharray="4 3"/>';
      });
    }
    // body
    s += '<rect x="110" y="156" width="80" height="100" rx="16" fill="' + c + '"' + stroke + '/>';
    s += '<circle cx="128" cy="236" r="5" fill="#d5dbe3"/><circle cx="172" cy="236" r="5" fill="#d5dbe3"/>';
    s += '<path d="M122 202 H178" stroke="#fff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" opacity=".8"/>';
    // head
    if (d.head === 'round') s += '<rect x="95" y="48" width="110" height="98" rx="46" fill="' + c + '"' + stroke + '/>';
    else if (d.head === 'square') s += '<rect x="95" y="48" width="110" height="98" rx="10" fill="' + c + '"' + stroke + '/>';
    else s += '<path d="M95 52 H205 V100 Q205 138 150 154 Q95 138 95 100 Z" fill="' + c + '"' + stroke + '/>';
    // eyes + smile
    if (d.eyes === 'round') s += '<circle cx="128" cy="96" r="12" fill="#fff"' + stroke + '/><circle cx="172" cy="96" r="12" fill="#fff"' + stroke + '/><circle cx="130" cy="98" r="5" fill="#3d3552"/><circle cx="174" cy="98" r="5" fill="#3d3552"/>';
    else if (d.eyes === 'sleepy') s += '<path d="M114 98 Q128 110 142 98 M158 98 Q172 110 186 98" fill="none" stroke="#3d3552" stroke-width="5" stroke-linecap="round"/>';
    else s += '<circle cx="150" cy="94" r="20" fill="#fff"' + stroke + '/><circle cx="152" cy="96" r="9" fill="#3d3552"/><circle cx="156" cy="92" r="3" fill="#fff"/>';
    s += '<path d="M134 124 Q150 136 166 124" fill="none" stroke="#3d3552" stroke-width="4" stroke-linecap="round"/>';
    if (d.extra === 'blush') s += '<circle cx="112" cy="116" r="8" fill="#f58aa8" opacity=".5"/><circle cx="188" cy="116" r="8" fill="#f58aa8" opacity=".5"/>';
    // necklace
    if (d.necklace === 'chain') s += '<path d="M118 152 Q150 196 182 152" fill="none" stroke="#aeb7c4" stroke-width="5" stroke-dasharray="6 3" stroke-linecap="round"/><circle cx="150" cy="178" r="6" fill="#f5e7a8"' + stroke + '/>';
    if (d.necklace === 'crochet') { [[120, 156], [126, 166], [136, 174], [150, 178], [164, 174], [174, 166], [180, 156]].forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="' + (i === 3 ? '#c9a8ee' : '#f5b5cc') + '" stroke="#fff" stroke-width="2"/>'; }); }
    if (d.extra === 'bow tie') s += '<path d="M150 164 L124 152 V176 Z M150 164 L176 152 V176 Z" fill="#c9a8ee"' + stroke + '/><circle cx="150" cy="164" r="6" fill="#7a55b3"/>';
    if (d.extra === 'star badge') s += '<path d="M150 188 l5 11 12 1 -9 8 3 12 -11 -7 -11 7 3 -12 -9 -8 12 -1z" fill="#fbe29a"' + stroke.replace('3"', '2"') + '/>';
    // shield
    if (d.shield === 'round') s += '<circle cx="70" cy="214" r="36" fill="#e8ecf1"' + stroke + '/><circle cx="70" cy="214" r="24" fill="#bfe3f7" stroke="#6f6585" stroke-width="2"/><circle cx="70" cy="214" r="7" fill="#c9a8ee"' + stroke.replace('3"', '2"') + '/>';
    if (d.shield === 'heater') s += '<path d="M38 176 H98 V214 Q98 246 68 262 Q38 246 38 214 Z" fill="#c9a8ee"' + stroke + '/><path d="M68 184 V252 M46 208 H90" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
    // hats
    if (d.hat === 'party') s += '<path d="M120 52 L150 0 L180 52 Z" fill="#f5b5cc"' + stroke + '/><path d="M130 36 H170" stroke="#fff" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/><circle cx="150" cy="-1" r="6" fill="#fbe29a"/>';
    if (d.hat === 'beanie') s += '<path d="M97 56 Q100 0 150 0 Q200 0 203 56 Z" fill="#c9a8ee"' + stroke + '/><rect x="93" y="44" width="114" height="16" rx="8" fill="#fff"' + stroke + '/><circle cx="150" cy="-2" r="9" fill="#fff"' + stroke + '/>';
    if (d.hat === 'bow') s += '<path d="M170 52 L142 36 V68 Z M170 52 L198 36 V68 Z" fill="#f5b5cc"' + stroke + '/><circle cx="170" cy="52" r="7" fill="#e58aa8"/>';
    if (d.hat === 'crown') s += '<path d="M108 54 V20 L128 38 L150 10 L172 38 L192 20 V54 Z" fill="#fbe29a"' + stroke + '/><circle cx="150" cy="30" r="5" fill="#f5b5cc"/>';
    return s + '</svg>';
  }

  // ---------- page setup ----------
  function $(id) { return document.getElementById(id); }
  var preview, status;

  function render() { preview.innerHTML = buildSVG(design); syncButtons(); }
  function syncButtons() {
    var b = document.querySelectorAll('#options .chip');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', String(design[b[i].dataset.k] === b[i].dataset.v));
  }
  function say(t) { status.textContent = t; }

  function buildOptions() {
    var box = $('options'), html = '';
    Object.keys(OPTS).forEach(function (k) {
      html += '<fieldset><legend>' + TITLES[k] + '</legend><div class="chips">';
      OPTS[k].forEach(function (v) {
        var label = LABELS[v] || v;
        if (k === 'color') html += '<button type="button" class="chip sw" data-k="' + k + '" data-v="' + v + '" aria-label="' + v + '" aria-pressed="false" style="background:' + COLORS[v] + '"></button>';
        else html += '<button type="button" class="chip" data-k="' + k + '" data-v="' + v + '" aria-pressed="false">' + label + '</button>';
      });
      html += '</div></fieldset>';
    });
    box.innerHTML = html;
    box.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.chip') : null;
      if (!t) return;
      design[t.dataset.k] = t.dataset.v;
      render();
    });
  }

  function randomize() { for (var k in OPTS) design[k] = pick(OPTS[k]); render(); say('Here’s a brand-new Clank!'); }
  function reset() { design = copy(DEFAULT); render(); $('result').hidden = true; say('Design reset.'); }

  // ---------- PNG export ----------
  var lastBlob = null, lastURL = null;
  function savePNG() {
    say('Making your picture…');
    var svg = buildSVG(design, [900, 1080]);
    var img = new Image();
    img.onload = function () {
      try {
        var cv = document.createElement('canvas'); cv.width = 900; cv.height = 1080;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, 900, 1080);
        var finish = function (blob) {
          if (!blob) { say('Sorry, the picture could not be made. Try a screenshot instead.'); return; }
          if (lastURL) URL.revokeObjectURL(lastURL);
          lastBlob = blob; lastURL = URL.createObjectURL(blob);
          showResult(lastURL);
        };
        if (cv.toBlob) cv.toBlob(finish, 'image/png'); else finish(dataURLtoBlob(cv.toDataURL('image/png')));
      } catch (err) { say('Could not save the picture. Try taking a screenshot instead.'); }
    };
    img.onerror = function () { say('Could not make the picture. Try taking a screenshot instead.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function dataURLtoBlob(u) {
    var p = u.split(','), bin = atob(p[1]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: 'image/png' });
  }
  function showResult(url) {
    $('resultImg').src = url;
    var dl = $('dlLink'); dl.href = url;
    $('result').hidden = false;
    var canShare = false;
    try { canShare = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([lastBlob], 'my-clank.png', { type: 'image/png' })] })); } catch (e) {}
    $('shareBtn').hidden = !canShare;
    say('Your Clank is ready! Use Download PNG below' + (canShare ? ' or Share / Save.' : '.'));
    $('result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function share() {
    if (!lastBlob) return;
    try {
      navigator.share({ files: [new File([lastBlob], 'my-clank.png', { type: 'image/png' })], title: 'My Clank' }).catch(function () {});
    } catch (e) { say('Press and hold the picture to save it.'); }
  }

  // ---------- house ----------
  function setupHouse() {
    var door = $('door'), roof = $('roof'), db = $('doorBtn'), rb = $('roofBtn');
    db.addEventListener('click', function () {
      var open = db.getAttribute('aria-pressed') !== 'true';
      db.setAttribute('aria-pressed', String(open));
      door.style.transform = open ? 'scaleX(0.18)' : 'scaleX(1)';
      db.textContent = open ? '🚪 Close the door' : '🚪 Open the door';
    });
    rb.addEventListener('click', function () {
      var off = rb.getAttribute('aria-pressed') !== 'true';
      rb.setAttribute('aria-pressed', String(off));
      roof.style.transform = off ? 'translate(60px,-40px) rotate(14deg)' : 'translate(0,0) rotate(0deg)';
      rb.textContent = off ? '🏠 Put the roof back' : '🏠 Lift the roof';
    });
  }

  // ---------- story illustrations ----------
  function storyArt() {
    var st = ' stroke="#6f6585" stroke-width="3" stroke-linecap="round"';
    var x = '<svg viewBox="0 0 200 130" aria-hidden="true">', i, cs = [[50, 45], [100, 80], [150, 40], [70, 100]];
    for (i = 0; i < cs.length; i++) x += '<path d="M' + (cs[i][0] - 14) + ' ' + (cs[i][1] - 14) + ' l28 28 m0 -28 l-28 28" stroke="#c5a8ec" stroke-width="9" stroke-linecap="round"/><circle cx="' + cs[i][0] + '" cy="' + cs[i][1] + '" r="4" fill="#d5dbe3"/>';
    $('b1').innerHTML = x + '</svg>';
    $('b2').innerHTML = '<svg viewBox="0 0 200 130" aria-hidden="true"><rect x="62" y="22" width="76" height="76" rx="8" fill="#a9e4cf"' + st + '/><circle cx="85" cy="55" r="7" fill="#fff"' + st + '/><circle cx="115" cy="55" r="7" fill="#fff"' + st + '/><path d="M88 76 Q100 86 112 76" fill="none"' + st + '/></svg>';
    $('b3').innerHTML = '<svg viewBox="0 0 300 360" style="max-height:130px;width:auto;margin:auto" aria-hidden="true">' + buildSVG(DEFAULT).replace(/^<svg[^>]*>/, '').replace('</svg>', '') + '</svg>';
  }

  if (typeof window !== 'undefined') {
    window.buildSVG = buildSVG;
    window.DEFAULT = DEFAULT;
    window.OPTS = OPTS;
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', function () {
    preview = $('preview'); status = $('status');
    $('heroArt').innerHTML = buildSVG(DEFAULT);
    storyArt(); buildOptions(); render(); setupHouse();
    $('randomBtn').addEventListener('click', randomize);
    $('resetBtn').addEventListener('click', reset);
    $('saveBtn').addEventListener('click', savePNG);
    $('shareBtn').addEventListener('click', share);
  });
  if (typeof module !== 'undefined' && typeof document === 'undefined') module.exports = { buildSVG: buildSVG, OPTS: OPTS, DEFAULT: DEFAULT };
})();
