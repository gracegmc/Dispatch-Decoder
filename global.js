console.log("JS IS RUNNING");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Select SVG and define dimensions
const svg = d3.select("#scatter-plot")
  .attr("width", 800)
  .attr("height", 500);

const margin = { top: 30, right: 30, bottom: 50, left: 60 },
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const chartGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let allData = [];

// Load JSON data
fetch("emergency_data.json")
  .then(res => res.json())
  .then(data => {
    allData = data;
    applyFilters();

    // Attach event listeners to all dropdowns
    document.querySelectorAll(".toggle-container select").forEach(select => {
      select.addEventListener("change", applyFilters);
    });
  })
  .catch(err => console.error("Failed to load data:", err));

function applyFilters() {
  const filters = {
    "incident-type": document.getElementById("incident-type").value.toLowerCase(),
    "region-type": document.getElementById("region-type").value.toLowerCase(),
    "road-type": document.getElementById("road-type").value.toLowerCase(),
    "weather-condition": document.getElementById("weather-condition").value.toLowerCase(),
    "weather-impact": document.getElementById("weather-impact").value.toLowerCase(),
    "dispatch-coordinator": document.getElementById("dispatch-coordinator").value.toLowerCase(),
    "label": document.getElementById("label").value.toLowerCase()
  };

  const filtered = allData.filter(d => {
    return (!filters["incident-type"] || filters["incident-type"] === "np" || d.Incident?.toLowerCase() === filters["incident-type"]) &&
           (!filters["region-type"] || filters["region-type"] === "np" || d.Region?.toLowerCase() === filters["region-type"]) &&
           (!filters["road-type"] || filters["road-type"] === "np" || d.Road?.toLowerCase() === filters["road-type"]) &&
           (!filters["weather-condition"] || filters["weather-condition"] === "np" || d.Wthr_Cond?.toLowerCase() === filters["weather-condition"]) &&
           (!filters["weather-impact"] || filters["weather-impact"] === "np" || d.Wthr_Impact?.toLowerCase() === filters["weather-impact"]) &&
           (!filters["dispatch-coordinator"] || filters["dispatch-coordinator"] === "np" || d.Dispatcher?.toLowerCase() === filters["dispatch-coordinator"]) &&
           (!filters["label"] || filters["label"] === "np" || d.Label?.toLowerCase().replace(" ", "-") === filters["label"]);
  });

  const responseTimes = filtered
    .map(d => d.Response_Time)
    .filter(rt => typeof rt === "number" && !isNaN(rt));

  drawHistogram(responseTimes);
}

function drawHistogram(data) {
  chartGroup.selectAll("*").remove();

  const x = d3.scaleLinear()
    .domain([0, d3.max(data) || 1])
    .range([0, width])
    .nice();

  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(20)(data);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) || 1])
    .range([height, 0])
    .nice();

  chartGroup.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  chartGroup.append("g")
    .call(d3.axisLeft(y));

  chartGroup.selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => x(d.x1) - x(d.x0) - 1)
    .attr("height", d => height - y(d.length))
    .attr("fill", "#0077ff");

  chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Response Time (minutes)");

  chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Frequency");
}

// VIS 2
// Load the CSV and initialize everything
let showProportion = false;
let fullData = [];
let tooltip = d3.select(".chart-tooltip");
      if (tooltip.empty()) {
        tooltip = d3.select("body")
          .append("div")
          .attr("class", "chart-tooltip")
          .style("position", "absolute")
          .style("padding", "6px 8px")
          .style("background", "rgba(0, 0, 0, 0.7)")
          .style("color", "#fff")
          .style("border-radius", "4px")
          .style("pointer-events", "none")
          .style("font-size", "12px")
          .style("display", "none");
      }

d3.csv("data/emergency_service_routing_with_timestamps.csv").then(data => {
  data.forEach(d => {
    d.Response_Time = +d.Response_Time;
  });

  fullData = data;
  createSlider(data);
  updateCharts(data); // Initial render
});

// Advanced Bucketing
const maxResponseTimeValue = 300; // max expected response time in your data (adjust)
const buckets = Array.from({ length: maxResponseTimeValue + 1 }, () => []);

// Populate buckets once after loading data
fullData.forEach(d => {
  const time = Math.floor(d.Response_Time);
  if (time <= maxResponseTimeValue) {
    buckets[time].push(d);
  }
});

// Then when filtering for slider value maxResponseTime:
function getFilteredData(maxResponseTime) {
  // collect data from buckets up to maxResponseTime
  let filtered = [];
  for (let t = 0; t <= maxResponseTime; t++) {
    filtered = filtered.concat(buckets[t]);
  }
  return filtered;
}

// Debounce function - delays function call until no new calls for 'delay' ms
function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const onSliderChange = debounce(function(maxResponseTime) {
    const filtered = fullData.filter(d => d.Response_Time <= maxResponseTime);
    updateCharts(filtered);
  }, 150);  // 150ms delay - tweak as needed
  
  d3.select("#responseTimeSlider").on("input", function () {
    const maxResponseTime = +this.value;
    d3.select("#sliderValue").text(maxResponseTime);
    onSliderChange(maxResponseTime);
  });
  
  
document.getElementById("toggleMode").addEventListener("input", function () {
    showProportion = this.checked;
    updateCharts(currentFilteredData); // re-render based on toggle
});
  
