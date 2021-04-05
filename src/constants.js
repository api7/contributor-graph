export const DEFAULT_OPTIONS = {
  legend: {
    top: "5%",
    data: []
  },
  toolbox: {
    feature: {
      saveAsImage: {}
    }
  },
  dataset: [],
  title: {
    text: "Contributor Over Time"
  },
  tooltip: {
    trigger: "axis"
  },
  xAxis: {
    type: "time",
    nameLocation: "middle"
  },
  yAxis: {
    name: ""
  },
  series: []
};

export const DEFAULT_ACTIVITY_OPTIONS = {
  legend: {
    top: "5%",
    data: []
  },
  toolbox: {
    feature: {
      saveAsImage: {}
    }
  },
  dataset: [],
  title: {
    text: "Monthly Active Contributors",
    subtext: 'The value represents the contributors who submitted commits in the month'
  },
  tooltip: {
    trigger: "axis"
  },
  xAxis: {
    type: "time",
    nameLocation: "middle"
  },
  yAxis: {
    name: ""
  },
  series: []
};