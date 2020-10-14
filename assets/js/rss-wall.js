const proxyurl = "https://cors-anywhere.herokuapp.com/";

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
  //console.log(item);
  var ts = new Date(item.pubDate);
  var cl = ts > recent ? ' class="recent"' : '';
  var html = `
    <article${cl}>
      <a href="${item.link}" target="_blank" rel="noopener">
        <img src="${item.image}" alt="">
        <h2>${item.title}</h2>
        <span>${ts.toISOString().split('T')[0]}&nbsp;${ts.toTimeString().split(' ')[0]}</span>
      </a>
    </article>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function asyncFetch(items, link) {
  return fetch(proxyurl + link)
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      var cutoff = offsetDate(-7 * 24); // one week
      data.querySelectorAll("item").forEach(i => {
        var image = i.querySelector("image")?.innerHTML;
        var pubDate = Date.parse(i.querySelector("pubDate")?.innerHTML);
        if (image && image.indexOf('-thumb.') < 0 && pubDate > cutoff) {
          items.push({
            pubDate: pubDate,
            title: formatTitle(i.querySelector("title")?.innerHTML),
            image: image,
            link: i.querySelector("link")?.innerHTML,
          });
        }
      });
    });
}

async function fetchRss(links) {
  var items = [];

  // load from sources
  for (var url of links) {
    await asyncFetch(items, url);
  }

  // order from newest to oldest, remove duplicates
  items.sort((a, b) => (a.pubDate < b.pubDate) ? 1 : -1);
  items = items.filter((a, i, self) => i === self.findIndex((t) => (t.title === a.title)));

  // remove splash
  var splash = document.getElementById("splash");
  splash.parentNode.removeChild(splash);

  // render to body
  for (var i of items) {
    renderArticle(i, offsetDate(-6)); // recent
  }
}

function asyncFetchWP(items, link) {
  return fetch(proxyurl + link)
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      data.querySelectorAll("item").forEach(i => {
        var pubDate = Date.parse(i.querySelector("pubDate")?.innerHTML);
        var image = i.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url");
        if (!image) {
          var desc = i.querySelector("description")?.innerHTML;
          var html = new DOMParser().parseFromString(desc, "text/html");
          image = html.querySelector("img")?.getAttribute("src");
        }
        if (image) {
          items.push({
            pubDate: pubDate,
            title: formatTitle(i.querySelector("title")?.innerHTML),
            image: image + '?w=400',
            link: i.querySelector("link")?.innerHTML,
          });
        }
      });
    });
}

async function fetchWP(links) {
  var items = [];

  // load from sources
  for (var url of links) {
    await asyncFetchWP(items, url);
  }

  // order from newest to oldest, remove duplicates
  items.sort((a, b) => (a.pubDate < b.pubDate) ? 1 : -1);
  items = items.filter((a, i, self) => i === self.findIndex((t) => (t.title === a.title)));

  // remove splash
  var splash = document.getElementById("splash");
  splash.parentNode.removeChild(splash);

  // render to body
  for (var i of items) {
    renderArticle(i, offsetDate(-24)); // recent
  }
}
