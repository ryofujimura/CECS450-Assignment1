// ==== CONFIG ====
const CSV_PATH = "Motor_Vehicle_Collisions_2020-2024.csv"; // <-- change if your filename differs
const YEARS = [2020, 2021, 2022, 2023, 2024];
const MONTHS = d3.range(1, 13);
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ==== SIZE / MARGINS ====
const margin = { top: 60, right: 140, bottom: 60, left: 70 };
const width = 900;
const height = 520;

// ==== SCALES / COLORS ====
const x = d3.scalePoint().domain(MONTHS).range([margin.left, width - margin.right]).padding(0.5);
const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);
const color = d3.scaleOrdinal().domain(YEARS).range(d3.schemeTableau10);

// ==== ROOT SVG ====
const svg = d3.select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("width", "100%")
  .attr("height", "100%");

// Title
svg.append("text")
  .attr("class", "title")
  .attr("x", margin.left)
  .attr("y", 28)
  .text("NYC Motor Vehicle Collisions by Month (Lines = Years)");

// Axes groups
const gx = svg.append("g").attr("class", "x axis")
  .attr("transform", `translate(0,${height - margin.bottom})`);

const gy = svg.append("g").attr("class", "y axis")
  .attr("transform", `translate(${margin.left},0)`);

// Axis labels
svg.append("text")
  .attr("class", "label")
  .attr("x", (width - margin.right))
  .attr("y", height - 16)
  .attr("text-anchor", "end")
  .text("Month");

svg.append("text")
  .attr("class", "label")
  .attr("x", - (height / 2))
  .attr("y", 20)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Number of collisions");

// Year label that updates on hover
const yearText = svg.append("text")
  .attr("class", "yearText")
  .attr("x", width - margin.right + 6)
  .attr("y", margin.top - 16)
  .attr("fill", "#111")
  .text("");

// Line generator
const line = d3.line()
  .x(d => x(d.month))
  .y(d => y(d.count))
  .curve(d3.curveMonotoneX);

// Tooltip (simple)
const tooltip = d3.select("body")
  .append("div")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("padding", "6px 8px")
  .style("background", "rgba(0,0,0,0.75)")
  .style("color", "#fff")
  .style("font", "12px sans-serif")
  .style("border-radius", "6px")
  .style("opacity", 0);

// ==== DATA LOAD & PROCESS ====
d3.csv(CSV_PATH, row => {
  // Expect these columns in your saved CSV:
  // CRASH YEAR, CRASH MONTH (1–12), (others are ignored)
  const year = +row["CRASH YEAR"];
  // Prefer CRASH MONTH if present; fallback to parsing CRASH DATE just in case.
  const mFromCol = +row["CRASH MONTH"];
  const month = Number.isFinite(mFromCol) && mFromCol >= 1 && mFromCol <= 12
    ? mFromCol
    : (row["CRASH DATE"] ? (new Date(row["CRASH DATE"])).getMonth() + 1 : NaN);

  return { year, month };
}).then(raw => {
  // Filter to target years & valid months
  const filtered = raw.filter(d => YEARS.includes(d.year) && MONTHS.includes(d.month));

  // Build a complete matrix Year x Month with zeros filled
  const counts = {};
  YEARS.forEach(y => {
    counts[y] = {};
    MONTHS.forEach(m => counts[y][m] = 0);
  });
  filtered.forEach(d => { counts[d.year][d.month] += 1; });

  // Convert to series list: [{year, values:[{month, count}...]}...]
  const series = YEARS.map(y => ({
    year: y,
    values: MONTHS.map(m => ({ month: m, count: counts[y][m] }))
  }));

  // Y domain
  const maxY = d3.max(series, s => d3.max(s.values, v => v.count)) || 0;
  y.domain([0, Math.ceil(maxY * 1.05)]);

  // === RENDER AXES ===
  gx.call(d3.axisBottom(x).tickValues(MONTHS).tickFormat((m, i) => MONTH_LABELS[i]));
  gy.call(d3.axisLeft(y).ticks(8).tickSize(- (width - margin.left - margin.right)));

  // Lighten grid lines
  gy.selectAll(".tick line").attr("stroke", "#e5e5e5");
  gx.selectAll(".tick line").attr("stroke", "#e5e5e5");

// === LINES ===
const gLines = svg.append("g").attr("class", "lines");

const paths = gLines.selectAll("path.line")
  .data(series)
  .enter()
  .append("path")
  .attr("class", "line shadow")
  .attr("fill", "none")
  .attr("stroke", d => color(d.year))
  .attr("stroke-width", 2.5)
  .attr("d", d => line(d.values))
  .attr("opacity", 0.95);

// Animate the "moving line" draw-in
let remaining = series.length; // how many lines to finish

paths.each(function() {
  const totalLength = this.getTotalLength();
  d3.select(this)
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(8000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0)
    .on("end", function() {
      remaining -= 1;
      if (remaining === 0) {
        // all lines done → enable hover
        enableHover();
      }
    });
});

// hover enabling function
function enableHover() {
  hoverTargets
    .style("cursor", "pointer")
    .on("mouseenter", d => { highlightYear(d.year); showYearTooltip(d.year); })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => { clearHighlight(); hideTooltip(); });

  legendRow
    .on("mouseenter", y => { highlightYear(y); showYearTooltip(y); })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => { clearHighlight(); hideTooltip(); });
}

