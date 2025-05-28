console.log("JS IS RUNNING");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// svg
const svg = d3.select("#scatter-plot")
  .attr("width", 800)
  .attr("height", 500);

const margin = { top: 30, right: 30, bottom: 50, left: 60 },
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const chartGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let allData = [];

// json
fetch("emergency_data.json")
  .then(res => res.json())
  .then(data => {
    allData = data;
    applyFilters();

    // event listeners for the dropdowns
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
           (!filters["region-type"] || filters["region-type"] === "np" || Region?.toLowerCase() === filters["region-type"]) &&
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
