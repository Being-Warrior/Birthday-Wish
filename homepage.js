// triangulation using https://github.com/ironwallaby/delaunay

// For more check out zachsaucier.com

const TWO_PI = Math.PI * 2;

var images = [],
  imageIndex = 0;

var image,
  imageWidth = 960,
  imageHeight = 720;

var vertices = [],
  indices = [],
  prevfrag = [],
  fragments = [];

var margin = 50;

var container = document.getElementById("container");

var clickPosition = [imageWidth * 0.5, imageHeight * 0.5];

window.onload = function () {
  TweenMax.set(container, { perspective: 500 });

  // images from http://www.hdwallpapers.in
  var urls = [
      "WhatsApp Image 2023-12-25 at 15.49.32.jpeg",
      "WhatsApp Image 2023-12-25 at 15.49.33 (1).jpeg",
      "WhatsApp Image 2023-12-25 at 15.49.33 (2).jpeg",
      "WhatsApp Image 2023-12-25 at 15.49.33.jpeg",
      "WhatsApp Image 2023-12-25 at 16.07.50.jpeg",
    ],
    image,
    loaded = 0;
  // very quick and dirty hack to load and display the first image asap
  images[0] = image = new Image();
  image.onload = function () {
    if (++loaded === 1) {
      for (var i = 1; i < 5; i++) {
        images[i] = image = new Image();

        image.src = urls[i];
      }
      placeImage();
    }
  };
  image.src = urls[0];
};

function placeImage(transitionIn) {
  image = images[imageIndex];

  if (++imageIndex === images.length) imageIndex = 0;

  var num = Math.random();
  if (num < 0.25) {
    image.direction = "left";
  } else if (num < 0.5) {
    image.direction = "top";
  } else if (num < 0.75) {
    image.direction = "bottom";
  } else {
    image.direction = "right";
  }

  container.appendChild(image);
  image.style.opacity = 0;

  if (transitionIn !== false) {
    triangulateIn();
  }
}

function triangulateIn(event) {
  var box = image.getBoundingClientRect(),
    top = box.top,
    left = box.left;

  if (image.direction == "left") {
    clickPosition[0] = 0;
    clickPosition[1] = imageHeight / 2;
  } else if (image.direction == "top") {
    clickPosition[0] = imageWidth / 2;
    clickPosition[1] = 0;
  } else if (image.direction == "bottom") {
    clickPosition[0] = imageWidth / 2;
    clickPosition[1] = imageHeight;
  } else if (image.direction == "right") {
    clickPosition[0] = imageWidth;
    clickPosition[1] = imageHeight / 2;
  }

  triangulate();
  build();
}

function triangulate() {
  for (var i = 0; i < 40; i++) {
    x = -margin + Math.random() * (imageWidth + margin * 2);
    y = -margin + Math.random() * (imageHeight + margin * 2);
    vertices.push([x, y]);
  }
  vertices.push([0, 0]);
  vertices.push([imageWidth, 0]);
  vertices.push([imageWidth, imageHeight]);
  vertices.push([0, imageHeight]);

  vertices.forEach(function (v) {
    v[0] = clamp(v[0], 0, imageWidth);
    v[1] = clamp(v[1], 0, imageHeight);
  });

  indices = Delaunay.triangulate(vertices);
}

function build() {
  var p0, p1, p2, fragment;

  var tl0 = new TimelineMax({ onComplete: buildCompleteHandler });

  for (var i = 0; i < indices.length; i += 3) {
    p0 = vertices[indices[i + 0]];
    p1 = vertices[indices[i + 1]];
    p2 = vertices[indices[i + 2]];

    fragment = new Fragment(p0, p1, p2);

    var dx = fragment.centroid[0] - clickPosition[0],
      dy = fragment.centroid[1] - clickPosition[1],
      d = Math.sqrt(dx * dx + dy * dy),
      rx = 30 * sign(dy),
      ry = 90 * -sign(dx),
      delay = d * 0.003 * randomRange(0.9, 1.1);
    fragment.canvas.style.zIndex = Math.floor(d).toString();

    var tl1 = new TimelineMax();

    if (image.direction == "left") {
      rx = Math.abs(rx);
      ry = 0;
    } else if (image.direction == "top") {
      rx = 0;
      ry = Math.abs(ry);
    } else if (image.direction == "bottom") {
      rx = 0;
      ry = -Math.abs(ry);
    } else if (image.direction == "right") {
      rx = -Math.abs(rx);
      ry = 0;
    }

    tl1.from(fragment.canvas, 1, {
      z: -50,
      rotationX: rx,
      rotationY: ry,
      scaleX: 0,
      scaleY: 0,
      ease: Cubic.easeIn,
    });
    tl1.from(fragment.canvas, 0.4, { alpha: 0 }, 0.6);

    tl0.insert(tl1, delay);

    fragments.push(fragment);
    container.appendChild(fragment.canvas);
  }
}

function buildCompleteHandler() {
  // add pooling?
  image.style.opacity = 1;
  image.addEventListener(
    "transitionend",
    function catchTrans() {
      fragments.forEach(function (f) {
        container.removeChild(f.canvas);
      });

      fragments.length = 0;
      vertices.length = 0;
      indices.length = 0;

      placeImage();
      this.removeEventListener("transitionend", catchTrans, false);
    },
    false
  );
}

//////////////
// MATH UTILS
//////////////