function createSlider(data) {
    const maxTime = d3.max(data, d => d.Response_Time);
    const minTime = d3.min(data, d => d.Response_Time);
  
    const slider = d3.select("#slider-container")
        .append("input")
        .attr("type", "range")
        .attr("min", minTime)
        .attr("max", maxTime)
        .attr("value", maxTime)
        .attr("step", 1)
        .on("input", function() {
            const filtered = data.filter(d => d.Response_Time <= this.value);
            updateCharts(filtered);
        });
  
    d3.select("#slider-container")
        .append("div")
        .attr("id", "slider-value")
        .text(`Response Time ≤ ${maxTime} mins`);
  
    slider.on("input", function() {
        const val = +this.value;
        d3.select("#slider-value").text(`Response Time ≤ ${val}`);
        const filtered = data.filter(d => d.Response_Time <= val);
        updateCharts(filtered);
    });
}
  
let currentFilteredData = [];

function updateCharts(filteredData) {
  currentFilteredData = filteredData; // save for re-renders
    const charts = [
        {
            id: "chart1", field: "Emergency_Level",
            categories: ["Major", "Critical", "Minor"],
            colors: ["#e86161", "#e8cb61", "#8ee779"]
        },
        {
            id: "chart2", field: "Traffic_Congestion",
            categories: ["High", "Moderate", "Low"],
            colors: ["#e86161", "#e8cb61", "#8ee779"]
        },
        {
            id: "chart3", field: "Incident_Type",
            categories: ["Cardiac Arrest", "Other", "Accident", "Fire"],
            colors: ["#e86161", "#9b9b9b", "#8ee779", "#e8cb61"]
        },
        {
            id: "chart4", field: "Incident_Severity",
            categories: ["High", "Medium", "Low"],
            colors: ["#e86161", "#e8cb61", "#8ee779"]
        }
    ];
  
    charts.forEach(chart => {
        renderBarChart(
            chart.id, 
            filteredData, 
            fullData, // new param
            chart.field, 
            chart.categories, 
            chart.colors
        );
    });
}
  
function renderBarChart(containerId, filteredData, fullData, field, categories, colors) {
    const counts = categories.map(cat => {
        const category = cat.trim();
    
        const matched = filteredData.filter(d => d[field].trim() === category).length;
        const total = fullData.filter(d => d[field].trim() === category).length;
    
        const value = showProportion
          ? (total === 0 ? 0 : matched / total)  // Use total category count for proportion
          : matched;
    
        return {
          category,
          raw: matched,
          total,
          value
        };
      });
    
  
    const container = d3.select(`#${containerId}`);
  
    const width = 250;
    const height = 200;
    const margin = { top: 30, right: 10, bottom: 40, left: 40 };
  
    // Clear container only if no SVG, else reuse for transitions
    let svg = container.select("svg");
    if (svg.empty()) {
      svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
  
      // Title
      svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(field.replaceAll("_", " "));
  
      // Group for bars
      svg.append("g").attr("class", "bars-group");
  
      // Group for gridlines
      svg.append("g").attr("class", "gridlines").attr("transform", `translate(${margin.left},0)`);
  
      // Group for y-axis
      svg.append("g").attr("class", "y-axis").attr("transform", `translate(${margin.left},0)`);
    }
  
    // Update title text
    svg.select(".chart-title").text(field.replaceAll("_", " "));
  
    const x = d3.scaleBand()
      .domain(categories)
      .range([margin.left, width - margin.right])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(counts, d => d.value)]).nice()
      .range([height - margin.bottom, margin.top]);
    
  
    // Gridlines with transition
    const yAxisGrid = d3.axisLeft(y)
      .ticks(5)
      .tickSize(-width + margin.left + margin.right)
      .tickFormat("");
  
    svg.select(".gridlines")
      .transition()
      .duration(500)
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "2,2");
  
    // Y-axis with percentage/digit formatting and transition
    const yAxis = d3.axisLeft(y).ticks(5);
    if (showProportion) yAxis.tickFormat(d3.format(".0%"));
    else yAxis.tickFormat(d3.format("d"));
  
    svg.select(".y-axis")
      .transition()
      .duration(500)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "10px");
  
    const color = d3.scaleOrdinal()
      .domain(categories)
      .range(colors);
  
    // DATA JOIN for bars
    const bars = svg.select(".bars-group")
      .selectAll("rect")
      .data(counts, d => d.category);
  
    // EXIT old bars
    bars.exit()
      .transition()
      .duration(300)
      .attr("y", y(0))
      .attr("height", 0)
      .remove();
      
    // ENTER new bars
    bars.enter()
      .append("rect")
      .attr("x", d => x(d.category))
      .attr("width", x.bandwidth())
      .attr("y", y(0))
      .attr("height", 0)
      .attr("fill", d => color(d.category))
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(showProportion
            ? `${d.category}: ${(d.value * 100).toFixed(1)}%<br>(${d.raw}/${d.total})`
            : `${d.category}: ${d.value} entries`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"))
      .merge(bars) // ENTER + UPDATE
      .transition()
      .duration(500)
      .attr("x", d => x(d.category))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.value))
      .attr("height", d => y(0) - y(d.value))
      .attr("fill", d => color(d.category));
  }
  