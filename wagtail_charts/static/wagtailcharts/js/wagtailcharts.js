Chart.defaults.set('plugins.datalabels', {
    color: '#000000',
});

const formatValue = function (val, precision = 1, override) {

    let raw_value;

    if (val instanceof Object && 'y' in val) {
        raw_value = val.y;
    } else {
        raw_value = val;
    }

    if (("" + raw_value).indexOf("%") >= 0) {
        return raw_value;
    }

    // We look for the locale in the window object, which must be set before the `render_charts` template tag is called.
    // If it is not present, it will be undefined and the browser's default locale will be used.
    let locale = window.WAGTAILCHARTS_LOCALE;

    number = Intl.NumberFormat(locale, {maximumFractionDigits: precision}).format(raw_value)

    if (override !== undefined && override !== "" && override !== null) {
        return number + " " + override;
    } else {
        return number;
    }
}

const percentageFormatter = function (val, precision = 1, override) {

    number = formatValue(val, precision);

    if (override !== undefined && override !== "" && override !== null) {
        return number + " " + override;
    } else {
        return number + "%";
    }
}

const absoluteNumberFormatter = function (val, precision = 1, override) {

    let unit = override || '';

    return unit + formatValue(Math.abs(val), precision);
}

const isObject = function (item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

const mergeDeep = function (target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
}

const labelFormatter = function(dataset, dataIndex, chart_settings) {

    let label = dataset.label || '';

    if (label) {
        label += ': ';
    }

    data = dataset.data[dataIndex]

    let labelFormatValue;
    if (dataset.yAxisID == 'y1') {
        if (chart_settings['y_right_data_type'] === 'percentage') {
            labelFormatValue = percentageFormatter;
        } else if (chart_settings['y_right_data_type'] === 'absolute_number') {
            labelFormatValue = absoluteNumberFormatter;
        }
    } else {
        if (chart_settings['y_left_data_type'] === 'percentage') {
            labelFormatValue = percentageFormatter;
        } else if (chart_settings['y_left_data_type'] === 'absolute_number') {
            labelFormatValue = absoluteNumberFormatter;
        }
    }

    if (!labelFormatValue) {
        labelFormatValue = formatValue;
    }

    if (Array.isArray(data) && data.length == 2) {
        label += labelFormatValue(
            (parseFloat(data[1]) * 1000 - parseFloat(data[0]) * 1000) / 1000,
            chart_settings['precision'],
            chart_settings['unit_override']
        )
    } else {
        label += labelFormatValue(
            data,
            chart_settings['precision'],
            chart_settings['unit_override']
        )
    }

    return label;
}


const getOrCreateLegendList = (chart, id) => {
    const legendContainer = document.getElementById(id);
    let listContainer = legendContainer.querySelector('ul');

    if (!listContainer) {
        listContainer = document.createElement('ul');
        listContainer.style.display = 'flex';
        listContainer.style.flexDirection = 'row';
        listContainer.style.margin = 0;
        listContainer.style.padding = 0;

        legendContainer.appendChild(listContainer);
    }

    return listContainer;
};

const htmlLegendPlugin = {
    id: 'htmlLegend',
    afterUpdate(chart, args, options) {
        const ul = getOrCreateLegendList(chart, options.containerID);

        // Remove old legend items
        while (ul.firstChild) {
            ul.firstChild.remove();
        }

        // Reuse the built-in legendItems generator
        const items = chart.options.plugins.legend.labels.generateLabels(chart);

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.alignItems = 'center';
            li.style.cursor = 'pointer';
            li.style.display = 'flex';
            li.style.flexDirection = 'row';
            li.style.marginLeft = '10px';

            li.onclick = () => {
                const { type } = chart.config;
                if (type === 'pie' || type === 'doughnut') {
                    // Pie and doughnut charts only have a single dataset and visibility is per item
                    chart.toggleDataVisibility(item.index);
                } else {
                    chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
                }
                chart.update();
            };

            // Color box
            const boxSpan = document.createElement('span');
            boxSpan.style.background = item.fillStyle;
            boxSpan.style.borderColor = item.strokeStyle;
            boxSpan.style.borderWidth = item.lineWidth + 'px';
            boxSpan.style.display = 'inline-block';
            boxSpan.style.flexShrink = 0;
            boxSpan.style.height = '20px';
            boxSpan.style.marginRight = '10px';
            boxSpan.style.width = '20px';

            // Text
            const textContainer = document.createElement('p');
            textContainer.style.color = item.fontColor;
            textContainer.style.margin = 0;
            textContainer.style.padding = 0;
            textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

            const text = document.createTextNode(item.text);
            textContainer.appendChild(text);

            li.appendChild(boxSpan);
            li.appendChild(textContainer);
            ul.appendChild(li);
        });
    }
};

