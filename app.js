document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOM Loaded. Initializing app...");

    // --- 1. GET HTML ELEMENTS ---
    const fileInput = document.getElementById('csvFileInput');
    const sampleSelect = document.getElementById('sampleSelector');
    const targetSelect = document.getElementById('targetSelector');
    const downloadBtn = document.getElementById('downloadPlotBtn');
    const plotTypeRadios = document.querySelectorAll('input[name="plotType"]');
    const plotTypeAvg = document.getElementById('plotTypeAvg');
    const showStdDevCheck = document.getElementById('showStdDev');
    const showCtCheck = document.getElementById('showCt');
    const ctThresholdInput = document.getElementById('ctThreshold');
    const filterByCtCheck = document.getElementById('filterByCtCheck');
    const plotWidthInput = document.getElementById('plotWidthInput');
    const plotHeightInput = document.getElementById('plotHeightInput');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const yMinInput = document.getElementById('yMinInput');
    const yMaxInput = document.getElementById('yMaxInput');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const plotDiv = document.getElementById('plotDiv');
    const tableDiv = document.getElementById('summaryTableDiv');
    const welcomeBoard = document.getElementById('welcomeBoard');
    const mainContent = document.getElementById('mainContent');
    const linearityTargetSelect = document.getElementById('linearityTargetSelect');
    const linearityPlotDiv = document.getElementById('linearityPlotDiv');
    const downloadLinearityPlotBtn = document.getElementById('downloadLinearityPlotBtn');
    const precisionPlotRadios = document.querySelectorAll('input[name="precisionPlotType"]');
    const precisionPlotDiv = document.getElementById('precisionPlotDiv');
    const downloadPrecisionPlotBtn = document.getElementById('downloadPrecisionPlotBtn');
    const precisionTableDiv = document.getElementById('precisionTableDiv');
    const downloadPrecisionTableBtn = document.getElementById('downloadPrecisionTableBtn');

    let fullData = [];
    let allSummaryData = []; // Store summary data globally
    let currentFilteredSummaryData = []; // Store filtered summary data for precision table download

    // --- 2. ADD EVENT LISTENERS ---
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            console.log("DEBUG: File input changed.");
            const file = event.target.files[0]; if (!file) return;
            Papa.parse(file, {
                header: true, skipEmptyLines: true, dynamicTyping: true, comments: "#",
                complete: (results) => {
                    console.log("DEBUG: CSV Parsing complete. Initial Rows:", results.data?.length ?? 'N/A');
                    console.log("DEBUG: results.meta:", results.meta);
                    console.log("DEBUG: First few raw rows:", results.data?.slice(0, 5));

                    // Filter more strictly for essential columns AND ensure they are not null/undefined
                    fullData = (results.data || []).filter(row =>
                        row && typeof row === 'object' &&
                        row.Well != null &&
                        row['Cycle Number'] != null && typeof row['Cycle Number'] === 'number' && isFinite(row['Cycle Number']) &&
                        row.dRn != null && typeof row.dRn === 'number' && isFinite(row.dRn) &&
                        row.Sample != null && String(row.Sample).trim() !== '' &&
                        row.Target != null && String(row.Target).trim() !== ''
                    );
                    console.log("DEBUG: Filtered Valid Data Rows (fullData):", fullData.length);
                    if (fullData.length === 0) {
                        const expectedHeaders = ["Well", "Cycle Number", "dRn", "Sample", "Target"];
                        const foundHeaders = results.meta?.fields || [];
                        const missingHeaders = expectedHeaders.filter(h => !foundHeaders.includes(h));
                        alert(`Could not parse valid data rows. Please check file format.\nNeeded headers: Well, Cycle Number, dRn, Sample, Target.\nDetected headers: ${foundHeaders.join(', ') || 'None'}\nMissing headers: ${missingHeaders.join(', ') || 'None'}\nEnsure required columns have valid numeric data (Cycle Number, dRn) and non-empty text (Sample, Target).`);
                        return;
                    }
                    populateSelectors(fullData);
                    populateLinearitySelectors(fullData);
                    [sampleSelect, targetSelect, downloadBtn].forEach(el => { if (el) el.disabled = false; });
                    if (welcomeBoard) welcomeBoard.style.display = 'none';
                    if (mainContent) mainContent.style.display = 'block';
                    if (!ctThresholdInput.value || isNaN(parseFloat(ctThresholdInput.value))) {
                        ctThresholdInput.value = 1000;
                        console.log("DEBUG: Resetting threshold to default 1000");
                    }
                    console.log("DEBUG: Triggering initial updateOutputs from file load...");
                    updateOutputs('File Load');
                },
                error: (err, file) => {
                    console.error("DEBUG: CSV Parsing Error:", err, "File:", file?.name);
                    alert("Error reading file: " + err.message + ". Check console for details.");
                }
            });
        });
    } else {
        console.error("DEBUG: fileInput not found.");
    }

    // Generic control listeners (with defensive checks)
    [
        sampleSelect, targetSelect, showStdDevCheck, showCtCheck,
        ctThresholdInput, filterByCtCheck, plotWidthInput,
        plotHeightInput, fontSizeInput, yMinInput, yMaxInput
    ].forEach(el => {
        if (!el) {
            // Note: do not spam console — just flag missing controls
            return;
        }
        const eventType = (el.type === 'number' || el.tagName === 'SELECT') ? 'input' : 'change';
        el.addEventListener(eventType, (e) => {
            const controlId = e.target.id || e.target.name;
            const controlValue = (e.target.type === 'checkbox') ? e.target.checked : e.target.value;
            console.log(`DEBUG: Control Changed: ${controlId}, Value: ${controlValue}`);

            if (el.name === 'plotType') {
                if (showStdDevCheck && plotTypeAvg) {
                    showStdDevCheck.disabled = !plotTypeAvg.checked;
                    if (!plotTypeAvg.checked) { showStdDevCheck.checked = false; }
                }
            }
            updateOutputs(`Control Change: ${controlId}`);
        });
    });

    // Plot type radios extra guard
    if (plotTypeRadios) {
        plotTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                console.log(`DEBUG: Plot Type Radio changed: ${radio.value}`);
                if (showStdDevCheck && plotTypeAvg) {
                    showStdDevCheck.disabled = !plotTypeAvg.checked;
                    if (!plotTypeAvg.checked) showStdDevCheck.checked = false;
                }
            });
        });
    }

    // download main plot
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            try {
                const plotWidth = plotDiv ? plotDiv.clientWidth : 1000;
                const plotHeight = plotDiv ? plotDiv.clientHeight : 600;
                Plotly.downloadImage('plotDiv', { format: 'png', width: plotWidth, height: plotHeight, filename: `qPCR_Plot_Export.png` });
            } catch (e) {
                console.error("Error downloading main plot:", e);
                alert("Unable to download plot. Check console.");
            }
        });
    }

    // tab switching
    if (tabButtons && tabButtons.length > 0 && tabContents) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const activeTab = document.getElementById(button.dataset.tab);
                if (activeTab) activeTab.classList.add('active');

                if (button.dataset.tab === 'linearityTab') { renderLinearityPlot(); }
                else if (button.dataset.tab === 'precisionTab') { renderPrecisionPlot(); renderPrecisionSummaryTable(); }
                else if (button.dataset.tab === 'plotTab') { updateOutputs('Tab Switch to plotTab'); }
            });
        });
    }


