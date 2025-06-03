//GLOBAL VARIABLES
let weather_type = null, location_type = null, incident_type = null, distance = null;
let filteredData;
let hasRenderedUI = false; // Track if toggles/buttons were rendered
// Toggle event listener
let weatherTog, locationTog, incidentTypeTog;


const prompts = {
    Weather: "(Weather) It was a ...",
    Location: "(Location) You are ...",
    Incident_Type: "SUDDENLY you",
};

let scenario; // Store scenario.json contents globally
let fullData = []; // Global to store all CSV rows

// Load JSON once on page load
fetch('scenario.json')
    .then(response => response.json())
    .then(data => {
        scenario = data;

        //group
        grouped = {};
        scenario.forEach(item => {
            const group = item["wrapper-id"];
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(item);
        });

        renderButtonsOnly(); // Now safe to call
    })
    .catch(error => console.error('Failed to load scenario.json:', error));

// Load CSV when page loads
d3.csv("../data/emergency_service_routing_with_timestamps.csv").then(data => {
    // Convert numeric fields
    data.forEach(d => {
        d.Distance_to_Incident = +d.Distance_to_Incident;
        d.Response_Time = +d.Response_Time;
    });
    fullData = data;
    })
    .catch(error => console.error("CSV Load Error:", error));


// FUNCTIONS
function renderButtonsOnly() {
    const container = document.getElementById('scenario-container');

    Object.entries(grouped).forEach(([wrapperId, items]) => {
        const section = document.createElement('div');
        section.className = 'scenario-button';
        section.id = wrapperId;

        const promptText = document.createElement('h3');
        promptText.textContent = prompts[wrapperId] || "Choose an option:";
        section.appendChild(promptText);

        items.forEach(({ "button-id": buttonId, image, text, alt }) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'button-wrapper';

            const button = document.createElement('button');
            button.id = buttonId;

            const img = document.createElement('img');
            img.src = image;
            img.alt = alt;

            button.appendChild(img);
            button.append(text);
            wrapper.appendChild(button);
            section.appendChild(wrapper);

            button.addEventListener('click', () => {
                const allButtons = section.querySelectorAll('button');
                if (!button.classList.contains('selected')) {
                    allButtons.forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');
                    updateSelection(wrapperId, buttonId);
                }                
            });
        });

        container.appendChild(section);
    });
}    

