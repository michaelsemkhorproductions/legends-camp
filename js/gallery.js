(function () {
  "use strict";

  // Fit every row without cropping or leaving a partial coach row empty.
  function planRows(ratios, width, targetHeight, gap) {
    var count = ratios.length;
    var costs = Array(count + 1).fill(Infinity);
    var previous = Array(count + 1).fill(-1);
    costs[0] = 0;
    for (var end = 1; end <= count; end++) {
      var sum = 0;
      for (var start = end - 1; start >= Math.max(0, end - 8); start--) {
        sum += ratios[start];
        var length = end - start;
        var height = (width - gap * (length - 1)) / sum;
        if (height <= 0) continue;
        var deviation = (height - targetHeight) / targetHeight;
        var cost = costs[start] + deviation * deviation * length + (length === 1 && count > 1 ? 4 : 0);
        if (cost < costs[end]) { costs[end] = cost; previous[end] = start; }
      }
    }
    var rows = [];
    for (var index = count; index > 0;) {
      var first = previous[index];
      var total = ratios.slice(first, index).reduce(function (a, b) { return a + b; }, 0);
      rows.unshift({ start: first, end: index, height: (width - gap * (index - first - 1)) / total });
      index = first;
    }
    return rows;
  }

  if (typeof module !== "undefined" && module.exports) module.exports = planRows;
  if (typeof document === "undefined") return;
  var gallery = document.getElementById("galleryStream");
  if (!gallery) return;
  var photos = Array.from(gallery.querySelectorAll(".gallery-photo"));
  var ratios = photos.map(function (photo) {
    var img = photo.querySelector("img");
    return Number(img.getAttribute("width")) / Number(img.getAttribute("height"));
  });
  var lastWidth = 0;
  function layout() {
    var width = gallery.clientWidth;
    if (!width || Math.abs(width - lastWidth) < 1) return;
    lastWidth = width;
    var target = width < 600 ? 170 : width < 900 ? 210 : 240;
    var fragment = document.createDocumentFragment();
    planRows(ratios, width, target, 12).forEach(function (row) {
      var element = document.createElement("div");
      element.className = "gallery-row";
      element.style.height = row.height + "px";
      photos.slice(row.start, row.end).forEach(function (photo) { element.appendChild(photo); });
      fragment.appendChild(element);
    });
    gallery.replaceChildren(fragment);
    gallery.classList.add("is-justified");
  }
  layout();
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(layout).observe(gallery);
  } else {
    window.addEventListener("resize", layout);
  }
})();
