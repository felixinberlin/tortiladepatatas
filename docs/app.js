(function () {
  "use strict";

  var I18N = {
    es: {
      title: "El Mapa de la Tortilla",
      tagline: "Todas las tortillas de patatas premiadas de España, en un mapa.",
      notice: "Beta: datos sacados de noticias y aún sin verificar. La ubicación de cada chincheta es aproximada.",
      search: "Buscar", region: "Región", year: "Año", championship: "Campeonato", style: "Estilo",
      all: "Todos", allF: "Todas",
      onlyWinners: "Solo primeros puestos",
      nearMe: "Cerca de mí",
      nearMeOn: "Ordenado por distancia",
      geoFail: "No se pudo obtener tu ubicación.",
      count: function (n, v) { return n + (n === 1 ? " premio" : " premios") + " · " + v + (v === 1 ? " local" : " locales"); },
      none: "Ningún premio coincide con los filtros.",
      place: function (p) { return p + ".º puesto"; },
      sources: "Fuentes",
      unverified: "sin verificar",
      approx: { barrio: "ubicación aprox. (barrio)", municipio: "ubicación aprox. (municipio)" },
      styles: { "con cebolla": "con cebolla", "sin cebolla": "sin cebolla", unknown: "estilo desconocido" },
      categories: {},
      scope: { national: "nacional", regional: "regional", local: "local" },
      chef: "Chef",
      noMap: "No se pudo cargar el mapa. La lista sigue funcionando.",
      footer: "Mapa © colaboradores de <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>."
    },
    en: {
      title: "The Tortilla Map",
      tagline: "Every award-winning Spanish potato omelette, on one map.",
      notice: "Beta: data taken from news reports and not yet verified. Each pin's location is approximate.",
      search: "Search", region: "Region", year: "Year", championship: "Championship", style: "Style",
      all: "All", allF: "All",
      onlyWinners: "First places only",
      nearMe: "Near me",
      nearMeOn: "Sorted by distance",
      geoFail: "Couldn't get your location.",
      count: function (n, v) { return n + (n === 1 ? " award" : " awards") + " · " + v + (v === 1 ? " venue" : " venues"); },
      none: "No awards match these filters.",
      place: function (p) { return ["", "1st", "2nd", "3rd"][p] ? ["", "1st", "2nd", "3rd"][p] + " place" : p + "th place"; },
      sources: "Sources",
      unverified: "unverified",
      approx: { barrio: "approx. location (neighbourhood)", municipio: "approx. location (town)" },
      styles: { "con cebolla": "with onion", "sin cebolla": "without onion", unknown: "style unknown" },
      categories: {
        "tradicional": "traditional",
        "jurado profesional": "jury prize",
        "premio del público": "public vote",
        "originalidad": "originality"
      },
      scope: { national: "national", regional: "regional", local: "local" },
      chef: "Chef",
      noMap: "The map couldn't load. The list still works.",
      footer: "Map © <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors."
    }
  };

  var state = { lang: "es", awards: [], user: null, activeVenue: null };
  var map = null, markerLayer = null, markersByVenue = {};

  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N[state.lang][key]; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function venueKey(a) { return a.venue + "|" + a.city; }
  function catLabel(c) { return t("categories")[c] || c; }
  function styleLabel(s) { return t("styles")[s || "unknown"]; }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }

  function storeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function distanceKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ---------- filters ----------
  function uniq(values) {
    return values.filter(function (v, i, arr) { return v != null && arr.indexOf(v) === i; });
  }

  function fillSelect(el, values, allLabel, labelFn) {
    var current = el.value;
    el.innerHTML = "";
    var opt = document.createElement("option");
    opt.value = ""; opt.textContent = allLabel;
    el.appendChild(opt);
    values.forEach(function (v) {
      var o = document.createElement("option");
      o.value = String(v);
      o.textContent = labelFn ? labelFn(v) : String(v);
      el.appendChild(o);
    });
    el.value = values.map(String).indexOf(current) >= 0 ? current : "";
  }

  function buildFilters() {
    var aw = state.awards;
    fillSelect($("f-region"), uniq(aw.map(function (a) { return a.region; })).sort(), t("allF"));
    fillSelect($("f-year"), uniq(aw.map(function (a) { return a.year; })).sort(function (x, y) { return y - x; }), t("all"));
    fillSelect($("f-champ"), uniq(aw.map(function (a) { return a.championship; })).sort(), t("all"));
    fillSelect($("f-style"), ["con cebolla", "sin cebolla", "unknown"], t("all"), styleLabel);
  }

  function filtered() {
    var q = $("f-q").value.trim().toLowerCase();
    var region = $("f-region").value, year = $("f-year").value, champ = $("f-champ").value, style = $("f-style").value;
    var onlyFirst = $("f-winners").checked;
    var out = state.awards.filter(function (a) {
      if (region && a.region !== region) return false;
      if (year && String(a.year) !== year) return false;
      if (champ && a.championship !== champ) return false;
      if (style && (a.style || "unknown") !== style) return false;
      if (onlyFirst && a.place !== 1) return false;
      if (q) {
        var hay = [a.venue, a.city, a.area, a.region, a.championship, a.chef].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    if (state.user) {
      out.forEach(function (a) { a._km = distanceKm(state.user, a); });
      out.sort(function (x, y) { return x._km - y._km; });
    } else {
      out.sort(function (x, y) { return (y.year - x.year) || (x.place - y.place) || x.venue.localeCompare(y.venue); });
    }
    return out;
  }

  // ---------- list ----------
  function awardLine(a) {
    return esc(t("place")(a.place)) + " · " + esc(a.championship) +
      (a.edition ? " (" + esc(a.edition) + ")" : "") + " · " + esc(a.year);
  }

  function renderList(items) {
    var list = $("list");
    list.innerHTML = "";
    var venues = uniq(items.map(venueKey));
    $("count").textContent = t("count")(items.length, venues.length) + (state.user ? " · " + t("nearMeOn") : "");
    if (!items.length) {
      list.innerHTML = "<li class=\"empty\">" + esc(t("none")) + "</li>";
      return;
    }
    items.forEach(function (a) {
      var li = document.createElement("li");
      li.className = "card" + (state.activeVenue === venueKey(a) ? " active" : "");
      li.tabIndex = 0;
      li.dataset.venue = venueKey(a);
      var where = [a.area, a.city].filter(Boolean).join(", ");
      var tags = [catLabel(a.category), styleLabel(a.style), t("scope")[a.scope], t("approx")[a.geo_precision]];
      if (!a.verified) tags.push(t("unverified"));
      li.innerHTML =
        "<span class=\"medal p" + esc(a.place) + "\" aria-hidden=\"true\">" + esc(a.place) + "</span>" +
        "<h2>" + esc(a.venue) + "</h2>" +
        "<div class=\"where\">" + esc(where) + (a.address ? " · " + esc(a.address) : "") +
          (state.user ? " · <span class=\"dist\">" + Math.round(a._km) + " km</span>" : "") + "</div>" +
        "<div class=\"award\">" + awardLine(a) + (a.chef ? " · " + esc(t("chef")) + ": " + esc(a.chef) : "") + "</div>" +
        "<div class=\"tags\">" + tags.map(function (x) { return "<span class=\"tag\">" + esc(x) + "</span>"; }).join("") + "</div>" +
        "<div class=\"src\">" + esc(t("sources")) + ": " + a.sources.map(function (u) {
          return "<a href=\"" + esc(u) + "\" target=\"_blank\" rel=\"noopener\">" + esc(hostOf(u)) + "</a>";
        }).join(", ") + "</div>";
      li.addEventListener("click", function (ev) {
        if (ev.target.tagName === "A") return;
        focusVenue(venueKey(a));
      });
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); focusVenue(venueKey(a)); }
      });
      list.appendChild(li);
    });
  }

  // ---------- map ----------
  function initMap() {
    var el = $("map");
    if (typeof L === "undefined") {
      el.classList.add("nomap");
      el.textContent = t("noMap");
      return;
    }
    map = L.map(el, { scrollWheelZoom: false }).setView([40.2, -3.7], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  function pinColor(place) {
    var css = getComputedStyle(document.documentElement);
    var v = place === 1 ? "--gold" : place === 2 ? "--silver" : place === 3 ? "--bronze" : "--muted";
    return css.getPropertyValue(v).trim();
  }

  function renderMap(items) {
    if (!map) return;
    markerLayer.clearLayers();
    markersByVenue = {};
    var groups = {};
    items.forEach(function (a) {
      var k = venueKey(a);
      (groups[k] = groups[k] || []).push(a);
    });
    // Venues that share approximate coordinates (same town centre) get spread in a small circle.
    var byCoord = {};
    Object.keys(groups).forEach(function (k) {
      var a = groups[k][0], c = a.lat.toFixed(4) + "," + a.lng.toFixed(4);
      (byCoord[c] = byCoord[c] || []).push(k);
    });
    var bounds = [];
    Object.keys(byCoord).forEach(function (c) {
      var keys = byCoord[c];
      keys.forEach(function (k, i) {
        var awards = groups[k], a = awards[0];
        var lat = a.lat, lng = a.lng;
        if (keys.length > 1) {
          var ang = (2 * Math.PI * i) / keys.length, r = 0.006;
          lat += r * Math.sin(ang); lng += r * Math.cos(ang) / Math.cos(lat * Math.PI / 180);
        }
        var best = Math.min.apply(null, awards.map(function (x) { return x.place; }));
        var icon = L.divIcon({
          className: "",
          html: "<div class=\"pin\" style=\"background:" + pinColor(best) + "\">" + (awards.length > 1 ? awards.length : best) + "</div>",
          iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14]
        });
        var popup = "<h3>" + esc(a.venue) + "</h3>" +
          "<div>" + esc([a.area, a.city].filter(Boolean).join(", ")) + "</div>" +
          (a.address ? "<div>" + esc(a.address) + "</div>" : "") +
          "<ul>" + awards.map(function (x) { return "<li>" + awardLine(x) + " · " + esc(catLabel(x.category)) + "</li>"; }).join("") + "</ul>" +
          "<div><em>" + esc(t("approx")[a.geo_precision]) + "</em></div>";
        var m = L.marker([lat, lng], { icon: icon, title: a.venue, keyboard: true }).bindPopup(popup);
        m.on("click", function () { highlight(k, false); });
        m.addTo(markerLayer);
        markersByVenue[k] = m;
        bounds.push([lat, lng]);
      });
    });
    if (state.user) bounds.push([state.user.lat, state.user.lng]);
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }

  function highlight(k, scroll) {
    state.activeVenue = k;
    Array.prototype.forEach.call(document.querySelectorAll(".card"), function (c) {
      c.classList.toggle("active", c.dataset.venue === k);
    });
    if (scroll) return;
    var first = document.querySelector(".card.active");
    if (first && first.scrollIntoView) first.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function focusVenue(k) {
    highlight(k, true);
    var m = markersByVenue[k];
    if (m && map) {
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 11));
      m.openPopup();
    }
  }

  // ---------- language ----------
  function applyLang(lang) {
    state.lang = I18N[lang] ? lang : "es";
    document.documentElement.lang = state.lang;
    document.title = t("title");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-html]"), function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".lang button"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
    });
    if (map === null && typeof L === "undefined") $("map").textContent = t("noMap");
    storeSet("tortilla-lang", state.lang);
    buildFilters();
    update();
  }

  function update() {
    var items = filtered();
    renderList(items);
    renderMap(items);
  }

  function nearMe() {
    var btn = $("near-me");
    if (state.user) {
      state.user = null;
      btn.setAttribute("aria-pressed", "false");
      update();
      return;
    }
    if (!navigator.geolocation) { alert(t("geoFail")); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      btn.setAttribute("aria-pressed", "true");
      update();
    }, function () { alert(t("geoFail")); }, { timeout: 10000 });
  }

  function init(data) {
    state.awards = data.awards;
    initMap();
    ["f-q", "f-region", "f-year", "f-champ", "f-style", "f-winners"].forEach(function (id) {
      $(id).addEventListener(id === "f-q" ? "input" : "change", update);
    });
    $("near-me").addEventListener("click", nearMe);
    Array.prototype.forEach.call(document.querySelectorAll(".lang button"), function (b) {
      b.addEventListener("click", function () { applyLang(b.dataset.lang); });
    });
    var urlLang = new URLSearchParams(location.search).get("lang");
    var navLang = (navigator.language || "es").slice(0, 2) === "es" ? "es" : "en";
    applyLang(urlLang || storeGet("tortilla-lang") || navLang);
  }

  fetch("data/winners.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function (err) {
      $("list").innerHTML = "<li class=\"empty\">Error loading data: " + esc(err.message) + "</li>";
    });
})();
