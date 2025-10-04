    const data = rawData
      .map(d => {
        const date = new Date(d['CRASH DATE']);
        if (isNaN(date)) return null;
        return {
          year: date.getFullYear(),
          month: months[date.getMonth()],
          vehicleType: d['VEHICLE TYPE CODE 1'] || "Unknown",
          factor: d['CONTRIBUTING FACTOR VEHICLE 1'] || "Unknown"
        };
      })
      .filter(d => d && d.year >= 2021 && d.year <= 2025);

    const nestedData = d3.rollup(
      data,
      v => v.length,
      d => d.year,
      d => d.month
    );

    const years = Array.from(nestedData.keys()).sort();

    const dataForLines = [];

    years.forEach(year => {
      months.forEach(month => {
        const count = nestedData.get(year)?.get(month) || 0;

        const matchingRecords = data.filter(d => d.year === year && d.month === month);

        let vehicleType = "N/A", factor = "N/A";

        if (matchingRecords.length > 0) {
          const vehicleCounts = d3.rollup(matchingRecords, v => v.length, d => d.vehicleType);
          vehicleType = Array.from(vehicleCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];

          const factorCounts = d3.rollup(matchingRecords, v => v.length, d => d.factor);
          factor = Array.from(factorCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
        }

        dataForLines.push({
          year,
          month,
          count,
          vehicleType,
          factor
        });
      });
    });