const scatterConnectorPlugin = {
    id: 'connectors',
    afterDatasetsDraw(chart, args, options) {
        const ctx = chart.ctx;
        const x = chart.scales.x;
        const y = chart.scales.y;

        // The connector only cares about the 3 first datasets
        const first = chart.data.datasets[0].data;
        const second = chart.data.datasets[1].data;
        const backgroundColor = chart.data.datasets[2].backgroundColor;
        const firstPointRadius = chart.data.datasets[0].pointRadius || 3;
        const secondPointRadius = chart.data.datasets[1].pointRadius || 3;

        first.forEach((p, i) => {
            const xPix = x.getPixelForValue(p.x);

            ctx.save();
            ctx.strokeStyle = backgroundColor;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(xPix, y.getPixelForValue(first[i].y) + firstPointRadius);
            ctx.lineTo(xPix, y.getPixelForValue(second[i].y) - secondPointRadius);
            ctx.stroke();
            ctx.restore();
        });
    }
};

const navigatorPlugin = {
    id: 'navigator',
    defaults: {
        handlerH: 30,
        handlerW: 10,
        isDragging: false,
        isHold: false,
        holdTimer: false,
        leftHandler: false,
        rightHandler: false,
        xLeft: undefined,
        xRight: undefined,
        minDistance: 30
    },
    afterDatasetsDraw(chart, args, options) {
        const { ctx, canvas, scales: { x }, chartArea: { left, right, width, height, top, bottom } } = chart;

        if (options.xLeft === undefined) { options.xLeft = left }
        if (options.xRight === undefined) { options.xRight = right }

        // selected area background
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(211, 211, 211, 0.4)';
        ctx.rect(options.xLeft, top, options.xRight - options.xLeft, height);
        ctx.fill();
        ctx.restore();

        // left handler
        function handler(x) {
            const handlerY = height / 2 + top - (options.handlerH / 2);
            const middlePos = x - options.handlerW / 2;

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(211, 211, 211, 1)';
            ctx.fillStyle = 'white';
            ctx.lineWidth = 2;
            ctx.rect(middlePos, handlerY, options.handlerW, options.handlerH);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(211, 211, 211, 1)';
            ctx.lineWidth = 2;
            ctx.moveTo(x, handlerY + 5);
            ctx.lineTo(x, handlerY + options.handlerH - 5);
            ctx.stroke();
        }

        handler(options.xLeft);  // left handler
        handler(options.xRight);  // right handler

    },
    beforeEvent(chart, args, options) {
        const { ctx, parentChart, canvas, scales: { x }, chartArea: { left, right, width, height, top, bottom } } = chart;

        const holdDuration = 500; // ms
        const handlerHalfW = options.handlerW / 2;

        canvas.addEventListener('mousemove', (e) => {
            if (options.isDragging) {
                canvas.style.cursor = 'pointer';
            } else {
                // check if the mouse is over a handler
                if (e.offsetX >= options.xLeft - handlerHalfW && e.offsetX <= options.xLeft + handlerHalfW) {
                    canvas.style.cursor = 'pointer';
                } else if (e.offsetX >= options.xRight - handlerHalfW && e.offsetX <= options.xRight + handlerHalfW) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.offsetX >= options.xLeft - handlerHalfW && e.offsetX <= options.xLeft + handlerHalfW) {
                options.isDragging = true;
                options.leftHandler = true;
                options.isHold = false;
                options.holdTimer = setTimeout(() => {
                    options.isHold = true;
                }, holdDuration);
            } else {
                options.leftHandler = false;
                canvas.style.cursor = 'default';
            }
        });
        canvas.addEventListener('mousedown', (e) => {
            if (e.offsetX >= options.xRight - handlerHalfW && e.offsetX <= options.xRight + handlerHalfW) {
                options.isDragging = true;
                options.rightHandler = true;
                options.isHold = false;
                options.holdTimer = setTimeout(() => {
                    options.isHold = true;
                }, holdDuration);
            } else {
                options.rightHandler = false;
                canvas.style.cursor = 'default';
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            clearTimeout(options.holdTimer);
            if (options.isDragging && !options.isHold) {
                canvas.style.cursor = 'default';
            }
            options.isDragging = false;
            options.leftHandler = false;
        });
        canvas.addEventListener('mouseup', (e) => {
            clearTimeout(options.holdTimer);
            if (options.isDragging && !options.isHold) {
                canvas.style.cursor = 'default';
            }
            options.isDragging = false;
            options.rightHandler = false;
        });

        // move the handler
        if (options.isDragging == true && options.leftHandler == true && args.event.type === 'mousemove' &&
            args.event.x > left && args.event.x < options.xRight - options.minDistance
        ) {
            options.xLeft = args.event.x;
            args.changed = true;
            parentChart.chartZoom(x.getValueForPixel(options.xLeft), x.getValueForPixel(options.xRight));
        }
        if (options.isDragging == true && options.rightHandler == true && args.event.type === 'mousemove' &&
            args.event.x < right && args.event.x > options.xLeft + options.minDistance
        ) {
            options.xRight = args.event.x;
            args.changed = true;
            parentChart.chartZoom(x.getValueForPixel(options.xLeft), x.getValueForPixel(options.xRight));
        }
    }
}

const charts = document.querySelectorAll('*[id^="chart-"]');
for (i = 0; i < charts.length; ++i) {
    const chart_data = JSON.parse(charts[i].dataset.datasets).data;
    const chart_options =  JSON.parse(charts[i].dataset.datasets).options;
    const chart_settings = JSON.parse(charts[i].dataset.config);
    const chartType = charts[i].dataset.chartType;
    const configCallback = charts[i].dataset.callback || null;
    const chartObj = chart_types[chartType];

    let datasets = [];
    let labels = [];
    let annotations = [];

    if (chart_settings['column_as_dataset']) {
        for (let [index, row_title] of chart_options.title.entries()) {
            if (index !== 0) {
                datasets.push({ label: row_title, data: chart_data[index], backgroundColor: chart_options.color[index] })
            }
        }
        labels = chart_data[0];
    } else if (chartType === 'scatter') {
        labels = chart_data[0];
        for (let [index, row_title] of chart_options.title.entries()) {
            let xy_data = [];
            if (index !== 0) {
                for (let [label_index, label] of labels.entries()) {
                    xy_data.push({ x: label, y: chart_data[index][label_index] });
                }
                let dataset = { label: row_title, data: xy_data, backgroundColor: chart_options.color[index] }
                let pointRadius = chart_options.point_radius[index];
                if (!Number.isNaN(parseInt(pointRadius))) {
                    dataset['pointRadius'] = parseInt(pointRadius);
                }
                datasets.push(dataset);
            }
        }

        if (chart_settings['chart_markers'].length > 0) {
            for (let [index, marker] of chart_settings['chart_markers'].entries()) {
                annotations.push({
                    type: 'line',
                    borderColor: marker.value.colour,
                    borderWidth: 3,
                    borderDash: [6, 4],
                    label: {
                        backgroundColor: marker.value.colour,
                        content: marker.value.label,
                        display: true,
                        position: 'start',
                        yAdjust: parseInt(chart_settings['chart_marker_label_position']) || 0
                    },
                    scaleID: 'y',
                    value: parseFloat(marker.value.value)
                })
            }
        }
    } else {
        datasets = chartObj.render_datasets(chart_data, chart_options);
        labels = chartObj.render_labels(chart_data, chart_options);
    }

    // Check if we need a right axis
    let rightAxisEnabled = false;
    if (Object.keys(chart_options).includes('yaxis') && chart_options.yaxis.includes("right")) {
        rightAxisEnabled = true;
    }

    let options = {
        responsive: true,
        elements: {
            point: {
                pointStyle: 'circle',
            },
        },
        scales: {
            x: {
                display: true,
                grid: {
                    lineWidth: 0,
                },
                title: {
                    display: false
                },
                ticks: {
                    callback: function(value, index, ticks) {
                        let labelStep = parseInt(chart_settings['x_tick_label_step']) || 1
                        if (labelStep !== 1) {
                            return index % labelStep === 0 ? this.getLabelForValue(value) : '';
                        } else {
                            return this.getLabelForValue(value);
                        }
                    }
                }
            },
            y: {
                beginAtZero: true,
                display: true,
                position: 'left',
                ticks: {
                    callback: function(value) {
                        return formatValue(value, chart_settings['y_left_precision'])
                    }
                },
                grid: {},
                title: {
                    display: false
                }
            },
            y1: {
                beginAtZero: true,
                display: false,
                position: 'right',
                ticks: {
                    callback: function(value) {
                        return formatValue(value, chart_settings['y_right_precision'])
                    }
                },
                grid: {},
                title: {
                    display: false
                }
            },
        },
        plugins: {
            legend: {
                position: chart_settings['legend_position'],
                display: chart_settings['show_legend'],
                reverse: chart_settings['reverse_legend']
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return labelFormatter(context.dataset, context.dataIndex, chart_settings);
                    }
                }
            },
            datalabels: {
                formatter: function(value) {
                    if (Array.isArray(value) && value.length == 2) {
                        return formatValue(
                            (parseFloat(value[1]) * 1000 - parseFloat(value[0]) * 1000) / 1000,
                            chart_settings['precision'],
                            chart_settings['unit_override']
                        )
                    } else {
                        return formatValue(value, chart_settings['precision'], chart_settings['unit_override'])
                    }
                },
            },
            annotation: {
                annotations: []
            }
        },
    }

    // General settings

    if (chart_settings['aspect_ratio'] !== 'none') {
        options.aspectRatio = Number(chart_settings['aspect_ratio']);
    }
    if (chart_settings['html_legend']) {
        charts[i].insertAdjacentHTML('afterend', '<div id="' + charts[i].id.replace('chart', 'chart-legend-container') + '"></div>');
        options.plugins.legend.display = false;
        options.plugins.htmlLegend = {
            containerID: charts[i].id.replace('chart', 'chart-legend-container'),
        }
    }
    if (chart_settings['point_style'] === 'none') {
        options.elements.point.pointStyle = false;
    } else if (chart_settings['point_style'] !== '') {
        options.elements.point.pointStyle = chart_settings['point_style'];
    }
    if (chart_settings['chart_title'] !== '') {
        options.plugins['title'] = { display: true, text: chart_settings['chart_title'], fullSize: false, font: { size: 16 } }
    }

    // Y settings

    if (chart_settings['y_left_min'] !== '') {
        options.scales.y.min = parseFloat(chart_settings['y_left_min'])
    }
    if (chart_settings['y_left_max'] !== '') {
        options.scales.y.max = parseFloat(chart_settings['y_left_max'])
    }
    if (chart_settings['y_left_log_scale']) {
        options.scales.y.type = 'logarithmic'
    }
    if (chart_settings['y_left_step_size'] !== '') {
        options.scales.y.ticks.stepSize = parseFloat(chart_settings['y_left_step_size'])
    }
    if (chart_settings['y_left_label'] !== '') {
        options.scales.y.title.display = true;
        options.scales.y.title.text = chart_settings['y_left_label'];
    }
    if (chart_settings['y_left_data_type'] === "percentage") {
        options.scales.y.ticks.callback = function(value) {
            return percentageFormatter(value, chart_settings['y_left_precision'], chart_settings['unit_override'])
        };

        if (chart_settings['show_values_on_chart']) {
            options.plugins.datalabels.formatter = function(value) {
                return percentageFormatter(value, chart_settings['precision'], chart_settings['unit_override'])
            }
        }
    } else if (chart_settings['y_left_data_type'] === "absolute_number") {
        options.scales.y.ticks.callback = function(value) {
            let unit = chart_settings['unit_override'] || '';
            return unit + Math.abs(value).toLocaleString();
        };
    }

    if (chart_settings['y_left_show'] === false){
        options.scales.y.grid.lineWidth = function(context) {
            return context.tick && context.tick.value == 0 ? 1 : 0
        }
        options.scales.y.grid.drawBorder = false;
        options.scales.y.ticks.display = false;
    }

    if (rightAxisEnabled) {
        options.scales.y1.display = true;

        if (chart_settings['y_right_min'] !== '') {
            options.scales.y1.min = parseFloat(chart_settings['y_right_min'])
        }
        if (chart_settings['y_right_max'] !== '') {
            options.scales.y1.max = parseFloat(chart_settings['y_right_max'])
        }
        if (chart_settings['y_right_log_scale']) {
            options.scales.y1.type = 'logarithmic'
        }
        if (chart_settings['y_right_step_size'] !== '') {
            options.scales.y1.ticks.stepSize = parseFloat(chart_settings['y_right_step_size']);
        }
        if (chart_settings['y_right_label'] !== '') {
            options.scales.y1.title.display = true;
            options.scales.y1.title.text = chart_settings['y_right_label'];
        }

        if (chart_settings['y_right_data_type'] === "percentage") {
            options.scales.y1.ticks.callback = function(value) {
                return percentageFormatter(value, chart_settings['y_right_precision'])
            };
        }

        if (chart_settings['y_right_show'] === false){
            options.scales.y1.grid.lineWidth = function(context) {
                return context.tick && context.tick.value == 0 ? 1 : 0
            }
            options.scales.y1.grid.drawBorder = false;
            options.scales.y1.ticks.display = false;
        }
    }

    if (chart_settings['x_label'] !== '') {
        options.scales.x.title.display = true;
        options.scales.x.title.text = chart_settings['x_label'];
    }

    if (chart_settings['stacking'] === 'stacked') {
        options.scales.x.stacked = true
        options.scales.y.stacked = true
        options.scales.y1.stacked = true
    }

    if (chart_settings['stacking'] === 'stacked_100') {
        options.plugins.stacked100 = { enable: true, replaceTooltipLabel: false }
    }

    if (chart_settings['show_grid'] === false){
        options.scales.x.grid.display = false;
        options.scales.y.grid.lineWidth = function(context) {
            return context.tick && context.tick.value == 0 ? 1 : 0
        }
        options.scales.y1.grid.lineWidth = function(context) {
            return context.tick && context.tick.value == 0 ? 1 : 0
        }
    }

    if (chartType == 'pie' || chartType == 'doughnut'){
        options.borderWidth = chart_settings['pie_border_width'];
        options.borderColor = chart_settings['pie_border_color'];
    }

    let chartOptions = {
        type: chart_types[chartType].chartjs_chart_type,
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: []
    }

    if (chart_settings['html_legend']) {
        chartOptions.plugins = [...chartOptions.plugins, htmlLegendPlugin]
    }

    if (chart_settings['show_values_on_chart']) {
        chartOptions.plugins = [...chartOptions.plugins, ChartDataLabels]
        if (chart_settings['stacking'] === 'stacked' || chart_settings['stacking'] === 'stacked_100') {
            options.plugins.datalabels.formatter = function (value) {
                if (parseFloat(value) === 0.0) {
                    return ''
                }
                if (chart_settings['y_left_data_type'] === "percentage") {
                    return percentageFormatter(value, chart_settings['precision'], chart_settings['unit_override'])
                } else {
                    return formatValue(value, chart_settings['precision'], chart_settings['unit_override'])
                }
            }
        }
    }

    if (chartType == 'bar_horizontal') {
        b = options.scales.y;
        options.scales.y = options.scales.x;
        options.scales.x = b;
    } else if (chartType == 'scatter') {
        options.scales.x['type'] = 'category';
        if (chart_settings['scatter_enable_connector']) {
            chartOptions.plugins = [...chartOptions.plugins, scatterConnectorPlugin];
        }
        if (annotations.length > 0) {
            options.plugins.annotation.annotations = annotations;
        }
    }

    chartOptions.options = mergeDeep(options, chart_types[chartType].chart_options)

    // Config callbacks are looked up by name in window.WAGTAILCHARTS_CALLBACKS, which the site
    // must define before the `render_charts` template tag is called. The name is never evaluated
    // as code, so pages using charts do not need 'unsafe-eval' in their Content Security Policy.
    if (configCallback !== null) {
        const registry = window.WAGTAILCHARTS_CALLBACKS || {};
        const fn = Object.prototype.hasOwnProperty.call(registry, configCallback) ? registry[configCallback] : null;
        if (typeof fn === 'function') {
            chartOptions.options = mergeDeep(chartOptions.options, fn());
        } else {
            console.warn(`wagtail-charts: callback "${configCallback}" is not registered in window.WAGTAILCHARTS_CALLBACKS`);
        }
    }

    // main chart
    let myChart = new Chart(charts[i].getContext('2d'), chartOptions);

    // navigation bar if enabled
    const navChartCanvas = document.getElementById('nav-' + charts[i].id)

    if (navChartCanvas) {
        myChart.chartZoom = function(min, max) {
            this.config.options.scales.x.min = min;
            this.config.options.scales.x.max = max;
            this.update();
        }
        navChartOptions = JSON.parse(JSON.stringify(chartOptions));
        navChartOptions.options.aspectRatio = 9;
        navChartOptions.options.scales.x.ticks.display = false;
        navChartOptions.options.scales.y.title.text = '';
        navChartOptions.options.scales.y1.title.text = '';
        navChartOptions.options.plugins.legend.display = false;
        navChartOptions.options.plugins.tooltip.enabled = false;
        navChartOptions.plugins = [navigatorPlugin];

        let myNavigator = new Chart(navChartCanvas.getContext('2d'), navChartOptions);
        myNavigator.parentChart = myChart;
    }
}