function randomRange(min, max) {
  return min + (max - min) * Math.random();
}

function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

function sign(x) {
  return x < 0 ? -1 : 1;
}

//////////////
// FRAGMENT
//////////////

Fragment = function (v0, v1, v2) {
  this.v0 = v0;
  this.v1 = v1;
  this.v2 = v2;

  this.computeBoundingBox();
  this.computeCentroid();
  this.createCanvas();
  this.clip();
};
Fragment.prototype = {
  computeBoundingBox: function () {
    var xMin = Math.min(this.v0[0], this.v1[0], this.v2[0]),
      xMax = Math.max(this.v0[0], this.v1[0], this.v2[0]),
      yMin = Math.min(this.v0[1], this.v1[1], this.v2[1]),
      yMax = Math.max(this.v0[1], this.v1[1], this.v2[1]);

    this.box = {
      x: Math.round(xMin),
      y: Math.round(yMin),
      w: Math.round(xMax - xMin),
      h: Math.round(yMax - yMin),
    };
  },
  computeCentroid: function () {
    var x = (this.v0[0] + this.v1[0] + this.v2[0]) / 3,
      y = (this.v0[1] + this.v1[1] + this.v2[1]) / 3;

    this.centroid = [x, y];
  },
  createCanvas: function () {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.box.w;
    this.canvas.height = this.box.h;
    this.canvas.style.width = this.box.w + "px";
    this.canvas.style.height = this.box.h + "px";
    this.canvas.style.left = this.box.x + "px";
    this.canvas.style.top = this.box.y + "px";
    this.ctx = this.canvas.getContext("2d");
  },
  clip: function () {
    this.ctx.save();
    this.ctx.translate(-this.box.x, -this.box.y);
    this.ctx.beginPath();
    this.ctx.moveTo(this.v0[0], this.v0[1]);
    this.ctx.lineTo(this.v1[0], this.v1[1]);
    this.ctx.lineTo(this.v2[0], this.v2[1]);
    this.ctx.closePath();
    this.ctx.clip();
    this.ctx.drawImage(image, 0, 0);
    this.ctx.restore();
  },
};

var Delaunay;

(function () {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
      ymin = Number.POSITIVE_INFINITY,
      xmax = Number.NEGATIVE_INFINITY,
      ymax = Number.NEGATIVE_INFINITY,
      i,
      dx,
      dy,
      dmax,
      xmid,
      ymid;

    for (i = vertices.length; i--; ) {
      if (vertices[i][0] < xmin) xmin = vertices[i][0];
      if (vertices[i][0] > xmax) xmax = vertices[i][0];
      if (vertices[i][1] < ymin) ymin = vertices[i][1];
      if (vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid - dmax],
      [xmid, ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid - dmax],
    ];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
      y1 = vertices[i][1],
      x2 = vertices[j][0],
      y2 = vertices[j][1],
      x3 = vertices[k][0],
      y3 = vertices[k][1],
      fabsy1y2 = Math.abs(y1 - y2),
      fabsy2y3 = Math.abs(y2 - y3),
      xc,
      yc,
      m1,
      m2,
      mx1,
      mx2,
      my1,
      my2,
      dx,
      dy;

    /* Check for coincident points */
    if (fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if (fabsy1y2 < EPSILON) {
      m2 = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc = (x2 + x1) / 2.0;
      yc = m2 * (xc - mx2) + my2;
    } else if (fabsy2y3 < EPSILON) {
      m1 = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc = (x3 + x2) / 2.0;
      yc = m1 * (xc - mx1) + my1;
    } else {
      m1 = -((x2 - x1) / (y2 - y1));
      m2 = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc = fabsy1y2 > fabsy2y3 ? m1 * (xc - mx1) + my1 : m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return { i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy };
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for (j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for (i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if ((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function (vertices, key) {
      var n = vertices.length,
        i,
        j,
        indices,
        st,
        open,
        closed,
        edges,
        dx,
        dy,
        a,
        b,
        c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if (n < 3) return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if (key) for (i = n; i--; ) vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. Force stable sorting by comparing indices if
       * the x-positions are equal. */
      indices = new Array(n);

      for (i = n; i--; ) indices[i] = i;

      indices.sort(function (i, j) {
        var diff = vertices[j][0] - vertices[i][0];
        return diff !== 0 ? diff : i - j;
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);

      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges = [];

      /* Incrementally add each vertex to the mesh. */
      for (i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for (j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if (dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if (dx * dx + dy * dy - open[j].r > EPSILON) continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i,
            open[j].j,
            open[j].j,
            open[j].k,
            open[j].k,
            open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for (j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for (i = open.length; i--; ) closed.push(open[i]);
      open.length = 0;

      for (i = closed.length; i--; )
        if (closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function (tri, p) {
      /* Bounding box test first, for quick rejections. */
      if (
        (p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
        (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
        (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
        (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1])
      )
        return null;

      var a = tri[1][0] - tri[0][0],
        b = tri[2][0] - tri[0][0],
        c = tri[1][1] - tri[0][1],
        d = tri[2][1] - tri[0][1],
        i = a * d - b * c;

      /* Degenerate tri. */
      if (i === 0.0) return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
        v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if (u < 0.0 || v < 0.0 || u + v > 1.0) return null;

      return [u, v];
    },
  };

  if (typeof module !== "undefined") module.exports = Delaunay;
})();
