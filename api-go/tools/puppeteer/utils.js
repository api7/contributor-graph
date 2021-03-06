const cloneDeep = require('lodash.clonedeep');
const echarts = require("echarts");

const DEFAULT_COLOR = "#39a85a";

const generateDefaultOption = (title) => {
  return {
    color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
    legend: {
      top: "5%",
      data: [],
      textStyle: {
        fontSize: 14
      }
    },
    toolbox: {
      feature: {
        myShare: {
          show: true,
          title: "Share",
          icon: "path://M830.506667 642.688c-57.344 0-104.192 30.72-126.037334 78.336l-277.162666-117.888c16.170667-25.045333 25.045333-55.722667 25.045333-88.832a167.253333 167.253333 0 0 0-4.864-40.362667l176.981333-137.301333c23.466667 17.749333 53.333333 28.245333 86.485334 28.245333 80 0 139.776-59.733333 139.776-138.88S790.912 87.04 710.954667 87.04c-80 0-139.008 59.733333-139.008 138.922667 0 20.181333 4.053333 38.741333 10.496 54.912L419.2 406.101333c-32.298667-48.469333-85.632-82.389333-146.218667-82.389333a178.944 178.944 0 0 0-179.413333 178.474667v0.853333a178.944 178.944 0 0 0 179.413333 179.2c37.12 0 71.893333-9.642667 100.181334-27.392l318.378666 135.68c4.053333 75.093333 62.250667 130.816 138.965334 130.816 80.042667 0 139.008-59.733333 139.008-138.922667 0-79.146667-59.818667-139.733333-138.965334-139.733333z",
          onclick: function () {
            handleShareClick();
          }
        }
      }
    },
    dataset: [],
    title: {
      text: title,
    },
    tooltip: {
      trigger: "axis"
    },
    xAxis: {
      type: "time",
      nameLocation: "middle",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14
        },
        rotate: 45
      }
    },
    yAxis: {
      name: "",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14
        }
      }
    },
    series: [],
    grid: {
      x: 10,
      x2: 15,
      y: 80,
      containLabel: true,
      y2: 5
    }
  };
};

const updateSeries = (passXAxis, dataSource, title) => {
  const newClonedOption = cloneDeep(
    generateDefaultOption(title)
  );
  const datasetWithFilters = [
    ["ContributorNum", "Repo", "Date", "DateValue"]
  ];
  const legend = [];
  const limitDate = new Date(passXAxis[0]).getTime();
  Object.entries(dataSource).forEach(([key, value]) => {
    legend.push(key);
    value.forEach(item => {
      datasetWithFilters.push([
        item.contributorNum,
        item.repo,
        item.date,
        new Date(item.date).getTime()
      ]);
    });
  });

  const newDateSet = datasetWithFilters.sort(
    (a, b) => new Date(a[2]) - new Date(b[2])
  );

  const filterDataset = legend.map(item => ({
    id: item,
    fromDatasetId: "dataset_raw",
    transform: {
      type: "filter",
      config: {
        and: [
          { dimension: "Repo", "=": item },
          { dimension: "DateValue", gte: limitDate }
        ]
      }
    }
  }));

  const series = legend.map(item => ({
    name: item,
    type: "line",
    datasetId: item,
    showSymbol: false,
    smooth: true,
    encode: {
      x: "Date",
      y: "ContributorNum",
      itemName: "Repo",
      tooltip: ["ContributorNum"]
    }
  }));

  if (series.length === 1) {
    series[0].areaStyle = {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        {
          offset: 0,
          color: DEFAULT_COLOR + "80"
        },
        {
          offset: 1,
          color: DEFAULT_COLOR + "00"
        }
      ])
    };
    series[0].itemStyle = {
      normal: {
        color: DEFAULT_COLOR,
        lineStyle: {
          color: DEFAULT_COLOR
        }
      }
    };
  }

  newClonedOption.dataset = [
    {
      id: "dataset_raw",
      source: newDateSet
    }
  ].concat(filterDataset);

  newClonedOption.series = series;
  newClonedOption.legend.data = legend;
  return newClonedOption;
};

module.exports = {
  updateSeries,
}
