
const margin = { top: 100, right: 400, bottom: 100, left: 420 };

// Getting dimensions for the chart
const container = d3.select("#chart");
if (!container.node()) {
  throw new Error("No container element with id #chart found in the DOM.");
}
const containerRect = container.node().getBoundingClientRect();
const width = containerRect.width - margin.left - margin.right;
const height = containerRect.height - margin.top - margin.bottom;

// Create the main scalable vector graphisc (SVG) canvas and a group element for the chart area
const svg = container
  .append("svg")
  .attr("width", containerRect.width)
  .attr("height", containerRect.height)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Create tooltips
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Load CSV data
fetch('Motor_Vehicle_Collisions_2020-2024.csv')
  .then(response => {
    if (!response.ok) throw new Error("Network response was not ok");
    return response.text();
  })
  .then(text => {
    const csvData = d3.csvParse(text);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Get vehicle types from CSV 
    const vehicleTypeCounts = d3.rollup(csvData, v => v.length, d => d['VEHICLE TYPE CODE 1']);
    const sortedVehicleTypes = Array.from(vehicleTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(d => d[0]);

    // Process collision data
    const monthlyData = [];
    csvData.forEach(d => {
      const monthNum = parseInt(d['MONTH'], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        monthlyData.push({
          month: monthNum,
          monthName: months[monthNum - 1],
          vehicleType: d['VEHICLE TYPE CODE 1'],
          year: parseInt(d['YEAR'], 10),
          count: 1
        });
      }
    });

    // Aggregate data by vehicle type and month (sum across years)
    const aggregatedData = d3.rollup(
      monthlyData,
      v => v.length, // Count the collisions
      d => d.vehicleType,
      d => d.month
    );

    
    const processedData = [];
    sortedVehicleTypes.forEach(vehicleType => {
      const vehicleData = months.map((monthName, i) => {
        const count = aggregatedData.get(vehicleType)?.get(i + 1) || 0;
        return { month: i + 1, monthName, count };
      });
      processedData.push({ vehicleType, values: vehicleData });
    });

    initializeChart();

    function initializeChart() {
      // scaling the chart
      const xScale = d3.scaleLinear().domain([1, 12]).range([0, width]);
      const maxCollisions = d3.max(processedData.flatMap(d => d.values.map(v => v.count))) || 1;
      // Initialize zoomed out so that everything is visible
      let yScale = d3.scaleLinear().domain([0, maxCollisions]).range([height, 0]);

      // color scale
      const vibrantColors = ["#33b3e5", "#ff4444", "#98e643", "#ffbb33", "#aa66cc", "#43e698", "#e6435d", "#5de6e6"];
      const color = d3.scaleOrdinal().domain(sortedVehicleTypes).range(vibrantColors);

      // images of the top 8 vehicles
      const vehicleImageMap = {
        'Sedan': 'sedan.png',
        'Station Wagon/Sport Utility Vehicle': 'station_wagon.png',
        'Taxi': 'taxi.png',
        'Pick-up Truck': 'pickup_truck.png',
        'Box Truck': 'box_truck.png',
        'Bus': 'bus.png',
        'Bike': 'bike.png',
        'Motorcycle': 'motorcycle.png'
      };

      // Add axes
      const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)
          .tickValues(d3.range(1, 13))
          .tickFormat(d => months[d - 1])
        );

      const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale));

       // Title 
      svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Monthly Collision Patterns (2020-2024 Total) by Vehicle Type in NYC");

      // Labels 
      svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .attr("y", -65)
        .attr("x", 0 - height / 2)
        .text("Collision Count");

      svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 30)
        .attr("text-anchor", "middle")
        .text("Month");

      // Zoom controls (right)
      const zoomControls = svg.append("g").attr("transform", `translate(${width + 40}, 0)`);
      zoomControls.append("rect").attr("width", 280).attr("height", 50).attr("fill", "white").attr("stroke", "gray").attr("stroke-width", 1).attr("rx", 8);
      zoomControls.append("text").attr("x", 10).attr("y", 15).attr("font-size", "10px").attr("font-weight", "bold").text("Y-Axis Zoom");

      const sliderWidth = 260, sliderHeight = 6, sliderX = 10, sliderY = 30;
      zoomControls.append("rect").attr("x", sliderX).attr("y", sliderY).attr("width", sliderWidth).attr("height", sliderHeight).attr("fill", "#ddd");

      
      const zoomHandle = zoomControls.append("circle")
        .attr("cx", sliderX)
        .attr("cy", sliderY + sliderHeight / 2)
        .attr("r", 8).attr("fill", "#333").attr("stroke", "white").attr("stroke-width", 2)
        .style("cursor", "pointer")
        .call(d3.drag().on("drag", function(event) {
          let newX = event.x;
          newX = Math.max(sliderX, Math.min(sliderX + sliderWidth, newX));
          zoomHandle.attr("cx", newX);

          const normalizedPos = (newX - sliderX) / sliderWidth; 
          const zoomFactor = 1 + normalizedPos * 4; 
          const newMax = Math.max(1, maxCollisions / zoomFactor); 
          yScale = d3.scaleLinear().domain([0, newMax]).range([height, 0]);

          updateChartScale();
        }));

      const zoomLabel = zoomControls.append("text").attr("x", 10).attr("y", 45).attr("font-size", "8px").attr("fill", "#666")
        .text(`${(maxCollisions / yScale.domain()[1]).toFixed(1)}x`);

      // Line generator
      const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

      
      const lineGroups = [];

      processedData.forEach((vehicleGroup, index) => {
        setTimeout(() => {
          const group = svg.append("g").attr("class", `vehicle-group-${index}`);
          // Path (bind numeric array via datum)
          const path = group.append("path")
            .datum(vehicleGroup.values)
            .attr("d", line)
            .attr("stroke", color(vehicleGroup.vehicleType))
            .attr("stroke-width", 3)
            .attr("fill", "none")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .style("opacity", 0)
            .style("cursor", "pointer")
            .on("mouseover", () => highlightVehicle(vehicleGroup.vehicleType))
            .on("mouseout", resetHighlights);

          lineGroups.push(group);

        
          const totalLength = path.node().getTotalLength();
          path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .style("opacity", 1)
            .transition()
            .duration(3000)
            .delay(index * 200)
            .attr("stroke-dashoffset", 0)
            .on("end", () => {
              // once the entry animation finishes, clear dasharray so updates are 'clean'
              path.attr("stroke-dasharray", null);
            });

           // Add interactive circles
          const circles = group.selectAll("circle.point")
            .data(vehicleGroup.values)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.month))
            .attr("cy", d => yScale(d.count))
            .attr("r", 0)
            .attr("fill", color(vehicleGroup.vehicleType))
            .style("cursor", "pointer")
            .on("mouseover", function(event, point) {
              highlightVehicle(vehicleGroup.vehicleType);
              tooltip.transition().duration(200).style("opacity", 1);
              tooltip.html(`
                <strong>${vehicleGroup.vehicleType}</strong><br/>
                Month: ${point.monthName}<br/>
                Collisions: ${point.count}
              `).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 30) + "px");
            })
            .on("mousemove", function(event) {
              tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
              resetHighlights();
              tooltip.transition().duration(200).style("opacity", 0);
            });

          
          circles.transition().duration(300).delay(3000 + index * 120).attr("r", 5);
        }, index * 120);
      });

      // Left Legend with vehicle names and their colors
      const legend = svg.append("g").attr("transform", `translate(${-margin.left + 40}, 0)`);
      legend.append("rect").attr("class", "panel").attr("width", 270).attr("height", 360).attr("rx", 8);
      legend.append("text").attr("class", "panel-title").attr("x", 10).attr("y", 30).text("Vehicle Types");
      legend.append("text").attr("class", "panel-subtitle").attr("x", 10).attr("y", 55).text("Hover to highlight");

      sortedVehicleTypes.forEach((vehicleType, i) => {
        const legendGroup = legend.append("g").attr("class", `legend-item legend-item-${i}`).style("cursor", "pointer");
        legendGroup.append("line").attr("x1", 10).attr("y1", 75 + i * 30).attr("x2", 25).attr("y2", 75 + i * 30).attr("stroke", color(vehicleType)).attr("stroke-width", 3);
        legendGroup.append("text").attr("x", 35).attr("y", 80 + i * 30).text(vehicleType);
        // highlight the vehicle when hovered over
        legendGroup.append("rect").attr("x", 5).attr("y", 65 + i * 30).attr("width", 190).attr("height", 30).attr("fill", "transparent")
          .on("mouseover", () => highlightVehicle(vehicleType))
          .on("mouseout", resetHighlights);
      });

      const infoBox = svg.append("g").attr("transform", `translate(${width + 40}, 80)`);
      infoBox.append("rect").attr("class", "panel").attr("width", 300).attr("height", 360).attr("rx", 8);
      infoBox.append("text").attr("class", "panel-title").attr("x", 10).attr("y", 30).text("Collision Stats");
      infoBox.append("text").attr("class", "panel-subtitle").attr("x", 10).attr("y", 55).text("Sum Across 5 Years");
      // Right Info Box (Positioned on the right)
      const infoContent = infoBox.append("text").attr("class", "info-content").attr("x", 10).attr("y", 85);
      const infoDetails = infoBox.append("text").attr("class", "info-details").attr("x", 10).attr("y", 110);
      // Right Info Box (Positioned on the right)
      const vehicleImage = infoBox.append('image').attr('id', 'vehicle-image').attr('x', 10).attr('y', 100).attr('width', 290).attr('height', 290).style('opacity', 0).attr('href', '').attr('xlink:href', '');

      // Functions for highlighting
      function highlightVehicle(vehicleType) {
        const index = sortedVehicleTypes.indexOf(vehicleType);
        lineGroups.forEach((group, groupIndex) => {
          group.style("opacity", groupIndex === index ? 1 : 0.15);
        });

        const vehicleData = processedData.find(d => d.vehicleType === vehicleType);
        const totalCollisions = d3.sum(vehicleData.values, v => v.count);
        const avgCollisions = Math.round(totalCollisions / 12);
        const peakMonth = vehicleData.values.reduce((max, curr) => (curr.count > max.count ? curr : max), vehicleData.values[0]);

        infoContent.text(`${totalCollisions.toLocaleString()} total`);
        infoDetails.selectAll("*").remove();

        const avgLine = infoDetails.append('tspan').attr('x', 10).attr('dy', '1.5em');
        avgLine.append('tspan').style('font-weight', '700').text('Avg/month: ');
        avgLine.append('tspan').style('font-weight', '400').text(avgCollisions.toLocaleString());

        const peakLine = infoDetails.append('tspan').attr('x', 10).attr('dy', '2em');
        peakLine.append('tspan').style('font-weight', '700').text('Peak: ');
        peakLine.append('tspan').style('font-weight', '400').text(`${peakMonth.monthName} (${peakMonth.count.toLocaleString()})`);

        // Show and update the vehicle images
        const imageName = vehicleImageMap[vehicleType];
        if (imageName) {
          const url = `images/${imageName}`;
          d3.select('#vehicle-image').attr('href', url).attr('xlink:href', url).transition().duration(200).style('opacity', 1);
        }
      }

      function resetHighlights() {
        lineGroups.forEach(group => group.style("opacity", 1));
        const totalAllCollisions = d3.sum(processedData.flatMap(d => d.values.map(v => v.count)));
        infoContent.text(`${totalAllCollisions.toLocaleString()} total (all types)`);
        infoDetails.selectAll("*").remove();
        processedData.forEach((vehicleGroup, idx) => {
          const total = d3.sum(vehicleGroup.values, v => v.count);
          const line = infoDetails.append('tspan').attr('x', 10).attr('dy', idx === 0 ? '1.5em' : '1.8em');
          line.append('tspan').style("font-weight", "700").text(`${vehicleGroup.vehicleType}: `);
          line.append('tspan').style("font-weight", "400").text(total.toLocaleString());
        });
        // Hide the vehicle image
        d3.select('#vehicle-image').transition().duration(200).style('opacity', 0);
      }

      // Function to update chart scale when zooming
      function updateChartScale() {
        
        yAxis.transition().duration(200).call(d3.axisLeft(yScale));

        // Update all lines and circles
        lineGroups.forEach((group, index) => {
          const vehicleGroup = processedData[index];

          
          group.interrupt();

          // Update the line path
          group.select("path")
            .datum(vehicleGroup.values)
            .attr("d", line);

          // Update the circles' positions
          group.selectAll("circle.point")
            .data(vehicleGroup.values)
            .transition()
            .duration(200)
            .attr("cx", d => xScale(d.month))
            .attr("cy", d => yScale(d.count));
        });

        // Update zoom label
        const currentZoomFactor = (maxCollisions / yScale.domain()[1]) || 1;
        zoomLabel.text(`${currentZoomFactor.toFixed(1)}x`);
      }

      
      resetHighlights();
    } 
  })
  .catch(error => {
    console.error('Error loading CSV:', error);
    svg.append("text")
      .attr("x", 500)
      .attr("y", 300)
      .attr("text-anchor", "middle")
      .style("fill", "red")
      .style("font-size", "18px")
      .text("Error loading collision data");
  });