// --- Ensure showStdDev is correctly enabled only for Average plot type and force re-render on change ---

// helper to set showStdDev availability based on current plot type
function syncShowStdDevState() {
    try {
        const checked = document.querySelector('input[name="plotType"]:checked');
        const plotType = checked ? checked.value : 'average';
        if (showStdDevCheck) {
            // enable only for average mode
            showStdDevCheck.disabled = (plotType !== 'average');
            if (plotType !== 'average') showStdDevCheck.checked = false;
        }
    } catch (e) {
        console.warn('Could not sync showStdDev state', e);
    }
}

// run once on startup to set correct initial state
syncShowStdDevState();

// attach change listeners to the plot type radios so they update UI and re-render immediately
if (plotTypeRadios && plotTypeRadios.length > 0) {
    plotTypeRadios.forEach(radio => {
        radio.removeEventListener?.('change', () => {}); // defensive no-op (safe if removeEventListener not supported)
        radio.addEventListener('change', (e) => {
            console.log('DEBUG: plotType changed ->', e.target.value);
            syncShowStdDevState();      // enable/disable stddev checkbox
            updateOutputs('plotType change'); // re-render using the new plot type
        });
    });
}





    // plotly relayout (drag line) - guarded
    if (plotDiv && typeof plotDiv.on === 'function') {
        plotDiv.on('plotly_relayout', (eventData) => {
            const shapeKey = Object.keys(eventData).find(key => key.startsWith('shapes[') && key.endsWith('.y0'));
            if (shapeKey && ctThresholdInput) {
                ctThresholdInput.value = parseFloat(eventData[shapeKey]).toFixed(0);
                updateOutputs("drag");
            }
        });
    }

    if (linearityTargetSelect) linearityTargetSelect.addEventListener('change', renderLinearityPlot);
    if (downloadLinearityPlotBtn) downloadLinearityPlotBtn.addEventListener('click', () => {
        try {
            Plotly.downloadImage(linearityPlotDiv, { format: 'png', width: 1000, height: 600, filename: `linearity_plot.png` });
        } catch (e) { console.error("Error downloading linearity plot:", e); alert("Unable to download linearity plot."); }
    });

    if (precisionPlotRadios) precisionPlotRadios.forEach(radio => { radio.addEventListener('change', renderPrecisionPlot); });
    if (downloadPrecisionPlotBtn) downloadPrecisionPlotBtn.addEventListener('click', () => {
        try { Plotly.downloadImage(precisionPlotDiv, { format: 'png', width: 1000, height: precisionPlotDiv.clientHeight || 600, filename: `precision_plot.png` }); }
        catch (e) { console.error("Error downloading precision plot:", e); alert("Unable to download precision plot."); }
    });

    // Download precision table handler (uses currentFilteredSummaryData)
    if (downloadPrecisionTableBtn) {
        downloadPrecisionTableBtn.addEventListener('click', () => {
            if (!currentFilteredSummaryData || currentFilteredSummaryData.length === 0) {
                alert('No precision/summary data available to download. Select Samples/Targets and ensure threshold yields Ct values.');
                return;
            }
            downloadDataAsCSV(currentFilteredSummaryData, 'precision_summary.csv');
        });
    }

    // --- 3. HELPER FUNCTIONS ---

    function populateSelectors(data) {
        console.log("DEBUG: populateSelectors called with data length:", data?.length ?? 0);
        try {
            if (!sampleSelect || !targetSelect) {
                console.error("DEBUG: Sample or Target select element not found in populateSelectors!");
                return;
            }
            const allSamples = [...new Set(data.map(row => row?.Sample))].filter(Boolean).sort();
            const allTargets = [...new Set(data.map(row => row?.Target))].filter(Boolean).sort();
            console.log("DEBUG: Unique Samples Found:", allSamples);
            console.log("DEBUG: Unique Targets Found:", allTargets);

            sampleSelect.innerHTML = '';
            if (allSamples.length === 0) {
                sampleSelect.add(new Option("No samples found", "", true, true));
                sampleSelect.disabled = true;
            } else {
                allSamples.forEach(sample => sampleSelect.add(new Option(sample, sample)));
                sampleSelect.disabled = false;
            }

            targetSelect.innerHTML = '';
            if (allTargets.length === 0) {
                targetSelect.add(new Option("No targets found", "", true, true));
                targetSelect.disabled = true;
            } else {
                allTargets.forEach(target => targetSelect.add(new Option(target, target)));
                targetSelect.disabled = false;
            }
            console.log("DEBUG: populateSelectors finished.");
        } catch (e) { console.error("Error populating selectors:", e); alert("Error processing Sample/Target names."); }
    }

    function populateLinearitySelectors(data) {
        console.log("DEBUG: populateLinearitySelectors called.");
        try {
            if (!linearityTargetSelect) {
                console.error("DEBUG: Linearity target select element not found!");
                return;
            }
            const allTargets = [...new Set(data.map(row => row?.Target))].filter(Boolean).sort();
            console.log("DEBUG: Linearity Targets Found:", allTargets);
            linearityTargetSelect.innerHTML = '';
            if (allTargets.length === 0) {
                linearityTargetSelect.add(new Option("No targets found", "", true, true));
                linearityTargetSelect.disabled = true;
            } else {
                allTargets.forEach(target => linearityTargetSelect.add(new Option(target, target)));
                linearityTargetSelect.disabled = false;
            }
        } catch (e) { console.error("Error populating linearity selectors:", e); }
    }

    function parseConcentration(name) {
        const s = String(name);
        try {
            if (s.includes('^')) {
                const parts = s.split('^');
                return Math.pow(parseFloat(parts[0]), parseFloat(parts[1]));
            }
            const num = parseFloat(s);
            return isNaN(num) ? null : num;
        } catch (e) { return null; }
    }

    function groupBy(array, key) {
        return array.reduce((result, currentValue) => {
            const groupKey = currentValue[key];
            if (!result.has(groupKey)) result.set(groupKey, []);
            result.get(groupKey).push(currentValue);
            return result;
        }, new Map());
    }

    function calculateStdDev(array) {
        if (!array || array.length < 2) return 0;
        const n = array.length;
        const mean = array.reduce((a, b) => a + b, 0) / n;
        const variance = array.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (n - 1);
        return Math.sqrt(variance);
    }

    function calculateAverageAndStdDev(groupedByCycle) {
        const cycles = [], means = [], sd_upper = [], sd_lower = [];
        const sortedCycles = [...groupedByCycle.keys()].sort((a, b) => a - b);
        for (const cycle of sortedCycles) {
            const dRnValues = groupedByCycle.get(cycle);
            if (dRnValues.length > 0) {
                const sum = dRnValues.reduce((a, b) => a + b, 0);
                const mean = sum / dRnValues.length;
                let stdDev = 0;
                if (dRnValues.length > 1) {
                    const variance = dRnValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (dRnValues.length - 1);
                    stdDev = Math.sqrt(variance);
                }
                cycles.push(cycle);
                means.push(mean);
                sd_upper.push(mean + stdDev);
                sd_lower.push(mean - stdDev);
            }
        }
        return { cycles, means, sd_upper, sd_lower };
    }

    function getReplicateCts(replicates, threshold) {
        const replicateCts = [];
        for (const replicateRows of replicates.values()) {
            replicateRows.sort((a, b) => a['Cycle Number'] - b['Cycle Number']);
            const crossingPoint = replicateRows.find(row => row['dRn'] > threshold);
            if (crossingPoint) replicateCts.push(crossingPoint['Cycle Number']);
        }
        return replicateCts;
    }

    function getReplicateCtData() {
        const threshold = parseFloat(ctThresholdInput.value);
        const selectedSamples = Array.from(sampleSelect.selectedOptions).map(opt => opt.value);
        const selectedTargets = Array.from(targetSelect.selectedOptions).map(opt => opt.value);
        let precisionData = [];
        for (const target of selectedTargets) {
            for (const sample of selectedSamples) {
                const summaryRow = allSummaryData.find(r => r.Sample == sample && r.Target === target);
                if (!summaryRow || summaryRow.MeanCt_raw === null) continue;
                const meanCt = summaryRow.MeanCt_raw;
                const data = fullData.filter(row => row.Sample == sample && row.Target === target);
                if (data.length === 0) continue;
                const replicates = groupBy(data, 'Well');
                const replicateCts = getReplicateCts(replicates, threshold);
                for (const ct of replicateCts) {
                    precisionData.push({ Sample: sample, Target: target, Replicate_Ct: ct, Mean_Ct: meanCt, Difference: ct - meanCt });
                }
            }
        }
        return precisionData;
    }

    function calculateGlobalSummaryData(threshold) {
        allSummaryData = [];
        if (fullData.length === 0) return;
        const allSamplesInFile = [...new Set(fullData.map(row => row.Sample))].filter(Boolean);
        const allTargetsInFile = [...new Set(fullData.map(row => row.Target))].filter(Boolean);
        for (const sample of allSamplesInFile) {
            for (const target of allTargetsInFile) {
                const data = fullData.filter(row => row.Sample == sample && row.Target === target);
                if (data.length === 0) continue;
                const replicates = groupBy(data, 'Well');
                const replicateCts = getReplicateCts(replicates, threshold);
                let mean = null, sd = 0, cv = 0, n = 0;
                if (replicateCts.length > 0) {
                    n = replicateCts.length;
                    mean = replicateCts.reduce((a, b) => a + b, 0) / n;
                    sd = calculateStdDev(replicateCts);
                    cv = (n > 1 && mean !== 0) ? (sd / mean) * 100 : 0;
                }
                allSummaryData.push({ Sample: sample, Target: target, N: n, MeanCt_raw: mean, MeanCt: mean ? mean.toFixed(2) : 'N/A', SdCt: mean ? sd.toFixed(2) : 'N/A', CV: mean ? cv.toFixed(2) : 'N/A' });
            }
        }
    }

    function downloadDataAsCSV(dataArray, filename = 'data.csv') {
        if (!dataArray || dataArray.length === 0) { alert('No data to download.'); return; }
        const keys = Object.keys(dataArray[0]);
        const csv = [keys.join(',')].concat(dataArray.map(row => keys.map(k => {
            const val = row[k];
            if (val === null || val === undefined) return '';
            return String(val).includes(',') ? `"${String(val).replace(/"/g, '""')}"` : String(val);
        }).join(','))).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
    }

    // --- RENDER FUNCTIONS ---

    function renderSummaryTable(summaryData) {
        if (!tableDiv) return;
        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No data found for this selection.</p>';
            return;
        }
        let html = '<table>';
        html += '<thead><tr><th>Sample</th><th>Target</th><th>N Replicates</th><th>Mean Ct</th><th>SD Ct</th><th>CV (%)</th></tr></thead>';
        html += '<tbody>';
        for (const row of summaryData) {
            html += `<tr> <td>${row.Sample}</td> <td>${row.Target}</td> <td>${row.N}</td> <td>${row.MeanCt}</td> <td>${row.SdCt}</td> <td>${row.CV}</td> </tr>`;
        }
        html += '</tbody></table>';
        tableDiv.innerHTML = html;
    }

    function renderPlots(samplesToShow, selectedTargets, threshold, source, allSummaryDataParam, appearanceOptions) {
        const plotType = document.querySelector('input[name="plotType"]:checked') ? document.querySelector('input[name="plotType"]:checked').value : 'average';
        const { plotHeight, baseFontSize, yMin, yMax } = appearanceOptions;
        const plotTraces = [];
        const plotLayout = {
            grid: { rows: selectedTargets.length, columns: 1, pattern: 'independent' },
            autosize: true,
            height: plotHeight * Math.max(1, selectedTargets.length),
            hovermode: 'x unified',
            annotations: [],
            shapes: [],
            colorway: Plotly.d3.scale.category10().range ? Plotly.d3.scale.category10().range() : Plotly.d3.scale.category10(),
            font: { size: baseFontSize },
            showlegend: true
        };
        const sampleColorMap = new Map();
        samplesToShow.forEach((sample, i) => { sampleColorMap.set(sample, plotLayout.colorway[i % plotLayout.colorway.length]); });
        const yMinValid = !isNaN(yMin);
        const yMaxValid = !isNaN(yMax);
        const yRange = [ yMinValid ? yMin : null, yMaxValid ? yMax : null ];

        selectedTargets.forEach((target, i) => {
            const subplotXAxisRef = 'x' + (i === 0 ? '' : i + 1);
            const subplotYAxisRef = 'y' + (i === 0 ? '' : i + 1);
            const subplotXAxisLayout = 'xaxis' + (i === 0 ? '' : i + 1);
            const subplotYAxisLayout = 'yaxis' + (i === 0 ? '' : i + 1);

            plotLayout[subplotXAxisLayout] = { title: 'Cycle Number' };
            plotLayout[subplotYAxisLayout] = { title: 'dRn', anchor: subplotXAxisRef, autorange: !(yMinValid || yMaxValid), range: yRange };
            plotLayout.annotations.push({ text: `<b>${target}</b>`, x: 0.5, y: 1.02, xref: `${subplotXAxisRef} domain`, yref: `${subplotYAxisRef} domain`, showarrow: false, font: { size: baseFontSize * 1.3, color: 'black' }, xanchor: 'center', yanchor: 'bottom' });
            plotLayout.shapes.push({ type: 'line', name: `threshold-line-${i}`, xref: 'paper', yref: subplotYAxisRef, x0: 0, x1: 1, y0: threshold, y1: threshold, line: { color: '#333', width: 2, dash: 'dot' }, editable: true, });

            samplesToShow.forEach((sample) => {
                const data = fullData.filter(row => row.Sample == sample && row.Target === target);
                if (data.length === 0) return;
                const replicates = groupBy(data, 'Well');
                const legendName = sample;
                const legendGroup = sample;
                const sampleColor = sampleColorMap.get(sample);
                const showLegendForTrace = (i === 0);

                switch (plotType) {
                    case 'all': {
                        let firstRep = true;
                        for (const repRows of replicates.values()) {
                            plotTraces.push({
                                x: repRows.map(r => r['Cycle Number']),
                                y: repRows.map(r => r['dRn']),
                                mode: 'lines',
                                type: 'scatter',
                                xaxis: subplotXAxisRef,
                                yaxis: subplotYAxisRef,
                                name: legendName,
                                legendgroup: legendGroup,
                                showlegend: showLegendForTrace && firstRep,
                                line: { width: 1.5, color: sampleColor, opacity: 0.6 }
                            });
                            firstRep = false;
                        }
                        break;
                    }
                    case 'one': {
                        if (replicates.size > 0) {
                            const oneRepRows = replicates.values().next().value;
                            plotTraces.push({
                                x: oneRepRows.map(r => r['Cycle Number']),
                                y: oneRepRows.map(r => r['dRn']),
                                mode: 'lines',
                                type: 'scatter',
                                xaxis: subplotXAxisRef,
                                yaxis: subplotYAxisRef,
                                name: legendName,
                                legendgroup: legendGroup,
                                showlegend: showLegendForTrace,
                                line: { color: sampleColor, width: 3 }
                            });
                        }
                        break;
                    }
                    case 'average':
                    default: {
                        const groupedByCycle = new Map();
                        for (const row of data) {
                            const cycle = row['Cycle Number'];
                            if (!groupedByCycle.has(cycle)) groupedByCycle.set(cycle, []);
                            groupedByCycle.get(cycle).push(row['dRn']);
                        }
                        const stats = calculateAverageAndStdDev(groupedByCycle);
                        if (showStdDevCheck && showStdDevCheck.checked) {
                            // convert sampleColor to rgba if possible
                            let fillColor = sampleColor;
                            try {
                                if (typeof sampleColor === 'string' && sampleColor.startsWith('rgb')) {
                                    fillColor = sampleColor.replace('rgb', 'rgba').replace(')', ', 0.15)');
                                } else {
                                    fillColor = sampleColor;
                                }
                            } catch (e) { fillColor = sampleColor; }
                            plotTraces.push({
                                x: [...stats.cycles, ...[...stats.cycles].reverse()],
                                y: [...stats.sd_upper, ...[...stats.sd_lower].reverse()],
                                fill: 'toself',
                                fillcolor: fillColor,
                                line: { color: 'transparent' },
                                type: 'scatter',
                                xaxis: subplotXAxisRef,
                                yaxis: subplotYAxisRef,
                                name: 'Std. Dev.',
                                legendgroup: legendGroup,
                                showlegend: false
                            });
                        }
                        plotTraces.push({
                            x: stats.cycles,
                            y: stats.means,
                            mode: 'lines',
                            type: 'scatter',
                            xaxis: subplotXAxisRef,
                            yaxis: subplotYAxisRef,
                            name: legendName,
                            legendgroup: legendGroup,
                            showlegend: showLegendForTrace,
                            line: { color: sampleColor, width: 3 }
                        });
                        break;
                    }
                }

                if (showCtCheck && showCtCheck.checked) {
                    const ctRow = allSummaryDataParam.find(r => r.Sample == sample && r.Target === target);
                    const meanCt = (ctRow && ctRow.MeanCt_raw !== null) ? ctRow.MeanCt_raw : null;
                    if (meanCt !== null && !isNaN(meanCt)) {
                        plotLayout.shapes.push({
                            type: 'line',
                            yref: `${subplotYAxisRef} domain`,
                            xref: subplotXAxisRef,
                            x0: meanCt,
                            x1: meanCt,
                            y0: 0,
                            y1: 1,
                            line: { color: sampleColor, width: 1.5, dash: 'dash' }
                        });
                        plotLayout.annotations.push({
                            x: meanCt,
                            y: 0.95,
                            xref: subplotXAxisRef,
                            yref: `${subplotYAxisRef} domain`,
                            text: `Ct: ${meanCt.toFixed(2)}`,
                            showarrow: true,
                            arrowhead: 0,
                            ax: 25,
                            ay: 0,
                            font: { color: sampleColor, size: baseFontSize * 0.9 }
                        });
                    }
                }
            });
        });

        try {
            Plotly.react(plotDiv, plotTraces, plotLayout, { edits: { shapePosition: true } });
        } catch (e) {
            console.error("Error rendering main Plotly plot:", e);
            if (plotDiv) Plotly.react(plotDiv, [], { title: 'Error rendering plot.' });
        }
    }






    function renderLinearityPlot() {
        if (!linearityPlotDiv) return;
        if (!allSummaryData || allSummaryData.length === 0) {
            Plotly.react(linearityPlotDiv, [], {title: "No summary data to plot. Try changing the dRn Threshold."});
            return;
        }
        const selectedTarget = linearityTargetSelect ? linearityTargetSelect.value : null;
        const baseFontSize = parseFloat(fontSizeInput.value) || 12;
        const plotData = allSummaryData
            .filter(row => row.Target === selectedTarget && row.MeanCt_raw !== null)
            .map(row => { const concentration = parseConcentration(row.Sample); return { ...row, concentration: concentration, log10_conc: (concentration > 0) ? Math.log10(concentration) : null }; })
            .filter(row => row.log10_conc !== null);
        if (plotData.length < 2) {
            Plotly.react(linearityPlotDiv, [], {title: `Not enough standard points found for ${selectedTarget}. (Found ${plotData.length})`});
            return;
        }
        const dataForRegression = plotData.map(row => [row.log10_conc, row.MeanCt_raw]);
        const result = regression.linear(dataForRegression);
        const slope = result.equation[0]; const intercept = result.equation[1]; const r2 = result.r2;
        const scatterTrace = { x: plotData.map(row => row.log10_conc), y: plotData.map(row => row.MeanCt_raw), text: plotData.map(row => `Sample: ${row.Sample}<br>Mean Ct: ${row.MeanCt}`), hoverinfo: 'text+x+y', mode: 'markers', type: 'scatter', name: 'Standards', marker: { size: 10 } };
        const lineTrace = { x: result.points.map(p => p[0]), y: result.points.map(p => p[1]), mode: 'lines', type: 'scatter', name: 'Regression Line', line: { color: 'red', dash: 'dash' } };
        const layout = { title: `Linearity Plot for ${selectedTarget}`, xaxis: { title: 'Log10(Concentration)' }, yaxis: { title: 'Mean Ct', autorange: 'reversed' }, font: { size: baseFontSize }, hovermode: 'closest', annotations: [ { x: 0.05, y: 0.05, xref: 'paper', yref: 'paper', text: `<b>y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}</b><br><b>R² = ${r2.toFixed(4)}</b>`, showarrow: false, align: 'left', font: { size: baseFontSize * 1.1 }, bordercolor: '#c7c7c7', borderwidth: 1, bgcolor: 'rgba(255,255,255,0.8)' } ] };
        Plotly.react(linearityPlotDiv, [scatterTrace, lineTrace], layout);
    }

    function renderPrecisionPlot() {
        if (!precisionPlotDiv) return;
        const precisionData = getReplicateCtData();
        const plotType = document.querySelector('input[name="precisionPlotType"]:checked') ? document.querySelector('input[name="precisionPlotType"]:checked').value : 'boxplot';
        const selectedTargets = Array.from(targetSelect ? targetSelect.selectedOptions : []).map(opt => opt.value);
        const baseFontSize = parseFloat(fontSizeInput.value) || 12;

        if (!precisionData || precisionData.length === 0 || !selectedTargets || selectedTargets.length === 0) {
            Plotly.react(precisionPlotDiv, [], {title: "No replicate data found for current selection and threshold."});
            return;
        }

        const plotTraces = [];
        const layoutUpdate = {
            grid: { rows: selectedTargets.length, columns: 1, pattern: 'independent' },
            height: 450 * selectedTargets.length,
            hovermode: 'closest',
            font: { size: baseFontSize },
            annotations: [],
            shapes: [],
            showlegend: false
        };

        selectedTargets.forEach((target, i) => {
            const targetData = precisionData.filter(d => d.Target === target);
            const xAxisRef = 'x' + (i === 0 ? '' : i + 1);
            const yAxisRef = 'y' + (i === 0 ? '' : i + 1);

            layoutUpdate[`xaxis${i === 0 ? '' : i + 1}`] = { title: plotType === 'boxplot' ? 'Sample' : 'Mean Ct of Replicates' };
            layoutUpdate[`yaxis${i === 0 ? '' : i + 1}`] = { title: plotType === 'boxplot' ? 'Ct Value' : 'Difference (Rep Ct - Mean Ct)', anchor: xAxisRef };

            layoutUpdate.annotations.push({
                text: `<b>${target}</b>`, x: 0.5, y: 1.02,
                xref: `${xAxisRef} domain`, yref: `${yAxisRef} domain`,
                showarrow: false, font: { size: baseFontSize * 1.3 },
                xanchor: 'center', yanchor: 'bottom'
            });

            if (targetData.length === 0) {
                layoutUpdate.annotations.push({
                    text: `No data for ${target}`, x: 0.5, y: 0.5,
                    xref: `${xAxisRef} domain`, yref: `${yAxisRef} domain`,
                    showarrow: false, font: { size: baseFontSize },
                    xanchor: 'center', yanchor: 'middle'
                });
                return;
            }

            if (plotType === 'boxplot') {
                const samplesInTarget = [...new Set(targetData.map(d => d.Sample))];
                samplesInTarget.forEach(sample => {
                    const sampleData = targetData.filter(d => d.Sample === sample);
                    plotTraces.push({
                        type: 'box',
                        name: sample,
                        y: sampleData.map(d => d.Replicate_Ct),
                        x: sampleData.map(() => sample),
                        boxpoints: 'all',
                        jitter: 0.3,
                        pointpos: 0,
                        xaxis: xAxisRef,
                        yaxis: yAxisRef,
                        marker: { size: 6 }
                    });
                });
            } else { // bland-altman
                const differences = targetData.map(d => d.Difference);
                let meanDiff = NaN, sdDiff = NaN, upperLimit = NaN, lowerLimit = NaN;

                if (differences.length > 0) {
                    meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
                    sdDiff = calculateStdDev(differences);
                    upperLimit = meanDiff + 1.96 * sdDiff;
                    lowerLimit = meanDiff - 1.96 * sdDiff;

                    layoutUpdate.shapes.push(
                        { type: 'line', layer: 'below', yref: yAxisRef, xref: 'paper', x0: 0, x1: 1, y0: meanDiff, y1: meanDiff, line: { color: 'blue', width: 2 } },
                        { type: 'line', layer: 'below', yref: yAxisRef, xref: 'paper', x0: 0, x1: 1, y0: upperLimit, y1: upperLimit, line: { color: 'red', width: 2, dash: 'dash' } },
                        { type: 'line', layer: 'below', yref: yAxisRef, xref: 'paper', x0: 0, x1: 1, y0: lowerLimit, y1: lowerLimit, line: { color: 'red', width: 2, dash: 'dash' } }
                    );

                    layoutUpdate.annotations.push(
                       { x: 0.98, y: meanDiff, xref: 'paper', yref: yAxisRef, text: `Mean: ${meanDiff.toFixed(2)}`, showarrow: false, xanchor: 'right', yanchor: 'bottom', font: {color: 'blue', size: baseFontSize * 0.9} },
                       { x: 0.98, y: upperLimit, xref: 'paper', yref: yAxisRef, text: `+1.96SD: ${upperLimit.toFixed(2)}`, showarrow: false, xanchor: 'right', yanchor: 'bottom', font: {color: 'red', size: baseFontSize * 0.9} },
                       { x: 0.98, y: lowerLimit, xref: 'paper', yref: yAxisRef, text: `-1.96SD: ${lowerLimit.toFixed(2)}`, showarrow: false, xanchor: 'right', yanchor: 'top', font: {color: 'red', size: baseFontSize * 0.9} }
                    );
                }

                plotTraces.push({
                    x: targetData.map(d => d.Mean_Ct),
                    y: targetData.map(d => d.Difference),
                    mode: 'markers',
                    type: 'scatter',
                    xaxis: xAxisRef,
                    yaxis: yAxisRef,
                    name: `Data_${i}`,
                    text: targetData.map(d => `Sample: ${d.Sample}<br>Rep Ct: ${d.Replicate_Ct.toFixed(2)}`),
                    hoverinfo: 'text+x+y',
                    marker: { size: 8, opacity: 0.7 }
                });
            }
        });

        Plotly.react(precisionPlotDiv, plotTraces, layoutUpdate);
    }

    function renderPrecisionSummaryTable() {
        if (!precisionTableDiv) return;
        const precisionData = getReplicateCtData();
        if (!precisionData || precisionData.length === 0) {
            precisionTableDiv.innerHTML = '<p>No replicate data available for current selection and threshold.</p>';
            return;
        }
        // aggregate summary by Sample/Target
        const grouped = {};
        for (const row of precisionData) {
            const key = `${row.Sample}|||${row.Target}`;
            if (!grouped[key]) grouped[key] = { Sample: row.Sample, Target: row.Target, N: 0, MeanDiff: 0, SD: 0, diffs: [] };
            grouped[key].N += 1;
            grouped[key].diffs.push(row.Difference);
        }
        const rows = Object.values(grouped).map(g => {
            const n = g.N;
            const mean = g.diffs.reduce((a,b)=>a+b,0)/n;
            const sd = calculateStdDev(g.diffs);
            return { Sample: g.Sample, Target: g.Target, N: n, Mean_Difference: mean.toFixed(3), SD: sd.toFixed(3) };
        });
        // render table
        let html = '<table>';
        html += '<thead><tr><th>Sample</th><th>Target</th><th>N</th><th>Mean Diff</th><th>SD</th></tr></thead><tbody>';
        for (const r of rows) html += `<tr><td>${r.Sample}</td><td>${r.Target}</td><td>${r.N}</td><td>${r.Mean_Difference}</td><td>${r.SD}</td></tr>`;
        html += '</tbody></table>';
        precisionTableDiv.innerHTML = html;
    }

    // --- 4. Main "Reactive" Function ---
    function updateOutputs(source = "user") {
        console.log(`DEBUG: updateOutputs triggered by: ${source}`);
        try {
            const plotWidth = parseFloat(plotWidthInput ? plotWidthInput.value : 100) || 100;
            if (plotDiv) plotDiv.style.width = `${plotWidth}%`;
            const threshold = parseFloat(ctThresholdInput ? ctThresholdInput.value : NaN);
            if (isNaN(threshold)) {
                console.error("DEBUG: Invalid dRn Threshold value:", ctThresholdInput ? ctThresholdInput.value : 'none');
                if (plotDiv) Plotly.react(plotDiv, [], { title: 'Invalid Threshold.' });
                if (tableDiv) tableDiv.innerHTML = '<p>Invalid dRn Threshold.</p>';
                if (precisionTableDiv) precisionTableDiv.innerHTML = '<p>Invalid dRn Threshold.</p>';
                if (linearityPlotDiv) Plotly.react(linearityPlotDiv, [], {title: "Invalid Threshold."});
                if (precisionPlotDiv) Plotly.react(precisionPlotDiv, [], {title: "Invalid Threshold."});
                return;
            }
            console.log(`DEBUG: Using threshold: ${threshold}`);

            const doCtFilter = filterByCtCheck && filterByCtCheck.checked;
            const ctCutoff = 35.0;

            calculateGlobalSummaryData(threshold);

            if (document.querySelector('.tab-button[data-tab="linearityTab"]')?.classList.contains('active')) {
                renderLinearityPlot();
            }
            if (document.querySelector('.tab-button[data-tab="precisionTab"]')?.classList.contains('active')) {
                renderPrecisionPlot();
                renderPrecisionSummaryTable();
            }

            const selectedSamples = Array.from(sampleSelect ? sampleSelect.selectedOptions : []).map(opt => opt.value);
            const selectedTargets = Array.from(targetSelect ? targetSelect.selectedOptions : []).map(opt => opt.value);
            console.log("DEBUG: Selected Samples:", selectedSamples);
            console.log("DEBUG: Selected Targets:", selectedTargets);

            if (selectedSamples.length === 0 || selectedTargets.length === 0) {
                console.log("DEBUG: No samples or targets selected, clearing main plots/tables.");
                if (plotDiv) Plotly.react(plotDiv, [], { title: 'Please select at least one Sample and one Target.' });
                if (tableDiv) tableDiv.innerHTML = '<p>Please select at least one Sample and one Target.</p>';
                if (precisionTableDiv) precisionTableDiv.innerHTML = '<p>Please select Samples and Targets in the sidebar.</p>';
                currentFilteredSummaryData = [];
                return;
            }

            let filteredSummaryData = allSummaryData.filter(row => row && selectedSamples.includes(String(row.Sample)) && selectedTargets.includes(row.Target) );
            let samplesToShow = selectedSamples;

            if (doCtFilter) {
                console.log("DEBUG: Applying Ct Filter (< 35)");
                const samplesToKeep = new Set( filteredSummaryData .filter(row => row.MeanCt_raw !== null && isFinite(row.MeanCt_raw) && row.MeanCt_raw < ctCutoff) .map(row => row.Sample) );
                console.log("DEBUG: Samples to keep after filter:", [...samplesToKeep]);
                samplesToShow = selectedSamples.filter(s => samplesToKeep.has(String(s)));
                filteredSummaryData = filteredSummaryData.filter(row => samplesToKeep.has(String(row.Sample)));
            }

            currentFilteredSummaryData = filteredSummaryData;
            console.log("DEBUG: Filtered Summary Data for Tables:", currentFilteredSummaryData);
            console.log("DEBUG: Samples to Show in Plots:", samplesToShow);

            const appearanceOptions = { plotHeight: parseFloat(plotHeightInput ? plotHeightInput.value : 450) || 450, baseFontSize: parseFloat(fontSizeInput ? fontSizeInput.value : 12) || 12, yMin: parseFloat(yMinInput ? yMinInput.value : NaN), yMax: parseFloat(yMaxInput ? yMaxInput.value : NaN) };
            console.log("DEBUG: Appearance Options:", appearanceOptions);

            renderPlots(samplesToShow, selectedTargets, threshold, source, allSummaryData, appearanceOptions);
            renderSummaryTable(filteredSummaryData);
        } catch (e) {
            console.error("Error during updateOutputs:", e);
            alert("An error occurred while updating the display. Check console for details.");
            try {
                if (plotDiv) Plotly.react(plotDiv, [], { title: 'Error occurred.' });
                if (tableDiv) tableDiv.innerHTML = '<p>Error occurred.</p>';
                if (precisionTableDiv) precisionTableDiv.innerHTML = '<p>Error occurred.</p>';
                if (linearityPlotDiv) Plotly.react(linearityPlotDiv, [], {title: "Error occurred."});
                if (precisionPlotDiv) Plotly.react(precisionPlotDiv, [], {title: "Error occurred."});
            } catch (renderError) {
                console.error("Error clearing plots/tables after main error:", renderError);
            }
        }
    }

    // --- Add initial setup message ---
    console.log("DEBUG: Initial setup complete. Waiting for file upload.");
});