function renderTogglesOnly() {
    if (hasRenderedUI) return;
    hasRenderedUI = true;

    const toggleWrapper = document.getElementById('toggles-wrapper');

    Object.entries(grouped).forEach(([wrapperId, items]) => {
        const container = document.createElement('div');
        container.className = 'toggle-container';

        const label = document.createElement('label');
        label.setAttribute('for', `toggle-${wrapperId}`);
        label.textContent = `${wrapperId}:`;

        const select = document.createElement('select');
        select.id = `toggle-${wrapperId}`;

        // Determine pre-selected value based on global variable
        let selectedValue;
        switch (wrapperId) {
            case 'Weather':
                selectedValue = weather_type;
                break;
            case 'Location':
                selectedValue = location_type;
                break;
            case 'Incident':
            case 'Incident_Type':
                selectedValue = incident_type;
                break;
        }

        items.forEach(({ "button-id": buttonId }) => {
            const option = document.createElement('option');
            option.value = buttonId;
            option.textContent = buttonId;
            if (buttonId === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Select the corresponding button in the UI too
        const selectedButton = document.getElementById(selectedValue);
        if (selectedButton) selectedButton.classList.add('selected');

        select.addEventListener('change', () => {
            const section = document.getElementById(wrapperId);
            const allButtons = section.querySelectorAll('button');
            allButtons.forEach(btn => btn.classList.remove('selected'));

            const selectedId = select.value;
            const button = document.getElementById(selectedId);
            if (button) button.classList.add('selected');

            updateSelection(wrapperId, selectedId);
        });

        container.appendChild(label);
        container.appendChild(select);
        toggleWrapper.appendChild(container);
    });
}

function updateSelection(wrapperId, newVal) {
    switch (wrapperId) {
        case 'Weather':
            weather_type = newVal;
            break;
        case 'Location':
            location_type = newVal;
            break;
        // case 'Incident':
        case 'Incident_Type':
            incident_type = newVal;
            break;
    }
    // filterAndPlot();
    // console.log(`${wrapperId} updated to`, newVal);
}

function updateDistance(value) {
    let numericValue = parseInt(value, 10);

    if (isNaN(numericValue)) {
        distanceValue.textContent = '1';
        distance = 1;
        return;
    }

    if (numericValue < 1) numericValue = 1;
    if (numericValue > 50) numericValue = 50;

    // Set both inputs to same value
    distance = numericValue;
    numberInput.value = distance;
    sliderInput.value = distance;

    // Update the display
    distanceValue.textContent = numericValue;
    // console.log("Distance set to:", numericValue);
}

function renderWarning() {
    let missing = [];

    if (weather_type == null) missing.push("weather");
    if (location_type == null) missing.push("location");
    if (incident_type == null) missing.push("incident type");
    if (distance == null) missing.push("distance");

    const warning = document.getElementById('warning');
    warning.style.display = 'flex';
    warning.textContent = `Please select option(s) for: ${missing.join(', ')}`;
    // console.warn("Missing inputs:", missing);
}

function filterData() {
    // console.log("filterData STARTED");
    // console.log(`weather_type = ${weather_type}`);
    // console.log(`location_type = ${location_type}`);
    // console.log(`incident_type = ${incident_type}`);

    // Mapping lowercase inputs to dataset-friendly values
    const weatherMap = {
        clear: "Clear",
        rainy: "Rainy",
        stormy: "Stormy"
    };

    const locationMap = {
        urban: "Urban",
        suburban: "Suburban",
        rural: "Rural"
    };

    const incidentMap = {
        "cardiac-arrest": "Cardiac Arrest",
        fire: "Fire",
        accident: "Accident",
        other: "Other"
    };

    // Apply mapping
    const weatherMatch = weatherMap[weather_type];
    const locationMatch = locationMap[location_type];
    const incidentMatch = incidentMap[incident_type];

    if (!weatherMatch || !locationMatch || !incidentMatch) {
        // console.warn("Invalid mapping in filterData");
        filteredData = [];
        return filteredData;
    }

    filteredData = fullData.filter(row =>
        row.Weather_Condition === weatherMatch &&
        row.Region_Type === locationMatch &&
        row.Incident_Type === incidentMatch
    );

    // console.log(`Filtered to ${filteredData.length} rows`);
    return filteredData;
}

function filterAndPlot() {
    // console.log("filterAndPlot STARTED")
    // console.log("CALLING filterData")
    const data = filterData();
    if (data.length === 0) {
        document.getElementById("chart").innerHTML = "<p>No data matches this scenario.</p>";
        return;
    }
    // console.log("CALLING renderScatterplot")
    renderScatterplot(data);
}

function renderScatterplot(data) {
    // Clear old plot
    d3.select("#chart").select("svg").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Distance_to_Incident)]).nice()
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Response_Time)]).nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(8));

    svg.append("g")
        .call(d3.axisLeft(y).ticks(8));

    // Scatter points
    svg.append("g")
        .selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Distance_to_Incident))
        .attr("cy", d => y(d.Response_Time))
        .attr("r", 4)
        .style("fill", "#1f77b4")
        .style("opacity", 0.7);

    // Linear regression (least squares)
    const n = data.length;
    const sumX = d3.sum(data, d => d.Distance_to_Incident);
    const sumY = d3.sum(data, d => d.Response_Time);
    const sumXY = d3.sum(data, d => d.Distance_to_Incident * d.Response_Time);
    const sumX2 = d3.sum(data, d => d.Distance_to_Incident * d.Distance_to_Incident);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y));

    const lineData = [
        { x: d3.min(data, d => d.Distance_to_Incident), y: null },
        { x: d3.max(data, d => d.Distance_to_Incident), y: null }
    ];
    lineData[0].y = slope * lineData[0].x + intercept;
    lineData[1].y = slope * lineData[1].x + intercept;

    svg.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Prediction for selected distance
    const predictedTime = slope * distance + intercept;
    svg.append("circle")
        .attr("cx", x(distance))
        .attr("cy", y(predictedTime))
        .attr("r", 6)
        .style("fill", "red");

    svg.append("text")
        .attr("x", x(distance) + 8)
        .attr("y", y(predictedTime) - 10)
        .text(`Predicted: ${predictedTime.toFixed(1)} min`)
        .style("fill", "red")
        .style("font-size", "12px");

    // Axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .style("text-anchor", "middle")
        .text("Distance to Incident (km)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .text("Response Time (min)");
}

//EVENT LISTENERs

// DISTANCE slider and input 
const numberInput = document.querySelector('#distance-input-wrapper #distance-input');
const sliderInput = document.querySelector('#distance-input-slider #distance-input');
const distanceValue = document.getElementById('distance-value');
// Listen to number input changes
numberInput.addEventListener('input', (e) => {
    updateDistance(e.target.value);
    filterAndPlot();
});
// Listen to slider input changes
sliderInput.addEventListener('input', (e) => {
    updateDistance(e.target.value);
    filterAndPlot();
});

// plot-button event listener 
document.getElementById('plot').addEventListener('click', () => {
    console.log("plot has been clicked")
    if (weather_type == null || location_type == null || incident_type == null || distance == null) {
        renderWarning();
        return;
    }
    if (!hasRenderedUI) {
        console.log(`hasRenderedUI = ${hasRenderedUI}`)
        renderTogglesOnly(scenario);
    }
    document.getElementById('chart').style.display = 'flex';
    document.getElementById('warning').style.display = 'none';
    // console.log("CALLING filterAndPlot()")
    filterAndPlot(scenario);
    
    // adding event listener
    weatherTog = document.querySelector('#toggles-wrapper #toggle-Weather');
    locationTog = document.querySelector('#toggles-wrapper #toggle-Location');
    incidentTypeTog = document.querySelector('#toggles-wrapper #toggle-Incident_Type');
    weatherTog.addEventListener('input', (e) => {
        console.log(e.target.value)
        updateSelection("Weather", e.target.value);
        filterAndPlot();
    });
    locationTog.addEventListener('input', (e) => {
        console.log(e.target.value)
        updateSelection("Location", e.target.value);
        filterAndPlot();
    });
    incidentTypeTog.addEventListener('input', (e) => {
        console.log(e.target.value)
        updateSelection("Incident_Type", e.target.value);
        filterAndPlot();
    });
    return;
});