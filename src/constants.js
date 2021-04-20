export const DEFAULT_OPTIONS = {
  color: ['#39a85a', '#4385ee', '#fabc37', '#2dc1dd', '#f972cf', '#8331c8'],
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
  color: ['#39a85a', '#4385ee', '#fabc37', '#2dc1dd', '#f972cf', '#8331c8'],
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
    subtext: 'The number of contributors who committed to main branch in each month'
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

export const DEFAULT_COLOR = '#39a85a';