// ===== Year-level stats hover =====
const YEAR_STATS = {
  2020: { total: 82336,
    topFactors: [
      { name: "Driver Inattention/Distraction", count: 28407 },
      { name: "Following Too Closely", count: 7582 },
      { name: "Failure to Yield Right-of-Way", count: 7045 },
    ],
    topVehicles: [
      { name: "Sedan", count: 37886 },
      { name: "Station Wagon/Sport Utility Vehicle", count: 30256 },
      { name: "Taxi", count: 2945 },
    ]
  },
  2021: { total: 81483,
    topFactors: [
      { name: "Driver Inattention/Distraction", count: 26241 },
      { name: "Following Too Closely", count: 7281 },
      { name: "Failure to Yield Right-of-Way", count: 7179 },
    ],
    topVehicles: [
      { name: "Sedan", count: 38418 },
      { name: "Station Wagon/Sport Utility Vehicle", count: 29069 },
      { name: "Taxi", count: 2094 },
    ]
  },
  2022: { total: 77621,
    topFactors: [
      { name: "Driver Inattention/Distraction", count: 25558 },
      { name: "Failure to Yield Right-of-Way", count: 7149 },
      { name: "Following Too Closely", count: 6707 },
    ],
    topVehicles: [
      { name: "Sedan", count: 35995 },
      { name: "Station Wagon/Sport Utility Vehicle", count: 27713 },
      { name: "Taxi", count: 2098 },
    ]
  },
  2023: { total: 72082,
    topFactors: [
      { name: "Driver Inattention/Distraction", count: 23794 },
      { name: "Failure to Yield Right-of-Way", count: 6367 },
      { name: "Following Too Closely", count: 6107 },
    ],
    topVehicles: [
      { name: "Sedan", count: 32722 },
      { name: "Station Wagon/Sport Utility Vehicle", count: 25661 },
      { name: "Taxi", count: 2048 },
    ]
  },
  2024: { total: 67140,
    topFactors: [
      { name: "Driver Inattention/Distraction", count: 21862 },
      { name: "Failure to Yield Right-of-Way", count: 6039 },
      { name: "Following Too Closely", count: 5427 },
    ],
    topVehicles: [
      { name: "Sedan", count: 29830 },
      { name: "Station Wagon/Sport Utility Vehicle", count: 23913 },
      { name: "Taxi", count: 2048 },
    ]
  }
};

function formatYearStats(year) {
  const s = YEAR_STATS[year];
  if (!s) return `<div style="font-weight:700">${year}</div><div>No stats available.</div>`;
  const f = s.topFactors.map(d => `<div>${d.name}: ${d.count.toLocaleString()}</div>`).join("");
  const v = s.topVehicles.map(d => `<div>${d.name}: ${d.count.toLocaleString()}</div>`).join("");
  return `
    <div style="font-weight:800; font-size:14px; margin-bottom:6px;">${year}</div>
    <div><b>Total Collisions:</b> ${s.total.toLocaleString()}</div>
    <div style="margin-top:6px;"><b>Top 3 Contributing Factors</b></div>
    ${f}
    <div style="margin-top:6px;"><b>Top 3 Vehicle Types</b></div>
    ${v}
  `;
}

// Create wide, invisible hover targets on top of the visible lines
const hoverTargets = gLines.selectAll("path.line-hover")
  .data(series)
  .enter()
  .append("path")
  .attr("class", "line-hover")
  .attr("fill", "none")
  .attr("stroke", "#000")
  .attr("stroke-opacity", 0)    // invisible but interactive
  .attr("stroke-width", 16)     // generous hit area
  .attr("pointer-events", "stroke")
  .attr("d", d => line(d.values))
  .style("cursor", "pointer");

// Hover handlers
function highlightYear(y) {
  paths.attr("opacity", p => (p.year === y ? 1 : 0.15));
  yearText.text(y);
}
function clearHighlight() {
  paths.attr("opacity", 0.95);
  yearText.text("");
}
function showYearTooltip(y) {
  tooltip.style("opacity", 1).html(formatYearStats(y));
}
function moveTooltip() {
  tooltip
    .style("left", (d3.event.pageX + 12) + "px")
    .style("top",  (d3.event.pageY - 24) + "px");
}
function hideTooltip() {
  tooltip.style("opacity", 0);
}

hoverTargets
  .on("mouseenter", d => { highlightYear(d.year); showYearTooltip(d.year); })
  .on("mousemove", moveTooltip)
  .on("mouseleave", () => { clearHighlight(); hideTooltip(); });

// === LEGEND ===
const legend = svg.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${width - margin.right + 8}, ${margin.top})`);

const legendRow = legend.selectAll("g.row")
  .data(YEARS)
  .enter()
  .append("g")
  .attr("class", "row")
  .attr("transform", (d, i) => `translate(0, ${i * 24})`)
  .style("cursor", "pointer")
  .on("mouseenter", y => { highlightYear(y); showYearTooltip(y); })
  .on("mousemove", moveTooltip)
  .on("mouseleave", () => { clearHighlight(); hideTooltip(); });

legendRow.append("rect")
  .attr("width", 14)
  .attr("height", 14)
  .attr("rx", 3)
  .attr("ry", 3)
  .attr("fill", d => color(d));

legendRow.append("text")
  .attr("x", 20)
  .attr("y", 11)
  .attr("font-size", 13)
  .attr("fill", "#111")
  .text(d => d);
});


