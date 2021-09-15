const proxyurl = "https://k34f75nkq2.herokuapp.com/";

const htmlEntities = {
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
};

window.onhashchange = function() {
  window.location.reload(false);
}

function userLang() {
  var lang = window.navigator.language;
  if (!lang) lang = window.navigator['browserLanguage'];
  if (!lang) lang = 'en-US';
  return lang.substring(0, 2);
}

function offsetDate(hours) {
  var now = new Date();
  now.setHours(now.getHours() + hours);
  return now;
}

function formatTitle(str) {
  str = str.replace(/\&([^;]+);/g, function (entity, entityCode) {
    var match;
    if (entityCode in htmlEntities)
      return htmlEntities[entityCode];
    else if (match = entityCode.match(/^#x([\da-fA-F]+)$/))
      return String.fromCharCode(parseInt(match[1], 16));
    else if (match = entityCode.match(/^#(\d+)$/))
      return String.fromCharCode(~~match[1]);
    else
      return entity;
  });
  var p = str.lastIndexOf('(');
  return p < 0 ? str : str.substring(0, p);
};

function renderArticle(item, recent) {
  var ts = new Date(item.pubDate);
  var cl = (recent && ts > recent) ? ' class="recent"' : '';
  var html = `
    <article${cl}>
      <a href="${item.link}" target="_blank" rel="noopener">
        <img src="${item.image}" alt="">
        <h2>${item.title}</h2>
        <span>${ts.toISOString().split('T')[0]}&nbsp;${ts.toTimeString().split(' ')[0]}</span>
      </a>
    </article>
  `;
  var rss = document.getElementById('rss');
  rss.insertAdjacentHTML('beforeend', html);
}

function renderFooter() {
  var lang = userLang();
  var hash = window.location.hash;
  var footer = document.getElementById('footer');
  if ((hash == '' && lang != 'ja') || hash == '#all')
    footer.insertAdjacentHTML('beforeend', `<a href="#ja">日本語のみ</a>`);
  else
    footer.insertAdjacentHTML('beforeend', `<a href="#all">International view</a>`);
}

function asyncFetch(items, url, cutoff) {
  return fetch(url)
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      data.querySelectorAll("item").forEach(i => {
        var pubDate = Date.parse(i.querySelector("pubDate")?.innerHTML);
        if (!cutoff || pubDate > cutoff) {
          // look for a picture
          var image = i.querySelector("image")?.innerHTML;
          if (!image) {
            image = i.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url");
          }
          if (!image) {
            for (var m of i.getElementsByTagName("media:content")) {
              var url = m.getAttribute("url");
              if (url.match(/(.jpg|.jpeg|.png|.gif)/i)) {
                image = url;
                break;
              }
            }
          }
          if (!image) {
            var enc = i.getElementsByTagName("content:encoded")[0]?.innerHTML;
            var html = new DOMParser().parseFromString(enc, "text/html");
            for (var m of html.getElementsByTagName("img")) {
              var src = m.getAttribute("src");
              if (!src) src = m.getAttribute("file");
              if (src && src.indexOf('emoji') < 0) {
                image = src;
                break;
              }
            }
          }
          if (!image) {
            var desc = i.querySelector("description")?.innerHTML;
            var html = new DOMParser().parseFromString(desc, "text/html");
            for (var m of html.getElementsByTagName("img")) {
              var src = m.getAttribute("src");
              if (src && src.indexOf('emoji') < 0) {
                image = src;
                break;
              }
            }
          }
          if (image && image.indexOf('-thumb.') < 0) { // skip if no good picture
            items.push({
              pubDate: pubDate,
              title: formatTitle(i.querySelector("title")?.innerHTML),
              image: image,
              link: i.querySelector("link")?.innerHTML,
            });
          }
        }
      });
    });
}

async function fetchRss(links, hours, local) {
  if (hours == null) hours = 7 * 24; // default to one week

  // load from RSS sources
  var hash = window.location.hash;
  var lang = userLang();
  var items = [];
  for (var url of links) {
    if (hash == '#all' || (hash == '' && lang != 'ja') || url.indexOf('chionkoi') >= 0) { // limit JP users to one link
      var link = local ? url : proxyurl + url;
      await asyncFetch(items, link, hours == 0 ? null : offsetDate(-hours)); // no limit if hours is zero
    }
  }

  // order from newest to oldest and remove duplicates
  items.sort((a, b) => (a.pubDate < b.pubDate) ? 1 : -1);
  items = items.filter((a, i, self) => i === self.findIndex((t) => (t.title === a.title)));

  // stop splash
  var splash = document.getElementById("splash");
  splash.parentNode.removeChild(splash);

  // render to body
  for (var i of items) {
    renderArticle(i, offsetDate(-24)); // highlight recent articles
  }
  renderFooter();
}
